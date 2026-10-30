import React, { useEffect, useMemo, useRef, useState } from "react";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import { COLLEGE_OPTIONS, collegePrograms } from "./config/collegeRoster";
import { Protected, RoleProtected } from "./components/RouteGuards";
import {
  submitAssessment
} from "./services/assessmentService";
import { useAssessmentDraft } from "./hooks/useAssessmentDraft";

import {
  deleteAssessmentCase,
  updateAssessmentCase
} from "./services/assessmentCaseService";

import {
  useRows,
  useDocumentRow,
  rowsAreLoading,
  firstRowsError
} from "./hooks/useRows";

import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate
} from "react-router-dom";

import {
  Activity,
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MessageCircle,
  Shield,
  Star,
  User,
  Users,
  UserPlus,
  Trash2
} from "lucide-react";

import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import { useReportsAnalytics } from "./hooks/useReportsAnalytics";
import { deleteUnprocessedCounselingRequest } from "./services/adminCleanupService";
import Home from "./components/Home";
import UserProfileFullScreen from "./components/UserProfileFullScreen";
import "./counseling-calendar.css";
import "./staff-feature-access.css";

import {
  submitReferral,
  updateReferral,
  getReferralNotes,
  saveReferralNotes
} from "./services/referralService";

import {
  requestCounselorTransfer as submitOneTimeCounselorTransfer,
  approveCounselorTransfer as approveOneTimeCounselorTransfer,
  cancelCounselorTransfer as cancelOneTimeCounselorTransfer
} from "./services/transferService";

import {
  markNotificationRead,
  markAllNotificationsRead,
  clearNotification,
  clearReadNotifications,
  clearAllNotifications
} from "./services/notificationService";

import {
  submitMindTrackFeedback,
  listMyMindTrackFeedback,
  listAdminMindTrackFeedback
} from "./services/feedbackService";

import {
  submitCounselingRequest,
  editCounselingRequest,
  updateCounselingRequest,
  getCounselingNotes,
  saveCounselingNotes
} from "./services/counselingService";

import {
  calculateAssessment,
  dass21Choices,
  dass21Questions,
  DASS21_TITLE,
  gad7Choices,
  gad7Questions,
  GAD7_TITLE,
  phq9Choices,
  phq9DifficultyChoices,
  phq9Questions,
  PHQ9_TITLE,
  scoredQuestionIds,
  who5Choices,
  who5Questions,
  WHO5_TITLE
} from "./utils/assessment";




// ======================================================
// COUNSELOR TRANSFER HELPERS
// ======================================================

function transferAccessDocumentId(
  ownerId,
  counselorId
) {

  return `${ownerId}_${counselorId}`;
}


function mergeRowsById(...lists) {

  const map = new Map();

  lists
    .flat()
    .forEach(
      row => {

        if (row?.id) {
          map.set(
            row.id,
            {
              ...(map.get(row.id) || {}),
              ...row
            }
          );
        }
      }
    );

  return Array.from(
    map.values()
  );
}


function appointmentHasStarted(row) {

  if (!row?.date || !row?.time) {
    return false;
  }

  const timeMap = {
    "8:00 AM": "08:00",
    "9:00 AM": "09:00",
    "10:00 AM": "10:00",
    "11:00 AM": "11:00",
    "1:00 PM": "13:00",
    "2:00 PM": "14:00",
    "3:00 PM": "15:00",
    "4:00 PM": "16:00"
  };

  const normalizedTime =
    timeMap[row.time] ||
    row.time;

  const date = new Date(
    `${row.date}T${normalizedTime}`
  );

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return Date.now() >= date.getTime();
}


function counselingScheduledAtDate(
  row
) {

  if (
    !row?.date ||
    !row?.time
  ) {

    return null;
  }


  const timeMap = {
    "8:00 AM": "08:00",
    "9:00 AM": "09:00",
    "10:00 AM": "10:00",
    "11:00 AM": "11:00",
    "1:00 PM": "13:00",
    "2:00 PM": "14:00",
    "3:00 PM": "15:00",
    "4:00 PM": "16:00"
  };


  const normalizedTime =
    timeMap[
      row.time
    ] ||
    row.time;


  const scheduledAt =
    new Date(
      `${row.date}T${normalizedTime}`
    );


  return Number.isNaN(
    scheduledAt.getTime()
  )
    ? null
    : scheduledAt;
}


// ======================================================
// DASHBOARD ACCESS
// Student / Teaching / Non-teaching users do not use Dashboard.
// Counselor and Super Admin keep Dashboard access.
// ======================================================

function DashboardRoute() {

  return <Dashboard />;
}


// ======================================================
// DASHBOARD
// ======================================================

