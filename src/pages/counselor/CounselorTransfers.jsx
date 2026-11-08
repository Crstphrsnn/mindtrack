import React, { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  History,
  Inbox,
  Send,
  ShieldCheck,
  UserRoundCheck
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRows, rowsAreLoading, firstRowsError } from "../../hooks/useRows";
import {
  requestCounselorTransfer as submitOneTimeCounselorTransfer,
  approveCounselorTransfer as approveOneTimeCounselorTransfer,
  cancelCounselorTransfer as cancelOneTimeCounselorTransfer
} from "../../services/transferService";
import "./CounselorTransfers.css";

const PENDING_STATUS = "Pending approval";

function transferStatusLabel(status) {
  if (status === PENDING_STATUS) return "Pending approval";
  if (status === "Approved") return "Approved";
  if (status === "Cancelled" || status === "Canceled") return "Cancelled";
  return status || "Unknown status";
}

function uniqueById(rows) {
  return Array.from(new Map(rows.filter(row => row?.id).map(row => [row.id, row])).values());
}

function TransferEmptyState({ icon: Icon, title, description }) {
  return (
    <div className="mt-transfer-empty">
      <span className="mt-transfer-empty-icon" aria-hidden="true"><Icon size={25} /></span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

// Supabase RPCs remain authoritative for eligibility, approval, and the one-time rule.
// The existing transferRequests RPC is also the source for available transfer history.
export default function CounselorTransfers() {
  const { user } = useAuth();
  const isCounselor = user?.role === "counselor";

  // One RPC subscription instead of two duplicate transferRequests subscriptions.
  // The backend still controls which transfer records this counselor can read.
  const transferRows = useRows("transferRequests", isCounselor ? {} : { disabled: true });
  const counselorAccounts = useRows("counselorDirectory", isCounselor ? { active: true } : { disabled: true });
  const transferableUsers = useRows("transferableUsers", isCounselor ? {} : { disabled: true });

  const [transferStudentId, setTransferStudentId] = useState("");
  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [formExpanded, setFormExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("incoming");
  const [notice, setNotice] = useState(null);
  const [processingTransferId, setProcessingTransferId] = useState("");
  const [handledTransferIds, setHandledTransferIds] = useState(() => new Set());

  const eligibleStudents = transferableUsers.filter(item => !item.transferUsed && !item.transferPending);
  const receivingCounselors = counselorAccounts.filter(item =>
    item.active && (item.counselorId || item.id) !== user?.id
  );
  const selectedStudent = eligibleStudents.find(item => item.id === transferStudentId);
  const selectedCounselor = receivingCounselors.find(item =>
    (item.counselorId || item.id) === transferTargetId
  );

  const incomingTransfers = transferRows.filter(row =>
    isCounselor && row.targetCounselorId === user.id && row.requestedById !== user.id
  );
  const outgoingTransfers = transferRows.filter(row =>
    isCounselor && row.requestedById === user.id
  );
  const pendingIncoming = incomingTransfers.filter(row =>
    row.status === PENDING_STATUS && !handledTransferIds.has(row.id)
  );
  const pendingOutgoing = outgoingTransfers.filter(row => row.status === PENDING_STATUS);
  const resolvedTransfers = uniqueById([...incomingTransfers, ...outgoingTransfers].filter(row =>
    row.status !== PENDING_STATUS
  ));

  // Keep handled actions disabled until the updated Supabase rows arrive.
  useEffect(() => {
    const pendingIds = new Set(transferRows.filter(row => row.status === PENDING_STATUS).map(row => row.id));
    setHandledTransferIds(current => {
      const next = new Set([...current].filter(id => pendingIds.has(id)));
      if (next.size === current.size && [...next].every(id => current.has(id))) return current;
      return next;
    });
  }, [transferRows]);

  const transferLoading = rowsAreLoading(transferRows, counselorAccounts, transferableUsers);
  const transferError = firstRowsError(transferRows, counselorAccounts, transferableUsers);
  const canSubmit = !transferSubmitting && !transferLoading && !transferError &&
    eligibleStudents.length > 0 && receivingCounselors.length > 0;

  function handleTabKeyDown(event, currentId) {
    const tabIds = ["incoming", "outgoing", "history"];
    const currentIndex = tabIds.indexOf(currentId);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabIds.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex + tabIds.length - 1) % tabIds.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabIds.length - 1;
    else return;
    event.preventDefault();
    const nextId = tabIds[nextIndex];
    setActiveTab(nextId);
    document.getElementById(`mt-transfer-tab-${nextId}`)?.focus();
  }

  async function submitTransferRequest(event) {
    event.preventDefault();
    setNotice(null);
    const student = eligibleStudents.find(item => item.id === transferStudentId);
    const counselor = receivingCounselors.find(item =>
      (item.counselorId || item.id) === transferTargetId
    );
    if (!student) {
      setNotice({ type: "error", text: "Choose an eligible student currently assigned to you." });
      return;
    }
    if (!counselor || transferTargetId === user?.id) {
      setNotice({ type: "error", text: "Choose a different active receiving counselor." });
      return;
    }
    const reason = transferReason.trim();
    if (reason.length < 3 || reason.length > 1000) {
      setNotice({ type: "error", text: "Enter a transfer reason of 3 to 1000 characters." });
      return;
    }
    if (!window.confirm(`Request a one-time transfer for ${student.name || "this student"} to ${counselor.name || "the selected counselor"}? The assignment changes only after approval.`)) return;

    setTransferSubmitting(true);
    try {
      await submitOneTimeCounselorTransfer(student.id, transferTargetId, reason);
      setTransferStudentId("");
      setTransferTargetId("");
      setTransferReason("");
      setActiveTab("outgoing");
      setNotice({ type: "success", text: "Transfer request sent. The student remains assigned to you until the receiving counselor approves it." });
    } catch (error) {
      console.error("Unable to request counselor transfer:", error);
      setNotice({ type: "error", text: error?.message || "Unable to submit the transfer request." });
    } finally {
      setTransferSubmitting(false);
    }
  }

  async function approveTransfer(transfer) {
    if (!isCounselor || !transfer?.id || transfer.status !== PENDING_STATUS ||
        transfer.targetCounselorId !== user?.id || handledTransferIds.has(transfer.id)) {
      setNotice({ type: "error", text: "This transfer is no longer available for your approval." });
      return;
    }
    if (!window.confirm(`Accept the one-time transfer for ${transfer.ownerName || "this student"}? You will become their assigned counselor.`)) return;
    setProcessingTransferId(transfer.id);
    setNotice(null);
    try {
      await approveOneTimeCounselorTransfer(transfer.id);
      setHandledTransferIds(current => new Set([...current, transfer.id]));
      setNotice({ type: "success", text: "Transfer accepted. You are now the student's assigned counselor." });
    } catch (error) {
      console.error("Unable to approve counselor transfer:", error);
      setNotice({ type: "error", text: error?.message || "Unable to accept the transfer." });
    } finally {
      setProcessingTransferId("");
    }
  }

  async function declineTransfer(transfer) {
    if (!isCounselor || !transfer?.id || transfer.status !== PENDING_STATUS ||
        transfer.targetCounselorId !== user?.id || handledTransferIds.has(transfer.id)) {
      setNotice({ type: "error", text: "Only the receiving counselor can decline a pending transfer." });
      return;
    }
    const enteredReason = window.prompt(`Reason for declining the transfer for ${transfer.ownerName || "this student"}? (3–1000 characters)`);
    if (enteredReason === null) return;
    const reason = enteredReason.trim();
    if (reason.length < 3 || reason.length > 1000) {
      setNotice({ type: "error", text: "Enter a decline reason of 3 to 1000 characters." });
      return;
    }
    setProcessingTransferId(transfer.id);
    setNotice(null);
    try {
      await cancelOneTimeCounselorTransfer(transfer.id, reason);
      setHandledTransferIds(current => new Set([...current, transfer.id]));
      setNotice({ type: "success", text: "Transfer declined. The student remains with the original counselor." });
    } catch (error) {
      console.error("Unable to decline counselor transfer:", error);
      setNotice({ type: "error", text: error?.message || "Unable to decline the transfer." });
    } finally {
      setProcessingTransferId("");
    }
  }

  if (!isCounselor) return null;

  return (
    <main className="mt-transfers">
      <header className="mt-transfers-heading">
      
        <div>
          <h1>Counselor Transfers</h1>
          <p>Request student transfers and review decisions in one place.</p>
        </div>
      </header>

      {transferError && (
        <div className="mt-transfer-alert mt-transfer-alert-error" role="alert">
          Unable to load some transfer records: {transferError}
        </div>
      )}
      {notice && (
        <div className={`mt-transfer-alert mt-transfer-alert-${notice.type}`} role={notice.type === "error" ? "alert" : "status"}>
          {notice.text}
        </div>
      )}

      <section className="mt-transfer-stats" aria-label="Transfer overview">
        <div className="mt-transfer-stat">
          <span className="mt-transfer-stat-icon" aria-hidden="true"><Inbox size={21} /></span>
          <div><span>Incoming pending</span><strong>{(transferRows.loading || transferRows.error) ? "—" : pendingIncoming.length}</strong></div>
        </div>
        <div className="mt-transfer-stat">
          <span className="mt-transfer-stat-icon" aria-hidden="true"><Clock3 size={21} /></span>
          <div><span>Outgoing pending</span><strong>{(transferRows.loading || transferRows.error) ? "—" : pendingOutgoing.length}</strong></div>
        </div>
        <div className="mt-transfer-stat">
          <span className="mt-transfer-stat-icon" aria-hidden="true"><CheckCircle2 size={21} /></span>
          <div><span>Resolved records</span><strong>{(transferRows.loading || transferRows.error) ? "—" : resolvedTransfers.length}</strong></div>
        </div>
      </section>

      <div className="mt-transfer-main-grid">
        <section className="mt-transfer-card mt-transfer-form-card" aria-labelledby="mt-transfer-form-title">
          <div className="mt-transfer-section-head">
            <div>
              <span className="mt-transfer-eyebrow">NEW REQUEST</span>
              <h2 id="mt-transfer-form-title">Request Student Transfer</h2>
              <p>Transfer an eligible student to another active counselor.</p>
            </div>
            <button className="mt-transfer-collapse" type="button" aria-expanded={formExpanded}
              aria-controls="mt-transfer-form-content" onClick={() => setFormExpanded(value => !value)}>
              {formExpanded ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
              <span>{formExpanded ? "Hide" : "Show"}</span>
            </button>
          </div>

          {formExpanded && (
            <div id="mt-transfer-form-content">
              <form className="mt-transfer-form" onSubmit={submitTransferRequest}>
                <div className="mt-transfer-fields">
                  <div className="mt-transfer-field">
                    <label htmlFor="transfer-student-select">1. Assigned student <span aria-hidden="true">*</span></label>
                    <select id="transfer-student-select" value={transferStudentId}
                      onChange={event => setTransferStudentId(event.target.value)} required disabled={transferSubmitting}>
                      <option value="">Choose an eligible student</option>
                      {eligibleStudents.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name || "Student"} — {item.department || "No college / office"}
                        </option>
                      ))}
                    </select>
                    {!transferLoading && eligibleStudents.length === 0 && (
                      <small>No eligible students are available for a one-time transfer.</small>
                    )}
                  </div>
                  <div className="mt-transfer-field">
                    <label htmlFor="transfer-target-select">2. Receiving counselor <span aria-hidden="true">*</span></label>
                    <select id="transfer-target-select" value={transferTargetId}
                      onChange={event => setTransferTargetId(event.target.value)} required disabled={transferSubmitting}>
                      <option value="">Choose an active counselor</option>
                      {receivingCounselors.map(item => (
                        <option key={item.counselorId || item.id} value={item.counselorId || item.id}>
                          {item.name} — {item.department || "No college / office"}
                        </option>
                      ))}
                    </select>
                    {!transferLoading && receivingCounselors.length === 0 && (
                      <small>No other active counselors are currently available.</small>
                    )}
                  </div>
                </div>

                {(selectedStudent || selectedCounselor) && (
                  <div className="mt-transfer-selection" aria-live="polite">
                    {selectedStudent && (
                      <div><UserRoundCheck size={17} aria-hidden="true" />
                        <span><strong>{selectedStudent.name || "Student"}</strong> · {selectedStudent.department || "No college / office"}
                          {selectedStudent.program ? ` · ${selectedStudent.program}` : ""}</span>
                      </div>
                    )}
                    {selectedCounselor && (
                      <div><ArrowLeftRight size={17} aria-hidden="true" />
                        <span>Receiving counselor: <strong>{selectedCounselor.name}</strong></span>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-transfer-field">
                  <label htmlFor="transfer-reason">3. Reason for transfer <span aria-hidden="true">*</span></label>
                  <textarea id="transfer-reason" rows={3} minLength={3} maxLength={1000} required
                    value={transferReason} onChange={event => setTransferReason(event.target.value)}
                    disabled={transferSubmitting}
                    placeholder="Please provide a brief explanation for the transfer request." />
                  <div className="mt-transfer-field-help">
                    <small>{transferReason.length}/1000</small>
                  </div>
                </div>

                <div className="mt-transfer-approval-note">
                  <ShieldCheck size={19} aria-hidden="true" />
                  <span>The receiving counselor must approve before the student's assignment changes. A completed transfer cannot be repeated.</span>
                </div>

                <button type="submit" className="primary-button mt-transfer-submit" disabled={!canSubmit}>
                  <Send size={18} aria-hidden="true" />
                  {transferSubmitting ? "Sending request..." : "Submit Transfer Request"}
                </button>
              </form>
            </div>
          )}
        </section>

      </div>

      <section className="mt-transfer-card mt-transfer-requests" aria-labelledby="mt-transfer-requests-title">
        <div className="mt-transfer-section-head">
          <div>
            <span className="mt-transfer-eyebrow">MANAGE REQUESTS</span>
            <h2 id="mt-transfer-requests-title">Transfer Requests</h2>
            <p>Review incoming requests, track outgoing requests, and view available resolved records.</p>
          </div>
        </div>

        <div className="mt-transfer-tabs" role="tablist" aria-label="Transfer request category">
          {[
            { id: "incoming", label: "Incoming", count: pendingIncoming.length, icon: Inbox },
            { id: "outgoing", label: "Outgoing", count: pendingOutgoing.length, icon: Clock3 },
            { id: "history", label: "History", count: resolvedTransfers.length, icon: History }
          ].map(({ id, label, count, icon: Icon }) => (
            <button key={id} type="button" role="tab" id={`mt-transfer-tab-${id}`}
              aria-selected={activeTab === id} aria-controls="mt-transfer-tab-panel" tabIndex={activeTab === id ? 0 : -1}
              className={`mt-transfer-tab${activeTab === id ? " is-active" : ""}`}
              onClick={() => setActiveTab(id)} onKeyDown={event => handleTabKeyDown(event, id)}>
              <Icon size={17} aria-hidden="true" /> {label} <span>{count}</span>
            </button>
          ))}
        </div>

        <div id="mt-transfer-tab-panel" className="mt-transfer-tab-panel" role="tabpanel"
          aria-labelledby={`mt-transfer-tab-${activeTab}`}>
          {transferRows.loading ? (
            <p className="mt-transfer-loading" role="status">Loading transfer requests...</p>
          ) : activeTab === "incoming" ? (
            pendingIncoming.length === 0 ? (
              <TransferEmptyState icon={Inbox} title="No incoming requests"
                description="Transfer requests awaiting your approval will appear here." />
            ) : (
              <div className="mt-transfer-list">
                {pendingIncoming.map(transfer => (
                  <article className="mt-transfer-request-item" key={transfer.id}>
                    <div className="mt-transfer-request-info">
                      <div className="mt-transfer-request-top">
                        <h3>{transfer.ownerName || "Student"}</h3>
                        <span className="mt-transfer-status mt-transfer-status-pending">Pending approval</span>
                      </div>
                      <p>{transfer.ownerDepartment || "No college / office"}</p>
                      <p>Requested by: <strong>{transfer.requestedByName || "Counselor"}</strong></p>
                      {transfer.reason && <p>Reason: {transfer.reason}</p>}
                      {transfer.consultationId && (transfer.date || transfer.time) && (
                        <p>Session: {[transfer.date, transfer.time].filter(Boolean).join(" · ")}</p>
                      )}
                    </div>
                    <div className="mt-transfer-request-actions">
                      <button type="button" className="primary-button mt-transfer-accept"
                        disabled={Boolean(processingTransferId) || handledTransferIds.has(transfer.id)}
                        onClick={() => approveTransfer(transfer)}>
                        {processingTransferId === transfer.id ? "Processing..." : "Accept transfer"}
                      </button>
                      <button type="button" className="mt-transfer-decline"
                        disabled={Boolean(processingTransferId) || handledTransferIds.has(transfer.id)}
                        onClick={() => declineTransfer(transfer)}>
                        Decline
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : activeTab === "outgoing" ? (
            pendingOutgoing.length === 0 ? (
              <TransferEmptyState icon={Clock3} title="No outgoing requests"
                description="Transfer requests you submit will appear here while awaiting a decision." />
            ) : (
              <div className="mt-transfer-list">
                {pendingOutgoing.map(transfer => (
                  <article className="mt-transfer-request-item" key={transfer.id}>
                    <div className="mt-transfer-request-info">
                      <div className="mt-transfer-request-top">
                        <h3>{transfer.ownerName || "Student"}</h3>
                        <span className="mt-transfer-status mt-transfer-status-pending">Pending approval</span>
                      </div>
                      <p>To: <strong>{transfer.targetCounselorName || "Selected counselor"}</strong></p>
                      <p>{transfer.ownerDepartment || "No college / office"}</p>
                      {transfer.reason && <p>Reason: {transfer.reason}</p>}
                    </div>
                    <p className="mt-transfer-awaiting">Awaiting receiving counselor's decision</p>
                  </article>
                ))}
              </div>
            )
          ) : resolvedTransfers.length === 0 ? (
            <TransferEmptyState icon={History} title="No resolved records available"
              description="Approved or cancelled transfers visible to your account will appear here when available." />
          ) : (
            <div className="mt-transfer-list">
              {resolvedTransfers.map(transfer => (
                <article className="mt-transfer-request-item" key={transfer.id}>
                  <div className="mt-transfer-request-info">
                    <div className="mt-transfer-request-top">
                      <h3>{transfer.ownerName || "Student"}</h3>
                      <span className={`mt-transfer-status${transfer.status === "Approved" ? " mt-transfer-status-approved" : ""}`}>
                        {transferStatusLabel(transfer.status)}
                      </span>
                    </div>
                    <p>{transfer.requestedById === user.id ? "Outgoing" : "Incoming"} transfer</p>
                    <p>{transfer.ownerDepartment || "No college / office"}</p>
                    {transfer.reason && <p>Reason: {transfer.reason}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
