import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRows, rowsAreLoading, firstRowsError } from "../../hooks/useRows";
import {
  requestCounselorTransfer as submitOneTimeCounselorTransfer,
  approveCounselorTransfer as approveOneTimeCounselorTransfer,
  cancelCounselorTransfer as cancelOneTimeCounselorTransfer
} from "../../services/transferService";

// The counselor's transfer workflow is a dedicated page, not a dashboard widget.
// Supabase RPCs remain authoritative for eligibility, approval, and one-time limits.
export default function CounselorTransfers() {
  const { user } = useAuth();
  const isCounselor = user?.role === "counselor";

  const pendingTransferRows =
    useRows(
      "transferRequests",
      isCounselor
        ? {
            targetCounselorId:
              user.id,

            status:
              "Pending approval"
          }
        : {
            disabled: true
          }
    );


  const outgoingTransferRows =
    useRows(
      "transferRequests",
      isCounselor
        ? {
            requestedById:
              user.id,

            status:
              "Pending approval"
          }
        : {
            disabled:
              true
          }
    );


  const counselorAccounts =
    useRows("counselorDirectory", isCounselor ? { active: true } : { disabled: true });

  const transferableUsers =
    useRows("transferableUsers", isCounselor ? {} : { disabled: true });

  const [transferStudentId, setTransferStudentId] = useState("");
  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  async function submitTransferRequest(event) {
    event.preventDefault();
    const student = transferableUsers.find(item => item.id === transferStudentId);
    if (!student || student.transferUsed || student.transferPending) {
      alert("Choose a currently assigned student who has not transferred and has no pending request.");
      return;
    }
    if (!transferTargetId || transferTargetId === user.id) {
      alert("Choose a different active counselor.");
      return;
    }
    if (!window.confirm(`Request a one-time transfer for ${student.name || "this student"}?`)) return;
    setTransferSubmitting(true);
    try {
      await submitOneTimeCounselorTransfer(student.id, transferTargetId, transferReason);
      setTransferStudentId("");
      setTransferTargetId("");
      setTransferReason("");
      alert("Transfer request sent. Waiting for receiving counselor approval.");
    } catch (error) {
      console.error("Unable to request one-time transfer:", error);
      alert(error?.message || "Unable to request transfer.");
    } finally {
      setTransferSubmitting(false);
    }
  }


  // Supabase transfer RPCs are authoritative; the rows refresh after transfer events.
  // A second approval is rejected by the database.
  const pendingTransferRequests =
    pendingTransferRows.filter(
      row =>
        isCounselor &&
        row.status ===
          "Pending approval" &&
        row.targetCounselorId ===
          user.id &&
        row.requestedById !==
          user.id
    );


  const outgoingTransferRequests =
    outgoingTransferRows.filter(
      row =>
        isCounselor &&
        row.status ===
          "Pending approval" &&
        row.requestedById ===
          user.id
    );


  const [
    cancelingIncomingTransferId,
    setCancelingIncomingTransferId
  ] = useState("");


  const [
    approvingTransferId,
    setApprovingTransferId
  ] = useState("");


  const [
    unavailableTransferIds,
    setUnavailableTransferIds
  ] = useState(
    () =>
      new Set()
  );


  useEffect(
    () => {

      const pendingIds =
        new Set(
          pendingTransferRequests.map(
            row =>
              row.id
          )
        );


      setUnavailableTransferIds(
        current => {

          const next =
            new Set(
              Array.from(
                current
              ).filter(
                id =>
                  pendingIds.has(
                    id
                  )
              )
            );


          if (
            next.size ===
            current.size &&
            Array.from(
              next
            ).every(
              id =>
                current.has(
                  id
                )
            )
          ) {

            return current;
          }


          return next;
        }
      );
    },
    [
      pendingTransferRequests
    ]
  );


  async function approveTransfer(transfer) {
    if (!isCounselor || !transfer?.id ||
        transfer.status !== "Pending approval" ||
        transfer.targetCounselorId !== user.id) {
      alert("This transfer request is no longer available for your approval.");
      return;
    }
    if (!window.confirm(`Approve the one-time counselor transfer for ${transfer.ownerName || "this student"}? You will become their assigned counselor.`)) return;
    setApprovingTransferId(transfer.id);
    try {
      await approveOneTimeCounselorTransfer(transfer.id);
      setUnavailableTransferIds(current => new Set([...current, transfer.id]));
      alert("Transfer approved. You are now the student's assigned counselor. Another transfer is not allowed.");
    } catch (error) {
      console.error("Supabase counselor transfer approval failed:", error);
      alert(error?.message || "Unable to approve this transfer.");
    } finally {
      setApprovingTransferId("");
    }
  }

  async function cancelIncomingTransfer(transfer) {
    if (!isCounselor || !transfer?.id ||
        transfer.status !== "Pending approval" ||
        transfer.targetCounselorId !== user.id) {
      alert("Only the receiving counselor can decline this pending transfer.");
      return;
    }
    const reason = window.prompt(`Why are you declining the transfer for ${transfer.ownerName || "this student"}?`);
    if (reason === null) return;
    setCancelingIncomingTransferId(transfer.id);
    try {
      await cancelOneTimeCounselorTransfer(transfer.id, reason);
      alert("Transfer declined. The student remains with the original counselor.");
    } catch (error) {
      console.error("Supabase counselor transfer cancellation failed:", error);
      alert(error?.message || "Unable to cancel this transfer.");
    } finally {
      setCancelingIncomingTransferId("");
    }
  }

  const transferLoading = rowsAreLoading(
    pendingTransferRows,
    outgoingTransferRows,
    counselorAccounts,
    transferableUsers
  );

  const transferError = firstRowsError(
    pendingTransferRows,
    outgoingTransferRows,
    counselorAccounts,
    transferableUsers
  );

  return (
    <>
      <div className="page-title">
        <h1>Transfers</h1>
        <p>Request student transfers and manage incoming or outgoing counselor transfer requests.</p>
      </div>

      {transferLoading && (
        <section className="panel">
          <p>Loading counselor transfer records...</p>
        </section>
      )}

      {transferError && (
        <div className="error-box" role="alert">
          Unable to load some transfer records: {transferError}
        </div>
      )}

      {!transferLoading && (
        <>
        {isCounselor && (
          <section className="panel" style={{ maxWidth: "100%" }}>
            <h2>One-Time Counselor Transfer</h2>
            <p>Transfer a currently assigned student once. The receiving counselor must approve before the assignment changes.</p>
            <form onSubmit={submitTransferRequest} style={{ display: "grid", gap: 12, maxWidth: 680 }}>
              <label htmlFor="transfer-student-select">Assigned student</label>
              <select id="transfer-student-select" value={transferStudentId}
                onChange={event => setTransferStudentId(event.target.value)} required>
                <option value="">Choose an eligible student</option>
                {transferableUsers.filter(item => !item.transferUsed && !item.transferPending).map(item => (
                  <option key={item.id} value={item.id}>{item.name || "Student"} — {item.department || "No department"}</option>
                ))}
              </select>
              <label htmlFor="transfer-target-select">Receiving counselor</label>
              <select id="transfer-target-select" value={transferTargetId}
                onChange={event => setTransferTargetId(event.target.value)} required>
                <option value="">Choose an active counselor</option>
                {counselorAccounts.filter(item => item.active && (item.counselorId || item.id) !== user.id).map(item => (
                  <option key={item.counselorId || item.id} value={item.counselorId || item.id}>{item.name} — {item.department || "No department"}</option>
                ))}
              </select>
              <label htmlFor="transfer-reason">Reason for transfer</label>
              <textarea id="transfer-reason" value={transferReason}
                onChange={event => setTransferReason(event.target.value)}
                minLength={3} maxLength={1000} required rows={3}
                placeholder="Enter the reason (do not include confidential assessment scores)." />
              <button type="submit" className="primary-button" disabled={transferSubmitting || transferableUsers.loading || counselorAccounts.loading}>
                {transferSubmitting ? "Sending request..." : "Request one-time transfer"}
              </button>
              {transferableUsers.error && <p className="error-box">{transferableUsers.error}</p>}
            </form>
          </section>
        )}

        {isCounselor && (

          <section className="panel transfer-dashboard-panel">

            <div className="transfer-dashboard-heading">

              <div>

                <h2>
                  Counselor Transfer Requests
                </h2>

                <p>
                  These counseling cases were assigned to you by another counselor and are waiting for your acceptance.
                </p>

              </div>


              <span className="transfer-count-badge">
                {pendingTransferRequests.length}
              </span>

            </div>


            {pendingTransferRequests.length === 0

              ? (

                <div className="transfer-empty-state">
                  No users are currently waiting for counselor transfer approval.
                </div>

              )

              : (

                <div className="transfer-request-grid">

                  {pendingTransferRequests.map(
                    transfer => (

                      <article
                        className="transfer-request-card"
                        key={transfer.id}
                      >

                        <div>

                          <strong>
                            {transfer.ownerName || "User"}
                          </strong>

                          <p>
                            {transfer.ownerDepartment || "No college / office"}
                          </p>

                          <small>
                            {transfer.sourceType === "profile" || !transfer.consultationId
                              ? "Source: User Profile"
                              : `Schedule: ${transfer.date || "No date"} · ${transfer.time || "No time"}`}
                          </small>

                          <small>
                            Requested by: {transfer.requestedByName || "Counselor"}
                          </small>

                          {transfer.reason && (
                            <small>
                              Reason: {transfer.reason}
                            </small>
                          )}

                        </div>


                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            flexWrap: "wrap"
                          }}
                        >
                          <button
                            type="button"
                            className="primary-button"
                            disabled={
                              approvingTransferId ===
                                transfer.id ||
                              cancelingIncomingTransferId ===
                                transfer.id ||
                              transfer.status !==
                                "Pending approval" ||
                              unavailableTransferIds.has(
                                transfer.id
                              )
                            }
                            onClick={
                              () =>
                                approveTransfer(
                                  transfer
                                )
                            }
                          >
                            {
                              approvingTransferId ===
                              transfer.id
                                ? "Approving..."
                                : (
                                    transfer.status !==
                                      "Pending approval" ||
                                    unavailableTransferIds.has(
                                      transfer.id
                                    )
                                  )
                                  ? "Already handled"
                                  : "Accept transfer"
                            }
                          </button>

                          <button
                            type="button"
                            className="danger-button danger-button-outline"
                            disabled={
                              approvingTransferId ===
                                transfer.id ||
                              cancelingIncomingTransferId ===
                                transfer.id ||
                              transfer.status !==
                                "Pending approval" ||
                              unavailableTransferIds.has(
                                transfer.id
                              )
                            }
                            onClick={
                              () =>
                                cancelIncomingTransfer(
                                  transfer
                                )
                            }
                          >
                            {
                              cancelingIncomingTransferId ===
                              transfer.id
                                ? "Cancelling..."
                                : "Cancel transfer"
                            }
                          </button>
                        </div>

                      </article>
                    )
                  )}

                </div>

              )
            }


            <div
              className="transfer-dashboard-heading"
              style={{
                marginTop:
                  "24px"
              }}
            >

              <div>
                <h3>
                  Outgoing transfers awaiting selected counselor decision
                </h3>
                <p>
                  Transfers you requested remain assigned to you until the selected counselor accepts or cancels them.
                </p>
              </div>

              <span className="transfer-count-badge">
                {outgoingTransferRequests.length}
              </span>

            </div>


            {outgoingTransferRequests.length === 0
              ? (
                <div className="transfer-empty-state">
                  You have no outgoing transfer requests waiting for a selected counselor decision.
                </div>
              )
              : (
                <div className="transfer-request-grid">
                  {outgoingTransferRequests.map(
                    transfer => (
                      <article
                        className="transfer-request-card"
                        key={`outgoing-${transfer.id}`}
                      >
                        <div>
                          <strong>
                            {transfer.ownerName || "User"}
                          </strong>
                          <p>
                            To: {transfer.targetCounselorName || "Selected counselor"}
                          </p>
                          <small>
                            {transfer.ownerDepartment || "No college / office"}
                          </small>
                          {transfer.reason && (
                            <small>
                              Transfer reason: {transfer.reason}
                            </small>
                          )}
                        </div>

                        <span className="transfer-pending-label">
                          Awaiting selected counselor decision
                        </span>
                      </article>
                    )
                  )}
                </div>
              )
            }

          </section>

        )}


        </>
      )}
    </>
  );
}