function Dashboard() {

  const { user } =
    useAuth();


  const navigate =
    useNavigate();


  const isSuperAdmin =
    user.role === "super_admin";


  const isCounselor =
    user.role === "counselor";


  // The server RPC returns only assessments belonging to the active
  // assigned counselor (or Super Admin). Do not filter by college here:
  // transferred students may belong to another college.
  const assessmentFilters =
    isSuperAdmin || isCounselor
      ? {}
      : {
          disabled:
            true
        };


  const consultationFilters =
    isSuperAdmin
      ? {}
      : isCounselor
        ? {
            department:
              user.department
          }
        : {
            disabled:
              true
          };


  const referralFilters =
    isSuperAdmin
      ? {}
      : isCounselor
        ? { assignedCounselorId: user.id }
        : { disabled: true };


  const assessments =
    useRows(
      "assessments",
      assessmentFilters
    );


  const consultations =
    useRows(
      "consultations",
      consultationFilters
    );


  // Counselor-specific consultation query used for the dashboard appointment total.
  // This follows the actual assigned counselor, so transferred appointments from
  // another college are still counted correctly.
  const assignedDashboardConsultations =
    useRows(
      "consultations",
      isCounselor
        ? {
            assignedCounselorId:
              user.id
          }
        : {
            disabled:
              true
          }
    );


  const referrals =
    useRows(
      "referrals",
      referralFilters
    );


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
        : isSuperAdmin
          ? {
              status:
                "Pending approval"
            }
          : {
              disabled:
                true
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

  async function submitDashboardTransfer(event) {
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


  const userMonitoringRows =
    useRows(
      "assessmentUserViews",
      (
        isCounselor ||
        isSuperAdmin ||
        REFERRAL_USER_ROLE_VALUES.includes(user.role)
      )
        ? {
            disabled:
              true
          }
        : {
            ownerId:
              user.id
          }
    );


  const latestReviewedMonitoring =
    userMonitoringRows.find(
      row =>
        isCounselorReviewedAssessment(
          row
        )
    ) ||
    null;


  const pendingMonitoringCount =
    userMonitoringRows.filter(
      row =>
        !isCounselorReviewedAssessment(
          row
        )
    ).length;



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


  const dashboardLoading =
    rowsAreLoading(
      assessments,
      consultations,
      referrals,
      ...(
        isCounselor
          ? [
              assignedDashboardConsultations,
              pendingTransferRows,
              outgoingTransferRows,
              counselorAccounts
            ]
          : []
      )
    );


  const dashboardError =
    firstRowsError(
      assessments,
      consultations,
      referrals,
      ...(
        isCounselor
          ? [
              assignedDashboardConsultations,
              pendingTransferRows,
              outgoingTransferRows,
              counselorAccounts
            ]
          : []
      )
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

  if (
    (
      isCounselor ||
      isSuperAdmin
    ) &&
    dashboardLoading
  ) {

    return (
      <>
        <PageTitle
          title={
            isSuperAdmin
              ? "Super Admin Dashboard"
              : "Counselor Dashboard"
          }
          subtitle="Live case monitoring and counseling operations"
        />

        <section className="panel">
          <Empty
            text="Loading dashboard data..."
          />
        </section>
      </>
    );
  }


  if (
    (
      isCounselor ||
      isSuperAdmin
    ) &&
    dashboardError
  ) {

    return (
      <>
        <PageTitle
          title={
            isSuperAdmin
              ? "Super Admin Dashboard"
              : "Counselor Dashboard"
          }
          subtitle="Live case monitoring and counseling operations"
        />

        <div className="error-box">
          {dashboardError}
          <br />
          Dashboard totals are unavailable until the data loads successfully.
        </div>
      </>
    );
  }


  const ownAssessments =
    assessments;


  const ownConsultations =
    consultations;


  const departmentCases =
    assessments;


  if (
    [
      "counselor",
      "super_admin"
    ].includes(
      user.role
    )
  ) {

    const severe =
      departmentCases.filter(
        x =>
          x.priority ===
          "Severe"
      ).length;


    const extremelySevere =
      departmentCases.filter(
        x =>
          x.priority ===
          "Extremely Severe"
      ).length;


    // Count only real scheduled counseling sessions.
    // Counselors see only sessions assigned to them; Super Admin sees all.
    const appointmentRows =
      isSuperAdmin
        ? consultations
        : assignedDashboardConsultations;


    const scheduledAppointments =
      appointmentRows.filter(
        row =>
          counselingRequestIsScheduled(
            row?.status
          )
      ).length;


    return (

      <>

        <PageTitle

          title={
            user.role ===
            "super_admin"

              ? "Super Admin Dashboard"

              : "Counselor Dashboard"
          }

          subtitle="Live case monitoring and counseling operations"

        />


        <div className="stat-grid">

          <Stat
            title="Total cases"
            value={
              departmentCases.length
            }
            icon={
              <ClipboardList />
            }
            tone="primary"
          />


          <Stat
            title="Severe"
            value={severe}
            icon={
              <AlertTriangle />
            }
            tone="severe"
          />


          <Stat
            title="Extremely Severe"
            value={extremelySevere}
            icon={
              <Clock3 />
            }
            tone="extreme"
          />


          <Stat
            title="Scheduled appointments"
            value={
              scheduledAppointments
            }
            icon={
              <Calendar />
            }
            tone="info"
          />

        </div>


        {isCounselor && (
          <section className="panel" style={{ maxWidth: "100%" }}>
            <h2>One-Time Counselor Transfer</h2>
            <p>Transfer a currently assigned student once. The receiving counselor must approve before the assignment changes.</p>
            <form onSubmit={submitDashboardTransfer} style={{ display: "grid", gap: 12, maxWidth: 680 }}>
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


        <section className="panel">

          <h2>
            Recent cases
          </h2>


          <CaseTable
            rows={
              departmentCases.slice(
                0,
                8
              )
            }
          />

        </section>

      </>

    );

  }


  // Teaching / Non-teaching users are referral staff, not assessment or
  // counseling-request clients. Keep their Home focused on referral work.
  if (REFERRAL_USER_ROLE_VALUES.includes(user.role)) {
    return (
      <>
        <PageTitle
          title={`Welcome, ${user.name}`}
          subtitle="Submit and track guidance referrals."
        />
        <section className="panel">
          <h2>Guidance Referral Services</h2>
          <p>
            Teaching and Non-teaching accounts can submit and follow up
            referrals. Psychological assessments and counseling requests
            are available to Student accounts only.
          </p>
          <div className="action-grid">
            <ActionLink
              href="/referrals"
              title="Referrals"
              text="Submit a guidance referral or check its status."
              icon={UserPlus}
            />
            <ActionLink
              href="/notifications"
              title="Notifications"
              text="See referral updates from the assigned counselor."
              icon={Bell}
            />
            <ActionLink
              href="/history"
              title="History"
              text="Review your existing MindTrack activity."
              icon={Clock3}
            />
            <ActionLink
              href="/feedback"
              title="Ratings & Feedback"
              text="Share your feedback on MindTrack."
              icon={Star}
            />
            <ActionLink
              href="/profile"
              title="Profile"
              text="View and update your personal contact information."
              icon={User}
            />
          </div>
        </section>
      </>
    );
  }

  return (

    <>

      <PageTitle

        title={
          `Welcome, ${user.name}`
        }

        subtitle="Access your MindTrack services and personal wellness tools."

      />


      <section
        className={
          `panel home-monitoring-summary-panel ${
            assessmentPriorityOutlineClassName(
              latestReviewedMonitoring?.priority
            )
          }`
        }
      >

        <div className="home-monitoring-summary-heading">

          <div>

            <span className="home-monitoring-kicker">
              Mental Health Monitoring
            </span>

            <h2>
              Your Monitoring Summary
            </h2>

            <p>
              This shows counselor-reviewed monitoring information only.
              Detailed psychological assessment scores and answers stay private.
            </p>

          </div>


          <Activity
            size={30}
            aria-hidden="true"
          />

        </div>


        {userMonitoringRows.loading

          ? (

            <div className="home-monitoring-empty">
              Loading your monitoring summary...
            </div>

          )

          : userMonitoringRows.error

            ? (

              <div className="home-monitoring-empty">
                Your monitoring summary is temporarily unavailable. You can
                still open the Monitoring page from the menu.
              </div>

            )

            : latestReviewedMonitoring

              ? (

                <div className="home-monitoring-summary-content">

                  <div className="home-monitoring-summary-main">

                    <div>

                      <span>
                        Current Monitoring Severity
                      </span>

                      <strong>
                        {
                          latestReviewedMonitoring.priority ||
                          "Not available"
                        }
                      </strong>

                    </div>


                    <span
                      className={
                        priorityClassName(
                          latestReviewedMonitoring.priority
                        )
                      }
                    >
                      {
                        latestReviewedMonitoring.priority ||
                        "No severity"
                      }
                    </span>

                  </div>


                  <div className="home-monitoring-summary-grid">

                    <div>

                      <span>
                        Review Status
                      </span>

                      <strong>
                        {
                          assessmentCaseStatusDisplayLabel(
                            latestReviewedMonitoring.status
                          )
                        }
                      </strong>

                    </div>


                    <div>

                      <span>
                        Reviewed By
                      </span>

                      <strong>
                        {
                          latestReviewedMonitoring.reviewedByName ||
                          "Guidance Counselor"
                        }
                      </strong>

                    </div>


                    <div>

                      <span>
                        Latest Reviewed Assessment
                      </span>

                      <strong>
                        {
                          formatRecordDateTime(
                            latestReviewedMonitoring.createdAt
                          )
                        }
                      </strong>

                    </div>

                  </div>


                  {latestReviewedMonitoring.recommendation && (

                    <div className="home-monitoring-recommendation">

                      <span>
                        Monitoring Recommendation
                      </span>

                      <p>
                        {
                          latestReviewedMonitoring.recommendation
                        }
                      </p>

                    </div>

                  )}


                  {pendingMonitoringCount >
                    0 && (

                    <div className="home-monitoring-pending-note">
                      {
                        pendingMonitoringCount
                      }
                      {" "}
                      assessment
                      {
                        pendingMonitoringCount ===
                          1
                          ? ""
                          : "s"
                      }
                      {" "}
                      still waiting for counselor review.
                    </div>

                  )}


                  <button
                    type="button"
                    className="primary-button home-monitoring-button"
                    onClick={
                      () =>
                        navigate(
                          "/monitoring"
                        )
                    }
                  >
                    View full monitoring
                  </button>

                </div>

              )

              : (

                <div className="home-monitoring-empty">

                  <strong>
                    No counselor-reviewed monitoring summary yet.
                  </strong>

                  <p>
                    {
                      pendingMonitoringCount >
                        0
                        ? "Your assessment has been submitted and is waiting for counselor review."
                        : "Complete a psychological assessment to begin your MindTrack monitoring history."
                    }
                  </p>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={
                      () =>
                        navigate(
                          pendingMonitoringCount >
                            0
                            ? "/monitoring"
                            : "/assessment"
                        )
                    }
                  >
                    {
                      pendingMonitoringCount >
                        0
                        ? "Open Monitoring"
                        : "Take an assessment"
                    }
                  </button>

                </div>

              )
        }

      </section>


      <section className="panel">

        <h2>
          Quick Actions
        </h2>


        <div className="action-grid">

          <ActionLink
            href="/assessment"
            title="Assessment"
            text="Complete your guided psychological screening."
            icon={ClipboardList}
          />


          <ActionLink
            href="/consultations"
            title="Counseling"
            text="Request counseling and manage your submitted requests."
            icon={MessageCircle}
          />


          {REFERRAL_USER_ROLE_VALUES.includes(
            user.role
          ) && (

            <ActionLink
              href="/referrals"
              title="Referrals"
              text="Refer a student or employee who may benefit from guidance support."
              icon={UserPlus}
            />

          )}


          <ActionLink
            href="/history"
            title="History"
            text="View your previous assessments and MindTrack activity."
            icon={Clock3}
          />


          <ActionLink
            href="/feedback"
            title="Ratings & Feedback"
            text="Rate your MindTrack experience and submit feedback."
            icon={Star}
          />


          <ActionLink
            href="/profile"
            title="Profile"
            text="View and update your personal contact information."
            icon={User}
          />

        </div>

      </section>

    </>

  );
}


// ======================================================
// ASSESSMENT
// ======================================================

function Assessment() {

  const { user } =
    useAuth();


  // Restore answers and the current section from Supabase, with a
  // short-lived same-tab cache for immediate refresh recovery.
  const {
    answers,
    setAnswers,
    phq9Difficulty,
    setPhq9Difficulty,
    notes,
    setNotes,
    assessmentPageIndex,
    setAssessmentPageIndex,
    draftLoading,
    draftSyncStatus,
    draftError,
    flushDraft,
    clearDraft
  } = useAssessmentDraft(user.id);


  const [saved, setSaved] =
    useState(null);


  const assessmentLocks =
    useDocumentRow(
      "assessmentLocks",
      user.id
    );


  const assessmentLock =
    assessmentLocks[0] ||
    null;


  const activeAssessment =
    Boolean(
      assessmentLock &&
      ![
        "Eligible",
        "Concluded"
      ].includes(
        assessmentLock.status
      )
    );


  const assessmentEligibilityLoading =
    rowsAreLoading(
      assessmentLocks
    );


  const assessmentEligibilityError =
    firstRowsError(
      assessmentLocks
    );


  const assessmentLockMissing =
    !assessmentEligibilityLoading &&
    !assessmentEligibilityError &&
    !assessmentLock;


  // Only an unfinished assessment blocks a new one.
  // A concluded assessment has no waiting period.
  const assessmentBlocked =
    Boolean(
      assessmentLockMissing ||
      activeAssessment
    );


  const answeredQuestionCount =
    scoredQuestionIds.filter(
      questionId =>
        answers[
          questionId
        ] !== undefined
    ).length;


  const totalQuestionCount =
    scoredQuestionIds.length;


  const assessmentProgress =
    totalQuestionCount
      ? Math.round(
          (
            answeredQuestionCount /
            totalQuestionCount
          ) * 100
        )
      : 0;


  function answerQuestion(
    questionId,
    value
  ) {

    setAnswers(
      current => ({
        ...current,
        [questionId]:
          value
      })
    );
  }


  const assessmentPages = [
    {
      code:
        "WHO-5",

      title:
        WHO5_TITLE,

      description:
        "Think about the last two weeks. For each statement, choose the answer that is closest to how often you felt that way.",

      questions:
        who5Questions,

      choices:
        who5Choices
    },

    {
      code:
        "PHQ-9",

      title:
        PHQ9_TITLE,

      description:
        "Think about the last 2 weeks. For each problem below, choose how often it bothered you.",

      questions:
        phq9Questions,

      choices:
        phq9Choices
    },

    {
      code:
        "GAD-7",

      title:
        GAD7_TITLE,

      description:
        "Think about the last 2 weeks. For each problem below, choose how often it bothered you.",

      questions:
        gad7Questions,

      choices:
        gad7Choices
    },

    {
      code:
        "DASS-21",

      title:
        DASS21_TITLE,

      description:
        "Think about the past week. Read each statement and choose the answer that best shows how much it applied to you.",

      questions:
        dass21Questions,

      choices:
        dass21Choices
    },

    {
      code:
        "Review",

      title:
        "Review and Submit",

      description:
        "Review the completion of all four screening tools, add optional notes if needed, then submit your psychological assessment.",

      questions:
        null,

      choices:
        null
    }
  ];


  const assessmentPageCount =
    assessmentPages.length;


  const currentAssessmentPage =
    assessmentPages[
      assessmentPageIndex
    ];


  function assessmentPageAnsweredCount(
    questions
  ) {

    if (
      !Array.isArray(
        questions
      )
    ) {

      return 0;
    }


    return questions.filter(
      question =>
        answers[
          question.id
        ] !== undefined
    ).length;
  }


  function assessmentPageComplete(
    questions
  ) {

    return Boolean(
      Array.isArray(
        questions
      ) &&
      questions.length > 0 &&
      assessmentPageAnsweredCount(
        questions
      ) ===
        questions.length
    );
  }


  function moveAssessmentPage(
    nextPageIndex
  ) {

    const safePageIndex =
      Math.min(
        assessmentPageCount - 1,
        Math.max(
          0,
          nextPageIndex
        )
      );


    setAssessmentPageIndex(
      safePageIndex
    );

    // The scroll is performed after React renders the next section.
    // The old window.scrollTo() ran before the section was mounted.
    void flushDraft().catch((error) => {
      console.warn("Assessment draft could not sync yet:", error);
    });
  }


  // Scroll the newly rendered section into view (including the first
  // question), leaving room for MindTrack's sticky progress/header.
  useEffect(() => {
    if (draftLoading || assessmentBlocked) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const section = document.querySelector(".assessment-page-card");
      if (!section) return;

      const progress = document.querySelector(".assessment-sticky-progress");
      const progressHeight = progress?.getBoundingClientRect().height || 0;
      const stickyTop = window.matchMedia("(max-width: 620px)").matches
        ? 62
        : 72;
      section.style.scrollMarginTop = `${progressHeight + stickyTop + 18}px`;
      section.scrollIntoView({ block: "start", behavior: "instant" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [assessmentPageIndex, draftLoading, assessmentBlocked]);


  function goToPreviousAssessmentPage() {

    moveAssessmentPage(
      assessmentPageIndex - 1
    );
  }


  function goToNextAssessmentPage() {

    if (
      !currentAssessmentPage
        ?.questions
    ) {

      return;
    }


    if (
      !assessmentPageComplete(
        currentAssessmentPage.questions
      )
    ) {

      const answered =
        assessmentPageAnsweredCount(
          currentAssessmentPage.questions
        );


      alert(
        `Please answer all questions in ${currentAssessmentPage.code} before continuing. ${answered} of ${currentAssessmentPage.questions.length} answered.`
      );

      return;
    }


    if (
      currentAssessmentPage.code ===
        "PHQ-9"
    ) {

      const phqHasProblems =
        phq9Questions.some(
          question =>
            Number(
              answers[
                question.id
              ] ?? 0
            ) > 0
        );


      if (
        phqHasProblems &&
        !phq9Difficulty
      ) {

        alert(
          "Please answer the PHQ-9 difficulty question before continuing."
        );

        return;
      }
    }


    moveAssessmentPage(
      assessmentPageIndex + 1
    );
  }


  function phqDifficultyDisplay(
    option
  ) {

    const simpleMeanings = {

      "Not difficult at all":
        "I can still do my usual activities normally",

      "Somewhat difficult":
        "Some usual activities are harder",

      "Very difficult":
        "Many usual activities are hard",

      "Extremely difficult":
        "My usual activities are very hard to do"

    };


    return simpleMeanings[
      option
    ]
      ? `${option} — ${simpleMeanings[option]}`
      : option;
  }


  function renderInstrumentQuestions(
    questionsList,
    choicesList
  ) {

    return questionsList.map(
      (question, index) => (

        <div
          className="question"
          key={
            question.id
          }
        >

          <strong>

            {index + 1}.
            {" "}
            {question.text}

          </strong>


          <div
            className={
              choicesList.length >= 4
                ? "choice-row assessment-choice-row-wide"
                : "choice-row"
            }
          >

            {choicesList.map(
              choice => (

                <label

                  key={
                    `${question.id}-${choice.value}`
                  }

                  className={
                    answers[
                      question.id
                    ] ===
                    choice.value

                      ? "choice selected"

                      : "choice"
                  }

                >

                  <input

                    type="radio"

                    name={
                      question.id
                    }

                    value={
                      choice.value
                    }

                    checked={
                      answers[
                        question.id
                      ] ===
                      choice.value
                    }

                    onChange={
                      () =>
                        answerQuestion(
                          question.id,
                          choice.value
                        )
                    }

                  />

                  <span className="assessment-choice-text">

                    <span className="assessment-choice-label">
                      {choice.label}
                    </span>


                    {choice.helper && (

                      <small className="assessment-choice-helper">
                        {choice.helper}
                      </small>

                    )}

                  </span>

                </label>

              )
            )}

          </div>

        </div>

      )
    );
  }


  async function submit(e) {

    e.preventDefault();


    if (assessmentBlocked) {

      alert(
        activeAssessment
          ? "You already have an active psychological assessment. A new assessment can only be taken after the current assessment is concluded."
          : "Your assessment eligibility record is not ready. Please contact the Guidance Office or Super Admin."
      );

      return;
    }


    const answeredScoredQuestions =
      scoredQuestionIds.filter(
        questionId =>
          answers[
            questionId
          ] !== undefined
      ).length;


    if (
      answeredScoredQuestions !==
      scoredQuestionIds.length
    ) {

      alert(
        "Please answer every WHO-5, PHQ-9, GAD-7, and DASS-21 question."
      );

      return;
    }


    const phqHasProblems =
      phq9Questions.some(
        question =>
          Number(
            answers[
              question.id
            ] ?? 0
          ) > 0
      );


    if (
      phqHasProblems &&
      !phq9Difficulty
    ) {

      alert(
        "Please answer the PHQ-9 difficulty question."
      );

      return;
    }


    const result =
      calculateAssessment(
        answers,
        phq9Difficulty
      );


    const record = {

      ownerId:
        user.id,

      ownerName:
        user.name,

      role:
        user.role,

      department:
        user.department,

      program:
        user.program || "",

      assessmentVersion:
        "WHO5-PHQ9-GAD7-DASS21-SUBSCALES-2026-09",

      instrumentTitles: [
        WHO5_TITLE,
        PHQ9_TITLE,
        GAD7_TITLE,
        DASS21_TITLE
      ],

      answers,

      phq9Difficulty:
        phq9Difficulty ||
        "Not applicable",

      notes,

      ...result,

      status:
        "For review"

    };


    try {

      // Wait for any pending autosave before submitting the final result.
      // The submission RPC remains authoritative even if draft sync fails.
      try {
        await flushDraft();
      } catch (draftSaveError) {
        console.warn("Draft sync failed before submission:", draftSaveError);
      }

      const assessmentId =
        await submitAssessment(record);


      console.log(
        "Supabase assessment created:",
        assessmentId
      );

      // The database trigger also clears the cloud draft atomically.
      // Clear the browser cache and any outstanding save queue here.
      try {
        await clearDraft();
      } catch (draftClearError) {
        console.warn("Could not finish draft cleanup:", draftClearError);
      }

      setSaved({

        assessmentId,

        priority:
          result.priority,

        recommendation:
          result.recommendation,

        safetyFlag:
          result.safetyFlag

      });


    } catch (
      assessmentError
    ) {

      console.error(
        "Psychological assessment submission error:",
        assessmentError
      );


      alert(
        assessmentError?.message ||
        "Unable to submit the psychological assessment."
      );
    }

  }


  if (saved) {

    return (

      <div className="result-card standardized-result-card">

        <CheckCircle2
          size={58}
        />


        <h1>
          Psychological assessment submitted
        </h1>


        <div
          className={
            `${priorityClassName(
              saved.priority
            )} big`
          }
        >
          {saved.priority}
          {" "}
          monitoring severity
        </div>


        <div className="notice">

          Your assessment was submitted successfully.
          Individual WHO-5, PHQ-9, GAD-7, and DASS-21 scores
          are intentionally not displayed on this page.
          The detailed item-level screening answers are shown
          only to the assigned Guidance Counselor for review.

        </div>


        <p className="assessment-monitoring-recommendation">
          {saved.recommendation}
        </p>


        <div className="notice">

          WHO-5, PHQ-9, GAD-7, and DASS-21 are screening tools.
          These results do not provide a medical diagnosis.
          The monitoring severity label follows the standardized
          severity labels in the scoring guide. WHO-5 is shown using
          its suggested well-being cut-off because the guide does not
          define Mild, Moderate, or Severe categories for WHO-5.

        </div>


        {saved.safetyFlag && (

          <div className="critical-notice">

            Your PHQ-9 response indicates that a counselor should
            review the safety-related item promptly. If you are in
            immediate danger or may act on thoughts of self-harm,
            contact local emergency services or a trusted person nearby.

          </div>

        )}

      </div>

    );

  }


  if (
    assessmentEligibilityLoading
  ) {

    return (
      <>
        <PageTitle
          title="Psychological Assessment"
          subtitle="Checking whether a new psychological assessment is currently available."
        />

        <section className="panel">
          <Empty
            text="Checking assessment eligibility..."
          />
        </section>
      </>
    );
  }


  if (
    assessmentEligibilityError
  ) {

    return (
      <>
        <PageTitle
          title="Psychological Assessment"
          subtitle="Psychological assessment availability could not be checked."
        />

        <div className="error-box">
          {assessmentEligibilityError}
        </div>
      </>
    );
  }


  if (assessmentBlocked) {

    const blockedStatus =
      activeAssessment
        ? (assessmentLock?.status || "Active assessment")
        : "Eligibility unavailable";


    return (
      <>
        <PageTitle
          title="Psychological Assessment"
          subtitle="MindTrack limits repeated assessments to prevent duplicate or spam submissions."
        />

        <section
          className="panel"
          style={{
            width: "100%",
            maxWidth: "950px",
            boxSizing: "border-box",
            marginLeft: "auto",
            marginRight: "auto"
          }}
        >

          <h2>
            New assessment temporarily unavailable
          </h2>


          <p>
            Current status:
            {" "}
            <strong>
              {blockedStatus}
            </strong>
          </p>


          {activeAssessment && (

            <div className="notice">

              You already have a psychological assessment that is still active.
              A new assessment cannot be started while the current assessment is
              waiting for review, approved, recommended for counseling/follow-up,
              or otherwise not yet terminated.

            </div>

          )}


          {assessmentLockMissing && (

            <div className="error-box">

              Your assessment eligibility record has not been initialized yet.
              Ask the Super Admin to run the assessment-lock migration before
              taking a new assessment.

            </div>

          )}

        </section>
      </>
    );
  }


  if (draftLoading) {
    return (
      <>
        <PageTitle
          title="Psychological Assessment"
          subtitle="Restoring your saved answers and assessment section."
        />
        <section className="panel assessment-page-shell">
          <Empty text="Loading your saved assessment draft..." />
        </section>
      </>
    );
  }


  return (

    <>

      <PageTitle

        title="Psychological Assessment"

        subtitle="Complete the screening tools one section at a time. Only one assessment section is shown per page to keep the process clear and easy to follow."

      />


      <div className="assessment-confidentiality-note assessment-page-shell">

        <Shield size={22} aria-hidden="true" />

        <div>
          <strong>Confidentiality Assurance</strong>

          <p>
            Your psychological assessment answers will be kept confidential.
            Your item-level answers are shown only to your assigned Guidance
            Counselor for assessment review, mental health monitoring, and
            counseling support.
          </p>
        </div>

      </div>


      <div
        className="assessment-simple-guide assessment-page-shell"
      >

        <strong>
          How to answer
        </strong>

        <p>
          Read each statement, think about the time period shown for the
          current assessment, then choose the answer that best matches your
          experience. A short hint may appear underneath some choices to make
          the response easier to understand.
        </p>

      </div>


      <section
        className="panel assessment-sticky-progress assessment-page-shell"
        aria-label="Assessment progress"
      >

        <div className="assessment-page-progress-heading">

          <div>

            <strong>
              Assessment Progress
            </strong>

            <small>
              {answeredQuestionCount}
              {" "}
              of
              {" "}
              {totalQuestionCount}
              {" "}
              questions answered
            </small>
            <small className="assessment-draft-status" role="status">
              {draftSyncStatus === "saving"
                ? "Saving answers..."
                : draftSyncStatus === "saved"
                  ? "Answers saved"
                  : draftSyncStatus === "error"
                    ? "Saved in this tab; cloud sync unavailable"
                    : "Autosave enabled"}
            </small>

          </div>


          <div className="assessment-page-progress-meta">

            <span>
              Section
              {" "}
              {assessmentPageIndex + 1}
              {" "}
              of
              {" "}
              {assessmentPageCount}
            </span>

            <strong>
              {assessmentProgress}%
            </strong>

          </div>

        </div>


        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={assessmentProgress}
          aria-label="Overall psychological assessment completion"
          className="assessment-page-progress-track"
        >

          <div
            className="assessment-page-progress-fill"
            style={{
              width:
                `${Math.min(
                  100,
                  Math.max(
                    0,
                    assessmentProgress
                  )
                )}%`
            }}
          />

        </div>


        <div
          className="assessment-page-stepper"
          aria-label="Psychological assessment sections"
        >

          {assessmentPages.map(
            (
              page,
              index
            ) => {

              const isCurrent =
                index ===
                assessmentPageIndex;


              const isReview =
                page.code ===
                "Review";


              const isComplete =
                isReview
                  ? assessmentProgress ===
                    100
                  : assessmentPageComplete(
                      page.questions
                    );


              return (

                <div
                  key={
                    page.code
                  }
                  className={
                    [
                      "assessment-page-step",

                      isCurrent
                        ? "current"
                        : "",

                      isComplete
                        ? "complete"
                        : ""
                    ]
                      .filter(Boolean)
                      .join(" ")
                  }
                  aria-current={
                    isCurrent
                      ? "step"
                      : undefined
                  }
                >

                  <span className="assessment-page-step-number">
                    {
                      isComplete &&
                      !isCurrent
                        ? "✓"
                        : index + 1
                    }
                  </span>

                  <span className="assessment-page-step-label">
                    {page.code}
                  </span>

                </div>

              );
            }
          )}

        </div>

      </section>


      {draftError && (
        <div className="notice assessment-page-shell" role="alert">
          Cloud autosave is temporarily unavailable. Your answers are kept
          in this browser tab while you remain signed in. Please check your
          connection or Supabase setup before closing the tab.
        </div>
      )}

      <form
        className="assessment-form standardized-assessment-form assessment-page-shell assessment-paged-form"
        onSubmit={submit}
      >

        <div
          className="assessment-page-indicator"
          aria-live="polite"
        >

          <span>
            Section
            {" "}
            {assessmentPageIndex + 1}
            {" "}
            of
            {" "}
            {assessmentPageCount}
          </span>

          <strong>
            {currentAssessmentPage.code}
          </strong>

        </div>


        {assessmentPageIndex === 0 && (

          <section className="panel assessment-instrument-card assessment-page-card">

            <div className="assessment-instrument-heading">

              <div>

                <span className="assessment-instrument-code">
                  WHO-5
                </span>

                <h2>
                  {WHO5_TITLE}
                </h2>

              </div>

            </div>


            <p className="assessment-instructions">
              {assessmentPages[0].description}
            </p>


            {
              renderInstrumentQuestions(
                who5Questions,
                who5Choices
              )
            }


            <div className="assessment-source-note">

              Source: World Health Organization. The World Health
              Organization-Five Well-Being Index (WHO-5), 2024.
              License: CC BY-NC-SA 3.0 IGO.

              <br />
              <br />

              MindTrack keeps the detailed result for authorized
              counselor review rather than displaying the score here.

            </div>


            <div className="assessment-page-actions assessment-page-actions-end">

              <button
                type="button"
                className="primary-button"
                onClick={
                  goToNextAssessmentPage
                }
              >
                Next: PHQ-9
              </button>

            </div>

          </section>

        )}


        {assessmentPageIndex === 1 && (

          <section className="panel assessment-instrument-card assessment-page-card">

            <div className="assessment-instrument-heading">

              <div>

                <span className="assessment-instrument-code">
                  PHQ-9
                </span>

                <h2>
                  {PHQ9_TITLE}
                </h2>

              </div>

            </div>


            <p className="assessment-instructions">
              {assessmentPages[1].description}
            </p>


            {
              renderInstrumentQuestions(
                phq9Questions,
                phq9Choices
              )
            }


            <label className="assessment-difficulty-field">

              If you checked any problems, how difficult have these
              problems made it for you to do your work, take care of
              things at home, or get along with other people?

              <small className="assessment-field-helper">
                Choose the answer that best describes how much the problems
                affected your usual daily activities.
              </small>

              <select

                value={
                  phq9Difficulty
                }

                onChange={
                  event =>
                    setPhq9Difficulty(
                      event.target.value
                    )
                }

              >

                <option value="">
                  Choose an answer
                </option>


                {phq9DifficultyChoices.map(
                  option => (

                    <option
                      key={option}
                      value={option}
                    >
                      {
                        phqDifficultyDisplay(
                          option
                        )
                      }
                    </option>

                  )
                )}

              </select>

            </label>


            <div className="assessment-source-note">

              The PHQ-9 response set and functional difficulty response
              are recorded for authorized counselor review.

              <br />
              <br />

              Individual scoring details are intentionally not displayed
              while the user is completing the assessment.

            </div>


            <div className="assessment-page-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={
                  goToPreviousAssessmentPage
                }
              >
                Previous
              </button>


              <button
                type="button"
                className="primary-button"
                onClick={
                  goToNextAssessmentPage
                }
              >
                Next: GAD-7
              </button>

            </div>

          </section>

        )}


        {assessmentPageIndex === 2 && (

          <section className="panel assessment-instrument-card assessment-page-card">

            <div className="assessment-instrument-heading">

              <div>

                <span className="assessment-instrument-code">
                  GAD-7
                </span>

                <h2>
                  {GAD7_TITLE}
                </h2>

              </div>

            </div>


            <p className="assessment-instructions">
              {assessmentPages[2].description}
            </p>


            {
              renderInstrumentQuestions(
                gad7Questions,
                gad7Choices
              )
            }


            <div className="assessment-source-note">

              The GAD-7 responses are recorded for authorized
              counselor review and monitoring.

              <br />
              <br />

              Individual scoring details are intentionally not displayed
              while the user is completing the assessment.

            </div>


            <div className="assessment-page-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={
                  goToPreviousAssessmentPage
                }
              >
                Previous
              </button>


              <button
                type="button"
                className="primary-button"
                onClick={
                  goToNextAssessmentPage
                }
              >
                Next: DASS-21
              </button>

            </div>

          </section>

        )}


        {assessmentPageIndex === 3 && (

          <section className="panel assessment-instrument-card assessment-page-card">

            <div className="assessment-instrument-heading">

              <div>

                <span className="assessment-instrument-code">
                  DASS-21
                </span>

                <h2>
                  {DASS21_TITLE}
                </h2>

              </div>

            </div>


            <p className="assessment-instructions">
              {assessmentPages[3].description}
            </p>


            {
              renderInstrumentQuestions(
                dass21Questions,
                dass21Choices
              )
            }


            <div className="assessment-source-note">

              DASS-21 covers depression, anxiety, and stress response areas.
              MindTrack records the responses for authorized counselor review.

              <br />
              <br />

              Individual scoring details are intentionally not displayed
              while the user is completing the assessment.

            </div>


            <div className="assessment-page-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={
                  goToPreviousAssessmentPage
                }
              >
                Previous
              </button>


              <button
                type="button"
                className="primary-button"
                onClick={
                  goToNextAssessmentPage
                }
              >
                Review answers
              </button>

            </div>

          </section>

        )}


        {assessmentPageIndex === 4 && (

          <section className="panel assessment-final-section assessment-page-card">

            <div className="assessment-instrument-heading">

              <div>

                <span className="assessment-instrument-code">
                  Review
                </span>

                <h2>
                  Review and Submit
                </h2>

              </div>

            </div>


            <p className="assessment-instructions">
              Check that all four assessment sections are complete before
              submitting. Individual scores remain hidden from this page.
            </p>


            <div className="assessment-page-review-grid">

              {assessmentPages
                .slice(
                  0,
                  4
                )
                .map(
                  (
                    page,
                    index
                  ) => {

                    const answered =
                      assessmentPageAnsweredCount(
                        page.questions
                      );


                    const complete =
                      assessmentPageComplete(
                        page.questions
                      );


                    return (

                      <button
                        key={
                          page.code
                        }
                        type="button"
                        className={
                          complete
                            ? "assessment-page-review-item complete"
                            : "assessment-page-review-item"
                        }
                        onClick={
                          () =>
                            moveAssessmentPage(
                              index
                            )
                        }
                      >

                        <span>
                          {page.code}
                        </span>

                        <strong>
                          {answered}
                          /
                          {page.questions.length}
                          {" "}
                          answered
                        </strong>

                        <small>
                          {
                            complete
                              ? "Complete"
                              : "Needs attention"
                          }
                        </small>

                      </button>

                    );
                  }
                )
              }

            </div>


            <label>

              Additional notes
              {" "}

              <span className="optional-text">
                (Optional)
              </span>


              <textarea

                value={notes}

                onChange={
                  e =>
                    setNotes(
                      e.target.value
                    )
                }

                rows="4"

                placeholder="Share information that may help the counselor understand your concern."

              />

            </label>


            <div className="notice">

              Please review your answers before submitting.
              MindTrack uses these tools for screening and monitoring
              support only. Results are not a diagnosis.

            </div>


            <div className="assessment-page-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={
                  goToPreviousAssessmentPage
                }
              >
                Previous
              </button>


              <button
                type="submit"
                className="primary-button"
                disabled={
                  assessmentProgress !==
                  100
                }
              >
                Submit psychological assessment
              </button>

            </div>

          </section>

        )}


      </form>

    </>

  );


}


// ======================================================
// COUNSELING DATE AND TIME AVAILABILITY
// ======================================================

const COUNSELING_TIME_SLOTS = [
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM"
];


function counselingSlotDocumentId(
  counselorId,
  date,
  time
) {

  return [
    String(
      counselorId || ""
    ).trim(),

    String(
      date || ""
    ).trim(),

    String(
      time || ""
    ).trim()
  ].join("__");
}


function activeCounselingSlotState(
  value
) {

  return [
    "held",
    "booked"
  ].includes(
    String(
      value || ""
    ).trim()
  );
}


const TERMINAL_COUNSELING_REQUEST_STATUSES = [
  "Terminated",
  "Cancelled",

  // Legacy values are still recognized during migration.
  "Concluded",
  "Canceled"
];


function normalizeCounselingRequestStatus(
  status
) {

  const value =
    String(
      status ||
      ""
    ).trim();


  if (
    value ===
    "Schedule for counseling"
  ) {

    return "Scheduled for counseling";
  }


  if (
    value ===
    "Follow up is recommended"
  ) {

    return "Follow up Counseling is recommended";
  }


  if (
    value ===
    "Concluded"
  ) {

    return "Terminated";
  }


  return value;
}


function counselingRequestIsScheduled(
  status
) {

  return [
    "Scheduled for counseling",
    "Rescheduled"
  ].includes(
    normalizeCounselingRequestStatus(
      status
    )
  );
}


function counselingRequestCreatesSession(
  status
) {

  return [
    "Scheduled for counseling",
    "Rescheduled",
    "Terminated"
  ].includes(
    normalizeCounselingRequestStatus(
      status
    )
  );
}


function counselingRequestHiddenFromRequestList(
  status
) {

  return [
    "Scheduled for counseling",
    "Rescheduled",
    "Terminated"
  ].includes(
    normalizeCounselingRequestStatus(
      status
    )
  );
}


function counselingRequestIsTerminal(
  status
) {

  return TERMINAL_COUNSELING_REQUEST_STATUSES.includes(
    normalizeCounselingRequestStatus(
      status
    )
  );
}


function counselingRequestIsActive(
  status
) {

  return !counselingRequestIsTerminal(
    status
  );
}


function counselingRequestStatusIsLocked(
  row,
  currentUser
) {

  return Boolean(
    currentUser?.role ===
      "counselor" &&
    normalizeCounselingRequestStatus(
      row?.status
    ) ===
      "Terminated"
  );
}


function superAdminDeleteConfirmed(
  recordLabel,
  ownerName
) {

  const confirmation =
    window.prompt(
      `Permanent Super Admin cleanup\n\nThis will permanently remove the selected ${recordLabel} and related test/erroneous records.\n\nUser: ${ownerName || "Unknown user"}\n\nType DELETE to continue.`
    );


  return confirmation ===
    "DELETE";
}


function recordTimestampMillis(
  value
) {

  if (!value) {
    return 0;
  }


  if (
    typeof value.toMillis ===
    "function"
  ) {

    return value.toMillis();
  }


  if (
    typeof value.seconds ===
    "number"
  ) {

    return value.seconds *
      1000;
  }


  const parsed =
    new Date(
      value
    ).getTime();


  return Number.isNaN(
    parsed
  )
    ? 0
    : parsed;
}


function newestRecordFirst(
  a,
  b
) {

  return (
    recordTimestampMillis(
      b.createdAt
    ) -
    recordTimestampMillis(
      a.createdAt
    )
  );
}


function counselorProgramLabel(
  value
) {

  const cleanValue =
    String(
      value || ""
    ).trim();


  return cleanValue ||
    "Not provided";
}


function counselorCollegeLabel(
  value
) {

  const cleanValue =
    String(
      value || ""
    ).trim();


  return cleanValue ||
    "Not provided";
}


function counselingUserRoleLabel(
  value
) {

  const role =
    String(
      value ||
      ""
    ).trim();


  if (
    role ===
      "student"
  ) {

    return "Student";
  }


  if (
    role ===
      "teaching" ||
    role ===
      "faculty"
  ) {

    return "Teaching";
  }


  if (
    role ===
      "non_teaching" ||
    role ===
      "personnel"
  ) {

    return "Non-teaching";
  }


  return role ||
    "User";
}


function assessmentCaseStatusLabel(
  value
) {

  const status =
    String(
      value || ""
    ).trim();


  if (
    status ===
    "Schedule for counseling"
  ) {

    return "Counseling is recommended";
  }


  if (
    status ===
    "For referral"
  ) {

    return "Approved";
  }


  return status ||
    "For review";
}


function assessmentCaseStatusDisplayLabel(
  value
) {

  const status =
    assessmentCaseStatusLabel(
      value
    );


  return status ===
    "Concluded"
      ? "Terminated"
      : status;
}


function isCounselorReviewedAssessment(
  row
) {

  return Boolean(
    row &&
    row.reviewed === true &&
    row.reviewedByRole ===
      "counselor" &&
    assessmentCaseStatusLabel(
      row.status
    ) !== "For review"
  );
}


function assessmentTrendMetrics(
  row
) {

  const results =
    row?.instrumentResults;


  if (!results) {
    return [];
  }


  const metrics = [];


  function addMetric(
    key,
    label,
    value,
    higherIsBetter
  ) {

    const numericValue =
      Number(value);


    if (
      Number.isFinite(
        numericValue
      )
    ) {

      metrics.push({
        key,
        label,
        value:
          numericValue,
        higherIsBetter
      });
    }
  }


  addMetric(
    "who5",
    "WHO-5",
    results?.who5
      ?.percentageScore,
    true
  );


  addMetric(
    "phq9",
    "PHQ-9",
    results?.phq9
      ?.totalScore,
    false
  );


  addMetric(
    "gad7",
    "GAD-7",
    results?.gad7
      ?.totalScore,
    false
  );


  if (
    results?.dass21
      ?.depression
  ) {

    addMetric(
      "dass_depression",
      "DASS-21 Depression",
      results.dass21
        .depression
        .adjustedScore,
      false
    );


    addMetric(
      "dass_anxiety",
      "DASS-21 Anxiety",
      results.dass21
        .anxiety
        .adjustedScore,
      false
    );


    addMetric(
      "dass_stress",
      "DASS-21 Stress",
      results.dass21
        .stress
        .adjustedScore,
      false
    );

  } else {

    addMetric(
      "dass_total",
      "DASS-21 Legacy Total",
      results?.dass21
        ?.totalScore,
      false
    );
  }


  return metrics;
}


function compareReviewedAssessmentTrend(
  current,
  previous
) {

  if (
    !current ||
    !previous
  ) {

    return {
      key:
        "insufficient",

      label:
        "Not enough reviewed assessments",

      summary:
        "At least two counselor-reviewed assessments are needed to determine whether the monitoring trend is improving.",

      improved:
        0,

      worsened:
        0,

      unchanged:
        0,

      compared:
        0
    };
  }


  const currentMetrics =
    assessmentTrendMetrics(
      current
    );


  const previousMap =
    new Map(
      assessmentTrendMetrics(
        previous
      ).map(
        metric => [
          metric.key,
          metric
        ]
      )
    );


  let improved = 0;
  let worsened = 0;
  let unchanged = 0;


  currentMetrics.forEach(
    metric => {

      const previousMetric =
        previousMap.get(
          metric.key
        );


      if (!previousMetric) {
        return;
      }


      if (
        metric.value ===
        previousMetric.value
      ) {

        unchanged += 1;
        return;
      }


      const isImprovement =
        metric.higherIsBetter
          ? metric.value >
            previousMetric.value
          : metric.value <
            previousMetric.value;


      if (isImprovement) {

        improved += 1;

      } else {

        worsened += 1;
      }
    }
  );


  const compared =
    improved +
    worsened +
    unchanged;


  if (compared === 0) {

    return {
      key:
        "insufficient",

      label:
        "Not enough comparable results",

      summary:
        "The two reviewed assessments do not contain enough matching scores to determine a monitoring trend.",

      improved,
      worsened,
      unchanged,
      compared
    };
  }


  if (
    improved >
    worsened
  ) {

    return {
      key:
        "improving",

      label:
        "Improving",

      summary:
        `${improved} of ${compared} comparable indicators improved, ${worsened} moved in a less favorable direction, and ${unchanged} stayed the same.`,

      improved,
      worsened,
      unchanged,
      compared
    };
  }


  if (
    worsened >
    improved
  ) {

    return {
      key:
        "not-improving",

      label:
        "Not improving",

      summary:
        `${worsened} of ${compared} comparable indicators moved in a less favorable direction, ${improved} improved, and ${unchanged} stayed the same.`,

      improved,
      worsened,
      unchanged,
      compared
    };
  }


  return {
    key:
      "no-clear-change",

    label:
      "No clear change",

    summary:
      `${improved} of ${compared} comparable indicators improved, ${worsened} moved in a less favorable direction, and ${unchanged} stayed the same.`,

    improved,
    worsened,
    unchanged,
    compared
  };
}


function priorityClassName(
  priority
) {

  const cleanPriority =
    String(
      priority || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );


  return `priority ${
    cleanPriority ||
    "no-assessment"
  }`;
}


function assessmentPriorityOutlineClassName(
  priority
) {

  const cleanPriority =
    String(
      priority || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );


  return `assessment-priority-${
    cleanPriority ||
    "none"
  }`;
}


function counselingTimeMinutes(
  timeText
) {

  const match =
    String(
      timeText || ""
    )
      .trim()
      .match(
        /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
      );


  if (!match) {

    return 24 * 60;
  }


  let hour =
    Number(
      match[1]
    );


  const minute =
    Number(
      match[2]
    );


  const period =
    match[3]
      .toUpperCase();


  if (
    period === "AM" &&
    hour === 12
  ) {

    hour = 0;
  }


  if (
    period === "PM" &&
    hour !== 12
  ) {

    hour += 12;
  }


  return (
    hour * 60 +
    minute
  );
}


function counselingAppointmentSortValue(
  row
) {

  const dateText =
    String(
      row?.date || ""
    ).trim();


  if (!dateText) {

    return Number.MAX_SAFE_INTEGER;
  }


  const dateValue =
    new Date(
      `${dateText}T00:00:00`
    ).getTime();


  if (
    Number.isNaN(
      dateValue
    )
  ) {

    return Number.MAX_SAFE_INTEGER;
  }


  return (
    dateValue +
    counselingTimeMinutes(
      row?.time
    ) *
      60 *
      1000
  );
}


function recordDateObject(
  value
) {

  if (!value) {
    return null;
  }


  if (
    typeof value.toDate ===
    "function"
  ) {

    return value.toDate();
  }


  if (
    typeof value.seconds ===
    "number"
  ) {

    return new Date(
      value.seconds * 1000
    );
  }


  if (
    value instanceof Date
  ) {

    return value;
  }


  const parsed =
    new Date(value);


  return Number.isNaN(
    parsed.getTime()
  )
    ? null
    : parsed;
}


function formatRecordDateTime(
  value
) {

  const date =
    recordDateObject(value);


  if (!date) {
    return "Date not available";
  }


  return date.toLocaleString(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  );
}


const GENERAL_USER_ROLE_VALUES = [
  "student",
  "teaching",
  "non_teaching",

  // Legacy values kept temporarily so older Firestore
  // accounts continue to work until the migration is run.
  "faculty",
  "personnel"
];


const REFERRAL_USER_ROLE_VALUES = [
  "teaching",
  "non_teaching",

  // Legacy compatibility.
  "faculty",
  "personnel"
];


function generalUserRole(
  role
) {

  return GENERAL_USER_ROLE_VALUES.includes(
    String(
      role ||
      ""
    ).trim()
  );
}


function teachingUserRole(
  role
) {

  return [
    "teaching",
    "faculty"
  ].includes(
    String(
      role ||
      ""
    ).trim()
  );
}


function nonTeachingUserRole(
  role
) {

  return [
    "non_teaching",
    "personnel"
  ].includes(
    String(
      role ||
      ""
    ).trim()
  );
}


function systemRoleLabel(
  role
) {

  const cleanRole =
    String(
      role ||
      ""
    )
      .trim()
      .toLowerCase();


  if (
    cleanRole ===
    "student"
  ) {

    return "Student";
  }


  if (
    teachingUserRole(
      cleanRole
    )
  ) {

    return "Teaching";
  }


  if (
    nonTeachingUserRole(
      cleanRole
    )
  ) {

    return "Non-teaching";
  }


  if (
    cleanRole ===
    "counselor"
  ) {

    return "Counselor";
  }


  if (
    cleanRole ===
    "super_admin"
  ) {

    return "Super Admin";
  }


  return role ||
    "—";
}


// National regular and special non-working holidays.
// 2026 dates follow Proclamation No. 1006 plus the
// separately declared Eid'l Fitr and Eid'l Adha holidays.
// 2027 dates follow Proclamation No. 1427.
// Eid holidays for 2027 can be added here once officially declared.
const COUNSELING_HOLIDAYS = {
  "2026-01-01": "New Year's Day",
  "2026-02-17": "Chinese New Year",
  "2026-03-20": "Eid'l Fitr",
  "2026-04-02": "Maundy Thursday",
  "2026-04-03": "Good Friday",
  "2026-04-04": "Black Saturday",
  "2026-04-09": "Araw ng Kagitingan",
  "2026-05-01": "Labor Day",
  "2026-05-27": "Eid'l Adha",
  "2026-06-12": "Independence Day",
  "2026-08-21": "Ninoy Aquino Day",
  "2026-08-31": "National Heroes Day",
  "2026-11-01": "All Saints' Day",
  "2026-11-02": "All Souls' Day",
  "2026-11-30": "Bonifacio Day",
  "2026-12-08": "Feast of the Immaculate Conception of Mary",
  "2026-12-24": "Christmas Eve",
  "2026-12-25": "Christmas Day",
  "2026-12-30": "Rizal Day",
  "2026-12-31": "Last Day of the Year",

  "2027-01-01": "New Year's Day",
  "2027-02-06": "Chinese New Year",
  "2027-03-25": "Maundy Thursday",
  "2027-03-26": "Good Friday",
  "2027-03-27": "Black Saturday",
  "2027-04-09": "Araw ng Kagitingan",
  "2027-05-01": "Labor Day",
  "2027-06-12": "Independence Day",
  "2027-08-21": "Ninoy Aquino Day",
  "2027-08-30": "National Heroes Day",
  "2027-11-01": "All Saints' Day",
  "2027-11-02": "All Souls' Day",
  "2027-11-30": "Bonifacio Day",
  "2027-12-08": "Feast of the Immaculate Conception of Mary",
  "2027-12-24": "Christmas Eve",
  "2027-12-25": "Christmas Day",
  "2027-12-30": "Rizal Day",
  "2027-12-31": "Last Day of the Year"
};


// Convert a local Date object to YYYY-MM-DD without UTC shifting.
function localDateKey(date) {

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");


  return `${year}-${month}-${day}`;
}


function todayDateKey() {

  return localDateKey(
    new Date()
  );
}


function isPastCounselingDate(dateKey) {

  return Boolean(
    dateKey &&
    dateKey < todayDateKey()
  );
}


function counselingHolidayName(dateKey) {

  return (
    COUNSELING_HOLIDAYS[
      dateKey
    ] || ""
  );
}


function isWeekendCounselingDate(dateKey) {

  if (!dateKey) {
    return false;
  }


  const date =
    new Date(
      `${dateKey}T00:00:00`
    );


  const day =
    date.getDay();


  return (
    day === 0 ||
    day === 6
  );
}


function isUnavailableCounselingDate(dateKey) {

  return (
    isPastCounselingDate(
      dateKey
    ) ||
    isWeekendCounselingDate(
      dateKey
    ) ||
    Boolean(
      counselingHolidayName(
        dateKey
      )
    )
  );
}


function CounselingDatePicker({
  value,
  onChange
}) {

  const initialDate =
    value
      ? new Date(
          `${value}T00:00:00`
        )
      : new Date();


  const [
    visibleMonth,
    setVisibleMonth
  ] = useState(
    new Date(
      initialDate.getFullYear(),
      initialDate.getMonth(),
      1
    )
  );


  const year =
    visibleMonth.getFullYear();

  const month =
    visibleMonth.getMonth();


  const firstWeekday =
    new Date(
      year,
      month,
      1
    ).getDay();


  const numberOfDays =
    new Date(
      year,
      month + 1,
      0
    ).getDate();


  const monthName =
    visibleMonth.toLocaleDateString(
      "en-PH",
      {
        month: "long",
        year: "numeric"
      }
    );


  const calendarCells = [];


  for (
    let blank = 0;
    blank < firstWeekday;
    blank += 1
  ) {

    calendarCells.push(
      <div
        key={`blank-${blank}`}
        className="counseling-calendar-empty"
      />
    );
  }


  for (
    let day = 1;
    day <= numberOfDays;
    day += 1
  ) {

    const date =
      new Date(
        year,
        month,
        day
      );


    const dateKey =
      localDateKey(
        date
      );


    const holidayName =
      counselingHolidayName(
        dateKey
      );


    const past =
      isPastCounselingDate(
        dateKey
      );


    const weekend =
      isWeekendCounselingDate(
        dateKey
      );


    const unavailable =
      past ||
      weekend ||
      Boolean(
        holidayName
      );


    const selected =
      value ===
      dateKey;


    calendarCells.push(

      <button

        key={dateKey}

        type="button"

        className={[
          "counseling-calendar-day",
          past
            ? "past"
            : "",
          weekend && !past
            ? "weekend"
            : "",
          holidayName
            ? "holiday"
            : "",
          selected
            ? "selected"
            : ""
        ]
          .filter(Boolean)
          .join(" ")}

        disabled={
          unavailable
        }

        title={
          holidayName
            ? `${holidayName} — unavailable`
            : past
              ? "Past date — unavailable"
              : weekend
                ? "Weekend — unavailable"
                : "Available"
        }

        onClick={
          () =>
            onChange(
              dateKey
            )
        }

      >

        <span className="calendar-day-number">
          {day}
        </span>


        {holidayName && (

          <span className="calendar-day-marker">
            Holiday
          </span>

        )}

      </button>

    );
  }


  const holidaysThisMonth =
    Object.entries(
      COUNSELING_HOLIDAYS
    )
      .filter(
        ([dateKey]) => {

          const date =
            new Date(
              `${dateKey}T00:00:00`
            );


          return (
            date.getFullYear() ===
              year &&
            date.getMonth() ===
              month
          );
        }
      )
      .sort(
        ([dateA], [dateB]) =>
          dateA.localeCompare(
            dateB
          )
      );


  const currentMonthStart =
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );


  const previousMonth =
    new Date(
      year,
      month - 1,
      1
    );


  const previousDisabled =
    previousMonth <
    currentMonthStart;


  return (

    <div className="counseling-date-picker">

      <div className="counseling-calendar-header">

        <button
          type="button"
          className="calendar-nav-button"
          disabled={
            previousDisabled
          }
          onClick={
            () =>
              setVisibleMonth(
                previousMonth
              )
          }
        >
          ‹
        </button>


        <strong>
          {monthName}
        </strong>


        <button
          type="button"
          className="calendar-nav-button"
          onClick={
            () =>
              setVisibleMonth(
                new Date(
                  year,
                  month + 1,
                  1
                )
              )
          }
        >
          ›
        </button>

      </div>


      <div className="counseling-calendar-weekdays">

        {[
          "Sun",
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Sat"
        ].map(
          weekday => (
            <span key={weekday}>
              {weekday}
            </span>
          )
        )}

      </div>


      <div className="counseling-calendar-grid">
        {calendarCells}
      </div>


      {value && (

        <div className="selected-counseling-date">

          Selected date:
          {" "}

          <strong>
            {
              new Date(
                `${value}T00:00:00`
              ).toLocaleDateString(
                "en-PH",
                {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric"
                }
              )
            }
          </strong>

        </div>

      )}


      {holidaysThisMonth.length > 0 && (

        <div className="calendar-holiday-list">

          <strong>
            Marked holidays this month
          </strong>


          {holidaysThisMonth.map(
            ([dateKey, name]) => (

              <div
                key={dateKey}
                className="calendar-holiday-row"
              >

                <span>
                  {
                    new Date(
                      `${dateKey}T00:00:00`
                    ).toLocaleDateString(
                      "en-PH",
                      {
                        month: "short",
                        day: "numeric"
                      }
                    )
                  }
                </span>

                <span>
                  {name}
                </span>

              </div>

            )
          )}

        </div>

      )}


    </div>

  );
}


// ======================================================
// CONSULTATIONS
// ======================================================

function Consultations() {

  const { user } =
    useAuth();


  const location =
    useLocation();


  const navigate =
    useNavigate();


  const rows =
    useRows(
      "consultations",
      {
        ownerId:
          user.id
      }
    );


  // Supabase owns the one-active-request constraint. No Firestore lock.
  const myCounselorAssignments = useRows("counselorAssignments", {
    ownerId: user.id
  });
  const myCounselorAssignment = myCounselorAssignments[0] || null;

  const activeCounselingRequest = rows.find(
    row => counselingRequestIsActive(row.status)
  ) || null;
  const counselingRequestLimitBlocked = Boolean(activeCounselingRequest);


  // Use the most recent counseling request that contains an
  // assigned counselor as the user's current counselor source.
  // This avoids exposing private counselingProfiles notes to
  // Student / Teaching / Non-teaching accounts.
  const currentCounselorAssignment =
    rows.find(
      row =>
        Boolean(
          row.assignedCounselorId
        )
    ) ||
    null;


  // New users may not have an older consultation carrying their
  // counselor assignment yet. Fall back to the active counselor
  // directory for the user's department, but only when exactly
  // one active counselor exists. This prevents a first request
  // from being saved without a counselor/slot reservation.
  const departmentCounselors =
    useRows(
      "counselorDirectory",
      {
        department:
          user.department
      }
    );


  const activeDepartmentCounselors =
    departmentCounselors.filter(
      counselor =>
        counselor.active ===
        true
    );


  const directoryCounselor =
    activeDepartmentCounselors.length ===
      1
      ? activeDepartmentCounselors[0]
      : null;


  const currentAssignedCounselorId =
    myCounselorAssignment?.assignedCounselorId ||
    currentCounselorAssignment
      ?.assignedCounselorId ||
    user.assignedCounselorId ||
    directoryCounselor
      ?.counselorId ||
    directoryCounselor
      ?.id ||
    "";


  const currentAssignedCounselorName =
    myCounselorAssignment?.assignedCounselorName ||
    currentCounselorAssignment
      ?.assignedCounselorName ||
    user.assignedCounselorName ||
    directoryCounselor
      ?.name ||
    "";


  const currentAssignedCounselorDepartment =
    myCounselorAssignment?.assignedCounselorDepartment ||
    currentCounselorAssignment
      ?.assignedCounselorDepartment ||
    user.assignedCounselorDepartment ||
    directoryCounselor
      ?.department ||
    "";


  const counselorScheduleSlots =
    useRows(
      "counselingScheduleSlots",
      currentAssignedCounselorId
        ? {
            counselorId:
              currentAssignedCounselorId
          }
        : {
            counselorId:
              "__NO_ASSIGNED_COUNSELOR__"
          }
    );


  function counselingTimeUnavailable(
    date,
    time,
    ignoreConsultationId = ""
  ) {

    if (
      !currentAssignedCounselorId ||
      !date ||
      !time
    ) {

      return false;
    }


    return counselorScheduleSlots.some(
      slot =>
        slot.counselorId ===
          currentAssignedCounselorId &&
        slot.date ===
          date &&
        slot.time ===
          time &&
        activeCounselingSlotState(
          slot.state
        ) &&
        slot.consultationId !==
          ignoreConsultationId
    );
  }


  const emptyRequest = {
    mode:
      "",

    date:
      "",

    time:
      "",

    category:
      "Academic concern",

    message:
      ""
  };


  const [form, setForm] =
    useState(
      emptyRequest
    );


  const [
    editingId,
    setEditingId
  ] = useState(null);


  const [
    editForm,
    setEditForm
  ] = useState(null);


  const [
    savingEdit,
    setSavingEdit
  ] = useState(false);


  const requestedRequestId =
    location.state
      ?.requestId ||
    "";


  useEffect(
    () => {

      if (
        !requestedRequestId ||
        rows.length === 0
      ) {

        return;
      }


      const targetExists =
        rows.some(
          row =>
            row.id ===
            requestedRequestId
        );


      if (!targetExists) {
        return;
      }


      const timer =
        window.setTimeout(
          () => {

            const element =
              document.getElementById(
                `consultation-${requestedRequestId}`
              );


            element?.scrollIntoView({
              behavior:
                "smooth",

              block:
                "center"
            });
          },
          120
        );


      return () =>
        window.clearTimeout(
          timer
        );

    },

    [
      requestedRequestId,
      rows
    ]
  );


  function clearNotificationNavigation() {

    if (
      location.state
        ?.fromNotification
    ) {

      navigate(
        location.pathname,
        {
          replace: true,
          state: {}
        }
      );
    }
  }


  function validateRequestDate(
    date
  ) {

    if (!date) {

      return (
        "Please select an available counseling date."
      );
    }


    if (
      isPastCounselingDate(
        date
      )
    ) {

      return (
        "Past dates cannot be selected for counseling."
      );
    }


    if (
      isWeekendCounselingDate(
        date
      )
    ) {

      return (
        "Weekends are unavailable for counseling. Please choose a weekday."
      );
    }


    const holidayName =
      counselingHolidayName(
        date
      );


    if (holidayName) {

      return (
        `${holidayName} is a holiday and is unavailable for counseling. Please choose another date.`
      );
    }


    return "";
  }


  function formattedRequestDate(
    date
  ) {

    if (!date) {
      return "No date selected";
    }


    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      "en-PH",
      {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      }
    );
  }


  const [submittingRequest, setSubmittingRequest] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (submittingRequest) return;
    if (counselingRequestLimitBlocked) {
      alert("You already have an active counseling request. Wait for it to be terminated before submitting another.");
      return;
    }
    if (!form.mode || !form.message.trim()) {
      alert("Select a counseling mode and describe your concern.");
      return;
    }
    const dateError = validateRequestDate(form.date);
    if (dateError) { alert(dateError); return; }
    if (!COUNSELING_TIME_SLOTS.includes(form.time)) {
      alert("Choose an available counseling time.");
      return;
    }
    if (!currentAssignedCounselorId) {
      alert("Your active counselor assignment is not ready. Contact the Guidance Office.");
      return;
    }
    if (counselingTimeUnavailable(form.date, form.time)) {
      alert("That counseling time is already reserved. Choose another.");
      return;
    }
    if (!window.confirm([
      "Submit this counseling request?", "",
      `Concern: ${form.category}`,
      `Mode: ${form.mode}`,
      `Date: ${formattedRequestDate(form.date)}`,
      `Time: ${form.time}`,
      `Details: ${form.message.trim()}`
    ].join("\n"))) return;

    try {
      setSubmittingRequest(true);
      await submitCounselingRequest(form);
      setForm({ ...emptyRequest });
      alert("Your counseling request was submitted successfully.");
    } catch (error) {
      console.error("Counseling request submission failed:", error);
      alert(error?.message || "Unable to submit your counseling request.");
    } finally {
      setSubmittingRequest(false);
    }
  }


  function startEdit(row) {

    setEditingId(
      row.id
    );


    setEditForm({

      mode:
        row.mode ||
        "",

      date:
        row.date ||
        "",

      time:
        COUNSELING_TIME_SLOTS.includes(
          row.time
        )
          ? row.time
          : "",

      category:
        row.category ||
        "Academic concern",

      message:
        row.message ||
        ""

    });
  }


  function cancelEdit() {

    setEditingId(null);
    setEditForm(null);
  }


  async function saveEdit(e, row) {
    e.preventDefault();
    if (!editForm || savingEdit) return;
    if (!editForm.mode || !editForm.message.trim()) {
      alert("Select a counseling mode and describe your concern.");
      return;
    }
    const dateError = validateRequestDate(editForm.date);
    if (dateError) { alert(dateError); return; }
    if (!COUNSELING_TIME_SLOTS.includes(editForm.time)) {
      alert("Choose an available counseling time.");
      return;
    }
    if (counselingTimeUnavailable(editForm.date, editForm.time, row.id)) {
      alert("That counseling time is no longer available. Choose another.");
      return;
    }
    if (!window.confirm("Save changes to this pending counseling request?")) return;
    try {
      setSavingEdit(true);
      await editCounselingRequest(row.id, editForm);
      setEditingId(null);
      setEditForm(null);
      alert("Your counseling request was updated successfully.");
    } catch (error) {
      console.error("Counseling request edit failed:", error);
      alert(error?.message || "Unable to update your counseling request.");
    } finally {
      setSavingEdit(false);
    }
  }


  const consultationsLoading =
    rowsAreLoading(
      rows,
      myCounselorAssignments,
      departmentCounselors,
      counselorScheduleSlots
    );


  const consultationsError =
    firstRowsError(
      rows,
      myCounselorAssignments,
      departmentCounselors,
      counselorScheduleSlots
    );


  if (consultationsLoading) {

    return (
      <>
        <PageTitle
          title="Counseling Requests"
          subtitle="Request counseling and track approval or rescheduling in real time."
        />

        <section className="panel">
          <Empty
            text="Loading counseling information..."
          />
        </section>
      </>
    );
  }


  if (consultationsError) {

    return (
      <>
        <PageTitle
          title="Counseling Requests"
          subtitle="Request counseling and track approval or rescheduling in real time."
        />

        <div className="error-box">
          {consultationsError}
          <br />
          Counseling availability and requests cannot be shown safely until the data loads successfully.
        </div>
      </>
    );
  }


  return (

    <>

      <PageTitle

        title="Counseling Requests"

        subtitle="Request counseling and track approval or rescheduling in real time."

      />


      <div className="two-column">


        {
          counselingRequestLimitBlocked

            ? (

              <section className="panel">

                <h2>
                  New counseling request temporarily unavailable
                </h2>


                {
                  activeCounselingRequest

                    ? (

                      <div className="notice">

                        You already have a counseling request that is still active.
                        MindTrack allows only
                        {" "}
                        <strong>
                          one active counseling request at a time
                        </strong>
                        {" "}
                        to prevent duplicate or spam submissions.

                        <br />
                        <br />

                        Current status:
                        {" "}
                        <strong>
                          {
                            normalizeCounselingRequestStatus(
                              activeCounselingRequest.status
                            ) ||
                            "Pending approval"
                          }
                        </strong>

                        {
                          activeCounselingRequest.date &&
                          activeCounselingRequest.time &&
                          (
                            <>
                              <br />
                              Schedule:
                              {" "}
                              <strong>
                                {
                                  activeCounselingRequest.date
                                }
                                {" · "}
                                {
                                  activeCounselingRequest.time
                                }
                              </strong>
                            </>
                          )
                        }

                        <br />
                        <br />

                        You may submit another counseling request after the current
                        request is marked
                        {" "}
                        <strong>
                          Terminated
                        </strong>
                        {" "}
                        or is cancelled.

                      </div>

                    )

                    : (

                      <div className="error-box">

                        Your counseling-request eligibility record has not been
                        initialized yet. Ask the Super Admin to run the
                        counseling-request lock migration.

                      </div>

                    )
                }

              </section>

            )

            : (

        <form
          className="panel"
          onSubmit={submit}
        >

          <h2>
            New request
          </h2>


          <label>

            Mode

            <select

              value={
                form.mode
              }

              required

              onChange={
                e =>
                  setForm({
                    ...form,
                    mode:
                      e.target.value
                  })
              }

            >

              <option value="">
                Choose counseling mode
              </option>

              <option value="Face-to-face">
                Face-to-face
              </option>

            </select>

          </label>


          <div className="counseling-date-field">

            <label>
              Preferred date
            </label>


            <CounselingDatePicker

              value={
                form.date
              }

              onChange={
                selectedDate =>
                  setForm({
                    ...form,
                    date:
                      selectedDate,

                    time:
                      ""
                  })
              }

            />

          </div>


          <label>

            Preferred time

            <select

              value={
                form.time
              }

              required

              onChange={
                e =>
                  setForm({
                    ...form,
                    time:
                      e.target.value
                  })
              }

            >

              <option value="">
                Choose preferred time
              </option>

              {COUNSELING_TIME_SLOTS.map(
                time => (

                  <option
                    key={time}
                    value={time}
                    disabled={
                      Boolean(
                        form.date &&
                        counselingTimeUnavailable(
                          form.date,
                          time
                        )
                      )
                    }
                  >
                    {
                      form.date &&
                      counselingTimeUnavailable(
                        form.date,
                        time
                      )
                        ? `${time} — Unavailable`
                        : time
                    }
                  </option>

                )
              )}

            </select>

          </label>


          <label>

            Concern

            <select

              value={
                form.category
              }

              onChange={
                e =>
                  setForm({
                    ...form,
                    category:
                      e.target.value
                  })
              }

            >

              <option>
                Academic concern
              </option>

              <option>
                Anxiety or stress
              </option>

              <option>
                Family concern
              </option>

              <option>
                Workplace concern
              </option>

              <option>
                Financial concern
              </option>

              <option>
                Other
              </option>

            </select>

          </label>


          <label>

            Details *

            <textarea

              rows="4"

              value={
                form.message
              }

              onChange={
                e =>
                  setForm({
                    ...form,
                    message:
                      e.target.value
                  })
              }

              required

              minLength={2}

              placeholder="Provide details about your concern. This field is required."

            />

          </label>


          <button className="primary-button">

            Submit request

          </button>

        </form>

            )
        }





        <section className="panel">

          <h2>
            My requests
          </h2>


          <p
            style={{
              color: "#6a7283",
              marginTop: 0
            }}
          >
            You may edit a request after submitting it.
            Changes are sent back for counselor review.
            Completed or cancelled requests can no longer be edited.
          </p>


          {rows.length === 0

            ? (

              <Empty
                text="No counseling request yet."
              />

            )

            : rows.map(
                row => {

                  const isEditing =
                    editingId ===
                    row.id;


                  const canEdit =
                    row.status ===
                    "Pending approval";


                  return (

                    <article

                      id={
                        `consultation-${row.id}`
                      }

                      className={
                        row.id ===
                          requestedRequestId
                          ? "record-card notification-target-highlight"
                          : "record-card"
                      }

                      key={
                        row.id
                      }

                      onClick={
                        clearNotificationNavigation
                      }

                    >


                      {isEditing &&
                      editForm

                        ? (

                          <form
                            onSubmit={
                              e =>
                                saveEdit(
                                  e,
                                  row
                                )
                            }
                          >

                            <h3
                              style={{
                                marginTop: 0,
                                color: "#173f8f"
                              }}
                            >
                              Edit counseling request
                            </h3>


                            <label>

                              Mode

                              <select

                                value={
                                  editForm.mode
                                }

                                required

                                onChange={
                                  e =>
                                    setEditForm({
                                      ...editForm,
                                      mode:
                                        e.target.value
                                    })
                                }

                              >

                                <option value="">
                                  Choose counseling mode
                                </option>

                                <option value="Face-to-face">
                                  Face-to-face
                                </option>

                              </select>

                            </label>


                            <div className="counseling-date-field">

                              <label>
                                Preferred date
                              </label>


                              <CounselingDatePicker

                                value={
                                  editForm.date
                                }

                                onChange={
                                  selectedDate =>
                                    setEditForm({
                                      ...editForm,
                                      date:
                                        selectedDate,

                                      time:
                                        ""
                                    })
                                }

                              />

                            </div>


                            <label>

                              Preferred time

                              <select

                                value={
                                  editForm.time
                                }

                                required

                                onChange={
                                  e =>
                                    setEditForm({
                                      ...editForm,
                                      time:
                                        e.target.value
                                    })
                                }

                              >

                                <option value="">
                                  Choose preferred time
                                </option>

                                {COUNSELING_TIME_SLOTS.map(
                                  time => (

                                    <option
                                      key={time}
                                      value={time}
                                      disabled={
                                        Boolean(
                                          editForm.date &&
                                          counselorScheduleSlots.some(
                                            slot =>
                                              slot.counselorId ===
                                                (
                                                  row.assignedCounselorId ||
                                                  currentAssignedCounselorId
                                                ) &&
                                              slot.date ===
                                                editForm.date &&
                                              slot.time ===
                                                time &&
                                              activeCounselingSlotState(
                                                slot.state
                                              ) &&
                                              slot.consultationId !==
                                                row.id
                                          )
                                        )
                                      }
                                    >
                                      {
                                        editForm.date &&
                                        counselorScheduleSlots.some(
                                          slot =>
                                            slot.counselorId ===
                                              (
                                                row.assignedCounselorId ||
                                                currentAssignedCounselorId
                                              ) &&
                                            slot.date ===
                                              editForm.date &&
                                            slot.time ===
                                              time &&
                                            activeCounselingSlotState(
                                              slot.state
                                            ) &&
                                            slot.consultationId !==
                                              row.id
                                        )
                                          ? `${time} — Unavailable`
                                          : time
                                      }
                                    </option>

                                  )
                                )}

                              </select>

                            </label>


                            <label>

                              Concern

                              <select

                                value={
                                  editForm.category
                                }

                                onChange={
                                  e =>
                                    setEditForm({
                                      ...editForm,
                                      category:
                                        e.target.value
                                    })
                                }

                              >

                                <option>
                                  Academic concern
                                </option>

                                <option>
                                  Anxiety or stress
                                </option>

                                <option>
                                  Family concern
                                </option>

                                <option>
                                  Workplace concern
                                </option>

                                <option>
                                  Financial concern
                                </option>

                                <option>
                                  Other
                                </option>

                              </select>

                            </label>


                            <label>

                              Details *

                              <textarea

                                rows="4"

                                value={
                                  editForm.message
                                }

                                onChange={
                                  e =>
                                    setEditForm({
                                      ...editForm,
                                      message:
                                        e.target.value
                                    })
                                }

                                required

                                minLength={2}

                                placeholder="Provide details about your concern. This field is required."

                              />

                            </label>


                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                flexWrap: "wrap",
                                marginTop: "16px"
                              }}
                            >

                              <button
                                className="primary-button"
                                disabled={
                                  savingEdit
                                }
                              >
                                {
                                  savingEdit
                                    ? "Saving..."
                                    : "Save changes"
                                }
                              </button>


                              <button
                                type="button"
                                className="secondary-button"
                                disabled={
                                  savingEdit
                                }
                                onClick={
                                  cancelEdit
                                }
                              >
                                Cancel
                              </button>

                            </div>

                          </form>

                        )

                        : (

                          <>

                            <strong>
                              {row.category}
                            </strong>


                            <span className="status">
                              {
                                normalizeCounselingRequestStatus(
                                  row.status
                                )
                              }
                            </span>


                            <p>

                              {row.date}
                              {" · "}
                              {row.time}

                              {row.mode && (
                                <>
                                  {" · "}
                                  {row.mode}
                                </>
                              )}

                            </p>


                            {row.message && (

                              <p
                                style={{
                                  whiteSpace:
                                    "pre-wrap"
                                }}
                              >
                                <strong>
                                  Details:
                                </strong>
                                {" "}
                                {row.message}
                              </p>

                            )}


                            {row.assignedCounselorName && (

                              <div
                                style={{
                                  marginTop:
                                    "10px",

                                  padding:
                                    "9px 11px",

                                  borderRadius:
                                    "9px",

                                  background:
                                    "#f6f8fb",

                                  color:
                                    "#566174",

                                  fontSize:
                                    "0.84rem"
                                }}
                              >
                                Assigned counselor:
                                {" "}
                                <strong>
                                  {
                                    row.assignedCounselorName
                                  }
                                </strong>

                                {
                                  row.assignedCounselorDepartment &&
                                  (
                                    <>
                                      {" · "}
                                      {
                                        row.assignedCounselorDepartment
                                      }
                                    </>
                                  )
                                }
                              </div>

                            )}


                            {row.transferStatus ===
                              "Pending approval" && (

                              <div
                                className="notice"
                                style={{
                                  marginTop:
                                    "10px"
                                }}
                              >
                                Transfer approval pending. Your current counselor
                                remains assigned until another counselor accepts
                                the transfer.
                              </div>

                            )}


                            {row.transferStatus ===
                              "Approved" && (

                              <div
                                className="success-box"
                                style={{
                                  marginTop:
                                    "10px"
                                }}
                              >
                                <strong>
                                  Transferred
                                </strong>
                                {" — "}
                                {
                                  row.assignedCounselorName ||
                                  "A new Guidance Counselor"
                                }
                                {" "}
                                is now assigned to this counseling request.
                              </div>

                            )}


                            {row.counselorRemarks && (

                              <small>

                                Counselor:
                                {" "}
                                {
                                  row.counselorRemarks
                                }

                              </small>

                            )}


                            {canEdit && (

                              <div
                                style={{
                                  marginTop:
                                    "14px"
                                }}
                              >

                                <button

                                  type="button"

                                  className="secondary-button"

                                  onClick={
                                    () =>
                                      startEdit(
                                        row
                                      )
                                  }

                                >
                                  Edit request
                                </button>

                              </div>

                            )}


                            {!canEdit && (

                              <small
                                style={{
                                  display: "block",
                                  marginTop: "12px",
                                  color: "#7b8495"
                                }}
                              >
                                This request can no longer be edited because it is {normalizeCounselingRequestStatus(row.status).toLowerCase()}.
                              </small>

                            )}

                          </>

                        )
                      }

                    </article>

                  );
                }
              )
          }

        </section>

      </div>

    </>

  );
}


// ======================================================
// PRIVATE REFERRAL COUNSELING NOTES (SUPABASE)
// ======================================================

function ReferralPrivateCounselingNotes({ referral, counselor }) {
  const emptyNotes = {
    caseHistory: "",
    counselingSessionSummary: "",
    counselorObservation: "",
    recommendations: ""
  };
  const [notes, setNotes] = useState(emptyNotes);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setNotes(emptyNotes);
    setMessage("");
    setError("");
    setLoadFailed(false);
    setLoading(true);

    if (!referral?.id || !counselor?.id) {
      setLoading(false);
      return () => { active = false; };
    }

    getReferralNotes(referral.id)
      .then(result => {
        if (active) {
          setNotes({ ...emptyNotes, ...result });
          setLoading(false);
        }
      })
      .catch(loadError => {
        if (active) {
          setError(loadError?.message || "Unable to load private referral counseling notes.");
          setLoadFailed(true); // Prevent overwriting notes that failed to load.
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [referral?.id, counselor?.id]);

  function updateNote(field, value) {
    setNotes(current => ({ ...current, [field]: value }));
    setMessage("");
  }

  async function saveNotes() {
    if (!referral?.id || !counselor?.id || saving || loadFailed) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await saveReferralNotes(referral.id, notes);
      setMessage("Private counseling notes saved and verified in Supabase.");
    } catch (saveError) {
      console.error("Unable to save private referral counseling notes:", saveError);
      setError(saveError?.message || "Unable to save private counseling notes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="referral-private-notes">
      <div className="referral-private-notes-heading">
        <div>
          <h4>Private counseling notes</h4>
          <small>Visible only to the assigned Guidance Counselor and authorized Super Admin.</small>
        </div>
      </div>
      {loading ? (
        <small>Loading private counseling notes...</small>
      ) : (
        <>
          {message && <div className="success-box referral-note-message">{message}</div>}
          {error && <div className="error-box referral-note-message">{error}</div>}
          <div className="referral-private-notes-grid">
            <label>
              Case History
              <textarea rows="4" value={notes.caseHistory} disabled={saving}
                onChange={event => updateNote("caseHistory", event.target.value)}
                placeholder="Document the relevant case history." />
            </label>
            <label>
              Summary of Counseling Session
              <textarea rows="4" value={notes.counselingSessionSummary} disabled={saving}
                onChange={event => updateNote("counselingSessionSummary", event.target.value)}
                placeholder="Summarize the counseling session." />
            </label>
            <label>
              Counselor's Observation
              <textarea rows="4" value={notes.counselorObservation} disabled={saving}
                onChange={event => updateNote("counselorObservation", event.target.value)}
                placeholder="Record counselor observations." />
            </label>
            <label>
              Recommended Actions
              <textarea rows="4" value={notes.recommendations} disabled={saving}
                onChange={event => updateNote("recommendations", event.target.value)}
                placeholder="Record recommended actions." />
            </label>
          </div>
          <button type="button" className="secondary-button" disabled={saving || loadFailed}
            onClick={saveNotes}>
            {saving ? "Saving private notes..." : "Save private counseling notes"}
          </button>
          <small style={{ display: "block", marginTop: "8px" }}>
            Private notes are saved separately from the referral status and counselor remarks.
          </small>
        </>
      )}
    </section>
  );
}


// ======================================================
// REFERRALS
// ======================================================

function Referrals() {

  const { user } =
    useAuth();


  const isCounselor =
    user.role ===
    "counselor";


  const isSuperAdmin =
    user.role ===
    "super_admin";


  const canSubmitReferral =
    [
      "teaching",
      "non_teaching",

      // Legacy compatibility while older user records are migrated.
      "faculty",
      "personnel"
    ].includes(
      user.role
    );


  const referralStatusOptions = [
    "Received",
    "Contacted",
    "Completed"
  ];


  function normalizedReferralStatus(
    value
  ) {
    if (
      value === "Under review" ||
      value === "In progress"
    ) {
      return "Contacted";
    }

    return referralStatusOptions.includes(
      value
    )
      ? value
      : "Received";
  }


  const [
    referralStatusDrafts,
    setReferralStatusDrafts
  ] = useState({});


  const [
    referralRemarksDrafts,
    setReferralRemarksDrafts
  ] = useState({});


  const [
    savingReferralId,
    setSavingReferralId
  ] = useState("");


  const [
    referralUpdateMessage,
    setReferralUpdateMessage
  ] = useState("");


  const [
    referralUpdateError,
    setReferralUpdateError
  ] = useState("");


  const [
    submittingReferral,
    setSubmittingReferral
  ] = useState(false);


  const [
    referralSubmitMessage,
    setReferralSubmitMessage
  ] = useState("");


  const [
    referralSubmitError,
    setReferralSubmitError
  ] = useState("");


  const [
    selectedReferralId,
    setSelectedReferralId
  ] = useState("");


  const rows =
    useRows(
      "referrals",
      isSuperAdmin
        ? {}
        : isCounselor
          ? {
              assignedCounselorId:
                user.id
            }
          : {
              ownerId:
                user.id
            }
    );


  const counselorDirectory =
    useRows(
      "counselorDirectory",
      {
        active: true
      }
    );


  const [form, setForm] =
    useState({

      personName:
        "",

      personType:
        "Student",

      department:
        "",

      program:
        "",

      reason:
        "",

      urgency:
        "Routine",

      contact:
        ""

    });


  const referralsLoading =
    (
      isCounselor ||
      isSuperAdmin
    )
      ? rows.loading
      : rowsAreLoading(
          rows,
          counselorDirectory
        );


  const referralsError =
    (
      isCounselor ||
      isSuperAdmin
    )
      ? rows.error
      : firstRowsError(
          rows,
          counselorDirectory
        );


  async function submit(e) {

    e.preventDefault();


    if (
      isCounselor ||
      isSuperAdmin ||
      !canSubmitReferral
    ) {

      alert(
        "Only Teaching and Non-teaching users may submit referrals."
      );

      return;
    }


    setReferralSubmitMessage("");

    setReferralSubmitError("");


    if (
      !COLLEGE_OPTIONS.includes(
        form.department
      )
    ) {

      setReferralSubmitError(
        "Please select a valid college or office."
      );

      return;
    }


    if (
      form.personType === "Student" &&
      !collegePrograms(form.department).includes(form.program)
    ) {
      setReferralSubmitError(
        "Please select a valid program for the selected college."
      );
      return;
    }

    if (
      !/^\d{11}$/.test(
        form.contact
      )
    ) {

      setReferralSubmitError(
        "Contact information must contain exactly 11 digits."
      );

      return;
    }


    const matchingCounselors =
      counselorDirectory.filter(
        counselor =>
          counselor.department ===
            form.department &&
          counselor.active ===
            true
      );


    if (
      matchingCounselors.length === 0
    ) {

      setReferralSubmitError(
        "No active Guidance Counselor is configured for the selected college/office."
      );

      return;
    }


    if (
      matchingCounselors.length > 1
    ) {

      setReferralSubmitError(
        "More than one active Guidance Counselor is configured for this college/office. Please contact the Super Admin before submitting the referral."
      );

      return;
    }


    const assignedCounselor =
      matchingCounselors[0];


    const confirmed =
      window.confirm(
        `Submit this referral?\n\nReferred person: ${form.personName}\nCollege / Office: ${form.department}${form.personType === "Student" ? `\nProgram: ${form.program}` : ""}\nAssigned counselor: ${assignedCounselor.name || "Guidance Counselor"}\n\nThe assigned counselor will receive the referral. You will be notified whenever the counselor changes its status.`
      );


    if (!confirmed) {
      return;
    }


    try {

      setSubmittingReferral(
        true
      );


      // Supabase verifies the caller's staff role and resolves the counselor
      // from the ACTIVE college on the server; no client counselor ID is trusted.
      await submitReferral(form);


      setForm({

        personName:
          "",

        personType:
          "Student",

        department:
          "",

        program:
          "",

        reason:
          "",

        urgency:
          "Routine",

        contact:
          ""

      });


      setReferralSubmitMessage(
        `Referral submitted successfully. ${assignedCounselor.name || "The assigned Guidance Counselor"} will review it. You will receive a notification whenever the referral status changes.`
      );


      setReferralSubmitError("");

    } catch (error) {

      console.error(
        "Unable to submit referral:",
        error
      );


      setReferralSubmitError(
        error?.code ===
          "permission-denied"

          ? "Only authorized Teaching and Non-teaching users can submit referrals."

          : (
              error?.message ||
              "Unable to submit the referral."
            )
      );

    } finally {

      setSubmittingReferral(
        false
      );
    }
  }

  async function saveReferralUpdate(
    row
  ) {

    if (
      !isCounselor ||
      !row?.id
    ) {

      return;
    }


    const currentStatus =
      normalizedReferralStatus(
        row.status
      );


    const nextStatus =
      normalizedReferralStatus(
        referralStatusDrafts[
          row.id
        ] ??
        currentStatus
      );


    const nextRemarks =
      String(
        referralRemarksDrafts[
          row.id
        ] ??
        row.counselorRemarks ??
        ""
      ).trim();


    if (
      !referralStatusOptions.includes(
        nextStatus
      )
    ) {

      alert(
        "Please select a valid referral status."
      );

      return;
    }


    const statusChanged =
      nextStatus !==
      String(
        row.status ||
        "Received"
      );


    const remarksChanged =
      nextRemarks !==
      String(
        row.counselorRemarks ||
        ""
      ).trim();


    if (
      !statusChanged &&
      !remarksChanged
    ) {

      setReferralUpdateMessage(
        "No referral changes to save."
      );

      setReferralUpdateError("");

      return;
    }


    try {

      setSavingReferralId(
        row.id
      );

      setReferralUpdateMessage("");

      setReferralUpdateError("");


      // Atomic Supabase RPC updates the referral and notifies the referrer
      // only when the status actually changes.
      await updateReferral(row.id, nextStatus, nextRemarks);


      setReferralStatusDrafts(
        current => ({
          ...current,

          [row.id]:
            nextStatus
        })
      );


      setReferralRemarksDrafts(
        current => ({
          ...current,

          [row.id]:
            nextRemarks
        })
      );


      setReferralUpdateMessage(
        statusChanged
          ? "Referral status updated. The referrer was notified."
          : "Referral counselor remarks updated."
      );

    } catch (error) {

      console.error(
        "Unable to update referral:",
        error
      );


      setReferralUpdateError(
        error?.code ===
          "permission-denied"

          ? "You do not have permission to update this referral."

          : (
              error?.message ||
              "Unable to update the referral."
            )
      );

    } finally {

      setSavingReferralId(
        ""
      );
    }
  }


  if (referralsLoading) {

    return (
      <>
        <PageTitle
          title={
            isSuperAdmin
              ? "Referral Management"
              : isCounselor
                ? "Assigned Referrals"
                : "Referral"
          }
          subtitle={
            isSuperAdmin
              ? "Review referral records across all colleges and offices."
              : isCounselor
                ? "Referrals specifically assigned to you."
                : "Teaching and Non-teaching users may refer someone who may benefit from guidance support."
          }
        />

        <section className="panel">
          <Empty
            text="Loading referral information..."
          />
        </section>
      </>
    );
  }


  if (referralsError) {

    return (
      <>
        <PageTitle
          title={
            isSuperAdmin
              ? "Referral Management"
              : isCounselor
                ? "Assigned Referrals"
                : "Referral"
          }
          subtitle={
            isSuperAdmin
              ? "Review referral records across all colleges and offices."
              : isCounselor
                ? "Referrals specifically assigned to you."
                : "Teaching and Non-teaching users may refer someone who may benefit from guidance support."
          }
        />

        <div className="error-box">
          {referralsError}
        </div>
      </>
    );
  }


  if (isSuperAdmin) {

    const superAdminReferralRows =
      [...rows].sort(
        (a, b) => {
          const first =
            recordDateObject(
              a.createdAt ||
              a.updatedAt
            );

          const second =
            recordDateObject(
              b.createdAt ||
              b.updatedAt
            );

          return (
            second?.getTime?.() ||
            0
          ) - (
            first?.getTime?.() ||
            0
          );
        }
      );


    const selectedSuperAdminReferral =
      superAdminReferralRows.find(
        row =>
          row.id ===
          selectedReferralId
      ) ||
      null;


    return (
      <>

        <PageTitle
          title="Referral Management"
          subtitle="Review referral records across all colleges and offices."
        />


        <section className="panel">

          <div className="user-list-heading">

            <div>
              <h2>
                All referrals
              </h2>

              <p>
                Open a referral to view its complete information.
              </p>
            </div>

            <span className="profile-result-count">
              {superAdminReferralRows.length}
              {" "}
              {
                superAdminReferralRows.length === 1
                  ? "referral"
                  : "referrals"
              }
            </span>

          </div>


          {superAdminReferralRows.length === 0

            ? (

              <Empty
                text="No referral records yet."
              />

            )

            : (

              <div className="table-wrap referral-list-table-wrap">

                <table className="referral-list-table">

                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>College / Office</th>
                      <th>Program</th>
                      <th>Urgency</th>
                      <th>Status</th>
                      <th>Assigned Counselor</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>

                    {superAdminReferralRows.map(
                      row => (

                        <tr key={row.id}>

                          <td>
                            <strong>
                              {
                                row.personName ||
                                "Referred user"
                              }
                            </strong>

                            <small className="referral-table-subtext">
                              {
                                formatRecordDateTime(
                                  row.createdAt ||
                                  row.updatedAt
                                )
                              }
                            </small>
                          </td>

                          <td>
                            {
                              row.department ||
                              "Not provided"
                            }
                          </td>

                          <td>{row.program || (row.personType === "Student" ? "Not provided" : "N/A")}</td>

                          <td>
                            {
                              row.urgency ||
                              "Routine"
                            }
                          </td>

                          <td>
                            <span className="status">
                              {
                                normalizedReferralStatus(
                                  row.status
                                )
                              }
                            </span>
                          </td>

                          <td>
                            {
                              row.assignedCounselorName ||
                              "Not assigned"
                            }
                          </td>

                          <td>
                            <button
                              type="button"
                              className="text-button"
                              onClick={
                                () => {
                                  setReferralUpdateMessage("");
                                  setReferralUpdateError("");
                                  setSelectedReferralId(
                                    row.id
                                  );
                                }
                              }
                            >
                              View Referral
                            </button>
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )
          }

        </section>


        {selectedSuperAdminReferral && (

          <div
            className="review-request-modal-backdrop"
            role="presentation"
            onMouseDown={
              event => {
                if (
                  event.target ===
                  event.currentTarget
                ) {
                  setSelectedReferralId("");
                }
              }
            }
          >

            <section
              className="review-request-modal referral-review-modal"
              role="dialog"
              aria-modal="true"
              aria-label={
                `Referral details for ${
                  selectedSuperAdminReferral.personName ||
                  "referred user"
                }`
              }
            >

              <header className="review-request-modal-header">

                <div>

                  <p className="review-request-modal-eyebrow">
                    Referral Record
                  </p>

                  <div className="review-request-modal-title-row">

                    <h2>
                      {
                        selectedSuperAdminReferral.personName ||
                        "Referred user"
                      }
                    </h2>

                    <span className="status">
                      {
                        normalizedReferralStatus(
                          selectedSuperAdminReferral.status
                        )
                      }
                    </span>

                  </div>

                  <p className="review-request-modal-subtitle">
                    View the complete referral information and counselor assignment.
                  </p>

                </div>


                <button
                  type="button"
                  className="review-request-close-button"
                  onClick={
                    () =>
                      setSelectedReferralId("")
                  }
                  aria-label="Close referral details"
                >
                  ×
                </button>

              </header>


              <div className="review-request-modal-body referral-review-modal-body">

                <section className="review-request-modal-card referral-review-summary-card superadmin-referral-summary-card">

                  <h3>
                    Referral Information
                  </h3>


                  <div className="referral-review-summary-grid">

                    <div className="review-request-detail-item">
                      <span>Referred user</span>
                      <strong>
                        {
                          selectedSuperAdminReferral.personName ||
                          "Not provided"
                        }
                      </strong>
                    </div>

                    <div className="review-request-detail-item">
                      <span>Type</span>
                      <strong>
                        {
                          selectedSuperAdminReferral.personType ||
                          "User"
                        }
                      </strong>
                    </div>

                    <div className="review-request-detail-item">
                      <span>College / Office</span>
                      <strong>
                        {
                          selectedSuperAdminReferral.department ||
                          "Not provided"
                        }
                      </strong>
                    </div>

                    <div className="review-request-detail-item">
                      <span>Program</span>
                      <strong>{selectedSuperAdminReferral.program || (selectedSuperAdminReferral.personType === "Student" ? "Not provided" : "N/A")}</strong>
                    </div>

                    <div className="review-request-detail-item">
                      <span>Submitted</span>
                      <strong>
                        {
                          formatRecordDateTime(
                            selectedSuperAdminReferral.createdAt ||
                            selectedSuperAdminReferral.updatedAt
                          )
                        }
                      </strong>
                    </div>

                    <div className="review-request-detail-item">
                      <span>Referred by</span>
                      <strong>
                        {
                          selectedSuperAdminReferral.referrerName ||
                          "Teaching / Non-teaching"
                        }
                      </strong>
                    </div>

                    <div className="review-request-detail-item">
                      <span>Contact</span>
                      <strong>
                        {
                          selectedSuperAdminReferral.contact ||
                          "Not provided"
                        }
                      </strong>
                    </div>

                    <div className="review-request-detail-item">
                      <span>Urgency</span>
                      <strong>
                        {
                          selectedSuperAdminReferral.urgency ||
                          "Routine"
                        }
                      </strong>
                    </div>

                    <div className="review-request-detail-item">
                      <span>Assigned counselor</span>
                      <strong>
                        {
                          selectedSuperAdminReferral.assignedCounselorName ||
                          "Not assigned"
                        }
                      </strong>
                    </div>

                    <div className="review-request-detail-item full">
                      <span>Reason</span>
                      <strong className="review-request-details-text">
                        {
                          selectedSuperAdminReferral.reason ||
                          "No referral reason provided."
                        }
                      </strong>
                    </div>

                    {
                      selectedSuperAdminReferral.counselorRemarks && (
                        <div className="review-request-detail-item full">
                          <span>Counselor remarks</span>
                          <strong className="review-request-details-text">
                            {
                              selectedSuperAdminReferral.counselorRemarks
                            }
                          </strong>
                        </div>
                      )
                    }

                  </div>


                  <div className="referral-review-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={
                        () =>
                          setSelectedReferralId("")
                      }
                    >
                      Close
                    </button>
                  </div>

                </section>

              </div>

            </section>

          </div>

        )}

      </>
    );
  }


  const counselorReferralRows =
    [...rows].sort(
      (a, b) => {
        const first =
          recordDateObject(
            a.createdAt ||
            a.updatedAt
          );

        const second =
          recordDateObject(
            b.createdAt ||
            b.updatedAt
          );

        return (
          second?.getTime?.() ||
          0
        ) - (
          first?.getTime?.() ||
          0
        );
      }
    );


  const selectedCounselorReferral =
    counselorReferralRows.find(
      row =>
        row.id ===
        selectedReferralId
    ) ||
    null;


  if (isCounselor) {

    return (
      <>

        <PageTitle
          title="Assigned Referrals"
          subtitle="View referrals that were routed to you through your counselor assignment."
        />


        <section className="panel">

          <div className="user-list-heading">

            <div>
              <h2>
                Referrals assigned to me
              </h2>

              <p>
                Open a referral to review its details, update the status, and manage counselor-only documentation.
              </p>
            </div>

            <span className="profile-result-count">
              {counselorReferralRows.length}
              {" "}
              {
                counselorReferralRows.length === 1
                  ? "referral"
                  : "referrals"
              }
            </span>

          </div>


          {referralUpdateMessage && (

            <div
              className="success-box"
              style={{
                marginTop:
                  "14px"
              }}
            >
              {referralUpdateMessage}
            </div>

          )}


          {referralUpdateError && (

            <div
              className="error-box"
              style={{
                marginTop:
                  "14px"
              }}
            >
              {referralUpdateError}
            </div>

          )}


          {counselorReferralRows.length === 0

            ? (

              <Empty
                text="No referrals are currently assigned to you."
              />

            )

            : (

              <div className="table-wrap referral-list-table-wrap">

                <table className="referral-list-table">

                  <thead>

                    <tr>
                      <th>Referred user</th>
                      <th>Type</th>
                      <th>College / Office</th>
                      <th>Program</th>
                      <th>Submitted</th>
                      <th>Urgency</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>

                  </thead>


                  <tbody>

                    {counselorReferralRows.map(
                      row => (

                        <tr key={row.id}>

                          <td>
                            <strong>
                              {row.personName || "Referred user"}
                            </strong>
                          </td>

                          <td>
                            {row.personType || "User"}
                          </td>

                          <td>
                            {row.department || "—"}
                          </td>

                          <td>{row.program || (row.personType === "Student" ? "Not provided" : "N/A")}</td>

                          <td>
                            {formatRecordDateTime(
                              row.createdAt ||
                              row.updatedAt
                            )}
                          </td>

                          <td>
                            {row.urgency || "Routine"}
                          </td>

                          <td>
                            <span className="status">
                              {normalizedReferralStatus(row.status)}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="text-button"
                              onClick={
                                () => {
                                  setReferralUpdateMessage("");
                                  setReferralUpdateError("");
                                  setSelectedReferralId(
                                    row.id
                                  );
                                }
                              }
                            >
                              View Referral
                            </button>
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )
          }

        </section>


        {selectedCounselorReferral && (

          <div
            className="review-request-modal-backdrop"
            role="presentation"
            onMouseDown={
              event => {
                if (
                  event.target ===
                  event.currentTarget
                ) {
                  setSelectedReferralId("");
                }
              }
            }
          >

            <section
              className="review-request-modal referral-review-modal"
              role="dialog"
              aria-modal="true"
              aria-label={
                `Referral details for ${
                  selectedCounselorReferral.personName ||
                  "referred user"
                }`
              }
            >

              <header className="review-request-modal-header">

                <div>

                  <p className="review-request-modal-eyebrow">
                    Assigned Referral
                  </p>

                  <div className="review-request-modal-title-row">

                    <h2>
                      {
                        selectedCounselorReferral.personName ||
                        "Referred user"
                      }
                    </h2>

                    <span className="status">
                      {
                        normalizedReferralStatus(
                          selectedCounselorReferral.status
                        )
                      }
                    </span>

                  </div>

                  <p className="review-request-modal-subtitle">
                    Review the referral details, update its status, add counselor remarks, and manage private counseling notes.
                  </p>

                </div>


                <button
                  type="button"
                  className="review-request-close-button"
                  onClick={
                    () =>
                      setSelectedReferralId(
                        ""
                      )
                  }
                  aria-label="Close referral details"
                >
                  ×
                </button>

              </header>


              <div className="review-request-modal-body referral-review-modal-body">

                <section className="review-request-modal-card referral-review-summary-card">

                  <h3>
                    Referral Information
                  </h3>


                  <div className="referral-review-summary-grid">

                    <div className="review-request-detail-item">
                      <span>Referred user</span>
                      <strong>
                        {
                          selectedCounselorReferral.personName ||
                          "Not provided"
                        }
                      </strong>
                    </div>

                    <div className="review-request-detail-item">
                      <span>Type</span>
                      <strong>
                        {
                          selectedCounselorReferral.personType ||
                          "User"
                        }
                      </strong>
                    </div>

                    <div className="review-request-detail-item">
                      <span>College / Office</span>
                      <strong>
                        {
                          selectedCounselorReferral.department ||
                          "Not provided"
                        }
                      </strong>
                    </div>

                    <div className="review-request-detail-item">
                      <span>Program</span>
                      <strong>{selectedCounselorReferral.program || (selectedCounselorReferral.personType === "Student" ? "Not provided" : "N/A")}</strong>
                    </div>

                    <div className="review-request-detail-item">
                      <span>Submitted</span>
                      <strong>
                        {
                          formatRecordDateTime(
                            selectedCounselorReferral.createdAt ||
                            selectedCounselorReferral.updatedAt
                          )
                        }
                      </strong>
                    </div>

                    <div className="review-request-detail-item">
                      <span>Referred by</span>
                      <strong>
                        {
                          selectedCounselorReferral.referrerName ||
                          "Teaching / Non-teaching"
                        }
                      </strong>
                    </div>

                    <div className="review-request-detail-item">
                      <span>Contact</span>
                      <strong>
                        {
                          selectedCounselorReferral.contact ||
                          "Not provided"
                        }
                      </strong>
                    </div>

                    <div className="review-request-detail-item">
                      <span>Urgency</span>
                      <strong>
                        {
                          selectedCounselorReferral.urgency ||
                          "Routine"
                        }
                      </strong>
                    </div>

                    <div className="review-request-detail-item full">
                      <span>Reason</span>
                      <strong className="review-request-details-text">
                        {
                          selectedCounselorReferral.reason ||
                          "No referral reason provided."
                        }
                      </strong>
                    </div>

                  </div>

                </section>


                <section className="review-request-modal-card referral-review-management-card">

                  <h3>
                    Referral Review
                  </h3>


                  <label>
                    Referral status

                    <select
                      value={
                        referralStatusDrafts[
                          selectedCounselorReferral.id
                        ] ??
                        normalizedReferralStatus(
                          selectedCounselorReferral.status
                        )
                      }
                      disabled={
                        savingReferralId ===
                        selectedCounselorReferral.id
                      }
                      onChange={
                        event =>
                          setReferralStatusDrafts(
                            current => ({
                              ...current,

                              [selectedCounselorReferral.id]:
                                event.target.value
                            })
                          )
                      }
                    >

                      {referralStatusOptions.map(
                        status => (

                          <option
                            key={status}
                            value={status}
                          >
                            {status}
                          </option>

                        )
                      )}

                    </select>

                  </label>


                  <label>
                    Counselor remarks

                    <span className="optional-text referral-review-helper-text">
                      Internal referral documentation. The referrer is notified only when the status changes.
                    </span>

                    <textarea
                      rows="4"
                      value={
                        referralRemarksDrafts[
                          selectedCounselorReferral.id
                        ] ??
                        selectedCounselorReferral.counselorRemarks ??
                        ""
                      }
                      disabled={
                        savingReferralId ===
                        selectedCounselorReferral.id
                      }
                      onChange={
                        event =>
                          setReferralRemarksDrafts(
                            current => ({
                              ...current,

                              [selectedCounselorReferral.id]:
                                event.target.value
                            })
                          )
                      }
                      placeholder="Add referral review notes."
                    />

                  </label>


                  <ReferralPrivateCounselingNotes
                    referral={
                      selectedCounselorReferral
                    }
                    counselor={user}
                  />


                  <div className="referral-review-actions">

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={
                        () =>
                          setSelectedReferralId(
                            ""
                          )
                      }
                    >
                      Close
                    </button>


                    <button
                      type="button"
                      className="primary-button"
                      disabled={
                        savingReferralId ===
                        selectedCounselorReferral.id
                      }
                      onClick={
                        () =>
                          saveReferralUpdate(
                            selectedCounselorReferral
                          )
                      }
                    >
                      {
                        savingReferralId ===
                          selectedCounselorReferral.id
                          ? "Saving..."
                          : "Save referral update"
                      }
                    </button>

                  </div>

                </section>

              </div>

            </section>

          </div>

        )}

      </>
    );
  }


  const own =
    rows.filter(
      row =>
        row.referrerId ===
        user.id
    );


  return (

    <>

      <PageTitle

        title="Referral"

        subtitle="Teaching and Non-teaching users may refer someone who may benefit from guidance support."

      />


      {referralSubmitMessage && (

        <div
          className="success-box"
          style={{
            marginBottom:
              "16px"
          }}
        >
          {referralSubmitMessage}
        </div>

      )}


      {referralSubmitError && (

        <div
          className="error-box"
          style={{
            marginBottom:
              "16px"
          }}
        >
          {referralSubmitError}
        </div>

      )}


      <div className="two-column">


        <form
          className="panel"
          onSubmit={submit}
        >


          <label>

            Name

            <input

              required

              value={
                form.personName
              }

              onChange={
                e =>
                  setForm({
                    ...form,
                    personName:
                      e.target.value
                  })
              }

            />

          </label>


          <label>

            Type

            <select

              value={
                form.personType
              }

              onChange={
                e =>
                  setForm({
                    ...form,
                    personType:
                      e.target.value,
                    program:
                      e.target.value === "Student" ? form.program : ""
                  })
              }

            >

              <option>
                Student
              </option>

              <option>
                Teaching
              </option>

              <option>
                Non-teaching
              </option>

            </select>

          </label>


          <label>

            College / Office

            <select

              required

              value={
                form.department
              }

              onChange={
                e =>
                  setForm({
                    ...form,
                    department:
                      e.target.value,
                    program:
                      ""
                  })
              }

            >

              <option
                value=""
                disabled
              >
                Select college / office
              </option>


              {COLLEGE_OPTIONS.map(
                college => (

                  <option
                    key={college}
                    value={college}
                  >
                    {college}
                  </option>

                )
              )}

            </select>

          </label>

          {form.personType === "Student" && (
            <label>
              Program
              <select
                required
                value={form.program}
                disabled={!form.department}
                onChange={e => setForm({ ...form, program: e.target.value })}
              >
                <option value="" disabled>
                  {form.department ? "Select program" : "Select college first"}
                </option>
                {collegePrograms(form.department).map(program => (
                  <option key={program} value={program}>
                    {program}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>

            Contact information

            <input

              type="tel"

              inputMode="numeric"

              autoComplete="tel"

              required

              minLength={11}

              maxLength={11}

              pattern="[0-9]{11}"

              title="Enter exactly 11 digits."

              placeholder="09XXXXXXXXX"

              value={
                form.contact
              }

              onChange={
                e =>
                  setForm({
                    ...form,
                    contact:
                      e.target.value
                        .replace(
                          /\D/g,
                          ""
                        )
                        .slice(
                          0,
                          11
                        )
                  })
              }

            />

          </label>


          <label>

            Urgency

            <select

              value={
                form.urgency
              }

              onChange={
                e =>
                  setForm({
                    ...form,
                    urgency:
                      e.target.value
                  })
              }

            >

              <option>
                Routine
              </option>

              <option>
                Urgent
              </option>

            </select>

          </label>


          <label>

            Reason

            <textarea

              required

              rows="5"

              value={
                form.reason
              }

              onChange={
                e =>
                  setForm({
                    ...form,
                    reason:
                      e.target.value
                  })
              }

            />

          </label>


          <button
            className="primary-button"
            disabled={
              submittingReferral ||
              !canSubmitReferral
            }
          >

            {
              submittingReferral
                ? "Submitting referral..."
                : "Submit referral"
            }

          </button>

        </form>


        <section className="panel">

          <h2>
            Referral status
          </h2>


          <p
            style={{
              marginTop:
                "-4px",

              color:
                "#667085"
            }}
          >
            MindTrack will notify you whenever the assigned counselor changes
            the status of a referral you submitted.
          </p>


          {own.length === 0

            ? (

              <Empty
                text="No referral submitted."
              />

            )

            : own.map(
                row => (

                  <article
                    className="record-card"
                    key={
                      row.id
                    }
                  >

                    <strong>
                      {
                        row.personName
                      }
                    </strong>


                    <span className="status">
                      {
                        normalizedReferralStatus(
                          row.status
                        )
                      }
                    </span>


                    <p>

                      {
                        row.personType
                      }

                      {" · "}

                      {
                        row.department
                      }

                      {row.program && (<> {" · "} {row.program} </>)}

                      {" · "}

                      {
                        row.urgency
                      }

                    </p>


                    {row.updatedByName && (

                      <small
                        style={{
                          display:
                            "block",

                          marginTop:
                            "6px"
                        }}
                      >
                        Last updated by:
                        {" "}
                        {
                          row.updatedByName
                        }
                      </small>

                    )}

                  </article>

                )
              )
          }

        </section>

      </div>

    </>

  );
}


// ======================================================
// RATINGS & FEEDBACK
// STUDENT / TEACHING / NON-TEACHING
// ======================================================

function Feedback() {

  const { user } =
    useAuth();


  const allowedRoles =
    GENERAL_USER_ROLE_VALUES;


  const [rating, setRating] =
    useState(0);

  const [category, setCategory] =
    useState(
      "Overall Experience"
    );

  const [feedback, setFeedback] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [history, setHistory] =
    useState([]);

  const [historyLoading, setHistoryLoading] =
    useState(true);

  const [historyError, setHistoryError] =
    useState("");


  useEffect(() => {
    if (!user?.id || !allowedRoles.includes(user.role)) {
      setHistory([]);
      setHistoryLoading(false);
      return undefined;
    }
    let active = true;
    let requestVersion = 0;
    setHistory([]);
    setHistoryLoading(true);
    setHistoryError("");

    async function loadHistory() {
      const version = ++requestVersion;
      try {
        const records = await listMyMindTrackFeedback(user.id);
        if (!active || version !== requestVersion) return;
        setHistory(records);
        setHistoryError("");
      } catch (err) {
        if (!active || version !== requestVersion) return;
        console.error("Unable to load Supabase feedback history:", err);
        setHistoryError(err?.message || "Unable to load your feedback history.");
      } finally {
        if (active && version === requestVersion) setHistoryLoading(false);
      }
    }

    void loadHistory();
    window.addEventListener("focus", loadHistory);
    window.addEventListener("mindtrack:feedback-changed", loadHistory);
    return () => {
      active = false;
      requestVersion += 1;
      window.removeEventListener("focus", loadHistory);
      window.removeEventListener("mindtrack:feedback-changed", loadHistory);
    };
  }, [user?.id, user?.role]);

  if (
    !allowedRoles.includes(
      user.role
    )
  ) {

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }


  async function submit(e) {

    e.preventDefault();

    setMessage("");
    setError("");


    if (
      rating < 1 ||
      rating > 5
    ) {

      setError(
        "Please select a rating from 1 to 5 stars."
      );

      return;
    }


    try {

      setSaving(true);


      // RLS verifies user_id against the authenticated Supabase session.
      const saved = await submitMindTrackFeedback({
        rating,
        category,
        feedback
      });
      setHistory(previous => [saved, ...previous.filter(row => row.id !== saved.id)]);

      setRating(0);

      setCategory(
        "Overall Experience"
      );

      setFeedback("");

      setMessage(
        "Thank you. Your rating and feedback were submitted successfully."
      );

    } catch (err) {

      console.error(
        "Feedback submission error:",
        err
      );


      setError(err?.message || "Unable to submit your feedback to Supabase.");

    } finally {

      setSaving(false);

    }
  }


  return (

    <>

      <PageTitle
        title="Ratings & Feedback"
        subtitle="Share your experience with MindTrack. Your feedback helps improve the system."
      />


      <div className="feedback-page-layout">


        <form
          className="panel feedback-form-panel"
          onSubmit={submit}
        >

          <h2>
            Rate your MindTrack experience
          </h2>

          <p className="feedback-help-text">
            Select from 1 to 5 stars. Five stars means an excellent experience.
          </p>


          <div
            className="star-rating"
            role="radiogroup"
            aria-label="MindTrack rating"
          >

            {[1, 2, 3, 4, 5].map(
              value => (

                <button
                  key={value}
                  type="button"
                  className={
                    value <= rating
                      ? "star-button selected"
                      : "star-button"
                  }
                  onClick={
                    () =>
                      setRating(value)
                  }
                  aria-label={
                    `${value} star${value > 1 ? "s" : ""}`
                  }
                  aria-pressed={
                    value === rating
                  }
                >

                  <Star
                    size={34}
                    fill={
                      value <= rating
                        ? "currentColor"
                        : "none"
                    }
                  />

                </button>

              )
            )}

          </div>


          <div className="rating-label">

            {rating === 5
              ? "Excellent"
              : rating === 4
                ? "Very Good"
                : rating === 3
                  ? "Good"
                  : rating === 2
                    ? "Fair"
                    : rating === 1
                      ? "Poor"
                      : "Select a rating"}

          </div>


          <label>
            Feedback Category

            <select
              value={category}
              onChange={
                e =>
                  setCategory(
                    e.target.value
                  )
              }
            >

              <option>
                Overall Experience
              </option>

              <option>
                Ease of Use
              </option>

              <option>
                System Performance
              </option>

              {user.role === "student" && (
                <>
                  <option>Assessment</option>
                  <option>Counseling</option>
                </>
              )}

              <option>
                Privacy and Security
              </option>

              <option>
                Interface / Design
              </option>

              <option>
                Other
              </option>

            </select>

          </label>


          <label>
            Feedback
            {" "}

            <span className="optional-text">
              (Optional)
            </span>

            <textarea
              rows="5"
              value={feedback}
              onChange={
                e =>
                  setFeedback(
                    e.target.value
                  )
              }
              maxLength={1000}
              placeholder="Tell us what you liked, what was difficult, or what we can improve."
            />

          </label>


          <div className="feedback-character-count">
            {feedback.length}/1000
          </div>


          {message && (
            <div className="success-box">
              {message}
            </div>
          )}


          {error && (
            <div className="error-box">
              {error}
            </div>
          )}


          <button
            className="primary-button"
            disabled={
              saving ||
              rating === 0
            }
          >

            {saving
              ? "Submitting..."
              : "Submit Feedback"}

          </button>


          <div className="profile-note">

            Ratings & Feedback is for improving the MindTrack system.
            It is separate from the formal research acceptability questionnaire.

          </div>

        </form>


        <section className="panel feedback-history-panel">

          <h2>
            My Feedback History
          </h2>


          {historyLoading

            ? (

              <Empty
                text="Loading your feedback..."
              />

            )

            : historyError

              ? (

                <div className="error-box">
                  {historyError}
                </div>

              )

            : history.length === 0

              ? (

                <Empty
                  text="You have not submitted any feedback yet."
                />

              )

              : (

                <div className="feedback-history-list">

                  {history.map(
                    item => (

                      <article
                        key={item.id}
                        className="feedback-history-card"
                      >

                        <div className="feedback-history-top">

                          <div className="feedback-stars-text">
                            {
                              "★".repeat(
                                Number(
                                  item.rating || 0
                                )
                              )
                            }
                            {
                              "☆".repeat(
                                Math.max(
                                  0,
                                  5 -
                                  Number(
                                    item.rating || 0
                                  )
                                )
                              )
                            }
                          </div>

                          <small>
                            {
                              formatFeedbackDate(
                                item.createdAt
                              )
                            }
                          </small>

                        </div>


                        <strong>
                          {
                            item.category ||
                            "Overall Experience"
                          }
                        </strong>


                        <p>
                          {
                            item.feedback?.trim()
                              ? item.feedback
                              : "No written comment."
                          }
                        </p>

                      </article>

                    )
                  )}

                </div>

              )
          }

        </section>

      </div>

    </>

  );
}


function feedbackTimestamp(value) {

  if (!value) {
    return 0;
  }


  if (
    typeof value.toMillis ===
    "function"
  ) {
    return value.toMillis();
  }


  if (
    typeof value.seconds ===
    "number"
  ) {
    return value.seconds * 1000;
  }


  const parsed =
    new Date(value).getTime();


  return Number.isNaN(parsed)
    ? 0
    : parsed;
}


function formatFeedbackDate(value) {

  const timestamp =
    feedbackTimestamp(value);


  if (!timestamp) {
    return "Just now";
  }


  return new Date(
    timestamp
  ).toLocaleString();

}


// ======================================================
// USER PROFILE
// ======================================================

function Profile() {

  const {
    user,
    updateProfile
  } = useAuth();

  const allowedRoles =
    GENERAL_USER_ROLE_VALUES;

  const [form, setForm] =
    useState({
      phoneNumber:
        user?.phoneNumber || "",

      address:
        user?.address || "",

      facebookAccount:
        user?.facebookAccount || "",

      contactPersonName:
        user?.contactPersonName || "",

      contactPersonPhone:
        user?.contactPersonPhone || ""
    });


  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  useEffect(
    () => {

      setForm({
        phoneNumber:
          user?.phoneNumber || "",

        address:
          user?.address || "",

        facebookAccount:
          user?.facebookAccount || "",

        contactPersonName:
          user?.contactPersonName || "",

        contactPersonPhone:
          user?.contactPersonPhone || ""
      });

    },
    [
      user?.phoneNumber,
      user?.address,
      user?.facebookAccount,
      user?.contactPersonName,
      user?.contactPersonPhone
    ]
  );


  if (
    !allowedRoles.includes(
      user.role
    )
  ) {

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }


  function change(e) {

    const {
      name,
      value
    } = e.target;


    const numericFields = [
      "phoneNumber",
      "contactPersonPhone"
    ];


    const nextValue =
      numericFields.includes(name)

        ? value.replace(/\D/g, "")

        : value;


    setForm(
      current => ({
        ...current,
        [name]: nextValue
      })
    );
  }


  async function submit(e) {

    e.preventDefault();

    setMessage("");
    setError("");


    if (
      !form.phoneNumber.trim()
    ) {

      setError(
        "Please enter your phone number."
      );

      return;
    }


    if (
      form.phoneNumber.length !== 11
    ) {

      setError(
        "Phone number must contain exactly 11 digits."
      );

      return;
    }


    if (
      !form.contactPersonName.trim()
    ) {

      setError(
        "Please enter your contact person's name."
      );

      return;
    }


    if (
      !form.contactPersonPhone.trim()
    ) {

      setError(
        "Please enter your contact person's phone number."
      );

      return;
    }


    if (
      form.contactPersonPhone.length !== 11
    ) {

      setError(
        "Contact person phone number must contain exactly 11 digits."
      );

      return;
    }


    if (
      !form.address.trim()
    ) {

      setError(
        "Please enter your address."
      );

      return;
    }


    try {

      setSaving(true);


      await updateProfile({
        phoneNumber:
          form.phoneNumber,

        address:
          form.address,

        facebookAccount:
          form.facebookAccount,

        contactPersonName:
          form.contactPersonName,

        contactPersonPhone:
          form.contactPersonPhone
      });


      setMessage(
        "Profile updated successfully."
      );

    } catch (err) {

      console.error(
        "Profile update error:",
        err
      );


      setError(
        err.message ||
        "Unable to update your profile."
      );

    } finally {

      setSaving(false);
    }
  }


  return (

    <>

      <PageTitle
        title="My Profile"
        subtitle="View your account information and keep your personal contact details updated."
      />


      <div className="profile-layout">


        <section className="panel profile-summary-card">

          <div
            className="profile-avatar"
            aria-hidden="true"
          >

            {
              user.name
                ?.trim()
                ?.charAt(0)
                ?.toUpperCase() ||
              "U"
            }

          </div>


          <h2>
            {user.name}
          </h2>

          <p>
            {user.email}
          </p>


          <div className="profile-role-badge">

            {
              systemRoleLabel(
                user.role
              )
            }

          </div>

        </section>


        <section className="panel profile-form-panel">

          <h2>
            Account Information
          </h2>


          <div className="profile-grid">

            <label>
              Full Name

              <input
                value={
                  user.name ||
                  ""
                }
                readOnly
              />
            </label>


            <label>
              Email

              <input
                value={
                  user.email ||
                  ""
                }
                readOnly
              />
            </label>


            <label>
              Account Type

              <input
                value={
                  systemRoleLabel(
                    user.role
                  )
                }
                readOnly
              />
            </label>


            <label>
              College / Office

              <input
                value={
                  user.department ||
                  ""
                }
                readOnly
              />
            </label>


            {user.role === "student" && (

              <label className="full-width-field">
                Program

                <input
                  value={
                    user.program ||
                    "Not provided"
                  }
                  readOnly
                />
              </label>

            )}


            <label>

              {
                user.role ===
                "student"

                  ? "Student Number"

                  : "Employee Number"
              }

              <input
                value={
                  user.userNumber ||
                  ""
                }
                readOnly
              />
            </label>

          </div>


          <div className="profile-note">

            Account type, college/office, program, email, and student/employee number are locked here to protect account and department records.

          </div>


          <form onSubmit={submit}>

            <h2>
              Personal Information
            </h2>


            <div className="profile-grid">

              <label>
                Phone Number

                <input
                  type="tel"
                  name="phoneNumber"
                  value={
                    form.phoneNumber
                  }
                  onChange={change}
                  inputMode="numeric"
                  pattern="[0-9]{11}"
                  minLength={11}
                  maxLength={11}
                  placeholder="09XXXXXXXXX"
                  required
                />
              </label>


              <label>

                Facebook Account
                {" "}

                <span className="optional-text">
                  (Optional)
                </span>

                <input
                  type="text"
                  name="facebookAccount"
                  value={
                    form.facebookAccount
                  }
                  onChange={change}
                />
              </label>


              <label className="full-width-field">
                Address

                <textarea
                  name="address"
                  rows="3"
                  value={
                    form.address
                  }
                  onChange={change}
                  required
                />
              </label>

            </div>


            <h2>
              Contact Person
            </h2>

            <p className="profile-note">
              Contact person information is required for user safety.
            </p>


            <div className="profile-grid">

              <label>
                Contact Person Name

                <input
                  type="text"
                  name="contactPersonName"
                  value={
                    form.contactPersonName
                  }
                  onChange={change}
                  required
                />
              </label>


              <label>
                Contact Person Phone Number

                <input
                  type="tel"
                  name="contactPersonPhone"
                  value={
                    form.contactPersonPhone
                  }
                  onChange={change}
                  inputMode="numeric"
                  pattern="[0-9]{11}"
                  minLength={11}
                  maxLength={11}
                  placeholder="09XXXXXXXXX"
                  required
                />
              </label>

            </div>


            {message && (
              <div className="success-box">
                {message}
              </div>
            )}


            {error && (
              <div className="error-box">
                {error}
              </div>
            )}


            <button
              className="primary-button"
              disabled={saving}
            >

              {
                saving
                  ? "Saving..."
                  : "Save Profile"
              }

            </button>

          </form>

        </section>

      </div>

    </>

  );
}


// ======================================================
// USER PROFILES - COUNSELOR / SUPER ADMIN (READ ONLY)
// ======================================================

function UserProfiles() {

  const { user } =
    useAuth();


  const allowedRoles = [
    "counselor",
    "super_admin"
  ];


  if (
    !allowedRoles.includes(
      user.role
    )
  ) {

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }


  return (
    <UserProfilesContent
      currentUser={user}
    />
  );
}


function UserProfilesContent({
  currentUser
}) {
  const isSuperAdmin = currentUser.role === "super_admin";
  const profileRows = useRows("users");
  // The server returns all accounts for Super Admin and only actively
  // assigned students for a counselor. No Firestore transferAccess query.
  const combinedRows = profileRows;
  const loadingUsers = profileRows.loading;
  const usersError = profileRows.error;

  const profileTransferCounselorRows = useRows(
    "counselorDirectory",
    isSuperAdmin ? { disabled: true } : { active: true }
  );
  const profileTransferCounselors = useMemo(() =>
    profileTransferCounselorRows
      .filter(counselor => counselor.active === true && (counselor.counselorId || counselor.id))
      .map(counselor => ({ ...counselor, id: counselor.counselorId || counselor.id })),
    [profileTransferCounselorRows]
  );

  const users =
    combinedRows.filter(
      account => {

        const role =
          String(
            account.role || ""
          )
            .trim()
            .toLowerCase();

        return generalUserRole(
          role
        );
      }
    );


  const [selected, setSelected] =
    useState(null);

  const [selectedCollege, setSelectedCollege] =
    useState(
      isSuperAdmin
        ? "All Colleges / Offices"
        : currentUser.department
    );

  const [selectedProgram, setSelectedProgram] =
    useState("All Programs");

  const [selectedTransferStatus, setSelectedTransferStatus] =
    useState("All Users");


  function isTransferredAccount(account) {
    return account.transferActive === true;
  }

  const collegeOptions =
    Array.from(
      new Set(
        users.map(
          account =>
            String(
              account.department || ""
            ).trim()
        ).filter(Boolean)
      )
    ).sort(
      (a, b) =>
        a.localeCompare(b)
    );


  const usersForProgramOptions =
    users.filter(
      account =>
        (
          !isSuperAdmin ||
          selectedCollege ===
            "All Colleges / Offices" ||
          account.department ===
            selectedCollege
        ) &&
        account.role ===
          "student" &&
        String(
          account.program || ""
        ).trim()
    );


  const programOptions =
    Array.from(
      new Set(
        usersForProgramOptions.map(
          account =>
            String(
              account.program
            ).trim()
        )
      )
    ).sort(
      (a, b) =>
        a.localeCompare(b)
    );


  const visibleUsers =
    users
      .filter(
        account => {

          const collegeMatches =
            !isSuperAdmin ||
            selectedCollege ===
              "All Colleges / Offices" ||
            account.department ===
              selectedCollege;

          const programMatches =
            selectedProgram ===
              "All Programs" ||
            (
              account.role ===
                "student" &&
              account.program ===
                selectedProgram
            );

          const transferred =
            isTransferredAccount(
              account
            );

          const transferMatches =
            selectedTransferStatus ===
              "All Users" ||
            (
              selectedTransferStatus ===
                "Transferred" &&
              transferred
            ) ||
            (
              selectedTransferStatus ===
                "Not Transferred" &&
              !transferred
            );

          return (
            collegeMatches &&
            programMatches &&
            transferMatches
          );
        }
      )
      .sort(
        (a, b) =>
          String(
            a.name || ""
          ).localeCompare(
            String(
              b.name || ""
            )
          )
      );


  function changeCollegeFilter(value) {
    setSelectedCollege(value);
    setSelectedProgram(
      "All Programs"
    );
    setSelected(null);
  }


  function displayRole(role) {

    return systemRoleLabel(
      role
    );
  }


  async function openProfileTransfer(account, counselingProfileState, targetCounselor, linkedConsultation = null) {
    if (currentUser.role !== "counselor" || !account?.id || !targetCounselor?.id) return;
    if (account.transferActive === true || counselingProfileState?.transferActive === true) {
      alert("This student has already completed a one-time counselor transfer.");
      return;
    }
    if (targetCounselor.id === currentUser.id) {
      alert("Choose another active Guidance Counselor.");
      return;
    }
    const reason = window.prompt(`Why transfer ${account.name || "this student"} to ${targetCounselor.name || "the receiving counselor"}?`);
    if (reason === null) return;
    if (!window.confirm("Request this one-time counselor transfer? The receiving counselor must approve it first.")) return;
    try {
      await submitOneTimeCounselorTransfer(
        account.id, targetCounselor.id, reason,
        linkedConsultation?.id || null
      );
      alert("Transfer request sent. The current assignment stays unchanged until approval.");
    } catch (error) {
      console.error("Supabase profile transfer request failed:", error);
      alert(error?.message || "Unable to request the counselor transfer.");
    }
  }

  return (

    <>

      <PageTitle
        title="User Profiles"
        subtitle={
          isSuperAdmin
            ? "Filter users by college/office, program, and transfer status, then open the complete user profile."
            : `View users from ${currentUser.department} together with users formally transferred to you.`
        }
      />




      <section className="panel profile-filter-panel">

        <div className="profile-filter-heading">
          <div>
            <h2>Find Users</h2>
            <p>
              Use the filters below to narrow the user list.
            </p>
          </div>

          <span className="profile-result-count">
            {visibleUsers.length} result{visibleUsers.length === 1 ? "" : "s"}
          </span>
        </div>


        <div className="profile-filter-grid transfer-profile-filter-grid">

          {isSuperAdmin && (
            <label>
              College / Office
              <select
                value={selectedCollege}
                onChange={
                  event =>
                    changeCollegeFilter(
                      event.target.value
                    )
                }
              >
                <option>All Colleges / Offices</option>
                {collegeOptions.map(
                  college => (
                    <option key={college} value={college}>
                      {college}
                    </option>
                  )
                )}
              </select>
            </label>
          )}


          <label>
            Program
            <select
              value={selectedProgram}
              onChange={
                event =>
                  setSelectedProgram(
                    event.target.value
                  )
              }
            >
              <option>All Programs</option>
              {programOptions.map(
                program => (
                  <option key={program} value={program}>
                    {program}
                  </option>
                )
              )}
            </select>
          </label>


          <label>
            Transfer Status
            <select
              value={selectedTransferStatus}
              onChange={
                event =>
                  setSelectedTransferStatus(
                    event.target.value
                  )
              }
            >
              <option>All Users</option>
              <option>Transferred</option>
              <option>Not Transferred</option>
            </select>
          </label>

        </div>

      </section>


      <section className="panel">

        <div className="user-list-heading">
          <div>
            <h2>User List</h2>
            <p>
              A Transferred indicator is shown in the list when the account is available through an approved counselor transfer.
            </p>
          </div>
        </div>


        {loadingUsers
          ? <Empty text="Loading user profiles..." />
          : usersError
            ? <div className="error-box">{usersError}</div>
            : visibleUsers.length === 0
              ? <Empty text="No users match the selected filters." />
              : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>College / Office</th>
                        <th>Program</th>
                        <th>Transfer</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleUsers.map(
                        account => (
                          <tr key={account.id}>
                            <td>{account.name}</td>
                            <td>{displayRole(account.role)}</td>
                            <td>{account.department || "—"}</td>
                            <td>
                              {account.role === "student"
                                ? account.program || "Not provided"
                                : "—"}
                            </td>
                            <td>
                              {isTransferredAccount(account)
                                ? <span className="transferred-table-badge">Transferred</span>
                                : "—"}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="text-button"
                                onClick={() => setSelected(account)}
                              >
                                View Profile
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}

      </section>


      {selected && (
        <UserProfileFullScreen
          key={selected.id}
          profile={selected}
          currentUser={currentUser}
          onClose={() => setSelected(null)}
          onTransferUser={
            currentUser.role ===
              "counselor"
              ? openProfileTransfer
              : null
          }
          transferCounselors={
            profileTransferCounselors
          }
        />
      )}

    </>
  );
}


// ======================================================
// USER NOTIFICATIONS
// ======================================================

function Notifications() {

  const { user } =
    useAuth();


  if (
    !generalUserRole(
      user.role
    ) &&
    user.role !==
      "counselor"
  ) {

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }


  return (
    <UserNotificationsContent
      user={user}
    />
  );
}


function UserNotificationsContent({ user }) {
  const navigate = useNavigate();
  const allRows = useRows("notifications", { ownerId: user.id });
  const [isMutating, setIsMutating] = useState(false);

  // The useRows hook reads only active notifications for this user.
  // Supabase RLS independently enforces the owner restriction.
  const rows = allRows;
  const unreadRows = rows.filter((row) => !row.read);
  const readCount = rows.length - unreadRows.length;

  async function openNotification(
    row
  ) {

    try {

      if (!row.read) {

        await markNotificationRead(row.id);
      }

    } catch (error) {

      console.error(
        "Unable to mark notification as read:",
        error
      );
    }


    if (
      row.sourceType === "consultation" && row.sourceId
    ) {
      navigate(
        user.role === "counselor" ? "/counseling-requests" : "/consultations",
        {
          state: {
            requestId: row.sourceId,
            fromNotification: true
          }
        }
      );
      return;
    }


    if (
      row.sourceType ===
        "assessment" &&
      row.sourceId
    ) {

      // Counselors review assigned assessments in Cases, not Monitoring.
      if (user.role === "counselor") {
        navigate("/cases");
        return;
      }

      navigate(
        "/monitoring",
        {
          state: {
            assessmentId:
              row.sourceId,

            fromNotification:
              true
          }
        }
      );

      return;
    }


    if (
      row.sourceType ===
        "transfer"
    ) {

      navigate(
        "/dashboard",
        {
          state: {
            transferRequestId:
              row.sourceId ||
              row.transferRequestId ||
              ""
          }
        }
      );

      return;
    }


    navigate(
      row.targetPath ||
      "/history"
    );
  }


  async function markAllRead() {
    if (isMutating || unreadRows.length === 0) return;
    setIsMutating(true);
    try {
      await markAllNotificationsRead();
    } catch (error) {
      console.error("Unable to mark all notifications as read:", error);
      alert(error?.message || "Unable to mark all notifications as read.");
    } finally {
      setIsMutating(false);
    }
  }

  async function clearOne(row) {
    if (isMutating || !row?.id) return;
    setIsMutating(true);
    try {
      await clearNotification(row.id);
    } catch (error) {
      console.error("Unable to clear notification:", error);
      alert(error?.message || "Unable to clear the notification.");
    } finally {
      setIsMutating(false);
    }
  }

  async function clearRead() {
    if (isMutating || readCount === 0) return;
    setIsMutating(true);
    try {
      await clearReadNotifications();
    } catch (error) {
      console.error("Unable to clear read notifications:", error);
      alert(error?.message || "Unable to clear read notifications.");
    } finally {
      setIsMutating(false);
    }
  }

  async function clearAll() {
    if (isMutating || rows.length === 0) return;
    if (!window.confirm(
      "Clear all notifications from your list? This cannot be undone. " +
      "Your assessments and counseling records will not be affected."
    )) return;

    setIsMutating(true);
    try {
      await clearAllNotifications();
    } catch (error) {
      console.error("Unable to clear all notifications:", error);
      alert(error?.message || "Unable to clear all notifications.");
    } finally {
      setIsMutating(false);
    }
  }

  if (allRows.loading) {
    return (
      <>
        <PageTitle title="Notifications" subtitle="Updates from your MindTrack activity." />
        <section className="panel" style={{ width: "100%", maxWidth: 950, boxSizing: "border-box", margin: "0 auto" }}>
          <Empty text="Loading notifications..." />
        </section>
      </>
    );
  }

  if (allRows.error) {
    return (
      <>
        <PageTitle title="Notifications" subtitle="Updates from your MindTrack activity." />
        <div className="error-box" style={{ width: "100%", maxWidth: 950, boxSizing: "border-box", margin: "0 auto" }}>
          {allRows.error}
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle
        title="Notifications"
        subtitle={
          user.role === "counselor"
            ? "Updates about counselor transfers and other MindTrack activity."
            : REFERRAL_USER_ROLE_VALUES.includes(user.role)
              ? "Updates about referrals you submitted and their progress."
              : "Updates about your assessments, counseling requests, and counselor transfers."
        }
      />

      <section
        className="panel notification-panel"
        style={{ width: "100%", maxWidth: 950, boxSizing: "border-box", margin: "0 auto" }}
      >
        <div className="notification-panel-heading" style={{ gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2>Your Notifications</h2>
            <p>{unreadRows.length} unread notification{unreadRows.length === 1 ? "" : "s"}</p>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", gap: 8 }}>
            {unreadRows.length > 0 && (
              <button
                type="button"
                className="secondary-button"
                onClick={markAllRead}
                disabled={isMutating}
              >
                Mark all as read
              </button>
            )}
            {readCount > 0 && (
              <button
                type="button"
                className="secondary-button"
                onClick={clearRead}
                disabled={isMutating}
              >
                Clear read
              </button>
            )}
            {rows.length > 0 && (
              <button
                type="button"
                className="secondary-button"
                onClick={clearAll}
                disabled={isMutating}
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {rows.length === 0 ? (
          <Empty text="No notifications yet." />
        ) : (
          <div className="notification-list">
            {rows.map((row) => (
              // Separate sibling buttons avoid invalid nested buttons.
              <div
                key={row.id}
                style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
              >
                <button
                  type="button"
                  className={row.read ? "notification-card" : "notification-card unread"}
                  onClick={() => openNotification(row)}
                  style={{ flex: "1 1 auto", minWidth: 0 }}
                >
                  <div className="notification-icon">
                    <Bell size={19} />
                  </div>
                  <div className="notification-content">
                    <div className="notification-title-row">
                      <strong>{row.title || "MindTrack update"}</strong>
                      {!row.read && (
                        <span className="notification-unread-label">New</span>
                      )}
                    </div>
                    <p>{row.message || "You have a new system update."}</p>
                    <div className="notification-meta-row">
                      <small>{formatRecordDateTime(row.createdAt)}</small>
                      <span className="notification-open-link">View update →</span>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ flexShrink: 0, padding: "10px 12px" }}
                  disabled={isMutating}
                  onClick={() => clearOne(row)}
                  aria-label={`Clear notification: ${row.title || "MindTrack update"}`}
                  title="Clear this notification"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}


// ======================================================
// USER MENTAL HEALTH MONITORING
// ======================================================

function Monitoring() {

  const { user } =
    useAuth();


  if (
    !generalUserRole(
      user.role
    )
  ) {

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }


  // Staff monitor their OWN referrals. Students retain assessment monitoring.
  if (REFERRAL_USER_ROLE_VALUES.includes(user.role)) {
    return <StaffReferralMonitoring user={user} />;
  }

  return (
    <UserMonitoringContent
      user={user}
    />
  );
}


// ======================================================
// TEACHING / NON-TEACHING REFERRAL MONITORING
// ======================================================
// This view reads the same secure Supabase referral RPC used by Referrals.
// The backend limits staff to their own records; the owner filter below is
// an additional UI safeguard, not a replacement for server authorization.
function staffReferralStatus(row) {
  const raw = String(row?.status || "Received").trim();
  const key = raw.toLowerCase();
  if (key === "pending" || key === "received") return "Received";
  if (["under review", "in progress", "contacted"].includes(key)) return "Contacted";
  if (key === "completed") return "Completed";
  return raw;
}

function StaffReferralMonitoring({ user }) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("All");
  const referrals = useRows("referrals", { ownerId: user.id });

  const ownReferrals = useMemo(() => {
    return [...referrals]
      .filter(row =>
        String(row.referrerId || row.ownerId || "") === String(user.id)
      )
      .sort((a, b) => {
        const aTime = recordDateObject(a.createdAt)?.getTime() || 0;
        const bTime = recordDateObject(b.createdAt)?.getTime() || 0;
        return bTime - aTime;
      });
  }, [referrals, user.id]);

  const received = ownReferrals.filter(row => staffReferralStatus(row) === "Received").length;
  const contacted = ownReferrals.filter(row => staffReferralStatus(row) === "Contacted").length;
  const completed = ownReferrals.filter(row => staffReferralStatus(row) === "Completed").length;
  const visibleReferrals = statusFilter === "All"
    ? ownReferrals
    : ownReferrals.filter(row => staffReferralStatus(row) === statusFilter);

  return (
    <>
      <PageTitle
        title="Referral Monitoring"
        subtitle="Track the referrals you submitted and the progress reported by the assigned Guidance Counselor."
      />

      {referrals.loading ? (
        <section className="panel">
          <Empty text="Loading your referrals..." />
        </section>
      ) : referrals.error ? (
        <div className="error-box" role="alert">
          Unable to load your referrals: {referrals.error}
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <Stat title="Total Referrals" value={ownReferrals.length} icon={<ClipboardList />} tone="primary" />
            <Stat title="Received" value={received} icon={<Bell />} tone="info" />
            <Stat title="Contacted" value={contacted} icon={<MessageCircle />} tone="indigo" />
            <Stat title="Completed" value={completed} icon={<CheckCircle2 />} tone="low" />
          </div>

          <section className="panel" style={{ marginTop: 20 }}>
            <div className="user-list-heading">
              <div>
                <h2>My Referral Status</h2>
                <p>Only referrals submitted from your account are shown here.</p>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>Filter</span>
                <select
                  aria-label="Filter referrals by status"
                  value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value)}
                >
                  <option value="All">All statuses</option>
                  <option value="Received">Received</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Completed">Completed</option>
                </select>
              </label>
            </div>

            {ownReferrals.length === 0 ? (
              <div className="monitoring-empty-panel" style={{ textAlign: "center", padding: 20 }}>
                <Users size={38} aria-hidden="true" />
                <h2>No referrals submitted yet</h2>
                <p>Submit a referral first. Its progress will appear here once saved.</p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => navigate("/referrals")}
                >
                  Submit a referral
                </button>
              </div>
            ) : visibleReferrals.length === 0 ? (
              <Empty text={`No referrals with status ${statusFilter}.`} />
            ) : (
              <div className="table-wrap referral-list-table-wrap">
                <table className="referral-list-table">
                  <thead>
                    <tr>
                      <th>Referred person</th>
                      <th>College / Office</th>
                      <th>Program</th>
                      <th>Submitted</th>
                      <th>Urgency</th>
                      <th>Status</th>
                      <th>Assigned Counselor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleReferrals.map(row => (
                      <tr key={row.id}>
                        <td><strong>{row.personName || "Referred person"}</strong></td>
                        <td>{row.department || "Not provided"}</td>
                        <td>{row.program || (row.personType === "Student" ? "Not provided" : "N/A")}</td>
                        <td>{formatRecordDateTime(row.createdAt)}</td>
                        <td>{row.urgency || "Routine"}</td>
                        <td><span className="status">{staffReferralStatus(row)}</span></td>
                        <td>{row.assignedCounselorName || "Not assigned"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {ownReferrals.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => navigate("/referrals")}
                >
                  View referrals / Submit another
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}


function UserMonitoringContent({
  user
}) {

  const navigate =
    useNavigate();


  const location =
    useLocation();


  const assessments =
    useRows(
      "assessmentUserViews",
      {
        ownerId:
          user.id
      }
    );


  const requestedAssessmentId =
    location.state
      ?.assessmentId ||
    "";


  function summaryDateValue(
    row
  ) {

    const date =
      recordDateObject(
        row.createdAt
      );


    return date
      ? date.getTime()
      : 0;
  }


  const reviewedAssessments =
    [...assessments]
      .filter(
        isCounselorReviewedAssessment
      )
      .sort(
        (
          a,
          b
        ) =>
          summaryDateValue(
            b
          ) -
          summaryDateValue(
            a
          )
      );


  const pendingAssessments =
    [...assessments]
      .filter(
        row =>
          !isCounselorReviewedAssessment(
            row
          )
      )
      .sort(
        (
          a,
          b
        ) =>
          summaryDateValue(
            b
          ) -
          summaryDateValue(
            a
          )
      );


  const latest =
    reviewedAssessments[0] ||
    null;


  const previous =
    reviewedAssessments[1] ||
    null;


  function priorityRank(
    priority
  ) {

    const ranks = {
      "Minimal / none":
        1,

      Mild:
        2,

      Moderate:
        3,

      "Moderately severe":
        4,

      Severe:
        5,

      "Extremely Severe":
        6
    };


    return ranks[
      priority
    ] ||
    0;
  }


  function priorityTrend(
    current,
    earlier
  ) {

    if (
      !current ||
      !earlier
    ) {

      return {
        key:
          "insufficient",

        label:
          "Not enough reviewed assessments",

        summary:
          "At least two counselor-reviewed assessments are needed to show a monitoring-severity trend."
      };
    }


    const currentRank =
      priorityRank(
        current.priority
      );


    const earlierRank =
      priorityRank(
        earlier.priority
      );


    if (
      !currentRank ||
      !earlierRank
    ) {

      return {
        key:
          "insufficient",

        label:
          "Not enough comparable records",

        summary:
          "The available reviewed assessments do not contain enough monitoring-severity information for comparison."
      };
    }


    if (
      currentRank <
      earlierRank
    ) {

      return {
        key:
          "improving",

        label:
          "Lower monitoring severity",

        summary:
          "The latest counselor-reviewed assessment has a lower standardized monitoring severity than the previous reviewed assessment."
      };
    }


    if (
      currentRank >
      earlierRank
    ) {

      return {
        key:
          "worsening",

        label:
          "Higher monitoring severity",

        summary:
          "The latest counselor-reviewed assessment has a higher standardized monitoring severity than the previous reviewed assessment."
      };
    }


    return {
      key:
        "stable",

      label:
        "Same monitoring severity",

      summary:
        "The latest and previous counselor-reviewed assessments have the same standardized monitoring severity."
    };
  }


  const trend =
    priorityTrend(
      latest,
      previous
    );


  const notificationAssessment =
    requestedAssessmentId
      ? assessments.find(
          row =>
            row.id ===
              requestedAssessmentId ||
            row.assessmentId ===
              requestedAssessmentId
        )
      : null;


  useEffect(
    () => {

      if (
        !requestedAssessmentId ||
        !notificationAssessment
      ) {

        return undefined;
      }


      const timer =
        window.setTimeout(
          () => {

            const element =
              document.getElementById(
                `monitoring-assessment-${requestedAssessmentId}`
              );


            element?.scrollIntoView({
              behavior:
                "smooth",

              block:
                "center"
            });
          },
          160
        );


      return () =>
        window.clearTimeout(
          timer
        );

    },
    [
      requestedAssessmentId,
      notificationAssessment
    ]
  );


  if (
    assessments.loading
  ) {

    return (
      <>

        <PageTitle
          title="Mental Health Monitoring"
          subtitle="Your monitoring page shows counselor-reviewed status and severity only. Detailed assessment scores are private to authorized Guidance Counselors."
        />


        <section className="panel">

          <Empty
            text="Loading monitoring data..."
          />

        </section>

      </>
    );
  }


  if (
    assessments.error
  ) {

    return (
      <>

        <PageTitle
          title="Mental Health Monitoring"
          subtitle="Your monitoring page shows counselor-reviewed status and severity only. Detailed assessment scores are private to authorized Guidance Counselors."
        />


        <div className="error-box">
          {assessments.error}
        </div>

      </>
    );
  }


  return (

    <>

      <PageTitle
        title="Mental Health Monitoring"
        subtitle="Your monitoring page shows counselor-reviewed status and severity only. Detailed WHO-5, PHQ-9, GAD-7, and DASS-21 scores are visible only to authorized Guidance Counselors and Super Admin."
      />


      {assessments.length ===
        0

        ? (

          <section className="panel monitoring-empty-panel">

            <Activity
              size={42}
            />


            <h2>
              No assessment data yet
            </h2>


            <p>
              Complete a psychological assessment first. After a Guidance
              Counselor reviews it, this page will show your monitoring
              severity and review status without displaying assessment scores.
            </p>


            <button
              type="button"
              className="primary-button"
              onClick={
                () =>
                  navigate(
                    "/assessment"
                  )
              }
            >
              Take an assessment
            </button>

          </section>

        )

        : !latest

          ? (

            <section className="panel monitoring-review-gate">

              <Activity
                size={42}
              />


              <h2>
                Awaiting counselor review
              </h2>


              <p>
                You have submitted an assessment, but MindTrack will not show
                a reviewed monitoring state until a Guidance Counselor reviews
                the case.
              </p>


              <div className="notice">
                Detailed assessment scores are not displayed to users.
                They remain available only to authorized Guidance Counselors
                and Super Admin for case review.
              </div>


              <span className="monitoring-pending-count">
                {
                  pendingAssessments.length
                }
                {" "}
                assessment
                {
                  pendingAssessments.length ===
                    1
                    ? ""
                    : "s"
                }
                {" "}
                awaiting counselor review
              </span>

            </section>

          )

          : (

            <>

              {notificationAssessment && (

                <section className="monitoring-notification-banner">
                  You opened Monitoring from an assessment notification.
                  The information shown below contains only user-visible
                  monitoring details, not assessment scores.
                </section>

              )}


              <section
                id={
                  `monitoring-assessment-${latest.assessmentId || latest.id}`
                }
                className={
                  `panel monitoring-summary-panel ${
                    assessmentPriorityOutlineClassName(
                      latest.priority
                    )
                  }`
                }
              >

                <div className="monitoring-summary-header">

                  <div>

                    <span className="monitoring-kicker">
                      Current Reviewed Monitoring State
                    </span>


                    <h2>
                      Based on your latest counselor-reviewed assessment
                    </h2>


                    <p>
                      Assessment taken:
                      {" "}
                      {
                        formatRecordDateTime(
                          latest.createdAt
                        )
                      }
                    </p>

                  </div>


                  <span
                    className={
                      priorityClassName(
                        latest.priority
                      )
                    }
                  >
                    {
                      latest.priority ||
                      "No severity"
                    }
                  </span>

                </div>


                <div className="monitoring-status-grid">

                  <div className="monitoring-status-item">

                    <span>
                      Counselor Review Status
                    </span>

                    <strong>
                      {
                        assessmentCaseStatusDisplayLabel(
                          latest.status
                        )
                      }
                    </strong>

                  </div>


                  <div className="monitoring-status-item">

                    <span>
                      Reviewed By
                    </span>

                    <strong>
                      {
                        latest.reviewedByName ||
                        "Guidance Counselor"
                      }
                    </strong>

                  </div>

                </div>


                {latest.recommendation && (

                  <div className="monitoring-counselor-note">

                    <strong>
                      Monitoring Recommendation
                    </strong>

                    <p>
                      {
                        latest.recommendation
                      }
                    </p>

                  </div>

                )}


                {latest.counselorRemarks && (

                  <div className="monitoring-counselor-note">

                    <strong>
                      Counselor Remark
                    </strong>

                    <p>
                      {
                        latest.counselorRemarks
                      }
                    </p>

                  </div>

                )}


                <div className="notice monitoring-score-privacy-note">
                  Your detailed WHO-5, PHQ-9, GAD-7, and DASS-21 scores are
                  intentionally hidden on the user side. Authorized Guidance
                  Counselors and Super Admin can review the detailed screening
                  results when managing your assessment case.
                </div>

              </section>


              <section
                className={
                  `panel monitoring-trend-panel ${trend.key}`
                }
              >

                <div className="monitoring-trend-header">

                  <div>

                    <span className="monitoring-kicker">
                      Monitoring Severity Trend
                    </span>

                    <h2>
                      {
                        trend.label
                      }
                    </h2>

                  </div>


                  <Activity
                    size={28}
                  />

                </div>


                <p>
                  {
                    trend.summary
                  }
                </p>


                {previous && (

                  <small>
                    Compared with the previous counselor-reviewed assessment
                    from
                    {" "}
                    {
                      formatRecordDateTime(
                        previous.createdAt
                      )
                    }.
                  </small>

                )}


                <div className="notice monitoring-trend-note">
                  This comparison uses only the counselor-reviewed MindTrack
                  monitoring severity. Numerical assessment scores are not
                  displayed to the user.
                </div>

              </section>


              <section className="panel monitoring-history-panel">

                <div className="monitoring-history-heading">

                  <div>

                    <span className="monitoring-kicker">
                      Assessment History
                    </span>

                    <h2>
                      Reviewed Assessment History
                    </h2>

                    <p>
                      Review status and monitoring severity is shown from
                      newest to oldest. Detailed assessment scores remain
                      counselor-only.
                    </p>

                  </div>


                  <Activity
                    size={26}
                    aria-hidden="true"
                  />

                </div>


                <div className="monitoring-history-list">

                  {reviewedAssessments.map(
                    row => (

                      <article
                        key={
                          row.id
                        }
                        id={
                          `monitoring-assessment-${row.assessmentId || row.id}`
                        }
                        className={
                          `monitoring-history-item ${
                            assessmentPriorityOutlineClassName(
                              row.priority
                            )
                          }`
                        }
                      >

                        <div>

                          <strong>
                            {
                              formatRecordDateTime(
                                row.createdAt
                              )
                            }
                          </strong>

                          <span>
                            {
                              assessmentCaseStatusDisplayLabel(
                                row.status
                              )
                            }
                          </span>

                        </div>


                        <span
                          className={
                            priorityClassName(
                              row.priority
                            )
                          }
                        >
                          {
                            row.priority ||
                            "No severity"
                          }
                        </span>

                      </article>

                    )
                  )}

                </div>

              </section>


              {pendingAssessments.length >
                0 && (

                <section className="panel monitoring-pending-panel">

                  <h2>
                    Awaiting Counselor Review
                  </h2>


                  <p>
                    These assessments are waiting for Guidance Counselor
                    review. Their detailed scores are not shown on the user
                    side.
                  </p>


                  <div className="monitoring-pending-list">

                    {pendingAssessments.map(
                      row => (

                        <div
                          key={
                            row.id
                          }
                          id={
                            `monitoring-assessment-${row.assessmentId || row.id}`
                          }
                          className="monitoring-pending-item"
                        >

                          <strong>
                            {
                              formatRecordDateTime(
                                row.createdAt
                              )
                            }
                          </strong>

                          <span>
                            Awaiting counselor review
                          </span>

                        </div>

                      )
                    )}

                  </div>

                </section>

              )}

            </>

          )
      }

    </>

  );
}


// ======================================================
// HISTORY
// ======================================================

function History() {
  const { user } = useAuth();
  if (REFERRAL_USER_ROLE_VALUES.includes(String(user?.role || "").toLowerCase())) {
    return <StaffReferralHistory user={user} />;
  }
  return <StudentHistory user={user} />;
}

// Teaching and Non-teaching history is referral history, not assessment history.
// Only the signed-in referrer's rows are returned by the secure Supabase RPC.
function StaffReferralHistory({ user }) {
  const navigate = useNavigate();
  const referrals = useRows("referrals", { ownerId: user.id });
  const own = [...referrals]
    .filter(row => String(row.referrerId || row.ownerId || "") === String(user.id))
    .sort((a, b) => (recordDateObject(b.createdAt)?.getTime() || 0) -
      (recordDateObject(a.createdAt)?.getTime() || 0));

  return (
    <>
      <PageTitle
        title="Referral History"
        subtitle="Your submitted guidance referrals and their latest recorded status."
      />
      <section className="panel">
        <div className="user-list-heading">
          <div>
            <h2>My Referral Records</h2>
            <p>Only referrals submitted using your account are listed.</p>
          </div>
          <button type="button" className="secondary-button" onClick={() => navigate("/monitoring")}>
            View referral monitoring
          </button>
        </div>
        {referrals.loading ? (
          <Empty text="Loading referral history..." />
        ) : referrals.error ? (
          <div className="error-box" role="alert">Unable to load referral history: {referrals.error}</div>
        ) : own.length === 0 ? (
          <Empty text="No referral history yet. Submit a referral to start your history." />
        ) : (
          <div className="table-wrap referral-list-table-wrap">
            <table className="referral-list-table">
              <thead>
                <tr>
                  <th>Date Submitted</th>
                  <th>Referred Person</th>
                  <th>College / Office</th>
                  <th>Program</th>
                  <th>Urgency</th>
                  <th>Current Status</th>
                  <th>Assigned Counselor</th>
                </tr>
              </thead>
              <tbody>
                {own.map(row => (
                  <tr key={row.id}>
                    <td>{formatRecordDateTime(row.createdAt)}</td>
                    <td><strong>{row.personName || "Referred person"}</strong></td>
                    <td>{row.department || "Not provided"}</td>
                    <td>{row.program || (row.personType === "Student" ? "Not provided" : "N/A")}</td>
                    <td>{row.urgency || "Routine"}</td>
                    <td><span className="status">{staffReferralStatus(row)}</span></td>
                    <td>{row.assignedCounselorName || "Not assigned"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function StudentHistory({ user }) {


  const assessments =
    useRows(
      "assessmentUserViews",
      {
        ownerId:
          user.id
      }
    );


  const consultations =
    useRows(
      "consultations",
      {
        ownerId:
          user.id
      }
    );


  // Assessment history is already migrated to Supabase.
  // Counseling history is migrated separately, so a legacy
  // consultation error must not hide the assessment records.
  const historyLoading =
    rowsAreLoading(
      assessments
    );


  const historyError =
    firstRowsError(
      assessments
    );


  if (historyLoading) {

    return (
      <>
        <PageTitle
          title="History"
          subtitle="Your own assessment and counseling request records."
        />

        <section className="panel">
          <Empty
            text="Loading assessment history..."
          />
        </section>
      </>
    );
  }


  if (historyError) {

    return (
      <>
        <PageTitle
          title="History"
          subtitle="Your own assessment and counseling request records."
        />

        <div className="error-box">
          {historyError}
        </div>
      </>
    );
  }


  return (

    <>

      <PageTitle
        title="History"
        subtitle="Your own assessment and counseling request records."
      />


      <section className="panel">

        <h2>
          Assessments
        </h2>


        {assessments.length ===
          0

          ? (

            <Empty
              text="No assessment records yet."
            />

          )

          : (

            <div className="table-wrap">

              <table>

                <thead>

                  <tr>

                    <th>
                      Date
                    </th>

                    <th>
                      Monitoring Severity
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Counselor Remark
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {[...assessments]
                    .sort(
                      (
                        a,
                        b
                      ) => {

                        const aDate =
                          recordDateObject(
                            a.createdAt
                          );


                        const bDate =
                          recordDateObject(
                            b.createdAt
                          );


                        return (
                          (bDate?.getTime() || 0) -
                          (aDate?.getTime() || 0)
                        );
                      }
                    )
                    .map(
                      row => (

                        <tr
                          key={
                            row.id
                          }
                        >

                          <td>
                            {
                              formatRecordDateTime(
                                row.createdAt
                              )
                            }
                          </td>


                          <td>

                            <span
                              className={
                                priorityClassName(
                                  row.priority
                                )
                              }
                            >
                              {
                                row.priority ||
                                "No severity"
                              }
                            </span>

                          </td>


                          <td>
                            {
                              assessmentCaseStatusDisplayLabel(
                                row.status
                              )
                            }
                          </td>


                          <td>
                            {
                              row.counselorRemarks ||
                              "No counselor remark."
                            }
                          </td>

                        </tr>

                      )
                    )
                  }

                </tbody>

              </table>

            </div>

          )
        }


        <div
          className="notice"
          style={{
            marginTop:
              "14px"
          }}
        >
          Detailed WHO-5, PHQ-9, GAD-7, and DASS-21 scores are hidden from
          the user History page and are available only to authorized Guidance
          Counselors and Super Admin.
        </div>

      </section>


      <section className="panel">

        <h2>
          Counseling Requests
        </h2>


        {consultations.loading

          ? (

            <Empty
              text="Loading counseling request history..."
            />

          )

          : consultations.error

            ? (

              <div className="notice">
                Counseling request history is still being migrated to Supabase.
                Your assessment history above is already available and is not affected.
              </div>

            )

            : consultations.length === 0

              ? (

                <Empty
                  text="No counseling request records yet."
                />

              )

              : consultations.map(
                  row => (

                    <article
                      key={
                        row.id
                      }
                      className="record-card"
                    >

                      <strong>
                        {
                          row.category
                        }
                      </strong>

                      <span className="status">
                        {
                          row.status
                        }
                      </span>

                      <p>

                        {
                          row.date
                        }

                        {" · "}

                        {
                          row.time
                        }

                      </p>

                    </article>

                  )
                )
        }

      </section>

    </>

  );
}


// ======================================================
// CASE MANAGEMENT
// ======================================================

function Cases() {

  const { user } =
    useAuth();


  const isSuperAdmin =
    user.role ===
    "super_admin";


  // Assessment Cases are now loaded through the Supabase
  // get_assessment_cases RPC. The database function applies
  // counselor / Super Admin access rules and also includes
  // users whose current counselor assignment was transferred.
  const assessmentRows =
    useRows(
      "assessments"
    );


  const rows =
    assessmentRows;


  const casesLoading =
    assessmentRows.loading;


  const casesError =
    assessmentRows.error;


  function ownerKey(
    row
  ) {

    if (row.ownerId) {
      return row.ownerId;
    }


    return [
      "legacy",
      row.ownerName || "unknown",
      row.department || "unknown",
      row.program || "unknown"
    ].join("::");
  }


  function assessmentDateValue(
    row
  ) {

    const date =
      recordDateObject(
        row.createdAt
      );


    return date
      ? date.getTime()
      : 0;
  }


  const groupedCases =
    new Map();


  rows.forEach(
    row => {

      const key =
        ownerKey(row);


      if (
        !groupedCases.has(
          key
        )
      ) {

        groupedCases.set(
          key,
          []
        );
      }


      groupedCases
        .get(key)
        .push(row);
    }
  );


  const accountCaseRows =
    Array.from(
      groupedCases.entries()
    )
      .map(
        ([
          key,
          history
        ]) => {

          const sortedHistory =
            [...history]
              .sort(
                (a, b) =>
                  assessmentDateValue(b) -
                  assessmentDateValue(a)
              );


          const latest =
            sortedHistory[0];


          return {
            ...latest,

            assessmentOwnerKey:
              key,

            assessmentCount:
              sortedHistory.length
          };
        }
      )
      .sort(
        (a, b) =>
          assessmentDateValue(b) -
          assessmentDateValue(a)
      );


  const [
    collegeFilter,
    setCollegeFilter
  ] = useState("all");


  const [
    programFilter,
    setProgramFilter
  ] = useState("all");


  const [
    priorityFilter,
    setPriorityFilter
  ] = useState("all");


  const caseCollegeOptions =
    Array.from(
      new Set(
        accountCaseRows.map(
          row =>
            counselorCollegeLabel(
              row.department
            )
        )
      )
    )
      .sort(
        (a, b) =>
          a.localeCompare(b)
      );


  const caseRowsForProgramOptions =
    accountCaseRows.filter(
      row => {

        if (
          !isSuperAdmin ||
          collegeFilter === "all"
        ) {

          return true;
        }


        return (
          counselorCollegeLabel(
            row.department
          ) ===
          collegeFilter
        );
      }
    );


  const caseProgramOptions =
    Array.from(
      new Set(
        caseRowsForProgramOptions.map(
          row =>
            counselorProgramLabel(
              row.program
            )
        )
      )
    )
      .sort(
        (a, b) =>
          a.localeCompare(b)
      );


  const filteredCaseRows =
    accountCaseRows.filter(
      row => {

        const college =
          counselorCollegeLabel(
            row.department
          );


        const program =
          counselorProgramLabel(
            row.program
          );


        const priority =
          String(
            row.priority || ""
          ).trim() ||
          "No Assessment";


        const matchesCollege =
          !isSuperAdmin ||
          collegeFilter === "all" ||
          college ===
            collegeFilter;


        const matchesProgram =
          programFilter === "all" ||
          program ===
            programFilter;


        const matchesPriority =
          isSuperAdmin ||
          priorityFilter === "all" ||
          priority ===
            priorityFilter;


        return (
          matchesCollege &&
          matchesProgram &&
          matchesPriority
        );
      }
    );


  const [
    selectedOwnerKey,
    setSelectedOwnerKey
  ] = useState("");


  const [
    selected,
    setSelected
  ] = useState(null);


  const [
    statusDraft,
    setStatusDraft
  ] = useState("For review");


  const [
    remarksDraft,
    setRemarksDraft
  ] = useState("");


  const [
    savingCase,
    setSavingCase
  ] = useState(false);


  const [
    deletingAssessmentId,
    setDeletingAssessmentId
  ] = useState("");


  const assessmentStatuses = [
    "For review",
    "Counseling is recommended",
    "Follow up is recommended",
    "Counseling is optional",
    "Approved",
    "Concluded"
  ];


  function allowedAssessmentStatuses(
    currentStatus
  ) {
    if (currentStatus === "Concluded") {
      return ["Concluded"];
    }

    if (currentStatus === "Approved") {
      return ["Approved", "Concluded"];
    }

    return assessmentStatuses;
  }


  const selectedHistory =
    selectedOwnerKey
      ? rows
          .filter(
            row =>
              ownerKey(row) ===
              selectedOwnerKey
          )
          .sort(
            (a, b) =>
              assessmentDateValue(b) -
              assessmentDateValue(a)
          )
      : [];


  function selectAssessmentVersion(
    row
  ) {

    setSelected(row);


    const normalizedStatus =
      assessmentCaseStatusLabel(
        row.status
      );


    setStatusDraft(
      assessmentStatuses.includes(
        normalizedStatus
      )
        ? normalizedStatus
        : "For review"
    );


    setRemarksDraft(
      row.counselorRemarks ||
      ""
    );
  }


  function selectAssessmentAccount(
    row
  ) {

    setSelectedOwnerKey(
      row.assessmentOwnerKey ||
      ownerKey(row)
    );


    selectAssessmentVersion(
      row
    );
  }


  function closeAssessmentReview() {

    setSelected(null);
    setSelectedOwnerKey("");
  }


  useEffect(
    () => {

      if (!selected) {
        return undefined;
      }


      const previousOverflow =
        document.body.style.overflow;


      function closeOnEscape(
        event
      ) {

        if (
          event.key ===
          "Escape"
        ) {

          closeAssessmentReview();
        }
      }


      document.body.style.overflow =
        "hidden";


      window.addEventListener(
        "keydown",
        closeOnEscape
      );


      return () => {

        document.body.style.overflow =
          previousOverflow;


        window.removeEventListener(
          "keydown",
          closeOnEscape
        );
      };

    },

    [selected]
  );


  async function deleteSelectedAssessmentRecord() {

    if (
      !isSuperAdmin ||
      !selected?.id
    ) {

      return;
    }


    if (
      !superAdminDeleteConfirmed(
        "psychological assessment",
        selected.ownerName
      )
    ) {

      return;
    }


    try {

      setDeletingAssessmentId(
        selected.id
      );


      await deleteAssessmentCase(
        selected.id
      );


      closeAssessmentReview();


      alert(
        "Assessment cleanup completed. The Supabase assessment was deleted and the user's assessment lock was repaired."
      );

    } catch (error) {

      console.error(
        "Unable to permanently clean up the assessment:",
        error
      );


      alert(
        error?.message ||
        "Unable to delete the assessment safely."
      );

    } finally {

      setDeletingAssessmentId(
        ""
      );
    }
  }


  async function saveAssessmentUpdate() {

    if (!selected) {
      return;
    }


    if (
      !allowedAssessmentStatuses(
        selected.status
      ).includes(statusDraft)
    ) {

      alert(
        "This assessment status transition is not allowed."
      );

      return;
    }


    try {

      setSavingCase(true);


      await updateAssessmentCase({

        assessmentId:
          selected.id,

        status:
          statusDraft,

        remarks:
          remarksDraft

      });


      setSelected(
        current => ({

          ...current,

          counselorRemarks:
            remarksDraft,

          status:
            statusDraft,

          ...(user.role ===
            "counselor"
            ? {
                reviewed:
                  statusDraft !==
                  "For review",

                reviewedById:
                  user.id,

                reviewedByName:
                  user.name ||
                  "Guidance Counselor",

                reviewedByRole:
                  "counselor"
              }
            : {})

        })
      );


      alert(
        "Psychological assessment case updated successfully."
      );

    } catch (err) {

      console.error(
        "Psychological assessment case update error:",
        err
      );


      alert(
        err?.message ||
        "Unable to update the psychological assessment case."
      );

    } finally {

      setSavingCase(false);
    }
  }


  function assessmentAnswerLabel(
    value,
    choices
  ) {

    if (
      value ===
        undefined ||
      value ===
        null
    ) {

      return "Not answered";
    }


    const matchedChoice =
      choices.find(
        choice =>
          String(
            choice.value
          ) ===
          String(
            value
          )
      );


    if (!matchedChoice) {

      return String(
        value
      );
    }


    return matchedChoice.helper
      ? `${matchedChoice.label} — ${matchedChoice.helper}`
      : matchedChoice.label;
  }


  function renderAssessmentAnswerGroup(
    title,
    questions,
    choices,
    answers
  ) {

    return (

      <section className="assessment-answer-instrument">

        <div className="assessment-answer-instrument-heading">

          <h4>
            {title}
          </h4>

          <span>
            {
              questions.filter(
                question =>
                  answers?.[
                    question.id
                  ] !==
                    undefined
              ).length
            }
            /
            {
              questions.length
            }
            {" "}
            answered
          </span>

        </div>


        <div className="assessment-answer-list">

          {questions.map(
            (
              question,
              index
            ) => (

              <article
                className="assessment-answer-item"
                key={
                  question.id
                }
              >

                <div className="assessment-answer-question">

                  <span>
                    {index + 1}
                  </span>

                  <p>
                    {question.text}
                  </p>

                </div>


                <div className="assessment-answer-response">

                  <small>
                    User's answer
                  </small>

                  <strong>
                    {
                      assessmentAnswerLabel(
                        answers?.[
                          question.id
                        ],
                        choices
                      )
                    }
                  </strong>

                </div>

              </article>

            )
          )}

        </div>

      </section>

    );
  }


  function renderAssessmentAnswers(
    row
  ) {

    if (
      user.role !==
        "counselor"
    ) {

      return null;
    }


    if (
      !row?.answers ||
      typeof row.answers !==
        "object"
    ) {

      return (

        <div className="notice assessment-answers-unavailable">
          This older assessment does not contain saved item-level answers.
          The scoring summary remains available for counselor review.
        </div>

      );
    }


    return (

      <div className="assessment-answer-review">

        <div className="assessment-answer-review-heading">

          <div>

            <span className="assessment-answer-review-kicker">
              Counselor-only
            </span>

            <h3>
              User's Psychological Assessment Answers
            </h3>

            <p>
              Review the user's selected response for every screening item.
              These item-level answers are not shown on the user side.
            </p>

          </div>

        </div>


        {
          renderAssessmentAnswerGroup(
            "WHO-5 Well-Being Index",
            who5Questions,
            who5Choices,
            row.answers
          )
        }


        {
          renderAssessmentAnswerGroup(
            "PHQ-9",
            phq9Questions,
            phq9Choices,
            row.answers
          )
        }


        <div className="assessment-answer-difficulty">

          <span>
            PHQ-9 Functional Difficulty
          </span>

          <strong>
            {
              row.instrumentResults
                ?.phq9
                ?.difficulty ||
              row.phq9Difficulty ||
              "Not provided"
            }
          </strong>

        </div>


        {
          renderAssessmentAnswerGroup(
            "GAD-7",
            gad7Questions,
            gad7Choices,
            row.answers
          )
        }


        {
          renderAssessmentAnswerGroup(
            "DASS-21",
            dass21Questions,
            dass21Choices,
            row.answers
          )
        }

      </div>

    );
  }


  function renderHistoryScores(
    row
  ) {

    if (!row.instrumentResults) {

      return (

        <div className="assessment-history-score-list">

          <span>
            Legacy score:
            {" "}
            {
              row.score ??
              "—"
            }
          </span>

        </div>

      );
    }


    const dass =
      row.instrumentResults
        ?.dass21;


    return (

      <div className="assessment-history-score-list">

        <span>
          WHO-5:
          {" "}
          {
            row.instrumentResults
              ?.who5
              ?.percentageScore ??
            "—"
          }/100
        </span>


        <span>
          PHQ-9:
          {" "}
          {
            row.instrumentResults
              ?.phq9
              ?.totalScore ??
            "—"
          }/27
        </span>


        <span>
          GAD-7:
          {" "}
          {
            row.instrumentResults
              ?.gad7
              ?.totalScore ??
            "—"
          }/21
        </span>


        {dass?.depression

          ? (

            <>

              <span>
                DASS-D:
                {" "}
                {
                  dass.depression
                    .adjustedScore
                }/42
              </span>

              <span>
                DASS-A:
                {" "}
                {
                  dass.anxiety
                    .adjustedScore
                }/42
              </span>

              <span>
                DASS-S:
                {" "}
                {
                  dass.stress
                    .adjustedScore
                }/42
              </span>

            </>

          )

          : (

            <span>
              DASS-21:
              {" "}
              {
                dass?.totalScore ??
                "—"
              }/63
            </span>

          )
        }

      </div>

    );
  }


  if (casesLoading) {

    return (
      <>
        <PageTitle
          title={
            isSuperAdmin
              ? "All Psychological Assessment Cases"
              : "Psychological Assessment Cases"
          }
          subtitle="One account is shown per user. Open Review to see the user's complete assessment history and manage individual assessment records."
        />

        <section className="panel">
          <Empty
            text="Loading assessment cases..."
          />
        </section>
      </>
    );
  }


  if (casesError) {

    return (
      <>
        <PageTitle
          title={
            isSuperAdmin
              ? "All Psychological Assessment Cases"
              : "Psychological Assessment Cases"
          }
          subtitle="One account is shown per user. Open Review to see the user's complete assessment history and manage individual assessment records."
        />

        <div className="error-box">
          {casesError}
        </div>
      </>
    );
  }


  return (

    <>

      <PageTitle

        title={
          isSuperAdmin
            ? "All Psychological Assessment Cases"
            : "Psychological Assessment Cases"
        }

        subtitle="One account is shown per user. Open Review to see the user's complete assessment history and manage individual assessment records."

      />


      <section className="panel counselor-filter-panel">

        <div className="counselor-filter-heading">

          <div>

            <h2>
              Filter Assessment Cases
            </h2>

            <p>
              {
                isSuperAdmin
                  ? "Filter user cases by college, program, and latest monitoring severity."
                  : "Filter user cases by program and latest monitoring severity."
              }
            </p>

          </div>


          <span className="counselor-filter-count">
            {
              filteredCaseRows.length
            }
            {" "}
            of
            {" "}
            {
              accountCaseRows.length
            }
            {" "}
            accounts
          </span>

        </div>


        <div
          className="counselor-filter-grid"
        >

          {isSuperAdmin && (

            <label>

              College / Office

              <select
                value={collegeFilter}
                onChange={
                  event => {

                    setCollegeFilter(
                      event.target.value
                    );

                    setProgramFilter(
                      "all"
                    );
                  }
                }
              >

                <option value="all">
                  All colleges / offices
                </option>

                {caseCollegeOptions.map(
                  college => (

                    <option
                      key={college}
                      value={college}
                    >
                      {college}
                    </option>

                  )
                )}

              </select>

            </label>

          )}


          <label>

            Program

            <select
              value={programFilter}
              onChange={
                event =>
                  setProgramFilter(
                    event.target.value
                  )
              }
            >

              <option value="all">
                All programs
              </option>

              {caseProgramOptions.map(
                program => (

                  <option
                    key={program}
                    value={program}
                  >
                    {program}
                  </option>

                )
              )}

            </select>

          </label>


          <label>

            Severity

            <select
              value={priorityFilter}
              onChange={
                event =>
                  setPriorityFilter(
                    event.target.value
                  )
              }
            >

              <option value="all">
                All severities
              </option>

              <option value="Minimal / none">
                Minimal / none
              </option>

              <option value="Mild">
                Mild
              </option>

              <option value="Moderate">
                Moderate
              </option>

              <option value="Moderately severe">
                Moderately severe
              </option>

              <option value="Severe">
                Severe
              </option>

              <option value="Extremely Severe">
                Extremely Severe
              </option>

            </select>

          </label>

        </div>

      </section>


      <section className="panel">

        <h2>
          Assessment Cases
        </h2>


        <AssessmentAccountTable

          rows={
            filteredCaseRows
          }

          onSelect={
            selectAssessmentAccount
          }

          showCollege={
            isSuperAdmin
          }

        />

      </section>


      {selected && (

        <div

          className="review-request-modal-backdrop"

          role="presentation"

          onMouseDown={
            event => {

              if (
                event.target ===
                event.currentTarget
              ) {

                closeAssessmentReview();
              }
            }
          }

        >

          <section

            className="review-request-modal assessment-history-review-modal"

            role="dialog"

            aria-modal="true"

            aria-label={
              `Review psychological assessment history for ${
                selected.ownerName ||
                "user"
              }`
            }

          >

            <header className="review-request-modal-header">

              <div>

                <p className="review-request-modal-eyebrow">
                  Psychological Assessment Case
                </p>


                <div className="review-request-modal-title-row">

                  <h2>
                    {
                      selected.ownerName ||
                      "User"
                    }
                  </h2>


                  <span
                    className={
                      priorityClassName(
                        selected.priority
                      )
                    }
                  >

                    {
                      selected.priority ||
                      "No severity"
                    }

                  </span>

                </div>


                <p className="review-request-modal-subtitle">
                  {
                    selectedHistory.length
                  }
                  {" "}
                  assessment
                  {
                    selectedHistory.length === 1
                      ? ""
                      : "s"
                  }
                  {" "}
                  recorded for this account. Select an assessment below to review its item-level answers, scoring summary, details, and review status.
                </p>

              </div>


              <div className="review-request-modal-header-actions">

                {isSuperAdmin && (

                  <button
                    type="button"
                    className="danger-button review-request-header-delete-button"
                    onClick={
                      deleteSelectedAssessmentRecord
                    }
                    disabled={
                      deletingAssessmentId ===
                      selected.id
                    }
                    title="Delete this psychological assessment record"
                  >
                    {
                      deletingAssessmentId ===
                        selected.id
                        ? "Deleting..."
                        : "Delete assessment"
                    }
                  </button>

                )}


                <button

                  type="button"

                  className="review-request-close-button"

                  onClick={
                    closeAssessmentReview
                  }

                  aria-label="Close psychological assessment review"

                  title="Close"

                >
                  ×
                </button>

              </div>

            </header>


            <div className="review-request-modal-body assessment-history-review-body">

              <section className="review-request-modal-card assessment-user-history-card">

                <div className="assessment-history-heading">

                  <div>

                    <h3>
                      Assessment History
                    </h3>

                    <p>
                      Newest assessment first. Open an assessment to review the user's item-level answers and scoring summary.
                    </p>

                  </div>

                </div>


                <div className="assessment-history-list">

                  {selectedHistory.map(
                    row => (

                      <button

                        type="button"

                        key={
                          row.id
                        }

                        className={
                          `${
                            row.id ===
                              selected.id
                              ? "assessment-history-item active"
                              : "assessment-history-item"
                          } ${
                            assessmentPriorityOutlineClassName(
                              row.priority
                            )
                          }`
                        }

                        onClick={
                          () =>
                            selectAssessmentVersion(
                              row
                            )
                        }

                      >

                        <div className="assessment-history-item-top">

                          <div>

                            <strong>
                              {
                                formatRecordDateTime(
                                  row.createdAt
                                )
                              }
                            </strong>

                            <small>
                              {
                                assessmentCaseStatusDisplayLabel(
                                  row.status
                                )
                              }
                            </small>

                          </div>


                          <span
                            className={
                              priorityClassName(
                                row.priority
                              )
                            }
                          >
                            {
                              row.priority ||
                              "No severity"
                            }
                          </span>

                        </div>


                        {
                          renderHistoryScores(
                            row
                          )
                        }


                        <span className="assessment-history-open-label">
                          {
                            row.id ===
                              selected.id
                              ? "Currently viewing"
                              : "View this assessment"
                          }
                        </span>

                      </button>

                    )
                  )}

                </div>

              </section>


              <section className="review-request-modal-card assessment-selected-detail-card">

                <div className="assessment-selected-detail-heading">

                  <div>

                    <h3>
                      Selected Assessment Details
                    </h3>

                    <p>
                      {
                        formatRecordDateTime(
                          selected.createdAt
                        )
                      }
                    </p>

                  </div>

                </div>


                {selected.instrumentResults

                  ? (

                    <>

                      <div className="assessment-review-score-grid">

                        <div className="review-request-detail-item">

                          <span>
                            WHO-5
                          </span>

                          <strong>
                            {
                              selected.instrumentResults
                                ?.who5
                                ?.percentageScore
                            }/100
                          </strong>

                          <small>
                            Raw:
                            {" "}
                            {
                              selected.instrumentResults
                                ?.who5
                                ?.rawScore
                            }/25
                          </small>

                          <p>
                            {
                              selected.instrumentResults
                                ?.who5
                                ?.interpretation
                            }
                          </p>

                        </div>


                        <div className="review-request-detail-item">

                          <span>
                            PHQ-9
                          </span>

                          <strong>
                            {
                              selected.instrumentResults
                                ?.phq9
                                ?.totalScore
                            }/27
                          </strong>

                          <small>
                            {
                              selected.instrumentResults
                                ?.phq9
                                ?.severity
                            }
                            {" "}
                            symptom range
                          </small>

                        </div>


                        <div className="review-request-detail-item">

                          <span>
                            GAD-7
                          </span>

                          <strong>
                            {
                              selected.instrumentResults
                                ?.gad7
                                ?.totalScore
                            }/21
                          </strong>

                          <small>
                            {
                              selected.instrumentResults
                                ?.gad7
                                ?.severity
                            }
                            {" "}
                            symptom range
                          </small>

                        </div>


                        {selected.instrumentResults
                          ?.dass21
                          ?.depression

                          ? (

                            <>

                              <div className="review-request-detail-item">

                                <span>
                                  DASS-21 Depression
                                </span>

                                <strong>
                                  {
                                    selected.instrumentResults
                                      .dass21
                                      .depression
                                      .adjustedScore
                                  }/42
                                </strong>

                                <small>
                                  Raw:
                                  {" "}
                                  {
                                    selected.instrumentResults
                                      .dass21
                                      .depression
                                      .rawScore
                                  }/21
                                </small>

                              </div>


                              <div className="review-request-detail-item">

                                <span>
                                  DASS-21 Anxiety
                                </span>

                                <strong>
                                  {
                                    selected.instrumentResults
                                      .dass21
                                      .anxiety
                                      .adjustedScore
                                  }/42
                                </strong>

                                <small>
                                  Raw:
                                  {" "}
                                  {
                                    selected.instrumentResults
                                      .dass21
                                      .anxiety
                                      .rawScore
                                  }/21
                                </small>

                              </div>


                              <div className="review-request-detail-item">

                                <span>
                                  DASS-21 Stress
                                </span>

                                <strong>
                                  {
                                    selected.instrumentResults
                                      .dass21
                                      .stress
                                      .adjustedScore
                                  }/42
                                </strong>

                                <small>
                                  Raw:
                                  {" "}
                                  {
                                    selected.instrumentResults
                                      .dass21
                                      .stress
                                      .rawScore
                                  }/21
                                </small>

                              </div>

                            </>

                          )

                          : (

                            <div className="review-request-detail-item">

                              <span>
                                DASS-21 Legacy Total
                              </span>

                              <strong>
                                {
                                  selected.instrumentResults
                                    ?.dass21
                                    ?.totalScore ??
                                  "—"
                                }/63
                              </strong>

                              <small>
                                Older record without separate subscale scores
                              </small>

                            </div>

                          )
                        }

                      </div>


                      <div className="review-request-detail-grid assessment-review-meta-grid">

                        <div className="review-request-detail-item">

                          <span>
                            Standardized Monitoring Severity
                          </span>

                          <strong>
                            {
                              selected.priority ||
                              "Not available"
                            }
                          </strong>

                        </div>


                        <div className="review-request-detail-item">

                          <span>
                            PHQ-9 Functional Difficulty
                          </span>

                          <strong>
                            {
                              selected.instrumentResults
                                ?.phq9
                                ?.difficulty ||
                              selected.phq9Difficulty ||
                              "Not provided"
                            }
                          </strong>

                        </div>


                        <div className="review-request-detail-item">

                          <span>
                            College / Office
                          </span>

                          <strong>
                            {
                              selected.department ||
                              "Not provided"
                            }
                          </strong>

                        </div>


                        <div className="review-request-detail-item">

                          <span>
                            Program
                          </span>

                          <strong>
                            {
                              selected.program ||
                              "Not provided"
                            }
                          </strong>

                        </div>


                        <div className="review-request-detail-item full">

                          <span>
                            Monitoring Recommendation
                          </span>

                          <strong className="review-request-details-text">
                            {
                              selected.recommendation ||
                              "No recommendation available."
                            }
                          </strong>

                        </div>


                        {selected.notes && (

                          <div className="review-request-detail-item full">

                            <span>
                              User's Additional Notes
                            </span>

                            <strong className="review-request-details-text">
                              {
                                selected.notes
                              }
                            </strong>

                          </div>

                        )}

                      </div>

                    </>

                  )

                  : (

                    <div className="review-request-detail-grid">

                      <div className="review-request-detail-item">

                        <span>
                          Legacy Monitoring Score
                        </span>

                        <strong>
                          {
                            selected.score ??
                            "Not available"
                          }

                          {
                            selected.score !==
                            undefined &&
                            selected.score !==
                            null
                              ? "/100"
                              : ""
                          }
                        </strong>

                      </div>


                      <div className="review-request-detail-item">

                        <span>
                          Severity Level
                        </span>

                        <strong>
                          {
                            selected.priority ||
                            "Not available"
                          }
                        </strong>

                      </div>


                      <div className="review-request-detail-item">

                        <span>
                          College / Office
                        </span>

                        <strong>
                          {
                            selected.department ||
                            "Not provided"
                          }
                        </strong>

                      </div>


                      <div className="review-request-detail-item">

                        <span>
                          Program
                        </span>

                        <strong>
                          {
                            selected.program ||
                            "Not provided"
                          }
                        </strong>

                      </div>


                      <div className="review-request-detail-item full">

                        <span>
                          System Recommendation
                        </span>

                        <strong className="review-request-details-text">
                          {
                            selected.recommendation ||
                            "No recommendation available."
                          }
                        </strong>

                      </div>


                      {selected.notes && (

                        <div className="review-request-detail-item full">

                          <span>
                            User's Additional Notes
                          </span>

                          <strong className="review-request-details-text">
                            {
                              selected.notes
                            }
                          </strong>

                        </div>

                      )}

                    </div>

                  )
                }

              </section>


              {user.role ===
                "counselor" && (

                <section className="review-request-modal-card assessment-answer-review-card">

                  {
                    renderAssessmentAnswers(
                      selected
                    )
                  }

                </section>

              )}


              <section className="review-request-modal-card review-request-update-card assessment-case-update-card">

                <h3>
                  {
                    isSuperAdmin
                      ? "Case Review"
                      : "Counselor Review"
                  }
                </h3>


                <p className="assessment-review-record-note">
                  Changes below apply only to the currently selected assessment dated
                  {" "}
                  {
                    formatRecordDateTime(
                      selected.createdAt
                    )
                  }.
                </p>


                <label>

                  Status

                  <select

                    value={
                      statusDraft
                    }

                    onChange={
                      event =>
                        setStatusDraft(
                          event.target.value
                        )
                    }

                  >

                    {allowedAssessmentStatuses(
                      selected.status
                    ).map(
                      status => (

                        <option
                          key={status}
                          value={status}
                        >
                          {assessmentCaseStatusDisplayLabel(
                            status
                          )}
                        </option>

                      )
                    )}

                  </select>

                </label>


                <label>

                  {
                    isSuperAdmin
                      ? "Case remarks"
                      : "Counselor remarks"
                  }

                  <textarea

                    rows="9"

                    value={
                      remarksDraft
                    }

                    onChange={
                      event =>
                        setRemarksDraft(
                          event.target.value
                        )
                    }

                    placeholder="Add remarks, recommendations, or instructions."

                  />

                </label>


                {selected.status ===
                  "Concluded" && (

                  <div className="notice">

                    <strong>
                      Assessment concluded
                    </strong>

                    <p style={{ marginBottom: 0 }}>
                      Once the student's assessment eligibility status is
                      Concluded, they may start a new assessment without a
                      waiting period. Only one assessment may be active at a time.
                    </p>

                  </div>

                )}


                {isSuperAdmin && (

                  <div className="superadmin-cleanup-zone">

                    <div>

                      <strong>
                        Super Admin test-data cleanup
                      </strong>

                      <p>
                        Permanently delete only an erroneous or test assessment.
                        MindTrack will also repair the user's assessment lock.
                      </p>

                    </div>


                    <button
                      type="button"
                      className="danger-button superadmin-cleanup-delete-button"
                      title="Delete assessment"
                      disabled={
                        deletingAssessmentId ===
                        selected.id
                      }
                      onClick={
                        deleteSelectedAssessmentRecord
                      }
                    >
                      {
                        deletingAssessmentId ===
                          selected.id
                          ? "Deleting assessment..."
                          : "Delete assessment"
                      }
                    </button>

                  </div>

                )}


                <div className="review-request-modal-actions">

                  <button

                    type="button"

                    className="secondary-button"

                    onClick={
                      closeAssessmentReview
                    }

                  >
                    Close
                  </button>


                  <button

                    type="button"

                    className="primary-button"

                    disabled={
                      savingCase
                    }

                    onClick={
                      saveAssessmentUpdate
                    }

                  >

                    {
                      savingCase
                        ? "Saving..."
                        : "Save case update"
                    }

                  </button>

                </div>

              </section>

            </div>

          </section>

        </div>

      )}

    </>

  );
}


// ======================================================
// COUNSELING REQUEST MANAGEMENT
// Counselor / Super Admin
// ======================================================

function CounselingRequestsManagement() {

  const { user } =
    useAuth();


  const location =
    useLocation();


  const navigate =
    useNavigate();


  const allowedRoles = [
    "counselor",
    "super_admin"
  ];


  const hasAccess =
    allowedRoles.includes(
      user.role
    );


  const isSuperAdmin =
    user.role ===
    "super_admin";


  // A counseling request that is already assigned to another
  // counselor remains viewable for record continuity, but the
  // former counselor must not be able to change it.
  function requestIsReadOnly(
    row
  ) {

    return Boolean(
      user.role ===
        "counselor" &&
      row?.assignedCounselorId &&
      row.assignedCounselorId !==
        user.id
    );
  }


  const departmentConsultations =
    useRows(
      "consultations",
      !hasAccess
        ? {
            ownerId:
              "__NO_ACCESS__"
          }
        : isSuperAdmin
          ? {}
          : {
              department:
                user.department
            }
    );


  const assignedConsultations =
    useRows(
      "consultations",
      !hasAccess ||
      isSuperAdmin
        ? {
            ownerId:
              "__NO_ACCESS__"
          }
        : {
            assignedCounselorId:
              user.id
          }
    );


  const rows =
    useMemo(
      () =>
        isSuperAdmin
          ? departmentConsultations
          : mergeRowsById(
              departmentConsultations,
              assignedConsultations
            ),
      [
        isSuperAdmin,
        departmentConsultations,
        assignedConsultations
      ]
    );


  // Assessment visibility is enforced by get_assessment_cases RPC.
  // College-only filtering would hide students transferred to this counselor.
  const assessmentRows =
    useRows(
      "assessments",
      !hasAccess
        ? {
            ownerId:
              "__NO_ACCESS__"
          }
        : {}
    );


  const counselors =
    useRows(
      "counselorDirectory",
      {
        active:
          true
      }
    );


  const transferCounselorOptions =
    useMemo(
      () =>
        counselors
          .filter(
            counselor =>
              counselor.active ===
                true &&
              Boolean(
                counselor.counselorId ||
                counselor.id
              )
          )
          .map(
            counselor => ({
              ...counselor,

              id:
                counselor.counselorId ||
                counselor.id
            })
          ),
      [
        counselors
      ]
    );


  // The Supabase RPC already restricts transfers to authorized participants.
  const transferRequests = useRows("transferRequests", {});


  const latestAssessmentByOwner =
    useMemo(
      () => {

        const map = {};


        assessmentRows.forEach(
          assessment => {

            const ownerId =
              assessment.ownerId;


            if (
              ownerId &&
              !map[
                ownerId
              ]
            ) {

              map[
                ownerId
              ] = assessment;
            }
          }
        );


        return map;
      },
      [
        assessmentRows
      ]
    );


  const enrichedRows =
    useMemo(
      () =>
        rows.map(
          row => {

            const latestAssessment =
              latestAssessmentByOwner[
                row.ownerId
              ];


            return {

              ...row,

              role:
                row.role ||
                latestAssessment
                  ?.role ||
                "",

              program:
                row.program ||
                latestAssessment
                  ?.program ||
                "",

              priority:
                latestAssessment
                  ?.priority ||
                "No Assessment"

            };
          }
        ),
      [
        rows,
        latestAssessmentByOwner
      ]
    );


  const [
    collegeFilter,
    setCollegeFilter
  ] = useState("all");


  const [
    programFilter,
    setProgramFilter
  ] = useState("all");


  const [
    priorityFilter,
    setPriorityFilter
  ] = useState("all");


  const requestCollegeOptions =
    Array.from(
      new Set(
        enrichedRows.map(
          row =>
            counselorCollegeLabel(
              row.department
            )
        )
      )
    )
      .sort(
        (a, b) =>
          a.localeCompare(b)
      );


  const requestRowsForProgramOptions =
    enrichedRows.filter(
      row => {

        if (
          !isSuperAdmin ||
          collegeFilter === "all"
        ) {

          return true;
        }


        return (
          counselorCollegeLabel(
            row.department
          ) ===
          collegeFilter
        );
      }
    );


  const requestProgramOptions =
    Array.from(
      new Set(
        requestRowsForProgramOptions.map(
          row =>
            counselorProgramLabel(
              row.program
            )
        )
      )
    )
      .sort(
        (a, b) =>
          a.localeCompare(b)
      );


  const filteredRequestRows =
    enrichedRows.filter(
      row => {

        const college =
          counselorCollegeLabel(
            row.department
          );


        const program =
          counselorProgramLabel(
            row.program
          );


        const priority =
          row.priority ||
          "No Assessment";


        const matchesCollege =
          !isSuperAdmin ||
          collegeFilter === "all" ||
          college ===
            collegeFilter;


        const matchesProgram =
          programFilter === "all" ||
          program ===
            programFilter;


        const matchesPriority =
          priorityFilter === "all" ||
          priority ===
            priorityFilter;


        return (
          matchesCollege &&
          matchesProgram &&
          matchesPriority
        );
      }
    );


  const actionableRequestRows =
    filteredRequestRows.filter(
      row =>
        !Number(
          row.sessionNumber ||
          0
        ) &&
        !counselingRequestHiddenFromRequestList(
          row.status
        )
    );


  const groupedRequestUsers =
    useMemo(
      () => {

        const groups =
          new Map();


        actionableRequestRows.forEach(
          row => {

            const key =
              row.ownerId ||
              row.ownerName ||
              row.id;


            if (
              !groups.has(
                key
              )
            ) {

              groups.set(
                key,
                {
                  ownerId:
                    row.ownerId ||
                    key,

                  ownerName:
                    row.ownerName ||
                    "User",

                  role:
                    row.role ||
                    "",

                  program:
                    row.program ||
                    "",

                  rows:
                    []
                }
              );
            }


            groups
              .get(
                key
              )
              .rows.push(
                row
              );
          }
        );


        return Array.from(
          groups.values()
        )
          .map(
            group => ({
              ...group,

              rows:
                [...group.rows]
                  .sort(
                    newestRecordFirst
                  )
            })
          )
          .sort(
            (
              a,
              b
            ) => {

              const newestDifference =
                newestRecordFirst(
                  a.rows[0] ||
                    {},
                  b.rows[0] ||
                    {}
                );


              if (
                newestDifference !==
                  0
              ) {

                return newestDifference;
              }


              return String(
                a.ownerName ||
                ""
              ).localeCompare(
                String(
                  b.ownerName ||
                  ""
                )
              );
            }
          );
      },
      [
        actionableRequestRows
      ]
    );


  const [selected, setSelected] =
    useState(null);


  const [
    transferTargetCounselorId,
    setTransferTargetCounselorId
  ] = useState("");


  const [
    statusDraft,
    setStatusDraft
  ] = useState("");


  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  useEffect(() => {
    setRescheduleDate(selected?.date || "");
    setRescheduleTime(selected?.time || "");
  }, [selected?.id]);

  const [
    remarksDraft,
    setRemarksDraft
  ] = useState("");


  const [
    privateCaseHistoryDraft,
    setPrivateCaseHistoryDraft
  ] = useState("");


  const [
    privateSessionSummaryDraft,
    setPrivateSessionSummaryDraft
  ] = useState("");


  const [
    privateObservationDraft,
    setPrivateObservationDraft
  ] = useState("");


  const [
    privateRecommendedActionsDraft,
    setPrivateRecommendedActionsDraft
  ] = useState("");


  const [
    privateNotesLoading,
    setPrivateNotesLoading
  ] = useState(false);


  const [
    privateNotesSaving,
    setPrivateNotesSaving
  ] = useState(false);


  const [
    privateNotesMessage,
    setPrivateNotesMessage
  ] = useState("");


  const [
    privateNotesError,
    setPrivateNotesError
  ] = useState("");

  // Keep track of unsaved private note edits independently of remarks.
  const [privateNotesDirty, setPrivateNotesDirty] = useState(false);


  const [
    privateNotesExists,
    setPrivateNotesExists
  ] = useState(false);


  const [
    privateNotesUpdatedBy,
    setPrivateNotesUpdatedBy
  ] = useState("");


  const [
    privateNotesLoadedFromLegacyProfile,
    setPrivateNotesLoadedFromLegacyProfile
  ] = useState(false);


  const [
    saving,
    setSaving
  ] = useState(false);


  const [
    deletingCounselingId,
    setDeletingCounselingId
  ] = useState("");


  const [
    deletingTransferId,
    setDeletingTransferId
  ] = useState("");


  // Keep modal navigation metadata in refs rather than state.
  // This prevents the Schedule -> Counseling Requests flow from
  // creating a render loop while the request modal is opening.
  const reviewReturnPathRef =
    useRef("");


  const handledRequestNavigationRef =
    useRef("");


  function closeRequestReview() {

    const destination =
      reviewReturnPathRef.current;


    reviewReturnPathRef.current =
      "";


    handledRequestNavigationRef.current =
      "";


    setSelected(null);

    setTransferTargetCounselorId("");

    setStatusDraft("");

    setRemarksDraft("");

    setPrivateCaseHistoryDraft("");

    setPrivateSessionSummaryDraft("");

    setPrivateObservationDraft("");

    setPrivateRecommendedActionsDraft("");

    setPrivateNotesMessage("");

    setPrivateNotesError("");

    setPrivateNotesDirty(false);

    setPrivateNotesExists(false);

    setPrivateNotesUpdatedBy("");

    setPrivateNotesLoadedFromLegacyProfile(false);


    if (destination) {

      navigate(
        destination,
        {
          replace: true
        }
      );
    }
  }


  useEffect(
    () => {

      if (!selected) {
        return undefined;
      }


      const previousOverflow =
        document.body.style.overflow;


      function closeOnEscape(event) {

        if (event.key === "Escape") {
          closeRequestReview();
        }
      }


      document.body.style.overflow =
        "hidden";


      window.addEventListener(
        "keydown",
        closeOnEscape
      );


      return () => {

        document.body.style.overflow =
          previousOverflow;


        window.removeEventListener(
          "keydown",
          closeOnEscape
        );
      };

    },

    [selected]
  );


  useEffect(() => {
    let active = true;
    if (!selected?.id || !selected?.ownerId) {
      setPrivateNotesLoading(false);
      setPrivateNotesExists(false);
      return () => { active = false; };
    }
    setPrivateNotesLoading(true);
    setPrivateNotesMessage("");
    setPrivateNotesError("");
    setPrivateNotesUpdatedBy("");
    setPrivateNotesLoadedFromLegacyProfile(false);
    setPrivateNotesDirty(false);

    async function loadNotes() {
      try {
        const data = await getCounselingNotes(selected.id);
        if (!active) return;
        setPrivateNotesExists(Boolean(data));
        setPrivateCaseHistoryDraft(data?.caseHistory || "");
        setPrivateSessionSummaryDraft(data?.counselingSessionSummary || "");
        setPrivateObservationDraft(data?.counselorObservation || "");
        setPrivateRecommendedActionsDraft(data?.recommendedActions || "");
        setPrivateNotesUpdatedBy(data?.updatedByName || "");
        setPrivateNotesDirty(false);
        setPrivateNotesError("");
      } catch (error) {
        if (!active) return;
        console.error("Unable to load private counseling notes:", error);
        setPrivateNotesError(error?.message || "Unable to load private counseling notes.");
      } finally {
        if (active) setPrivateNotesLoading(false);
      }
    }
    void loadNotes();
    return () => { active = false; };
  }, [selected?.id, selected?.ownerId]);


  const requestedRequestId =
    location.state
      ?.requestId ||
    "";


  const requestedFromSchedule =
    location.state
      ?.fromSchedule ===
    true;


  const requestedNavigationKey =
    location.state
      ?.requestNavigationKey ||
    "";


  useEffect(
    () => {

      if (!requestedRequestId) {
        return;
      }


      const navigationKey =
        requestedNavigationKey ||
        `${requestedRequestId}:${
          requestedFromSchedule
            ? "schedule"
            : "direct"
        }`;


      if (
        handledRequestNavigationRef.current ===
        navigationKey
      ) {

        return;
      }


      const target =
        enrichedRows.find(
          row =>
            row.id ===
            requestedRequestId
        );


      if (!target) {
        return;
      }


      handledRequestNavigationRef.current =
        navigationKey;


      reviewReturnPathRef.current =
        requestedFromSchedule
          ? "/schedule"
          : "";


      const allowedReviewStatuses = [
        "For review",
        "Scheduled for counseling",
        "Rescheduled",
        "Follow up Counseling is recommended",
        "Counseling is optional",
        "For referral",
        "Terminated"
      ];


      // Consume the route state before opening the modal so
      // closing the modal cannot re-trigger the same request.
      navigate(
        location.pathname,
        {
          replace: true,
          state: null
        }
      );


      setSelected(
        target
      );


      setStatusDraft(
        allowedReviewStatuses.includes(
          normalizeCounselingRequestStatus(
            target.status
          )
        )
          ? normalizeCounselingRequestStatus(
              target.status
            )
          : "For review"
      );


      setRemarksDraft(
        target.counselorRemarks ||
        ""
      );

    },

    [
      requestedRequestId,
      requestedFromSchedule,
      requestedNavigationKey,
      enrichedRows,
      navigate,
      location.pathname
    ]
  );


  if (!hasAccess) {

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }


  function selectRequest(row) {

    reviewReturnPathRef.current =
      "";

    handledRequestNavigationRef.current =
      "";

    setSelected(row);

    setTransferTargetCounselorId("");

    const allowedReviewStatuses = [
      "For review",
      "Scheduled for counseling",
      "Rescheduled",
      "Follow up Counseling is recommended",
      "Counseling is optional",
      "For referral",
      "Terminated"
    ];


    setStatusDraft(
      allowedReviewStatuses.includes(
        normalizeCounselingRequestStatus(
          row.status
        )
      )
        ? normalizeCounselingRequestStatus(
            row.status
          )
        : "For review"
    );

    setRemarksDraft(
      row.counselorRemarks ||
      ""
    );
  }


  function transferRequestForConsultation(
    consultationId
  ) {

    return transferRequests.find(
      row =>
        row.consultationId ===
          consultationId &&
        row.status ===
          "Pending approval"
    );
  }


  function transferRequestsForConsultation(
    consultationId
  ) {

    return transferRequests.filter(
      row =>
        row.consultationId ===
        consultationId
    );
  }


  function approvedTransferForConsultation(
    consultationId
  ) {

    return transferRequestsForConsultation(
      consultationId
    ).find(
      row =>
        row.status ===
          "Approved"
    ) ||
    null;
  }


  function canRequestTransfer(row) {

    if (
      user.role !== "counselor" ||
      !row?.id ||
      normalizeCounselingRequestStatus(
        row.status
      ) ===
        "Terminated" ||
      requestIsReadOnly(
        row
      ) ||
      transferRequests.some(transfer =>
        transfer.ownerId === row.ownerId &&
        ["Pending approval", "Approved"].includes(transfer.status)
      )
    ) {

      return false;
    }


    return (
      row.assignedCounselorId ===
      user.id
    );
  }


  async function deletePendingTransferRecord(transfer) {
    if (!isSuperAdmin || !transfer?.id || transfer.status !== "Pending approval") return;
    const reason = window.prompt("Reason for cancelling this pending transfer (the audit record will be retained):");
    if (reason === null) return;
    setDeletingTransferId(transfer.id);
    try {
      await cancelOneTimeCounselorTransfer(transfer.id, reason);
      alert("Pending transfer cancelled. The transfer history is retained for auditing.");
    } catch (error) {
      console.error("Unable to cancel pending transfer:", error);
      alert(error?.message || "Unable to cancel pending transfer.");
    } finally {
      setDeletingTransferId("");
    }
  }

  async function deleteSelectedCounselingRequest() {
    if (!isSuperAdmin || !selected?.id) return;

    // Protect counseling histories, transfer audit trails and scheduled sessions.
    // The Supabase RPC repeats all checks transactionally; UI checks are only UX.
    if (transferRequestsForConsultation(selected.id).length > 0) {
      alert("This counseling request has transfer history. Deletion is blocked to preserve the audit trail.");
      return;
    }

    const allowedStatuses = ["Pending approval", "For review", "Canceled", "Cancelled"];
    if (!allowedStatuses.includes(normalizeCounselingRequestStatus(selected.status))) {
      alert("Only unprocessed or cancelled counseling requests can be deleted. Scheduled and completed cases must be retained.");
      return;
    }

    if (!superAdminDeleteConfirmed("unprocessed counseling request", selected.ownerName)) return;

    const reason = window.prompt(
      "Administrative cleanup reason (10–500 characters). This action is audited and cannot be undone:"
    );
    if (reason === null) return;
    if (reason.trim().length < 10 || reason.trim().length > 500) {
      alert("Enter a cleanup reason between 10 and 500 characters.");
      return;
    }

    setDeletingCounselingId(selected.id);
    try {
      await deleteUnprocessedCounselingRequest(selected.id, reason);
      closeRequestReview();
      alert("Unprocessed counseling request removed from Supabase. An administrative audit record was retained.");
    } catch (error) {
      console.error("Unable to safely delete Supabase counseling request:", error);
      alert(error?.message || "Unable to delete the counseling request safely.");
    } finally {
      setDeletingCounselingId("");
    }
  }


  async function savePrivateCounselingNotes() {
    if (!selected || privateNotesSaving) return;
    if (user.role !== "counselor") {
      alert("Only the assigned Guidance Counselor can save private counseling notes.");
      return;
    }
    if (requestIsReadOnly(selected)) {
      alert("These notes are read-only because another counselor is assigned.");
      return;
    }
    try {
      setPrivateNotesSaving(true);
      setPrivateNotesMessage("");
      setPrivateNotesError("");
      await saveCounselingNotes(selected.id, {
        caseHistory: privateCaseHistoryDraft.trim(),
        counselingSessionSummary: privateSessionSummaryDraft.trim(),
        counselorObservation: privateObservationDraft.trim(),
        recommendedActions: privateRecommendedActionsDraft.trim()
      });
      setPrivateNotesExists(true);
      setPrivateNotesDirty(false);
      setPrivateNotesUpdatedBy(user.name || user.email || "Guidance Counselor");
      setPrivateNotesLoadedFromLegacyProfile(false);
      setPrivateNotesMessage("Private counseling notes saved and verified in Supabase.");
    } catch (error) {
      console.error("Unable to save private counseling notes:", error);
      setPrivateNotesError(error?.message || "Unable to save private counseling notes.");
    } finally {
      setPrivateNotesSaving(false);
    }
  }


  async function requestCounselorTransfer(row) {
    if (!canRequestTransfer(row)) {
      alert("Only the currently assigned counselor can request an eligible transfer.");
      return;
    }
    const target = transferCounselorOptions.find(item => item.id === transferTargetCounselorId);
    if (!target || target.id === user.id) {
      alert("Choose a different active Guidance Counselor.");
      return;
    }
    const reason = window.prompt(`Why transfer ${row.ownerName || "this student"} to ${target.name || "the selected counselor"}?`);
    if (reason === null) return;
    if (!window.confirm("Send this one-time transfer request? The receiving counselor must approve it.")) return;
    try {
      await submitOneTimeCounselorTransfer(row.ownerId, target.id, reason, row.id);
      setTransferTargetCounselorId("");
      alert("Transfer request sent. The assignment changes only after the receiving counselor approves.");
    } catch (error) {
      console.error("Supabase counselor transfer request failed:", error);
      alert(error?.message || "Unable to request the transfer.");
    }
  }

  async function saveRequestUpdate() {
    if (!selected || saving) return;
    if (requestIsReadOnly(selected)) {
      alert("Only the currently assigned counselor can update this request.");
      return;
    }
    if (counselingRequestStatusIsLocked(selected, user) && statusDraft !== "Terminated") {
      alert("A terminated counseling request cannot be reopened.");
      return;
    }
    if (statusDraft === "Rescheduled") {
      if (!rescheduleDate || !COUNSELING_TIME_SLOTS.includes(rescheduleTime)) {
        alert("Choose a valid new date and time for rescheduling.");
        return;
      }
      if (isPastCounselingDate(rescheduleDate) || isWeekendCounselingDate(rescheduleDate) || counselingHolidayName(rescheduleDate)) {
        alert("Choose a future available weekday that is not a holiday.");
        return;
      }
      if (selected.date === rescheduleDate && selected.time === rescheduleTime) {
        alert("Choose a different date or time to reschedule.");
        return;
      }
    }
    let privateNotesSavedThisAttempt = false;
    try {
      setSaving(true);

      // The footer Save button must also persist edited private notes.
      // Save notes first: if that fails, don't falsely report that all
      // counseling changes were saved.
      if (privateNotesDirty && user.role === "counselor") {
        setPrivateNotesError("");
        setPrivateNotesMessage("");
        await saveCounselingNotes(selected.id, {
          caseHistory: privateCaseHistoryDraft.trim(),
          counselingSessionSummary: privateSessionSummaryDraft.trim(),
          counselorObservation: privateObservationDraft.trim(),
          recommendedActions: privateRecommendedActionsDraft.trim()
        });
        privateNotesSavedThisAttempt = true;
        setPrivateNotesDirty(false);
        setPrivateNotesExists(true);
        setPrivateNotesUpdatedBy(user.name || user.email || "Guidance Counselor");
        setPrivateNotesLoadedFromLegacyProfile(false);
        setPrivateNotesMessage("Private counseling notes saved and verified in Supabase.");
      }

      const sessionNumber = await updateCounselingRequest(
        selected.id, statusDraft, remarksDraft,
        statusDraft === "Rescheduled"
          ? { date: rescheduleDate, time: rescheduleTime }
          : {}
      );
      setSelected(current => current && current.id === selected.id
        ? {
            ...current,
            status: statusDraft,
            counselorRemarks: remarksDraft,
            ...(statusDraft === "Rescheduled" ? { date: rescheduleDate, time: rescheduleTime } : {}),
            ...(sessionNumber ? { sessionNumber } : {})
          }
        : current);
      // The Supabase counseling-update trigger creates the student notification
      // in the same database transaction as the request update.
      alert(privateNotesSavedThisAttempt
        ? "Counseling request and private counseling notes saved successfully."
        : "Counseling request updated successfully.");
    } catch (error) {
      console.error("Counseling request update failed:", error);
      const failureMessage = error?.message || "Unable to save counseling changes.";
      if (privateNotesDirty && !privateNotesSavedThisAttempt) {
        setPrivateNotesError(failureMessage);
      }
      alert(privateNotesSavedThisAttempt
        ? `Private counseling notes were saved, but the request update failed: ${failureMessage}`
        : failureMessage);
    } finally {
      setSaving(false);
    }
  }


  const requestManagementSources =
    isSuperAdmin
      ? [
          departmentConsultations,
          assessmentRows,
          counselors,
          transferRequests
        ]
      : [
          departmentConsultations,
          assignedConsultations,
          assessmentRows,
          counselors,
          transferRequests
        ];


  const requestManagementLoading =
    rowsAreLoading(
      ...requestManagementSources
    );


  const requestManagementError =
    firstRowsError(
      ...requestManagementSources
    );


  if (requestManagementLoading) {

    return (
      <>
        <PageTitle
          title="Counseling Requests"
          subtitle="Review, update, and manage counseling requests."
        />

        <section className="panel">
          <Empty
            text="Loading counseling requests..."
          />
        </section>
      </>
    );
  }


  if (requestManagementError) {

    return (
      <>
        <PageTitle
          title="Counseling Requests"
          subtitle="Review, update, and manage counseling requests."
        />

        <div className="error-box">
          {requestManagementError}
        </div>
      </>
    );
  }


  return (

    <>

      <PageTitle

        title="Counseling Requests"

        subtitle={
          isSuperAdmin
            ? "Review counseling requests from all departments."
            : `Review counseling requests for ${user.department}.`
        }

      />


      <section className="panel counselor-filter-panel">

        <div className="counselor-filter-heading">

          <div>

            <h2>
              Filter Counseling Requests
            </h2>

            <p>
              {
                isSuperAdmin
                  ? "Filter requests by college and program."
                  : "Filter requests by program and the user's latest assessment severity."
              }
            </p>

          </div>


          <span className="counselor-filter-count">
            {
              actionableRequestRows.length
            }
            {" "}
            active request
            {
              actionableRequestRows.length ===
                1
                ? ""
                : "s"
            }
          </span>

        </div>


        <div
          className={
            isSuperAdmin
              ? "counselor-filter-grid three-columns"
              : "counselor-filter-grid"
          }
        >

          {isSuperAdmin && (

            <label>

              College / Office

              <select
                value={collegeFilter}
                onChange={
                  event => {

                    setCollegeFilter(
                      event.target.value
                    );

                    setProgramFilter(
                      "all"
                    );
                  }
                }
              >

                <option value="all">
                  All colleges / offices
                </option>

                {requestCollegeOptions.map(
                  college => (

                    <option
                      key={college}
                      value={college}
                    >
                      {college}
                    </option>

                  )
                )}

              </select>

            </label>

          )}


          <label>

            Program

            <select
              value={programFilter}
              onChange={
                event =>
                  setProgramFilter(
                    event.target.value
                  )
              }
            >

              <option value="all">
                All programs
              </option>

              {requestProgramOptions.map(
                program => (

                  <option
                    key={program}
                    value={program}
                  >
                    {program}
                  </option>

                )
              )}

            </select>

          </label>


          <label>

            Severity

            <select
              value={priorityFilter}
              onChange={
                event =>
                  setPriorityFilter(
                    event.target.value
                  )
              }
            >

              <option value="all">
                All severities
              </option>

              <option value="Minimal / none">
                Minimal / none
              </option>

              <option value="Mild">
                Mild
              </option>

              <option value="Moderate">
                Moderate
              </option>

              <option value="Moderately severe">
                Moderately severe
              </option>

              <option value="Severe">
                Severe
              </option>

              <option value="Extremely Severe">
                Extremely Severe
              </option>

            </select>

          </label>

        </div>

      </section>


      <section className="panel counseling-request-list-panel">

        <div className="counseling-request-list-heading">

          <div>

            <h2>
              Request List
            </h2>

            <p>
              Only users with counseling requests that still need action are shown here. Scheduled, rescheduled, and terminated sessions are removed from this request list and remain available through Schedule and User Profiles.
            </p>

          </div>


          <span className="counselor-filter-count">
            {
              groupedRequestUsers.length
            }
            {" "}
            user
            {
              groupedRequestUsers.length ===
                1
                ? ""
                : "s"
            }
          </span>

        </div>


        {groupedRequestUsers.length === 0

          ? (

            <Empty
              text="No active counseling requests requiring review."
            />

          )

          : (

            <div className="counseling-request-user-grid">

              {groupedRequestUsers.map(
                group => (

                  <article
                    className="counseling-request-user-card"
                    key={
                      group.ownerId
                    }
                  >

                    <div className="counseling-request-user-main">

                      <strong>
                        {
                          group.ownerName ||
                          "User"
                        }
                      </strong>


                      <div className="counseling-request-user-meta">

                        <span>
                          {
                            counselingUserRoleLabel(
                              group.role
                            )
                          }
                        </span>


                        {group.program && (

                          <>

                            <span aria-hidden="true">
                              ·
                            </span>

                            <span>
                              {
                                counselorProgramLabel(
                                  group.program
                                )
                              }
                            </span>

                          </>

                        )}

                      </div>

                    </div>


                    <button
                      type="button"
                      className="secondary-button"
                      onClick={
                        () => {

                          const newestRequest =
                            group.rows?.[0] ||
                            null;


                          if (
                            newestRequest
                          ) {

                            selectRequest(
                              newestRequest
                            );
                          }
                        }
                      }
                    >
                      View counseling request
                    </button>

                  </article>

                )
              )}

            </div>

          )
        }

      </section>


      {/* A request may have a counselor decision or a session number,
          which removes it from the action queue above. Keep the full
          accessible history visible so counselors can still find it. */}
      <section className="panel counseling-request-list-panel" style={{ marginTop: 20 }}>
        <div className="counseling-request-list-heading">
          <div>
            <h2>All Counseling Requests</h2>
            <p>
              View pending, reviewed, optional, scheduled, rescheduled,
              and terminated requests. These records remain available
              even when they no longer need action in the queue above.
            </p>
          </div>
          <span className="counselor-filter-count">
            {filteredRequestRows.length} total
          </span>
        </div>

        {filteredRequestRows.length === 0 ? (
          <Empty
            text="No counseling requests are visible for this counselor. If a student has submitted one, verify the assigned counselor in Supabase."
          />
        ) : (
          <div className="counseling-request-user-grid">
            {[...filteredRequestRows]
              .sort(newestRecordFirst)
              .map(row => (
                <article
                  className="counseling-request-user-card"
                  key={row.id}
                >
                  <div className="counseling-request-user-main">
                    <strong>{row.ownerName || "User"}</strong>
                    <div className="counseling-request-user-meta">
                      <span>
                        {normalizeCounselingRequestStatus(row.status) || "Pending approval"}
                      </span>
                      {row.category && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{row.category}</span>
                        </>
                      )}
                      {row.date && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{row.date}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => selectRequest(row)}
                  >
                    View request
                  </button>
                </article>
              ))}
          </div>
        )}
      </section>


      {selected && (

        <div

          className="review-request-modal-backdrop"

          role="presentation"

          onMouseDown={
            event => {

              if (
                event.target ===
                event.currentTarget
              ) {

                closeRequestReview();
              }
            }
          }

        >

          <section

            className="review-request-modal"

            role="dialog"

            aria-modal="true"

            aria-label={
              `Review counseling request for ${
                selected.ownerName ||
                "user"
              }`
            }

          >

            <header className="review-request-modal-header">

              <div>

                <p className="review-request-modal-eyebrow">
                  Counseling Request
                </p>

                <div className="review-request-modal-title-row">

                  <h2>
                    {
                      selected.ownerName ||
                      "User"
                    }
                  </h2>

                  <span className="status">
                    {
                      normalizeCounselingRequestStatus(
                        selected.status
                      ) ||
                      "Pending approval"
                    }
                  </span>

                </div>

                <p className="review-request-modal-subtitle">
                  Review the request details, update the status,
                  and add counselor remarks.
                </p>

              </div>


              <div className="review-request-modal-header-actions">

                {isSuperAdmin && (

                  <button
                    type="button"
                    className="danger-button review-request-header-delete-button"
                    onClick={
                      deleteSelectedCounselingRequest
                    }
                    disabled={
                      deletingCounselingId ===
                        selected.id ||
                      transferRequestsForConsultation(selected.id).length > 0 ||
                      !["Pending approval", "For review", "Canceled", "Cancelled"].includes(
                        normalizeCounselingRequestStatus(selected.status)
                      )
                    }
                    title={
                      transferRequestsForConsultation(selected.id).length > 0
                        ? "Transfer history must be retained."
                        : "Only unprocessed/cancelled requests without sessions or notes may be deleted."
                    }
                  >
                    {
                      deletingCounselingId ===
                        selected.id
                        ? "Deleting..."
                        : "Delete unprocessed request"
                    }
                  </button>

                )}


                <button

                  type="button"

                  className="review-request-close-button"

                  onClick={
                    closeRequestReview
                  }

                  aria-label="Close counseling request review"

                  title="Close"

                >
                  ×
                </button>

              </div>

            </header>


            <div className="review-request-modal-body">

              <section className="review-request-modal-card">

                <h3>
                  Request Details
                </h3>


                <div className="review-request-detail-grid">

                  <div className="review-request-detail-item">

                    <span>
                      Concern
                    </span>

                    <strong>
                      {
                        selected.category ||
                        "Not provided"
                      }
                    </strong>

                  </div>


                  <div className="review-request-detail-item">

                    <span>
                      College / Office
                    </span>

                    <strong>
                      {
                        selected.department ||
                        "Not provided"
                      }
                    </strong>

                  </div>


                  <div className="review-request-detail-item">

                    <span>
                      Program
                    </span>

                    <strong>
                      {
                        counselorProgramLabel(
                          selected.program
                        )
                      }
                    </strong>

                  </div>


                  <div className="review-request-detail-item">

                    <span>
                      Severity
                    </span>

                    <strong>
                      {
                        selected.priority ||
                        "No Assessment"
                      }
                    </strong>

                  </div>


                  <div className="review-request-detail-item">

                    <span>
                      Mode
                    </span>

                    <strong>
                      {
                        selected.mode ||
                        "Not provided"
                      }
                    </strong>

                  </div>


                  <div className="review-request-detail-item">

                    <span>
                      Preferred Schedule
                    </span>

                    <strong>
                      {
                        selected.date ||
                        "No date"
                      }

                      {" · "}

                      {
                        selected.time ||
                        "No time"
                      }
                    </strong>

                  </div>


                  <div className="review-request-detail-item">

                    <span>
                      Counseling Session
                    </span>

                    <strong>
                      {
                        selected.sessionNumber
                          ? `Session ${selected.sessionNumber}`
                          : "Not numbered yet"
                      }
                    </strong>

                  </div>


                  <div className="review-request-detail-item full">

                    <span>
                      Details
                    </span>

                    <strong className="review-request-details-text">
                      {
                        selected.message ||
                        "No additional details."
                      }
                    </strong>

                  </div>

                </div>

              </section>


              <section className="review-request-modal-card review-request-update-card">

                <h3>
                  Counselor Review
                </h3>


                {requestIsReadOnly(
                  selected
                ) && (

                  <div className="notice">
                    Read-only record: this counseling request was transferred to another counselor. You can review the existing information, but you cannot change the status or counselor remarks.
                  </div>

                )}


                {counselingRequestStatusIsLocked(
                  selected,
                  user
                ) && (

                  <div className="notice counseling-terminated-lock-notice">
                    <strong>
                      Terminated counseling request
                    </strong>
                    <p>
                      This counseling request has already been concluded. Its
                      status is locked and can no longer be changed. Existing
                      counselor documentation may still be reviewed.
                    </p>
                  </div>

                )}


                <label>

                  Status

                  <select

                    value={
                      statusDraft
                    }

                    disabled={
                      requestIsReadOnly(
                        selected
                      ) ||
                      counselingRequestStatusIsLocked(
                        selected,
                        user
                      )
                    }

                    onChange={
                      e =>
                        setStatusDraft(
                          e.target.value
                        )
                    }

                  >

                    <option>
                      For review
                    </option>

                    <option>
                      Scheduled for counseling
                    </option>

                    <option>
                      Rescheduled
                    </option>

                    <option>
                      Follow up Counseling is recommended
                    </option>

                    <option>
                      Counseling is optional
                    </option>

                    <option>
                      For referral
                    </option>

                    <option>
                      Terminated
                    </option>

                  </select>

                </label>


                {statusDraft === "Rescheduled" && (
                  <div className="counseling-reschedule-fields">
                    <p><strong>New appointment schedule</strong></p>
                    <label>New date</label>
                    <CounselingDatePicker
                      value={rescheduleDate}
                      onChange={date => {
                        setRescheduleDate(date);
                        setRescheduleTime("");
                      }}
                    />
                    <label>
                      New time
                      <select
                        value={rescheduleTime}
                        onChange={event => setRescheduleTime(event.target.value)}
                        disabled={requestIsReadOnly(selected)}
                        required
                      >
                        <option value="">Choose new time</option>
                        {COUNSELING_TIME_SLOTS.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

                <label>

                  Counselor remarks / instructions
                  <span className="review-field-visibility-note">
                    Visible to the user. Use Private Counseling Notes below for counselor-only documentation.
                  </span>

                  <textarea

                    rows="9"

                    value={
                      remarksDraft
                    }

                    readOnly={
                      requestIsReadOnly(
                        selected
                      )
                    }

                    onChange={
                      e =>
                        setRemarksDraft(
                          e.target.value
                        )
                    }

                    placeholder="Add remarks or instructions for the user."

                  />

                </label>

              </section>


              <section
                className="review-request-modal-card private-counseling-notes-card"
              >

                <h3>
                  Private Counseling Notes
                </h3>


                <p
                  style={{
                    marginTop:
                      0,

                    color:
                      "#667085",

                    lineHeight:
                      1.5
                  }}
                >
                  These notes are accessible only to the currently assigned
                  Guidance Counselor. They are not shown on the Student,
                  Teaching, Non-teaching, or Super Admin side.
                </p>


                {privateNotesUpdatedBy && (

                  <div
                    className="notice"
                    style={{
                      marginTop:
                        "10px",

                      marginBottom:
                        "12px"
                    }}
                  >
                    <strong>
                      Existing counselor documentation
                    </strong>

                    <br />

                    Last documented by:
                    {" "}
                    <strong>
                      {
                        privateNotesUpdatedBy
                      }
                    </strong>

                    {privateNotesLoadedFromLegacyProfile && (
                      <>
                        <br />
                        These notes were carried over from the user's earlier
                        counseling profile so the receiving counselor can review
                        the previous counselor's documentation.
                      </>
                    )}
                  </div>

                )}


                {privateNotesLoading

                  ? (

                    <Empty
                      text="Loading private counseling notes..."
                    />

                  )

                  : (

                    <>

                      <div className="private-counseling-notes-grid">

                        <label className="private-counseling-note-field">
                          Case History

                          <textarea
                            rows="6"
                            value={
                              privateCaseHistoryDraft
                            }
                            readOnly={
                              requestIsReadOnly(
                                selected
                              )
                            }
                            onChange={
                              event => {
                                setPrivateCaseHistoryDraft(event.target.value);
                                setPrivateNotesDirty(true);
                                setPrivateNotesMessage("");
                              }
                            }
                            placeholder="Record relevant case background, previous concerns, and important case developments."
                          />
                        </label>


                        <label className="private-counseling-note-field">
                          Summary of Counseling Session

                          <textarea
                            rows="6"
                            value={
                              privateSessionSummaryDraft
                            }
                            readOnly={
                              requestIsReadOnly(
                                selected
                              )
                            }
                            onChange={
                              event => {
                                setPrivateSessionSummaryDraft(event.target.value);
                                setPrivateNotesDirty(true);
                                setPrivateNotesMessage("");
                              }
                            }
                            placeholder="Summarize the important concerns, discussion, interventions, and session outcome."
                          />
                        </label>


                        <label className="private-counseling-note-field">
                          Counselor's Observation

                          <textarea
                            rows="6"
                            value={
                              privateObservationDraft
                            }
                            readOnly={
                              requestIsReadOnly(
                                selected
                              )
                            }
                            onChange={
                              event => {
                                setPrivateObservationDraft(event.target.value);
                                setPrivateNotesDirty(true);
                                setPrivateNotesMessage("");
                              }
                            }
                            placeholder="Record relevant professional observations from the counseling interaction."
                          />
                        </label>


                        <label className="private-counseling-note-field">
                          Recommended Actions

                          <textarea
                            rows="6"
                            value={
                              privateRecommendedActionsDraft
                            }
                            readOnly={
                              requestIsReadOnly(
                                selected
                              )
                            }
                            onChange={
                              event => {
                                setPrivateRecommendedActionsDraft(event.target.value);
                                setPrivateNotesDirty(true);
                                setPrivateNotesMessage("");
                              }
                            }
                            placeholder="Record follow-up steps, referrals, monitoring actions, or other recommendations."
                          />
                        </label>

                      </div>


                      {privateNotesDirty && (
                        <p role="status" style={{ color: "#9a6700", marginTop: "12px" }}>
                          Unsaved private notes. Click Save private counseling notes,
                          or Save request update &amp; notes below.
                        </p>
                      )}

                      {privateNotesMessage && (

                        <div
                          className="success-box"
                          style={{
                            marginTop:
                              "12px"
                          }}
                        >
                          {
                            privateNotesMessage
                          }
                        </div>

                      )}


                      {privateNotesError && (

                        <div
                          className="error-box"
                          style={{
                            marginTop:
                              "12px"
                          }}
                        >
                          {
                            privateNotesError
                          }
                        </div>

                      )}


                      <div
                        style={{
                          marginTop:
                            "14px"
                        }}
                      >

                        <button
                          type="button"
                          className="secondary-button"
                          disabled={
                            privateNotesSaving ||
                            saving ||
                            user.role !== "counselor" ||
                            requestIsReadOnly(
                              selected
                            )
                          }
                          onClick={
                            savePrivateCounselingNotes
                          }
                        >
                          {
                            user.role !== "counselor"
                              ? "Private notes — counselor only"
                              : requestIsReadOnly(
                                  selected
                                )
                              ? "Private notes — read only"
                              : privateNotesSaving
                                ? "Saving private notes..."
                                : "Save private counseling notes"
                          }
                        </button>

                      </div>

                    </>

                  )
                }

              </section>


              {isSuperAdmin && (

                <div className="superadmin-cleanup-zone superadmin-cleanup-zone-full">

                  <div>

                    <strong>
                      Super Admin test-data cleanup
                    </strong>

                    <p>
                      Use only for test or erroneous records. Approved counselor
                      transfers are protected so counselor assignment history is
                      not accidentally broken.
                    </p>

                  </div>


                  <div className="superadmin-cleanup-actions">

                    {transferRequestForConsultation(
                      selected.id
                    ) && (

                      <button
                        type="button"
                        className="danger-button danger-button-outline superadmin-cleanup-delete-button"
                        title="Delete pending transfer request"
                        disabled={
                          deletingTransferId ===
                          transferRequestForConsultation(
                            selected.id
                          )?.id
                        }
                        onClick={
                          () =>
                            deletePendingTransferRecord(
                              transferRequestForConsultation(
                                selected.id
                              )
                            )
                        }
                      >
                        {
                          deletingTransferId ===
                            transferRequestForConsultation(
                              selected.id
                            )?.id
                            ? "Deleting transfer..."
                            : "Delete"
                        }
                      </button>

                    )}


                    {approvedTransferForConsultation(
                      selected.id
                    ) && (

                      <span className="cleanup-protected-label">
                        Approved transfer history protected
                      </span>

                    )}


                    <button
                      type="button"
                      className="danger-button superadmin-cleanup-delete-button"
                      title="Delete counseling request"
                      disabled={
                        deletingCounselingId ===
                        selected.id ||
                        transferRequestsForConsultation(selected.id).length > 0 ||
                        !["Pending approval", "For review", "Canceled", "Cancelled"].includes(
                          normalizeCounselingRequestStatus(selected.status)
                        )
                      }
                      onClick={
                        deleteSelectedCounselingRequest
                      }
                    >
                      {
                        deletingCounselingId ===
                          selected.id
                          ? "Deleting counseling request..."
                          : "Delete unprocessed request"
                      }
                    </button>

                  </div>

                </div>

              )}


              <div className="review-request-workflow-footer">

                {canRequestTransfer(
                  selected
                ) && (

                  <div className="counselor-transfer-target-panel">

                    <label>

                      Transfer to

                      <select
                        value={
                          transferTargetCounselorId
                        }
                        onChange={
                          event =>
                            setTransferTargetCounselorId(
                              event.target.value
                            )
                        }
                      >

                        <option value="">
                          Choose a Guidance Counselor
                        </option>


                        {transferCounselorOptions
                          .filter(
                            counselor =>
                              counselor.id !==
                                user.id
                          )
                          .sort(
                            (
                              first,
                              second
                            ) =>
                              String(
                                first.name ||
                                ""
                              ).localeCompare(
                                String(
                                  second.name ||
                                  ""
                                )
                              )
                          )
                          .map(
                            counselor => (

                              <option
                                key={
                                  counselor.id
                                }
                                value={
                                  counselor.id
                                }
                              >
                                {
                                  counselor.name ||
                                  "Guidance Counselor"
                                }
                                {
                                  counselor.department
                                    ? ` — ${counselor.department}`
                                    : ""
                                }
                              </option>

                            )
                          )
                        }

                      </select>

                    </label>


                    <button
                      type="button"
                      className="transfer-user-button"
                      disabled={
                        !transferTargetCounselorId
                      }
                      onClick={
                        () =>
                          requestCounselorTransfer(
                            selected
                          )
                      }
                    >
                      Transfer user
                    </button>

                  </div>

                )}


                {transferRequestForConsultation(
                  selected.id
                ) && (

                  <div
                    style={{
                      display:
                        "flex",

                      alignItems:
                        "center",

                      gap:
                        "10px",

                      flexWrap:
                        "wrap"
                    }}
                  >

                    <span className="transfer-pending-label">
                      Transfer awaiting acceptance by the selected counselor
                    </span>




                  </div>

                )}


                <div className="review-request-modal-actions">

                  <button

                    type="button"

                    className="secondary-button"

                    onClick={
                      closeRequestReview
                    }

                  >
                    Close
                  </button>


                  <button

                    type="button"

                    className="primary-button"

                    disabled={
                      saving ||
                      privateNotesSaving ||
                      privateNotesLoading ||
                      requestIsReadOnly(
                        selected
                      )
                    }

                    onClick={
                      saveRequestUpdate
                    }

                  >

                    {
                      requestIsReadOnly(
                        selected
                      )
                        ? "Read only"
                        : saving
                          ? "Saving..."
                          : "Save request update & notes"
                    }

                  </button>

                </div>

              </div>

            </div>

          </section>

        </div>

      )}

    </>

  );
}
// ======================================================
// COUNSELOR SCHEDULE
// ======================================================

function Schedule() {

  const { user } =
    useAuth();


  const navigate =
    useNavigate();


  const [
    scheduleFilter,
    setScheduleFilter
  ] = useState(
    "Terminated"
  );


  const isSuperAdmin =
    user.role ===
    "super_admin";


  const departmentRows =
    useRows(
      "consultations",
      isSuperAdmin
        ? {}
        : {
            department:
              user.department
          }
    );


  const transferredAssignedRows =
    useRows(
      "consultations",
      isSuperAdmin
        ? {
            ownerId:
              "__NO_ACCESS__"
          }
        : {
            assignedCounselorId:
              user.id
          }
    );


  const pendingTransferRows =
    useRows(
      "transferRequests",
      isSuperAdmin
        ? {
            status:
              "Pending approval"
          }
        : {
            targetCounselorId:
              user.id,

            status:
              "Pending approval"
          }
    );


  const outgoingTransferRows =
    useRows(
      "transferRequests",
      isSuperAdmin
        ? {
            requestedById:
              "__NO_ACCESS__"
          }
        : {
            requestedById:
              user.id,

            status:
              "Pending approval"
          }
    );


  const incomingTransferRequests =
    isSuperAdmin
      ? []
      : pendingTransferRows.filter(
          row =>
            row.status ===
              "Pending approval" &&
            row.targetCounselorId ===
              user.id
        );


  const outgoingTransferRequests =
    isSuperAdmin
      ? []
      : outgoingTransferRows.filter(
          row =>
            row.status ===
              "Pending approval"
        );


  const allPendingTransferRows =
    mergeRowsById(
      pendingTransferRows,
      outgoingTransferRows
    ).filter(
      row =>
        row.status ===
          "Pending approval"
    );


  const pendingTransferByConsultation =
    new Map(
      allPendingTransferRows.map(
        row => [
          row.consultationId,
          row
        ]
      )
    );


  const activeDepartmentRows =
    isSuperAdmin
      ? departmentRows
      : departmentRows.filter(
          row =>
            !row.assignedCounselorId ||
            row.assignedCounselorId ===
              user.id
        );


  const rows =
    isSuperAdmin
      ? departmentRows
      : mergeRowsById(
          activeDepartmentRows,
          transferredAssignedRows
        );


  const todayKey =
    useMemo(
      () => {

        const now =
          new Date();


        const year =
          now.getFullYear();


        const month =
          String(
            now.getMonth() + 1
          ).padStart(
            2,
            "0"
          );


        const day =
          String(
            now.getDate()
          ).padStart(
            2,
            "0"
          );


        return `${year}-${month}-${day}`;
      },
      []
    );


  const appointments =
    useMemo(
      () =>
        [...rows]
          .filter(
            row =>
              row.date &&
              row.time
          )
          .sort(
            (a, b) => {

              const dateDifference =
                counselingAppointmentSortValue(
                  a
                ) -
                counselingAppointmentSortValue(
                  b
                );


              if (
                dateDifference !==
                0
              ) {

                return dateDifference;
              }


              return String(
                a.ownerName || ""
              ).localeCompare(
                String(
                  b.ownerName || ""
                )
              );
            }
          ),
      [rows]
    );


  function normalizedStatus(
    row
  ) {

    return normalizeCounselingRequestStatus(
      row?.status ||
      "For review"
    );
  }


  function isPendingAppointment(
    row
  ) {

    const status =
      normalizedStatus(
        row
      );


    return (
      status ===
        "Pending approval" ||
      status ===
        "For review"
    );
  }


  function isScheduledAppointment(
    row
  ) {

    return counselingRequestIsScheduled(
      normalizedStatus(
        row
      )
    );
  }


  function isTerminatedAppointment(
    row
  ) {

    return (
      normalizedStatus(
        row
      ) ===
      "Terminated"
    );
  }


  function isOperationalAppointment(
    row
  ) {

    return (
      isPendingAppointment(
        row
      ) ||
      isScheduledAppointment(
        row
      )
    );
  }


  function pendingTransferFor(
    row
  ) {

    return (
      pendingTransferByConsultation.get(
        row.id
      ) ||
      null
    );
  }


  function canTransferFromSchedule(
    row
  ) {

    if (
      isSuperAdmin ||
      user.role !==
        "counselor" ||
      pendingTransferFor(
        row
      )
    ) {

      return false;
    }


    return (
      row.assignedCounselorId ===
      user.id
    );
  }


  function isTransferRelatedAppointment(
    row
  ) {

    return Boolean(
      row.transferredFromCounselorId ||
      row.transferStatus ===
        "Approved"
    );
  }


  function isTodayAppointment(
    row
  ) {

    return (
      row.date ===
      todayKey
    );
  }


  function isTerminatedScheduleRecord(
    row
  ) {

    return isTerminatedAppointment(
      row
    );
  }


  const scheduleCounts =
    useMemo(
      () => ({
        today:
          appointments.filter(
            row =>
              isTodayAppointment(
                row
              ) &&
              isOperationalAppointment(
                row
              )
          ).length,

        pending:
          appointments.filter(
            row =>
              row.date >=
                todayKey &&
              isPendingAppointment(
                row
              )
          ).length,

        scheduled:
          appointments.filter(
            row =>
              row.date >=
                todayKey &&
              isScheduledAppointment(
                row
              )
          ).length,

        terminated:
          appointments.filter(
            isTerminatedScheduleRecord
          ).length,

        transfers:
          appointments.filter(
            isTransferRelatedAppointment
          ).length
      }),
      [
        appointments,
        todayKey
      ]
    );


  const visibleAppointments =
    useMemo(
      () =>
        appointments.filter(
          row => {

            if (
              scheduleFilter ===
              "Today"
            ) {

              return (
                isTodayAppointment(
                  row
                ) &&
                isOperationalAppointment(
                  row
                )
              );
            }


            if (
              scheduleFilter ===
              "Terminated"
            ) {

              return isTerminatedScheduleRecord(
                row
              );
            }


            if (
              scheduleFilter ===
              "Pending"
            ) {

              return isPendingAppointment(
                row
              );
            }


            if (
              scheduleFilter ===
              "Scheduled"
            ) {

              return isScheduledAppointment(
                row
              );
            }


            if (
              scheduleFilter ===
              "Transfers"
            ) {

              return isTransferRelatedAppointment(
                row
              );
            }


            return true;
          }
        ),
      [
        appointments,
        scheduleFilter,
        todayKey
      ]
    );


  const groupedAppointments =
    useMemo(
      () => {

        const groups =
          new Map();


        visibleAppointments.forEach(
          row => {

            const key =
              row.date;


            if (
              !groups.has(
                key
              )
            ) {

              groups.set(
                key,
                []
              );
            }


            groups
              .get(
                key
              )
              .push(
                row
              );
          }
        );


        return Array.from(
          groups.entries()
        ).map(
          ([date, items]) => ({
            date,
            items
          })
        );
      },
      [
        visibleAppointments
      ]
    );


  const duplicateOperationalSlots =
    useMemo(
      () => {

        const counts =
          new Map();


        appointments
          .filter(
            row =>
              row.date >=
                todayKey &&
              isOperationalAppointment(
                row
              )
          )
          .forEach(
            row => {

              const key =
                `${row.date}|${row.time}`;


              counts.set(
                key,
                (
                  counts.get(
                    key
                  ) ||
                  0
                ) + 1
              );
            }
          );


        return new Set(
          Array.from(
            counts.entries()
          )
            .filter(
              ([, count]) =>
                count > 1
            )
            .map(
              ([key]) =>
                key
            )
        );
      },
      [
        appointments,
        todayKey
      ]
    );


  function formatScheduleDate(
    dateText
  ) {

    const parsed =
      new Date(
        `${dateText}T00:00:00`
      );


    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {

      return dateText;
    }


    return parsed
      .toLocaleDateString(
        "en-PH",
        {
          weekday:
            "long",

          month:
            "long",

          day:
            "numeric",

          year:
            "numeric"
        }
      )
      .toUpperCase();
  }


  function statusAppearance(
    status
  ) {

    if (
      counselingRequestIsScheduled(
        status
      )
    ) {

      return {
        background:
          "#e8f7ee",

        color:
          "#166534",

        border:
          "1px solid #bbf7d0"
      };
    }


    if (
      status ===
      "Pending approval" ||
      status ===
      "For review"
    ) {

      return {
        background:
          "#fff7e6",

        color:
          "#92400e",

        border:
          "1px solid #fde68a"
      };
    }


    if (
      status ===
      "Follow up Counseling is recommended"
    ) {

      return {
        background:
          "#fff1f2",

        color:
          "#9f1239",

        border:
          "1px solid #fecdd3"
      };
    }


    if (
      status ===
      "For referral"
    ) {

      return {
        background:
          "#f3e8ff",

        color:
          "#6b21a8",

        border:
          "1px solid #e9d5ff"
      };
    }


    if (
      status ===
      "Counseling is optional"
    ) {

      return {
        background:
          "#eef2ff",

        color:
          "#3730a3",

        border:
          "1px solid #c7d2fe"
      };
    }


    if (
      status ===
      "Terminated"
    ) {

      return {
        background:
          "#f1f5f9",

        color:
          "#475569",

        border:
          "1px solid #cbd5e1"
      };
    }


    return {
      background:
        "#eef2ff",

      color:
        "#1e3a8a",

      border:
        "1px solid #c7d2fe"
    };
  }


  function openAppointment(
    appointment
  ) {

    navigate(
      "/counseling-requests",
      {
        state: {
          requestId:
            appointment.id,

          fromSchedule:
            true,

          requestNavigationKey:
            `${appointment.id}-schedule`
        }
      }
    );
  }


  const scheduleLoading =
    rowsAreLoading(
      departmentRows,
      ...(
        isSuperAdmin
          ? []
          : [
              transferredAssignedRows,
              pendingTransferRows,
              outgoingTransferRows
            ]
      )
    );


  const scheduleError =
    firstRowsError(
      departmentRows,
      ...(
        isSuperAdmin
          ? []
          : [
              transferredAssignedRows,
              pendingTransferRows,
              outgoingTransferRows
            ]
      )
    );


  if (
    scheduleLoading
  ) {

    return (
      <>
        <PageTitle
          title="Counselor Schedule"
          subtitle="Counseling activity is grouped by date and time."
        />

        <section className="panel">
          <Empty
            text="Loading counselor schedule..."
          />
        </section>
      </>
    );
  }


  if (
    scheduleError
  ) {

    return (
      <>
        <PageTitle
          title="Counselor Schedule"
          subtitle="Counseling activity is grouped by date and time."
        />

        <div className="error-box">
          {scheduleError}
        </div>
      </>
    );
  }


  const filterOptions = [
    "Terminated",
    "Today",
    "Pending",
    "Scheduled",
    "Transfers",
    "All"
  ];


  return (

    <>

      <PageTitle

        title="Counselor Schedule"

        subtitle="Counseling activity is grouped by date and time. Use the filters to review pending, scheduled, transferred, or terminated sessions."

      />


      <section
        className="panel"
        style={{
          maxWidth:
            "1180px",

          marginLeft:
            "auto",

          marginRight:
            "auto"
        }}
      >

        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(5, minmax(0, 1fr))",

            gap:
              "12px",

            marginBottom:
              "18px"
          }}
          className="schedule-summary-grid"
        >

          {[
            {
              label:
                "Today",

              value:
                scheduleCounts.today,

              tone:
                "primary"
            },

            {
              label:
                "Pending",

              value:
                scheduleCounts.pending,

              tone:
                "moderate"
            },

            {
              label:
                "Scheduled",

              value:
                scheduleCounts.scheduled,

              tone:
                "low"
            },

            {
              label:
                "Terminated",

              value:
                scheduleCounts.terminated,

              tone:
                "terminated"
            },

            {
              label:
                "Transfers",

              value:
                scheduleCounts.transfers,

              tone:
                "transfer"
            }
          ].map(
            item => (

              <div
                key={
                  item.label
                }
                className={
                  `schedule-summary-card schedule-summary-${item.tone}`
                }
              >

                <div
                  style={{
                    fontSize:
                      "0.82rem",

                    color:
                      "#64748b",

                    marginBottom:
                      "4px"
                  }}
                >
                  {item.label}
                </div>

                <strong
                  style={{
                    fontSize:
                      "1.35rem"
                  }}
                >
                  {item.value}
                </strong>

              </div>

            )
          )}

        </div>


        <div
          style={{
            display:
              "flex",

            flexWrap:
              "wrap",

            gap:
              "8px",

            alignItems:
              "center",

            marginBottom:
              "18px"
          }}
        >

          {filterOptions.map(
            option => {

              const selected =
                scheduleFilter ===
                option;


              return (

                <button
                  type="button"
                  className={
                    `schedule-filter-pill ${
                      selected
                        ? "active"
                        : ""
                    }`
                  }
                  key={
                    option
                  }
                  onClick={
                    () =>
                      setScheduleFilter(
                        option
                      )
                  }
                  style={{
                    border:
                      selected
                        ? "1px solid #1d4ed8"
                        : "1px solid #d7e0ee",

                    background:
                      selected
                        ? "#1d4ed8"
                        : "#ffffff",

                    color:
                      selected
                        ? "#ffffff"
                        : "#334155",

                    borderRadius:
                      "999px",

                    padding:
                      "8px 14px",

                    fontWeight:
                      700,

                    cursor:
                      "pointer"
                  }}
                >
                  {option}
                </button>

              );
            }
          )}

        </div>


        {!isSuperAdmin && (

          <div
            className="notice"
            style={{
              marginBottom:
                "18px",

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "space-between",

              gap:
                "14px",

              flexWrap:
                "wrap"
            }}
          >

            <div>

              <strong>
                Counselor transfer tools
              </strong>

              <div
                style={{
                  marginTop:
                    "4px"
                }}
              >
                The Transfers filter shows only counseling records that were
                already transferred. Pending transfer requests remain available
                through the transfer request workflow.
              </div>

            </div>


            <button
              type="button"
              className="secondary-button"
              onClick={
                () =>
                  navigate(
                    "/dashboard"
                  )
              }
            >
              {
                incomingTransferRequests.length >
                0
                  ? `Incoming transfer requests (${incomingTransferRequests.length})`
                  : "View transfer requests"
              }
            </button>

          </div>

        )}


        {
          duplicateOperationalSlots.size >
          0
        && (

          <div
            className="notice"
            style={{
              marginBottom:
                "18px"
            }}
          >

            <strong>
              Schedule check:
            </strong>
            {" "}
            MindTrack detected
            {" "}
            {
              duplicateOperationalSlots.size
            }
            {" "}
            active date/time
            {
              duplicateOperationalSlots.size ===
              1
                ? " slot"
                : " slots"
            }
            {" "}
            with more than one pending or scheduled request.
            Review the highlighted appointments to make sure there is no counselor conflict.

          </div>

        )}


        {
          visibleAppointments.length ===
          0

            ? (

              <Empty
                text={
                  scheduleFilter ===
                  "Terminated"

                    ? "No terminated counseling sessions."

                    : scheduleFilter ===
                        "Transfers"

                      ? "No transferred counseling users."

                      : `No ${scheduleFilter.toLowerCase()} appointments.`
                }
              />

            )

            : groupedAppointments.map(
                group => (

                  <section
                    key={
                      group.date
                    }
                    style={{
                      marginBottom:
                        "24px"
                    }}
                  >

                    <div
                      style={{
                        display:
                          "flex",

                        alignItems:
                          "center",

                        gap:
                          "12px",

                        marginBottom:
                          "12px"
                      }}
                    >

                      <strong
                        style={{
                          fontSize:
                            "0.9rem",

                          letterSpacing:
                            "0.035em",

                          color:
                            "#334155",

                          whiteSpace:
                            "nowrap"
                        }}
                      >
                        {
                          formatScheduleDate(
                            group.date
                          )
                        }
                      </strong>


                      <div
                        style={{
                          height:
                            "1px",

                          background:
                            "#dbe3ef",

                          flex:
                            1
                        }}
                      />

                    </div>


                    <div
                      style={{
                        display:
                          "grid",

                        gridTemplateColumns:
                          "repeat(2, minmax(0, 1fr))",

                        gap:
                          "12px"
                      }}
                      className="schedule-organized-grid"
                    >

                      {group.items.map(
                        row => {

                          const status =
                            normalizedStatus(
                              row
                            );


                          const appearance =
                            statusAppearance(
                              status
                            );


                          const slotKey =
                            `${row.date}|${row.time}`;


                          const hasPossibleConflict =
                            duplicateOperationalSlots.has(
                              slotKey
                            ) &&
                            isOperationalAppointment(
                              row
                            );


                          const pendingTransfer =
                            pendingTransferFor(
                              row
                            );


                          const transferredToCurrentCounselor =
                            Boolean(
                              row.transferredFromCounselorId &&
                              row.assignedCounselorId ===
                                user.id
                            );


                          return (

                            <button
                              type="button"
                              className="schedule-card-button"
                              key={
                                row.id
                              }
                              onClick={
                                () =>
                                  openAppointment(
                                    row
                                  )
                              }
                              title="Open counseling request"
                              style={{
                                width:
                                  "100%",

                                minHeight:
                                  "150px",

                                display:
                                  "grid",

                                gridTemplateColumns:
                                  "44px minmax(0, 1fr)",

                                gap:
                                  "12px",

                                textAlign:
                                  "left",

                                border:
                                  hasPossibleConflict
                                    ? "1px solid #f59e0b"
                                    : "1px solid #d7e0ee",

                                borderRadius:
                                  "14px",

                                background:
                                  "#ffffff",

                                padding:
                                  "16px",

                                cursor:
                                  "pointer",

                                boxShadow:
                                  "0 1px 2px rgba(15, 23, 42, 0.03)"
                              }}
                            >

                              <div
                                style={{
                                  width:
                                    "40px",

                                  height:
                                    "40px",

                                  borderRadius:
                                    "12px",

                                  background:
                                    "#eef4ff",

                                  display:
                                    "grid",

                                  placeItems:
                                    "center",

                                  color:
                                    "#1d4ed8"
                                }}
                              >
                                <Calendar
                                  size={
                                    20
                                  }
                                />
                              </div>


                              <div
                                style={{
                                  minWidth:
                                    0,

                                  display:
                                    "flex",

                                  flexDirection:
                                    "column",

                                  height:
                                    "100%"
                                }}
                              >

                                <div
                                  style={{
                                    display:
                                      "flex",

                                    justifyContent:
                                      "space-between",

                                    gap:
                                      "12px",

                                    alignItems:
                                      "flex-start"
                                  }}
                                >

                                  <strong
                                    style={{
                                      fontSize:
                                        "1rem",

                                      color:
                                        "#0f172a"
                                    }}
                                  >
                                    {
                                      row.time
                                    }
                                  </strong>


                                  {hasPossibleConflict && (

                                    <span
                                      style={{
                                        fontSize:
                                          "0.72rem",

                                        fontWeight:
                                          800,

                                        color:
                                          "#92400e",

                                        background:
                                          "#fff7e6",

                                        border:
                                          "1px solid #fde68a",

                                        padding:
                                          "4px 7px",

                                        borderRadius:
                                          "999px",

                                        whiteSpace:
                                          "nowrap"
                                      }}
                                    >
                                      Check conflict
                                    </span>

                                  )}

                                </div>


                                <div
                                  style={{
                                    marginTop:
                                      "8px",

                                    fontWeight:
                                      700,

                                    color:
                                      "#1e293b"
                                  }}
                                >
                                  {
                                    row.ownerName ||
                                    "User"
                                  }
                                </div>


                                {Number(
                                  row.sessionNumber ||
                                  0
                                ) > 0 && (

                                  <div
                                    style={{
                                      marginTop:
                                        "3px",

                                      color:
                                        "#173f8f",

                                      fontSize:
                                        "0.78rem",

                                      fontWeight:
                                        800
                                    }}
                                  >
                                    Session
                                    {" "}
                                    {
                                      row.sessionNumber
                                    }
                                  </div>

                                )}


                                <div
                                  style={{
                                    marginTop:
                                      "3px",

                                    color:
                                      "#64748b",

                                    lineHeight:
                                      1.4
                                  }}
                                >

                                  {
                                    row.program ||
                                    row.department ||
                                    "Program not specified"
                                  }

                                  {row.mode && (
                                    <>
                                      {" · "}
                                      {row.mode}
                                    </>
                                  )}

                                </div>


                                {
                                  (
                                    pendingTransfer ||
                                    transferredToCurrentCounselor
                                  ) && (

                                    <div
                                      style={{
                                        display:
                                          "flex",

                                        flexWrap:
                                          "wrap",

                                        gap:
                                          "6px",

                                        marginTop:
                                          "10px"
                                      }}
                                    >

                                      {pendingTransfer && (

                                        <span
                                          style={{
                                            background:
                                              "#fff7e6",

                                            color:
                                              "#92400e",

                                            border:
                                              "1px solid #fde68a",

                                            borderRadius:
                                              "999px",

                                            padding:
                                              "4px 8px",

                                            fontSize:
                                              "0.72rem",

                                            fontWeight:
                                              800
                                          }}
                                        >
                                          Transfer awaiting approval
                                        </span>

                                      )}


                                      {transferredToCurrentCounselor && (

                                        <span
                                          style={{
                                            background:
                                              "#ecfdf5",

                                            color:
                                              "#166534",

                                            border:
                                              "1px solid #bbf7d0",

                                            borderRadius:
                                              "999px",

                                            padding:
                                              "4px 8px",

                                            fontSize:
                                              "0.72rem",

                                            fontWeight:
                                              800
                                          }}
                                        >
                                          Transferred to you
                                        </span>

                                      )}

                                    </div>

                                  )
                                }


                                <div
                                  style={{
                                    display:
                                      "flex",

                                    justifyContent:
                                      "space-between",

                                    alignItems:
                                      "center",

                                    gap:
                                      "10px",

                                    flexWrap:
                                      "wrap",

                                    marginTop:
                                      "auto",

                                    paddingTop:
                                      "14px"
                                  }}
                                >

                                  <span
                                    style={{
                                      ...appearance,

                                      display:
                                        "inline-flex",

                                      alignItems:
                                        "center",

                                      borderRadius:
                                        "999px",

                                      padding:
                                        "5px 9px",

                                      fontSize:
                                        "0.75rem",

                                      fontWeight:
                                        700
                                    }}
                                  >
                                    {status}
                                  </span>


                                  <span
                                    style={{
                                      fontSize:
                                        "0.8rem",

                                      fontWeight:
                                        800,

                                      color:
                                        "#1d4ed8"
                                    }}
                                  >
                                    {
                                      pendingTransfer
                                        ? "View transfer"
                                        : "Open request"
                                    }
                                  </span>

                                </div>

                              </div>

                            </button>

                          );
                        }
                      )}

                    </div>

                  </section>

                )
              )
        }

      </section>


      <style>
        {`
          @media (max-width: 900px) {
            .schedule-summary-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }

            .schedule-organized-grid {
              grid-template-columns: minmax(0, 1fr) !important;
            }
          }

          @media (max-width: 560px) {
            .schedule-summary-grid {
              grid-template-columns: minmax(0, 1fr) !important;
            }
          }
        `}
      </style>

    </>

  );
}

// ======================================================
// ACCOUNT MANAGEMENT
// ======================================================

function Accounts() {

  const users =
    useRows(
      "users"
    );


  const [
    selectedRoleFilter,
    setSelectedRoleFilter
  ] = useState(
    "All Roles"
  );


  const [
    selectedCollegeFilter,
    setSelectedCollegeFilter
  ] = useState(
    "All colleges / offices"
  );


  const [
    selectedProgramFilter,
    setSelectedProgramFilter
  ] = useState(
    "All programs"
  );


  function accountRoleFilterLabel(
    role
  ) {

    const normalizedRole =
      String(
        role ||
        ""
      )
        .trim()
        .toLowerCase();


    if (
      normalizedRole ===
      "student"
    ) {

      return "Student";
    }


    if (
      normalizedRole ===
        "teaching" ||
      normalizedRole ===
        "faculty"
    ) {

      return "Teaching";
    }


    if (
      normalizedRole ===
        "non_teaching" ||
      normalizedRole ===
        "non-teaching" ||
      normalizedRole ===
        "personnel"
    ) {

      return "Non-teaching";
    }


    if (
      normalizedRole ===
      "counselor"
    ) {

      return "Counselor";
    }


    if (
      normalizedRole ===
      "super_admin"
    ) {

      return "Super Admin";
    }


    return systemRoleLabel(
      role
    );
  }


  const accountCollegeOptions =
    Array.from(
      new Set(
        users
          .map(
            account =>
              String(
                account.department ||
                ""
              ).trim()
          )
          .filter(Boolean)
      )
    ).sort(
      (a, b) =>
        a.localeCompare(b)
    );


  const accountProgramOptions =
    Array.from(
      new Set(
        users
          .filter(
            account =>
              selectedCollegeFilter ===
                "All colleges / offices" ||
              String(
                account.department ||
                ""
              ).trim() ===
                selectedCollegeFilter
          )
          .map(
            account =>
              String(
                account.program ||
                ""
              ).trim()
          )
          .filter(Boolean)
      )
    ).sort(
      (a, b) =>
        a.localeCompare(b)
    );


  const visibleAccounts =
    users
      .filter(
        account => {

          const matchesRole =
            selectedRoleFilter ===
              "All Roles" ||
            accountRoleFilterLabel(
              account.role
            ) ===
              selectedRoleFilter;


          const matchesCollege =
            selectedCollegeFilter ===
              "All colleges / offices" ||
            String(
              account.department ||
              ""
            ).trim() ===
              selectedCollegeFilter;


          const matchesProgram =
            selectedProgramFilter ===
              "All programs" ||
            String(
              account.program ||
              ""
            ).trim() ===
              selectedProgramFilter;


          return (
            matchesRole &&
            matchesCollege &&
            matchesProgram
          );
        }
      )
      .sort(
        (a, b) =>
          String(
            a.name ||
            ""
          ).localeCompare(
            String(
              b.name ||
              ""
            )
          )
      );


  if (users.loading) {

    return (
      <>
        <PageTitle
          title="Account Management"
          subtitle="Super Admin overview of Student, Teaching, Non-teaching, Counselor, and Super Admin accounts."
        />

        <section className="panel">
          <Empty
            text="Loading accounts..."
          />
        </section>
      </>
    );
  }


  if (users.error) {

    return (
      <>
        <PageTitle
          title="Account Management"
          subtitle="Super Admin overview of Student, Teaching, Non-teaching, Counselor, and Super Admin accounts."
        />

        <div className="error-box">
          {users.error}
        </div>
      </>
    );
  }


  return (

    <>

      <PageTitle

        title="Account Management"

        subtitle="Super Admin overview of Student, Teaching, Non-teaching, Counselor, and Super Admin accounts."

      />


      <section className="panel account-management-filter-panel">

        <div className="profile-filter-heading">

          <div>

            <h2>
              Filter Accounts
            </h2>

            <p>
              Filter the account list by role, college / office, and program.
            </p>

          </div>


          <span className="profile-result-count">
            {visibleAccounts.length} result{visibleAccounts.length === 1 ? "" : "s"}
          </span>

        </div>


        <div className="account-role-filter-row account-management-filter-grid">

          <label>
            Role

            <select
              value={selectedRoleFilter}
              onChange={
                event =>
                  setSelectedRoleFilter(
                    event.target.value
                  )
              }
            >
              <option>All Roles</option>
              <option>Student</option>
              <option>Teaching</option>
              <option>Non-teaching</option>
              <option>Counselor</option>
            </select>
          </label>


          <label>
            College / Office

            <select
              value={selectedCollegeFilter}
              onChange={
                event => {
                  setSelectedCollegeFilter(
                    event.target.value
                  );
                  setSelectedProgramFilter(
                    "All programs"
                  );
                }
              }
            >
              <option>
                All colleges / offices
              </option>

              {accountCollegeOptions.map(
                college => (
                  <option
                    key={college}
                    value={college}
                  >
                    {college}
                  </option>
                )
              )}
            </select>
          </label>


          <label>
            Program

            <select
              value={selectedProgramFilter}
              onChange={
                event =>
                  setSelectedProgramFilter(
                    event.target.value
                  )
              }
            >
              <option>
                All programs
              </option>

              {accountProgramOptions.map(
                program => (
                  <option
                    key={program}
                    value={program}
                  >
                    {program}
                  </option>
                )
              )}
            </select>
          </label>

        </div>

      </section>


      <section className="panel">


        <div className="table-wrap">

          <table>

            <thead>

              <tr>

                <th>
                  Name
                </th>

                <th>
                  Email
                </th>

                <th>
                  Role
                </th>

                <th>
                  Department
                </th>

                <th>
                  Program
                </th>

              </tr>

            </thead>


            <tbody>

              {visibleAccounts.map(
                account => (

                  <tr
                    key={
                      account.id
                    }
                  >

                    <td>
                      {
                        account.name
                      }
                    </td>

                    <td>
                      {
                        account.email
                      }
                    </td>

                    <td>
                      {
                        systemRoleLabel(
                          account.role
                        )
                      }
                    </td>

                    <td>
                      {
                        account.department ||
                        "—"
                      }
                    </td>

                    <td>
                      {
                        account.program ||
                        "—"
                      }
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>


        <div className="notice">

          Counselor and Super Admin accounts must be provisioned through a secured Supabase administrative process, not through public registration.

        </div>

      </section>

    </>

  );
}



// ======================================================
// FEEDBACK ANALYTICS - SUPER ADMIN
// ======================================================

function FeedbackAnalytics() {

  const [feedbackRows, setFeedbackRows] =
    useState([]);

  const [loadingFeedback, setLoadingFeedback] =
    useState(true);

  const [feedbackError, setFeedbackError] =
    useState("");


  useEffect(() => {
    let active = true;
    let requestVersion = 0;

    async function loadAnalytics() {
      const version = ++requestVersion;
      try {
        const records = await listAdminMindTrackFeedback();
        if (!active || version !== requestVersion) return;
        setFeedbackRows(records);
        setFeedbackError("");
      } catch (err) {
        if (!active || version !== requestVersion) return;
        console.error("Unable to load Supabase feedback analytics:", err);
        setFeedbackRows([]);
        setFeedbackError(err?.message || "Unable to load feedback analytics.");
      } finally {
        if (active && version === requestVersion) setLoadingFeedback(false);
      }
    }

    void loadAnalytics();
    window.addEventListener("focus", loadAnalytics);
    window.addEventListener("mindtrack:feedback-changed", loadAnalytics);
    return () => {
      active = false;
      requestVersion += 1;
      window.removeEventListener("focus", loadAnalytics);
      window.removeEventListener("mindtrack:feedback-changed", loadAnalytics);
    };
  }, []);

  const total =
    feedbackRows.length;


  const average =
    total
      ? (
          feedbackRows.reduce(
            (sum, item) =>
              sum +
              Number(
                item.rating || 0
              ),
            0
          ) /
          total
        ).toFixed(2)

      : "0.00";


  const distribution =
    [5, 4, 3, 2, 1].map(
      stars => ({
        stars,
        count:
          feedbackRows.filter(
            item =>
              Number(
                item.rating
              ) === stars
          ).length
      })
    );


  const categoryCounts =
    Array.from(
      new Set(
        feedbackRows.map(
          item =>
            item.category ||
            "Overall Experience"
        )
      )
    )
      .map(
        category => ({
          category,
          count:
            feedbackRows.filter(
              item =>
                (
                  item.category ||
                  "Overall Experience"
                ) === category
            ).length
        })
      )
      .sort(
        (a, b) =>
          b.count - a.count
      );


  return (

    <section className="panel feedback-analytics-panel">

      <div className="feedback-section-heading">

        <div>

          <h2>
            System Ratings & Feedback
          </h2>

          <p>
            Summary of feedback submitted by Student, Teaching, and Non-teaching users.
          </p>

        </div>

      </div>


      {loadingFeedback

        ? (

          <Empty
            text="Loading ratings and feedback..."
          />

        )

        : feedbackError

          ? (

            <div className="error-box">
              {feedbackError}
            </div>

          )

          : (

            <>

              <div className="feedback-summary-grid">

                <div className="feedback-summary-card">

                  <Star
                    size={28}
                    fill="currentColor"
                  />

                  <span>
                    Average Rating
                  </span>

                  <strong>
                    {average} / 5
                  </strong>

                </div>


                <div className="feedback-summary-card">

                  <ClipboardList
                    size={28}
                  />

                  <span>
                    Total Feedback
                  </span>

                  <strong>
                    {total}
                  </strong>

                </div>

              </div>


              <div className="feedback-report-grid">

                <div className="feedback-report-block">

                  <h3>
                    Rating Distribution
                  </h3>


                  {distribution.map(
                    item => (

                      <div
                        className="feedback-distribution-row"
                        key={item.stars}
                      >

                        <span>
                          {
                            "★".repeat(
                              item.stars
                            )
                          }
                        </span>


                        <div className="feedback-distribution-bar">

                          <i
                            style={{
                              width:
                                `${
                                  total
                                    ? (
                                        item.count /
                                        total
                                      ) * 100
                                    : 0
                                }%`
                            }}
                          />

                        </div>


                        <b>
                          {item.count}
                        </b>

                      </div>

                    )
                  )}

                </div>


                <div className="feedback-report-block">

                  <h3>
                    Feedback Categories
                  </h3>


                  {categoryCounts.length === 0

                    ? (
                      <p className="feedback-help-text">
                        No category data yet.
                      </p>
                    )

                    : categoryCounts.map(
                        item => (

                          <div
                            className="feedback-category-row"
                            key={item.category}
                          >

                            <span>
                              {item.category}
                            </span>

                            <strong>
                              {item.count}
                            </strong>

                          </div>

                        )
                      )
                  }

                </div>

              </div>


              <div className="feedback-recent-section">

                <h3>
                  Recent User Feedback
                </h3>


                {feedbackRows.length === 0

                  ? (

                    <Empty
                      text="No ratings or feedback have been submitted yet."
                    />

                  )

                  : (

                    <div className="table-wrap">

                      <table>

                        <thead>

                          <tr>

                            <th>
                              Name
                            </th>

                            <th>
                              Role
                            </th>

                            <th>
                              Department
                            </th>

                            <th>
                              Rating
                            </th>

                            <th>
                              Category
                            </th>

                            <th>
                              Feedback
                            </th>

                            <th>
                              Date
                            </th>

                          </tr>

                        </thead>


                        <tbody>

                          {feedbackRows
                            .slice(
                              0,
                              20
                            )
                            .map(
                              item => (

                                <tr
                                  key={item.id}
                                >

                                  <td>
                                    {
                                      item.ownerName ||
                                      "User"
                                    }
                                  </td>

                                  <td>
                                    {
                                      systemRoleLabel(
                                        item.role
                                      )
                                    }
                                  </td>

                                  <td>
                                    {
                                      item.department ||
                                      "—"
                                    }
                                  </td>

                                  <td>
                                    <span className="table-star-rating">
                                      {
                                        "★".repeat(
                                          Number(
                                            item.rating || 0
                                          )
                                        )
                                      }
                                    </span>
                                    {" "}
                                    {
                                      item.rating
                                    }/5
                                  </td>

                                  <td>
                                    {
                                      item.category ||
                                      "Overall Experience"
                                    }
                                  </td>

                                  <td className="feedback-comment-cell">
                                    {
                                      item.feedback?.trim()
                                        ? item.feedback
                                        : "No written comment."
                                    }
                                  </td>

                                  <td>
                                    {
                                      formatFeedbackDate(
                                        item.createdAt
                                      )
                                    }
                                  </td>

                                </tr>

                              )
                            )
                          }

                        </tbody>

                      </table>

                    </div>

                  )
                }

              </div>

            </>

          )
      }

    </section>

  );
}


// ======================================================
// REPORTS
// ======================================================

function Reports() {
  const { user } = useAuth();
  const isSuperAdmin = user.role === "super_admin";

  // Phase 4C: report-only, aggregate Supabase RPC. No Firebase collections,
  // assessment answers, counseling messages, or student names are loaded.
  const { report, loading: reportsLoading, error: reportsError } = useReportsAnalytics();

  if (reportsLoading) {
    return (
      <>
        <PageTitle title="Reports and Analytics" subtitle="Assessment, counseling, and referral analytics." />
        <section className="panel"><Empty text="Loading analytics from Supabase..." /></section>
      </>
    );
  }

  if (reportsError) {
    return (
      <>
        <PageTitle title="Reports and Analytics" subtitle="Assessment, counseling, and referral analytics." />
        <div className="error-box">
          {reportsError}
          <br />
          Reports could not load. Confirm that the Phase 4C SQL has been run and your account has report access.
        </div>
      </>
    );
  }

  const priorityLevels = [
    "Minimal / none", "Mild", "Moderate", "Moderately severe",
    "Severe", "Extremely Severe", "Unclassified"
  ];
  const priorityColors = {
    "Minimal / none": "#168a4b",
    Mild: "#65a30d",
    Moderate: "#c89412",
    "Moderately severe": "#ea7c16",
    Severe: "#dc3b2f",
    "Extremely Severe": "#991b1b",
    Unclassified: "#64748b"
  };

  function categorySort(a, b) {
    if (a.label === "Not specified") return 1;
    if (b.label === "Not specified") return -1;
    return a.label.localeCompare(b.label);
  }

  // These rows are already grouped by the database. Never aggregate
  // confidential individual records in the browser.
  function priorityBreakdown(dimension) {
    const grouped = new Map();
    report.assessmentBreakdown
      .filter(row => row.dimension === dimension)
      .forEach(row => {
        if (!grouped.has(row.label)) {
          grouped.set(row.label, {
            label: row.label,
            ...Object.fromEntries(priorityLevels.map(level => [level, 0]))
          });
        }
        const item = grouped.get(row.label);
        const level = priorityLevels.includes(row.priority) ? row.priority : "Unclassified";
        item[level] += row.count;
      });
    return [...grouped.values()].sort(categorySort);
  }

  function counselingBreakdown(dimension) {
    return report.counselingBreakdown
      .filter(row => row.dimension === dimension)
      .map(row => ({
        label: row.label,
        requests: row.requests,
        scheduledSessions: row.scheduledSessions
      }))
      .sort(categorySort);
  }

  function referralBreakdown(dimension) {
    return report.referralBreakdown
      .filter(row => row.dimension === dimension)
      .map(row => ({ label: row.label, count: row.count }))
      .sort(categorySort);
  }

  const priorityByCollege = priorityBreakdown("college");
  const priorityByProgram = priorityBreakdown("program");
  const priorityBySex = priorityBreakdown("sex");
  const priorityByUserType = priorityBreakdown("userType");
  const counselingByCollege = counselingBreakdown("college");
  const counselingByProgram = counselingBreakdown("program");
  const counselingBySex = counselingBreakdown("sex");
  const counselingByUserType = counselingBreakdown("userType");
  const referralByStatus = referralBreakdown("status");
  const referralByUrgency = referralBreakdown("urgency");
  const referralByMonth = referralBreakdown("month");

  const priorityTotals = Object.fromEntries(priorityLevels.map(level => [
    level,
    report.assessmentBreakdown
      .filter(row => row.dimension === "college" && row.priority === level)
      .reduce((sum, row) => sum + row.count, 0)
  ]));
  const scheduledSessions = report.scheduledTotal;
  const referralStatusCount = status =>
    referralByStatus.find(row => row.label === status)?.count || 0;
  const analyticsScope = isSuperAdmin
    ? "All colleges and offices"
    : `${user.department || "Counselor"} — currently assigned caseload and relevant referrals`;

  function AnalyticsLegend({
    series
  }) {

    return (

      <div className="analytics-legend">

        {series.map(
          item => (

            <span
              key={
                item.key
              }
            >

              <i
                style={{
                  background:
                    item.color
                }}
              />

              {
                item.label
              }

            </span>

          )
        )}

      </div>

    );
  }


  function AnalyticsBarChart({
    title,
    subtitle,
    rows,
    series,
    emptyText
  }) {

    const maxValue =
      Math.max(
        1,
        ...rows.flatMap(
          row =>
            series.map(
              item =>
                Number(
                  row[
                    item.key
                  ] ||
                  0
                )
            )
        )
      );


    return (

      <section className="panel analytics-chart-panel">

        <div className="analytics-chart-heading">

          <div>

            <h2>
              {title}
            </h2>

            <p>
              {subtitle}
            </p>

          </div>


          <AnalyticsLegend
            series={series}
          />

        </div>


        {rows.length === 0

          ? (

            <Empty
              text={emptyText}
            />

          )

          : (

            <div className="analytics-chart-list">

              {rows.map(
                row => (

                  <div
                    className="analytics-chart-category"
                    key={
                      row.label
                    }
                  >

                    <div className="analytics-chart-category-label">
                      {row.label}
                    </div>


                    <div className="analytics-chart-series">

                      {series.map(
                        item => {

                          const value =
                            Number(
                              row[
                                item.key
                              ] ||
                              0
                            );


                          return (

                            <div
                              className="analytics-chart-row"
                              key={
                                `${row.label}-${item.key}`
                              }
                            >

                              <span className="analytics-series-name">
                                {item.shortLabel || item.label}
                              </span>


                              <div className="analytics-bar-track">

                                <i
                                  className="analytics-bar-fill"
                                  style={{
                                    width:
                                      `${
                                        (
                                          value /
                                          maxValue
                                        ) *
                                        100
                                      }%`,

                                    background:
                                      item.color
                                  }}
                                />

                              </div>


                              <b>
                                {value}
                              </b>

                            </div>

                          );
                        }
                      )}

                    </div>

                  </div>

                )
              )}

            </div>

          )
        }

      </section>

    );
  }


  const prioritySeries =
    priorityLevels
      .filter(priority => priority !== "Unclassified" || priorityTotals.Unclassified > 0)
      .map(
      priority => ({
        key:
          priority,

        label:
          priority,

        color:
          priorityColors[
            priority
          ]
      })
    );


  const counselingSeries = [
    {
      key:
        "requests",

      label:
        "Counseling requests",

      shortLabel:
        "Requests",

      color:
        "#173f8f"
    },
    {
      key:
        "scheduledSessions",

      label:
        "Scheduled counseling",

      shortLabel:
        "Scheduled",

      color:
        "#6d48b5"
    }
  ];


  return (

    <div className="analytics-page">

      <style>
        {`
          .analytics-page {
            width: 100%;
          }

          .analytics-print-header {
            display: none;
          }

          .analytics-scope-card {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: center;
            flex-wrap: wrap;
            margin-bottom: 18px;
            padding: 14px 18px;
            border: 1px solid #dfe3eb;
            border-radius: 14px;
            background: #ffffff;
          }

          .analytics-scope-card strong {
            display: block;
            margin-bottom: 3px;
            color: #172033;
          }

          .analytics-scope-card span,
          .analytics-scope-card small {
            color: #687084;
          }

          .analytics-section-heading {
            margin: 28px 0 10px;
          }

          .analytics-section-heading h2 {
            margin: 0 0 5px;
            color: #172033;
            font-size: 22px;
          }

          .analytics-section-heading p {
            margin: 0;
            color: #687084;
          }

          .analytics-chart-panel {
            break-inside: avoid;
          }

          .analytics-chart-heading {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 18px;
            flex-wrap: wrap;
            margin-bottom: 20px;
          }

          .analytics-chart-heading h2 {
            margin: 0 0 5px;
          }

          .analytics-chart-heading p {
            margin: 0;
            color: #687084;
            line-height: 1.45;
          }

          .analytics-legend {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 8px 14px;
          }

          .analytics-legend span {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: #536174;
            font-size: 12px;
            font-weight: 700;
          }

          .analytics-legend i {
            width: 11px;
            height: 11px;
            border-radius: 3px;
            flex: 0 0 11px;
          }

          .analytics-chart-list {
            display: grid;
            gap: 18px;
          }

          .analytics-chart-category {
            display: grid;
            grid-template-columns: minmax(170px, 260px) 1fr;
            gap: 18px;
            align-items: start;
            padding: 14px 0;
            border-bottom: 1px solid #edf0f4;
          }

          .analytics-chart-category:last-child {
            border-bottom: 0;
          }

          .analytics-chart-category-label {
            color: #172033;
            font-size: 13px;
            font-weight: 800;
            line-height: 1.4;
            overflow-wrap: anywhere;
          }

          .analytics-chart-series {
            display: grid;
            gap: 8px;
          }

          .analytics-chart-row {
            display: grid;
            grid-template-columns: 78px minmax(120px, 1fr) 36px;
            gap: 10px;
            align-items: center;
          }

          .analytics-series-name {
            color: #687084;
            font-size: 11px;
            font-weight: 700;
          }

          .analytics-bar-track {
            height: 14px;
            overflow: hidden;
            border-radius: 999px;
            background: #edf0f5;
          }

          .analytics-bar-fill {
            display: block;
            min-width: 0;
            height: 100%;
            border-radius: 999px;
            transition: width 180ms ease;
          }

          .analytics-chart-row b {
            color: #172033;
            font-size: 12px;
            text-align: right;
          }

          .analytics-print-actions {
            display: flex;
            justify-content: flex-end;
            margin-top: 22px;
          }

          @media (max-width: 800px) {
            .analytics-chart-category {
              grid-template-columns: 1fr;
              gap: 10px;
            }

            .analytics-chart-row {
              grid-template-columns: 70px minmax(80px, 1fr) 32px;
            }
          }

          @media print {
            .sidebar,
            .topbar,
            .analytics-print-actions {
              display: none !important;
            }

            .workspace {
              width: 100% !important;
              margin-left: 0 !important;
            }

            .content {
              max-width: none !important;
              padding: 0 !important;
            }

            .analytics-print-header {
              display: block !important;
              margin-bottom: 18px;
              padding-bottom: 12px;
              border-bottom: 2px solid #173f8f;
            }

            .analytics-print-header h1 {
              margin: 0 0 5px;
              font-size: 24px;
            }

            .analytics-print-header p {
              margin: 3px 0;
              color: #536174;
              font-size: 11px;
            }

            .page-title {
              display: none !important;
            }

            .analytics-scope-card,
            .stat-card,
            .analytics-chart-panel,
            .feedback-analytics-panel {
              box-shadow: none !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .analytics-chart-panel {
              margin-top: 14px !important;
              padding: 16px !important;
            }

            .analytics-section-heading {
              break-after: avoid;
              page-break-after: avoid;
            }

            .analytics-bar-fill,
            .analytics-legend i,
            .priority,
            .stat-card > div {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .analytics-chart-category {
              grid-template-columns: 190px 1fr;
              gap: 12px;
              padding: 9px 0;
            }

            .analytics-chart-row {
              grid-template-columns: 64px 1fr 28px;
              gap: 7px;
            }

            .analytics-chart-heading {
              margin-bottom: 12px;
            }

            .analytics-chart-heading h2 {
              font-size: 16px;
            }

            .analytics-chart-heading p,
            .analytics-scope-card,
            .analytics-legend span {
              font-size: 10px;
            }
          }
        `}
      </style>


      <div className="analytics-print-header">

        <h1>
          MindTrack Reports and Analytics
        </h1>

        <p>
          Scope:
          {" "}
          {analyticsScope}
        </p>

      </div>


      <PageTitle
        title="Reports and Analytics"
        subtitle="Supabase assessment, counseling, and referral statistics grouped by college, program, user type, and sex."
      />


      <div className="analytics-scope-card">

        <div>

          <strong>
            Analytics scope
          </strong>

          <span>
            {analyticsScope}
          </span>

        </div>


      </div>


      <div className="stat-grid">

        <Stat
          title="Assessment cases"
          tone="primary"
          value={
            report.assessmentTotal
          }
          icon={
            <ClipboardList />
          }
        />


        <Stat
          title="Counseling requests"
          tone="indigo"
          value={
            report.counselingTotal
          }
          icon={
            <Calendar />
          }
        />


        <Stat
          title="Scheduled counseling"
          tone="info"
          value={
            scheduledSessions
          }
          icon={
            <Clock3 />
          }
        />


        <Stat
          title="Minimal / none"
          tone="low"
          value={
            priorityTotals["Minimal / none"] ||
            0
          }
          icon={
            <CheckCircle2 />
          }
        />


        <Stat
          title="Mild"
          tone="mild"
          value={
            priorityTotals.Mild ||
            0
          }
          icon={
            <Activity />
          }
        />


        <Stat
          title="Moderate"
          tone="moderate"
          value={
            priorityTotals.Moderate ||
            0
          }
          icon={
            <ClipboardList />
          }
        />


        <Stat
          title="Moderately severe"
          tone="moderately-severe"
          value={
            priorityTotals["Moderately severe"] ||
            0
          }
          icon={
            <Clock3 />
          }
        />


        <Stat
          title="Severe"
          tone="severe"
          value={
            priorityTotals.Severe ||
            0
          }
          icon={
            <AlertTriangle />
          }
        />


        <Stat
          title="Extremely Severe"
          tone="extreme"
          value={
            priorityTotals["Extremely Severe"] ||
            0
          }
          icon={
            <AlertTriangle />
          }
        />

        {priorityTotals.Unclassified > 0 && (
          <Stat title="Unclassified" tone="primary"
            value={priorityTotals.Unclassified} icon={<ClipboardList />} />
        )}

      </div>


      <div className="analytics-section-heading">

        <h2>
          Assessment Case Analytics
        </h2>

        <p>
          Each submitted psychological assessment is counted once; unclassified records are shown separately.
        </p>

      </div>


      <AnalyticsBarChart
        title="Assessment severities by college / office"
        subtitle="Minimal / none, Mild, Moderate, Moderately severe, Severe, and Extremely Severe assessment cases for each college or office."
        rows={priorityByCollege}
        series={prioritySeries}
        emptyText="No assessment cases are available for college-level analytics."
      />


      <AnalyticsBarChart
        title="Assessment severities by program"
        subtitle="Severity distribution for each academic program. Accounts without a program are grouped as No program / N/A."
        rows={priorityByProgram}
        series={prioritySeries}
        emptyText="No assessment cases are available for program-level analytics."
      />


      <AnalyticsBarChart
        title="Assessment severities by user type"
        subtitle="Severity distribution for Student, Teaching, and Non-teaching users."
        rows={priorityByUserType}
        series={prioritySeries}
        emptyText="No assessment cases are available for user-type analytics."
      />


      <AnalyticsBarChart
        title="Assessment severities by sex"
        subtitle="Severity distribution using the Male/Female value stored in the user's public account profile."
        rows={priorityBySex}
        series={prioritySeries}
        emptyText="No assessment cases are available for sex-level analytics."
      />


      <div className="analytics-section-heading">

        <h2>
          Counseling Analytics
        </h2>

        <p>
          Each counseling request is counted once. Scheduled counseling includes requests currently marked Scheduled for counseling or Rescheduled.
        </p>

      </div>


      <AnalyticsBarChart
        title="Counseling by college / office"
        subtitle="Total counseling requests and scheduled counseling records for each college or office."
        rows={counselingByCollege}
        series={counselingSeries}
        emptyText="No counseling records are available for college-level analytics."
      />


      <AnalyticsBarChart
        title="Counseling by program"
        subtitle="Counseling requests and scheduled counseling records grouped by academic program."
        rows={counselingByProgram}
        series={counselingSeries}
        emptyText="No counseling records are available for program-level analytics."
      />


      <AnalyticsBarChart
        title="Counseling by user type"
        subtitle="Counseling requests and scheduled counseling records for Student, Teaching, and Non-teaching users."
        rows={counselingByUserType}
        series={counselingSeries}
        emptyText="No counseling records are available for user-type analytics."
      />


      <AnalyticsBarChart
        title="Counseling by sex"
        subtitle="Counseling requests and scheduled counseling records grouped by Male/Female account profile value."
        rows={counselingBySex}
        series={counselingSeries}
        emptyText="No counseling records are available for sex-level analytics."
      />


      <div className="analytics-section-heading">
        <h2>Referral Analytics</h2>
        <p>Referral counts are grouped by current status, urgency, and month (Philippine time). Counselor reports include referrals assigned to them or involving currently assigned students.</p>
      </div>

      <div className="stat-grid">
        <Stat title="Total referrals" tone="primary"
          value={report.referralTotal} icon={<Users />} />
        <Stat title="Received" tone="info"
          value={referralStatusCount("Received")} icon={<ClipboardList />} />
        <Stat title="Contacted" tone="indigo"
          value={referralStatusCount("Contacted")} icon={<MessageCircle />} />
        <Stat title="Completed" tone="low"
          value={referralStatusCount("Completed")} icon={<CheckCircle2 />} />
      </div>

      <AnalyticsBarChart
        title="Referrals by status"
        subtitle="Current referral status. Unrecognized legacy statuses are grouped as Other."
        rows={referralByStatus}
        series={[{ key: "count", label: "Referrals", color: "#173f8f" }]}
        emptyText="No referral records are available."
      />

      <AnalyticsBarChart
        title="Referrals by urgency"
        subtitle="Referral urgency as recorded at submission."
        rows={referralByUrgency}
        series={[{ key: "count", label: "Referrals", color: "#a96c1a" }]}
        emptyText="No referral urgency data is available."
      />

      <AnalyticsBarChart
        title="Monthly referral trend"
        subtitle="Number of referrals submitted per calendar month (Asia/Manila)."
        rows={referralByMonth}
        series={[{ key: "count", label: "Referrals", color: "#0f766e" }]}
        emptyText="No monthly referral data is available."
      />

      <section className="panel analytics-print-actions">

        <button

          className="secondary-button"

          onClick={
            () =>
              window.print()
          }

        >
          Print analytics
        </button>

      </section>


      {isSuperAdmin && (
        <FeedbackAnalytics />
      )}

    </div>

  );
}


// ======================================================
// REUSABLE COMPONENTS
// ======================================================

function PageTitle({
  title,
  subtitle
}) {

  return (

    <div className="page-title">

      <h1>
        {title}
      </h1>

      <p>
        {subtitle}
      </p>

    </div>

  );

}


function Stat({
  title,
  value,
  icon,
  danger,
  warning,
  tone
}) {

  const resolvedTone =
    tone ||
    (
      danger
        ? "critical"
        : warning
          ? "high"
          : "primary"
    );


  return (

    <div
      className={
        `stat-card stat-card-${resolvedTone}`
      }
    >

      <div>
        {icon}
      </div>

      <span>
        {title}
      </span>

      <strong>
        {value}
      </strong>

    </div>

  );

}


function ActionLink({
  href,
  title,
  text,
  icon: Icon
}) {

  return (

    <a
      href={href}
      className="action-card"
    >

      {Icon && (

        <span className="action-card-icon">
          <Icon
            size={28}
            strokeWidth={2.2}
          />
        </span>

      )}


      <span className="action-card-copy">

        <strong>
          {title}
        </strong>

        <p>
          {text}
        </p>

      </span>

    </a>

  );

}


function Empty({
  text
}) {

  return (

    <div className="empty">
      {text}
    </div>

  );

}


// ======================================================
// ASSESSMENT ACCOUNT TABLE
// Counselor / Super Admin
// One account per row; scores stay inside Review.
// ======================================================

function AssessmentAccountTable({
  rows,
  onSelect,
  showCollege = false
}) {

  if (!rows.length) {

    return (
      <Empty
        text="No assessment cases yet."
      />
    );

  }


  return (

    <div className="table-wrap">

      <table className="assessment-account-table">

        <thead>

          <tr>

            <th>
              User
            </th>


            {showCollege && (

              <th>
                College / Office
              </th>

            )}


            <th>
              Program
            </th>


            <th>
              Latest Severity
            </th>


            <th>
              Latest Status
            </th>


            <th>
              Assessments
            </th>


            <th>
              Action
            </th>

          </tr>

        </thead>


        <tbody>

          {rows.map(
            row => (

              <tr
                key={
                  row.assessmentOwnerKey ||
                  row.ownerId ||
                  row.id
                }
              >

                <td>

                  <strong>
                    {
                      row.ownerName ||
                      "User"
                    }
                  </strong>

                </td>


                {showCollege && (

                  <td>
                    {
                      counselorCollegeLabel(
                        row.department
                      )
                    }
                  </td>

                )}


                <td>
                  {
                    counselorProgramLabel(
                      row.program
                    )
                  }
                </td>


                <td>

                  <span
                    className={
                      priorityClassName(
                        row.priority
                      )
                    }
                  >
                    {
                      row.priority ||
                      "No severity"
                    }
                  </span>

                </td>


                <td>
                  {
                    assessmentCaseStatusDisplayLabel(
                      row.status
                    )
                  }
                </td>


                <td>

                  <span className="assessment-count-badge">
                    {
                      row.assessmentCount ||
                      1
                    }
                  </span>

                </td>


                <td>

                  <button

                    type="button"

                    className="text-button"

                    onClick={
                      () =>
                        onSelect(
                          row
                        )
                    }

                  >
                    Review
                  </button>

                </td>

              </tr>

            )
          )}

        </tbody>

      </table>

    </div>

  );
}


// ======================================================
// CASE TABLE
// ======================================================

function CaseTable({
  rows,
  onSelect,
  showCollege = false
}) {

  if (!rows.length) {

    return (
      <Empty
        text="No records yet."
      />
    );

  }


  return (

    <div className="table-wrap">

      <table>


        <thead>

          <tr>

            <th>
              User
            </th>

            {showCollege && (

              <th>
                College / Office
              </th>

            )}

            <th>
              Program
            </th>

            <th>
              WHO-5
            </th>

            <th>
              PHQ-9
            </th>

            <th>
              GAD-7
            </th>

            <th>
              DASS-21
            </th>

            <th>
              Monitoring Severity
            </th>

            <th>
              Status
            </th>

            {onSelect && (

              <th>
                Action
              </th>

            )}

          </tr>

        </thead>


        <tbody>


          {rows.map(
            row => {

              const standardized =
                Boolean(
                  row.instrumentResults
                );


              return (

                <tr
                  key={
                    row.id
                  }
                >

                  <td>

                    {
                      row.ownerName ||
                      "Current user"
                    }

                  </td>


                  {showCollege && (

                    <td>

                      {
                        counselorCollegeLabel(
                          row.department
                        )
                      }

                    </td>

                  )}


                  <td>

                    {
                      counselorProgramLabel(
                        row.program
                      )
                    }

                  </td>


                  <td>

                    {standardized

                      ? (
                        <>
                          {
                            row.instrumentResults
                              ?.who5
                              ?.percentageScore
                          }/100
                        </>
                      )

                      : (
                        row.score ??
                        "—"
                      )
                    }

                  </td>


                  <td>

                    {standardized

                      ? (
                        <>
                          {
                            row.instrumentResults
                              ?.phq9
                              ?.totalScore
                          }/27
                        </>
                      )

                      : "—"
                    }

                  </td>


                  <td>

                    {standardized

                      ? (
                        <>
                          {
                            row.instrumentResults
                              ?.gad7
                              ?.totalScore
                          }/21
                        </>
                      )

                      : "—"
                    }

                  </td>

                  <td>

                    {standardized &&
                    row.instrumentResults
                      ?.dass21

                      ? (
                        row.instrumentResults
                          .dass21
                          .depression

                          ? (

                            <div className="dass21-table-scores">

                              <span>
                                D:
                                {" "}
                                {
                                  row.instrumentResults
                                    .dass21
                                    .depression
                                    .adjustedScore
                                }/42
                              </span>

                              <span>
                                A:
                                {" "}
                                {
                                  row.instrumentResults
                                    .dass21
                                    .anxiety
                                    .adjustedScore
                                }/42
                              </span>

                              <span>
                                S:
                                {" "}
                                {
                                  row.instrumentResults
                                    .dass21
                                    .stress
                                    .adjustedScore
                                }/42
                              </span>

                            </div>

                          )

                          : (
                            <>
                              Legacy:
                              {" "}
                              {
                                row.instrumentResults
                                  .dass21
                                  .totalScore ??
                                "—"
                              }/63
                            </>
                          )
                      )

                      : "—"
                    }

                  </td>


                  <td>

                    <span
                      className={
                        priorityClassName(
                          row.priority
                        )
                      }
                    >

                      {
                        row.priority ||
                        "—"
                      }

                    </span>

                  </td>


                  <td>
                    {
                      assessmentCaseStatusLabel(
                        row.status
                      )
                    }
                  </td>


                  {onSelect && (

                    <td>

                      <button

                        className="text-button"

                        onClick={
                          () =>
                            onSelect(
                              row
                            )
                        }

                      >

                        Review

                      </button>

                    </td>

                  )}

                </tr>

              );
            }
          )}

        </tbody>

      </table>

    </div>

  );

}


// ======================================================
// APP ROUTES
// ======================================================

export default function App() {
  const { user } = useAuth();
  const staffReferralOnly = REFERRAL_USER_ROLE_VALUES.includes(
    String(user?.role || "").trim().toLowerCase()
  );

  // Layout.jsx is unchanged. This role-scoped class hides only the two
  // restricted sidebar links; RoleProtected blocks direct URL access.
  useEffect(() => {
    document.body.classList.toggle(
      "mindtrack-staff-referrals-only",
      staffReferralOnly
    );
    return () => {
      document.body.classList.remove("mindtrack-staff-referrals-only");
    };
  }, [staffReferralOnly]);

  return (

    <Routes>


      {/* PUBLIC HOME PAGE */}

      <Route

        path="/"

        element={
          <Home />
        }

      />


      {/* PUBLIC LOGIN */}

      <Route

        path="/login"

        element={
          <Login />
        }

      />


      {/* PUBLIC REGISTRATION */}

      <Route

        path="/register"

        element={
          <Register />
        }

      />


      {/* PUBLIC PASSWORD RECOVERY */}
      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />


      {/* PROTECTED MINDTRACK PAGES */}

      <Route

        path="/*"

        element={

          <Protected>

            <Layout>

              <Routes>


                <Route

                  path="/dashboard"

                  element={
                    <DashboardRoute />
                  }

                />


                <Route

                  path="/assessment"

                  element={
                    <RoleProtected
                      allowedRoles={["student"]}
                    >
                      <Assessment />
                    </RoleProtected>
                  }

                />


                <Route

                  path="/monitoring"

                  element={
                    <RoleProtected
                      allowedRoles={GENERAL_USER_ROLE_VALUES}
                    >
                      <Monitoring />
                    </RoleProtected>
                  }

                />


                <Route

                  path="/notifications"

                  element={
                    <Notifications />
                  }

                />


                <Route

                  path="/consultations"

                  element={
                    <RoleProtected
                      allowedRoles={["student"]}
                    >
                      <Consultations />
                    </RoleProtected>
                  }

                />


                <Route

                  path="/referrals"

                  element={
                    <RoleProtected
                      allowedRoles={[...REFERRAL_USER_ROLE_VALUES, "counselor", "super_admin"]}
                    >
                      <Referrals />
                    </RoleProtected>
                  }

                />

                <Route

                  path="/feedback"

                  element={
                    <RoleProtected
                      allowedRoles={GENERAL_USER_ROLE_VALUES}
                    >
                      <Feedback />
                    </RoleProtected>
                  }

                />


                <Route

                  path="/profile"

                  element={
                    <Profile />
                  }

                />

                <Route

                  path="/user-profiles"

                  element={
                    <RoleProtected
                      allowedRoles={["counselor", "super_admin"]}
                    >
                      <UserProfiles />
                    </RoleProtected>
                  }

                />


                <Route

                  path="/history"

                  element={
                    <RoleProtected
                      allowedRoles={GENERAL_USER_ROLE_VALUES}
                    >
                      <History />
                    </RoleProtected>
                  }

                />


                <Route

                  path="/cases"

                  element={
                    <RoleProtected
                      allowedRoles={["counselor", "super_admin"]}
                    >
                      <Cases />
                    </RoleProtected>
                  }

                />


                <Route

                  path="/counseling-requests"

                  element={
                    <RoleProtected
                      allowedRoles={["counselor", "super_admin"]}
                    >
                      <CounselingRequestsManagement />
                    </RoleProtected>
                  }

                />


                <Route

                  path="/schedule"

                  element={
                    <RoleProtected
                      allowedRoles={["counselor", "super_admin"]}
                    >
                      <Schedule />
                    </RoleProtected>
                  }

                />


                <Route

                  path="/accounts"

                  element={
                    <RoleProtected
                      allowedRoles={["super_admin"]}
                    >
                      <Accounts />
                    </RoleProtected>
                  }

                />


                <Route

                  path="/reports"

                  element={
                    <RoleProtected
                      allowedRoles={["counselor", "super_admin"]}
                    >
                      <Reports />
                    </RoleProtected>
                  }

                />


                <Route

                  path="*"

                  element={

                    <Navigate

                      to="/dashboard"

                      replace

                    />

                  }

                />


              </Routes>

            </Layout>

          </Protected>

        }


      />


    </Routes>

  );

}