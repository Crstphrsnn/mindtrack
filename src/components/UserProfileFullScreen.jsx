import React, {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Calendar,
  Clock3,
  FileText,
  Save,
  X
} from "lucide-react";

import {
  deleteField,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { db } from "../services/firebase";
import {
  subscribeCollection
} from "../services/dataService";


function useProfileRows(
  collectionName,
  profile,
  currentUser
) {

  const [rows, setRows] =
    useState([]);


  useEffect(
    () => {

      if (
        !profile?.id ||
        !currentUser
      ) {

        setRows([]);

        return undefined;
      }


      // Query by owner ID for both Super Admin and Counselor.
      // Firestore rules decide whether the current counselor has
      // department, current-transfer, or previous-transfer access.
      return subscribeCollection(
        collectionName,
        incomingRows => {
          setRows(
            incomingRows
          );
        },
        {
          ownerId:
            profile.id
        }
      );

    },

    [
      collectionName,
      profile?.id,
      profile?.department,
      currentUser?.id,
      currentUser?.role,
      currentUser?.department
    ]
  );


  return rows;
}


function formatDate(dateKey) {

  if (!dateKey) {
    return "No date";
  }


  const date =
    new Date(
      `${dateKey}T00:00:00`
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return dateKey;
  }


  return date.toLocaleDateString(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  );
}


function formatTimestamp(value) {

  if (!value) {
    return "Not yet saved";
  }


  let timestamp = 0;


  if (
    typeof value.toMillis ===
    "function"
  ) {

    timestamp =
      value.toMillis();

  } else if (
    typeof value.seconds ===
    "number"
  ) {

    timestamp =
      value.seconds * 1000;

  } else {

    timestamp =
      new Date(
        value
      ).getTime();
  }


  if (
    !timestamp ||
    Number.isNaN(timestamp)
  ) {

    return "Not yet saved";
  }


  return new Date(
    timestamp
  ).toLocaleString(
    "en-PH"
  );
}


export default function UserProfileFullScreen({
  profile,
  currentUser,
  onClose,

  displayRole = role => {

    const value =
      String(
        role ||
        ""
      ).trim();


    if (
      value ===
      "student"
    ) {
      return "Student";
    }


    if (
      value ===
        "teaching" ||
      value ===
        "faculty"
    ) {
      return "Teaching";
    }


    if (
      value ===
        "non_teaching" ||
      value ===
        "personnel"
    ) {
      return "Non-teaching";
    }


    if (
      value ===
      "counselor"
    ) {
      return "Counselor";
    }


    if (
      value ===
      "super_admin"
    ) {
      return "Super Admin";
    }


    return value ||
      "Not provided";
  },

  displayValue = value => {

    const text =
      String(
        value ??
        ""
      ).trim();


    return text ||
      "Not provided";
  }
}) {

  const assessments =
    useProfileRows(
      "assessments",
      profile,
      currentUser
    );


  const consultations =
    useProfileRows(
      "consultations",
      profile,
      currentUser
    );


  const [
    counselingProfile,
    setCounselingProfile
  ] = useState(null);


  const [
    privateProfile,
    setPrivateProfile
  ] = useState(null);


  const [
    privateProfileError,
    setPrivateProfileError
  ] = useState("");


  const [
    caseHistoryDraft,
    setCaseHistoryDraft
  ] = useState("");


  const [
    sessionSummaryDraft,
    setSessionSummaryDraft
  ] = useState("");


  const [
    observationDraft,
    setObservationDraft
  ] = useState("");


  const [
    recommendationsDraft,
    setRecommendationsDraft
  ] = useState("");


  const [
    notesLoading,
    setNotesLoading
  ] = useState(true);


  const [
    notesSaving,
    setNotesSaving
  ] = useState(false);


  const [
    notesMessage,
    setNotesMessage
  ] = useState("");


  const [
    notesError,
    setNotesError
  ] = useState("");


  useEffect(
    () => {

      if (!profile?.id) {
        return undefined;
      }


      setNotesLoading(true);
      setNotesError("");


      const noteRef =
        doc(
          db,
          "counselingProfiles",
          profile.id
        );


      const unsubscribe =
        onSnapshot(
          noteRef,

          snapshot => {

            const data =
              snapshot.exists()
                ? {
                    id:
                      snapshot.id,
                    ...snapshot.data()
                  }
                : null;


            setCounselingProfile(
              data
            );


            const legacyNotes =
              data?.notes ||
              "";


            setCaseHistoryDraft(
              data?.caseHistory ||
              legacyNotes
            );


            setSessionSummaryDraft(
              data?.counselingSessionSummary ||
              ""
            );


            setObservationDraft(
              data?.counselorObservation ||
              ""
            );


            setRecommendationsDraft(
              data?.recommendations ||
              ""
            );


            setNotesLoading(false);
          },

          error => {

            console.error(
              "Unable to load counselor notes:",
              error
            );


            setCounselingProfile(
              null
            );


            setNotesError(
              error?.code ===
              "permission-denied"

                ? "You do not have permission to view counselor notes for this user."

                : (
                    error?.message ||
                    "Unable to load counselor notes."
                  )
            );


            setNotesLoading(false);
          }
        );


      return unsubscribe;

    },

    [
      profile?.id
    ]
  );


  useEffect(
    () => {

      if (
        !profile?.id
      ) {

        setPrivateProfile(
          null
        );

        return undefined;
      }


      setPrivateProfileError(
        ""
      );


      const privateRef =
        doc(
          db,
          "userPrivateProfiles",
          profile.id
        );


      const unsubscribe =
        onSnapshot(
          privateRef,

          snapshot => {

            setPrivateProfile(
              snapshot.exists()
                ? snapshot.data()
                : null
            );
          },

          error => {

            // Previous counselors keep documentation/history access,
            // but private contact details remain restricted to the
            // current assigned counselor and Super Admin.
            if (
              error?.code !==
              "permission-denied"
            ) {

              console.error(
                "Unable to load private user profile:",
                error
              );
            }


            setPrivateProfile(
              null
            );


            setPrivateProfileError(
              error?.code ===
                "permission-denied"
                ? "Private contact details are available only to the current assigned counselor and Super Admin."
                : (
                    error?.message ||
                    "Unable to load private profile information."
                  )
            );
          }
        );


      return unsubscribe;

    },
    [
      profile?.id,
      currentUser?.id,
      currentUser?.role
    ]
  );


  useEffect(
    () => {

      function closeOnEscape(
        event
      ) {

        if (
          event.key ===
          "Escape"
        ) {

          onClose();
        }
      }


      const previousOverflow =
        document.body.style.overflow;


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

    [onClose]
  );


  const latestAssessment =
    assessments[0] ||
    null;


  const priority =
    latestAssessment?.priority ||
    "No Assessment";


  const priorityClass =
    latestAssessment?.priority
      ? String(
          latestAssessment.priority
        )
          .trim()
          .toLowerCase()
      : "none";


  const isSuperAdmin =
    currentUser.role ===
    "super_admin";


  const isSameDepartmentCounselor =
    currentUser.role ===
      "counselor" &&
    currentUser.department ===
      profile.department;


  const assignedCounselorId =
    counselingProfile
      ?.assignedCounselorId ||
    "";


  const assignedCounselorDepartment =
    counselingProfile
      ?.assignedCounselorDepartment ||
    "";


  const isCurrentAssignedCounselor =
    currentUser.role ===
      "counselor" &&
    assignedCounselorId ===
      currentUser.id;


  const isPreviousAssignedCounselor =
    currentUser.role ===
      "counselor" &&
    !isCurrentAssignedCounselor &&
    (
      (
        Array.isArray(
          counselingProfile
            ?.previousCounselorIds
        ) &&
        counselingProfile.previousCounselorIds.includes(
          currentUser.id
        )
      )
      ||
      counselingProfile
        ?.transferredFromCounselorId ===
        currentUser.id
    );


  const isTransferred =
    Boolean(
      assignedCounselorId &&
      assignedCounselorDepartment &&
      profile.department &&
      assignedCounselorDepartment !==
        profile.department
    );


  const canEditCounselorNotes =
    isSuperAdmin ||
    isCurrentAssignedCounselor ||
    (
      isSameDepartmentCounselor &&
      !assignedCounselorId
    );


  const assignedCounselorLabel =
    counselingProfile
      ?.assignedCounselorName

      || (
        assignedCounselorId
          ? "Assigned counselor"
          : "Not assigned yet"
      );


  const today =
    new Date();


  const todayKey =
    [
      today.getFullYear(),
      String(
        today.getMonth() + 1
      ).padStart(
        2,
        "0"
      ),
      String(
        today.getDate()
      ).padStart(
        2,
        "0"
      )
    ].join("-");


  const upcomingSchedules =
    useMemo(
      () =>
        consultations
          .filter(
            row =>
              [
                "Schedule for counseling",
                "Approved",
                "Rescheduled"
              ].includes(
                row.status
              ) &&
              row.date &&
              row.date >=
                todayKey
          )
          .sort(
            (a, b) =>
              String(
                a.date || ""
              ).localeCompare(
                String(
                  b.date || ""
                )
              )
          ),

      [
        consultations,
        todayKey
      ]
    );


  async function saveNotes() {

    if (!canEditCounselorNotes) {
      return;
    }


    try {

      setNotesSaving(true);
      setNotesMessage("");
      setNotesError("");


      const noteRef =
        doc(
          db,
          "counselingProfiles",
          profile.id
        );


      const counselorId =
        counselingProfile
          ?.assignedCounselorId

        || (
          currentUser.role ===
          "counselor"
            ? currentUser.id
            : ""
        );


      const counselorName =
        counselingProfile
          ?.assignedCounselorName

        || (
          currentUser.role ===
          "counselor"
            ? currentUser.name
            : ""
        );


      await setDoc(
        noteRef,
        {
          ownerId:
            profile.id,

          ownerName:
            profile.name ||
            "",

          department:
            profile.department ||
            "",

          assignedCounselorId:
            counselorId,

          assignedCounselorName:
            counselorName,

          assignedCounselorDepartment:
            counselingProfile
              ?.assignedCounselorDepartment
            || (
              currentUser.role ===
                "counselor"
                ? currentUser.department || ""
                : ""
            ),

          previousCounselorIds:
            counselingProfile
              ?.previousCounselorIds ||
            [],

          previousCounselorNames:
            counselingProfile
              ?.previousCounselorNames ||
            [],

          caseHistory:
            caseHistoryDraft.trim(),

          counselingSessionSummary:
            sessionSummaryDraft.trim(),

          counselorObservation:
            observationDraft.trim(),

          recommendations:
            recommendationsDraft.trim(),

          notes:
            deleteField(),

          updatedById:
            currentUser.id,

          updatedByName:
            currentUser.name ||
            currentUser.email ||
            "Authorized user",

          updatedAt:
            serverTimestamp()
        },
        {
          merge: true
        }
      );


      setNotesMessage(
        "Counselor notes saved successfully."
      );

    } catch (error) {

      console.error(
        "Unable to save counselor notes:",
        error
      );


      setNotesError(
        error?.code ===
        "permission-denied"

          ? "You are not allowed to edit the counselor notes for this user."

          : (
              error?.message ||
              "Unable to save counselor notes."
            )
      );

    } finally {

      setNotesSaving(false);
    }
  }


  return (

    <div
      className="user-profile-modal-backdrop"
      role="presentation"
      onMouseDown={
        event => {

          if (
            event.target ===
            event.currentTarget
          ) {

            onClose();
          }
        }
      }
    >

      <section
        className="user-profile-modal"
        role="dialog"
        aria-modal="true"
        aria-label={
          `${profile.name || "User"} profile`
        }
      >

        <header className="user-profile-modal-header">

          <div className="user-profile-modal-identity">

            <div
              className="profile-avatar"
              aria-hidden="true"
            >
              {
                profile.name
                  ?.trim()
                  ?.charAt(0)
                  ?.toUpperCase()
                ||
                "U"
              }
            </div>


            <div className="user-profile-modal-name">

              <div className="user-profile-name-row">

                <h2>
                  {
                    displayValue(
                      profile.name
                    )
                  }
                </h2>


                <span
                  className={
                    `priority ${priorityClass}`
                  }
                >
                  {priority}
                </span>

              </div>


              <p>
                {
                  displayValue(
                    profile.email
                  )
                }
              </p>


              <div className="user-profile-header-badges">

                <div className="user-profile-status-badges">

                  <span className="profile-role-badge">
                    {
                      displayRole(
                        profile.role
                      )
                    }
                  </span>


                  {isTransferred && (
                    <span className="transferred-badge transferred-profile-badge">
                      Transferred
                    </span>
                  )}

                </div>


                <div className="user-profile-counselor-meta">

                  <span className="assigned-counselor-badge">
                    <strong>
                      Assigned Counselor:
                    </strong>
                    {" "}
                    {
                      assignedCounselorLabel
                    }
                  </span>


                  {assignedCounselorDepartment && (
                    <span className="assigned-counselor-department-badge">
                      <strong>
                        Counselor College / Office:
                      </strong>
                      {" "}
                      {assignedCounselorDepartment}
                    </span>
                  )}

                </div>

              </div>

            </div>

          </div>


          <button
            type="button"
            className="user-profile-close-button"
            onClick={onClose}
            aria-label="Close user profile"
            title="Close"
          >
            <X size={24} />
          </button>

        </header>


        <div className="user-profile-modal-body">

          {isPreviousAssignedCounselor && (
            <div className="transfer-documentation-notice">
              <div className="transfer-documentation-notice-title">
                Documentation access
              </div>

              <div className="transfer-documentation-notice-text">
                This user has been transferred to another counselor. You retain
                read-only access to the profile, counseling history, assessment
                history, and existing counselor notes for documentation.
              </div>
            </div>
          )}


          <section className="user-profile-modal-card">

            <h3>
              Account Information
            </h3>


            <div className="readonly-profile-grid">

              <div className="readonly-profile-item">
                <span>
                  Full Name
                </span>
                <strong>
                  {
                    displayValue(
                      profile.name
                    )
                  }
                </strong>
              </div>


              <div className="readonly-profile-item">
                <span>
                  Account Type
                </span>
                <strong>
                  {
                    displayRole(
                      profile.role
                    )
                  }
                </strong>
              </div>


              <div className="readonly-profile-item">
                <span>
                  College / Office
                </span>
                <strong>
                  {
                    displayValue(
                      profile.department
                    )
                  }
                </strong>
              </div>


              {profile.role ===
                "student" && (

                <div className="readonly-profile-item">
                  <span>
                    Program
                  </span>
                  <strong>
                    {
                      displayValue(
                        profile.program
                      )
                    }
                  </strong>
                </div>

              )}


              <div className="readonly-profile-item">
                <span>
                  {
                    profile.role ===
                    "student"
                      ? "Student Number"
                      : "Employee Number"
                  }
                </span>

                <strong>
                  {
                    displayValue(
                      profile.userNumber
                    )
                  }
                </strong>
              </div>


              <div className="readonly-profile-item">
                <span>
                  Phone Number
                </span>
                <strong>
                  {
                    displayValue(
                      privateProfile?.phoneNumber
                    )
                  }
                </strong>
              </div>


              <div className="readonly-profile-item full">
                <span>
                  Address
                </span>
                <strong>
                  {
                    displayValue(
                      privateProfile?.address
                    )
                  }
                </strong>
              </div>


              <div className="readonly-profile-item">
                <span>
                  Facebook Account
                </span>
                <strong>
                  {
                    displayValue(
                      privateProfile?.facebookAccount
                    )
                  }
                </strong>
              </div>


              <div className="readonly-profile-item">
                <span>
                  Contact Person
                </span>
                <strong>
                  {
                    displayValue(
                      privateProfile?.contactPersonName
                    )
                  }
                </strong>
              </div>


              <div className="readonly-profile-item">
                <span>
                  Contact Person Phone
                </span>
                <strong>
                  {
                    displayValue(
                      privateProfile?.contactPersonPhone
                    )
                  }
                </strong>
              </div>

            </div>


            <div className="profile-note">
              Profile information is view-only for counselors and Super Admin.
            </div>


            {privateProfileError && (

              <div className="profile-note">
                {
                  privateProfileError
                }
              </div>

            )}

          </section>


          <section className="user-profile-modal-card">

            <div className="user-profile-section-title">

              <div>

                <h3>
                  Counseling Schedule
                </h3>

                <p>
                  Shows upcoming approved or rescheduled counseling appointments so the counselor can quickly see the user's next session.
                </p>

              </div>

              <Calendar
                size={24}
              />

            </div>


            {upcomingSchedules.length === 0

              ? (

                <div className="user-profile-empty">
                  No upcoming approved counseling schedule.
                </div>

              )

              : (

                <div className="profile-schedule-list">

                  {upcomingSchedules.map(
                    row => (

                      <article
                        key={row.id}
                        className="profile-schedule-card"
                      >

                        <div>
                          <strong>
                            {
                              row.category ||
                              "Counseling"
                            }
                          </strong>

                          <span>
                            {
                              formatDate(
                                row.date
                              )
                            }
                            {" · "}
                            {
                              row.time ||
                              "No time"
                            }

                            {row.mode && (
                              <>
                                {" · "}
                                {row.mode}
                              </>
                            )}
                          </span>
                        </div>


                        <span className="status">
                          {
                            row.status
                          }
                        </span>

                      </article>

                    )
                  )}

                </div>

              )
            }

          </section>


          <section className="user-profile-modal-card">

            <div className="user-profile-section-title">

              <div>

                <h3>
                  Psychological Assessment History
                </h3>

                <p>
                  Shows the user's assessment cases from newest to oldest for authorized counselor review and transfer continuity.
                </p>

              </div>

              <FileText
                size={24}
              />

            </div>


            {assessments.length === 0

              ? (

                <div className="user-profile-empty">
                  No psychological assessment history.
                </div>

              )

              : (

                <div className="profile-history-list">

                  {assessments.map(
                    row => {

                      const results =
                        row.instrumentResults;


                      return (

                        <article
                          key={row.id}
                          className="profile-history-card assessment-profile-history-card"
                        >

                          <div className="profile-history-card-top">

                            <strong>
                              {
                                formatTimestamp(
                                  row.createdAt
                                )
                              }
                            </strong>

                            <span className="status">
                              {
                                row.status ||
                                "For review"
                              }
                            </span>

                          </div>


                          <p>
                            Priority:
                            {" "}
                            <strong>
                              {
                                row.priority ||
                                "Not available"
                              }
                            </strong>
                          </p>


                          {results
                            ? (
                              <div className="profile-assessment-score-list">
                                <span>
                                  WHO-5: {results?.who5?.percentageScore ?? "—"}/100
                                </span>
                                <span>
                                  PHQ-9: {results?.phq9?.totalScore ?? "—"}/27
                                </span>
                                <span>
                                  GAD-7: {results?.gad7?.totalScore ?? "—"}/21
                                </span>
                                {results?.dass21?.depression
                                  ? (
                                    <>
                                      <span>
                                        DASS-D: {results.dass21.depression.adjustedScore}/42
                                      </span>
                                      <span>
                                        DASS-A: {results.dass21.anxiety.adjustedScore}/42
                                      </span>
                                      <span>
                                        DASS-S: {results.dass21.stress.adjustedScore}/42
                                      </span>
                                    </>
                                  )
                                  : (
                                    <span>
                                      DASS-21: {results?.dass21?.totalScore ?? "—"}/63
                                    </span>
                                  )
                                }
                              </div>
                            )
                            : (
                              <small>
                                Legacy score: {row.score ?? "Not available"}
                              </small>
                            )
                          }


                          {row.counselorRemarks && (
                            <small>
                              <b>Counselor remarks:</b>
                              {" "}
                              {row.counselorRemarks}
                            </small>
                          )}

                        </article>
                      );
                    }
                  )}

                </div>

              )
            }

          </section>


          <section className="user-profile-modal-card">

            <div className="user-profile-section-title">

              <div>

                <h3>
                  Counseling Request History
                </h3>

                <p>
                  Shows the user's submitted counseling requests from newest to oldest.
                </p>

              </div>

              <Clock3
                size={24}
              />

            </div>


            {consultations.length === 0

              ? (

                <div className="user-profile-empty">
                  No counseling request history.
                </div>

              )

              : (

                <div className="profile-history-list">

                  {consultations.map(
                    row => (

                      <article
                        key={row.id}
                        className="profile-history-card"
                      >

                        <div className="profile-history-card-top">

                          <strong>
                            {
                              row.category ||
                              "Counseling request"
                            }
                          </strong>

                          <span className="status">
                            {
                              row.status ||
                              "Pending approval"
                            }
                          </span>

                        </div>


                        <p>
                          {
                            formatDate(
                              row.date
                            )
                          }
                          {" · "}
                          {
                            row.time ||
                            "No time"
                          }

                          {row.mode && (
                            <>
                              {" · "}
                              {row.mode}
                            </>
                          )}
                        </p>


                        {row.message && (

                          <small>
                            <b>
                              Details:
                            </b>
                            {" "}
                            {row.message}
                          </small>

                        )}


                        {row.counselorRemarks && (

                          <small>
                            <b>
                              Counselor remarks:
                            </b>
                            {" "}
                            {
                              row.counselorRemarks
                            }
                          </small>

                        )}

                      </article>

                    )
                  )}

                </div>

              )
            }

          </section>


          <section className="user-profile-modal-card counseling-notes-card">

            <div className="user-profile-section-title">

              <div>

                <h3>
                  Counselor Notes
                </h3>

                <p>
                  Structured private case notes. Only the assigned counselor or Super Admin can edit this section.
                </p>

              </div>

              <FileText
                size={24}
              />

            </div>


            {notesLoading

              ? (

                <div className="user-profile-empty">
                  Loading counselor notes...
                </div>

              )

              : (

                <>

                  <div className="counselor-notes-grid">

                    <label className="counselor-note-field">
                      <span>Case History</span>
                      <textarea
                        rows="6"
                        value={caseHistoryDraft}
                        readOnly={!canEditCounselorNotes}
                        onChange={event => setCaseHistoryDraft(event.target.value)}
                        placeholder={
                          canEditCounselorNotes
                            ? "Record relevant case background, previous concerns, and important case developments."
                            : "Only the assigned counselor or Super Admin can edit this field."
                        }
                      />
                    </label>

                    <label className="counselor-note-field">
                      <span>Counseling Session Summary</span>
                      <textarea
                        rows="6"
                        value={sessionSummaryDraft}
                        readOnly={!canEditCounselorNotes}
                        onChange={event => setSessionSummaryDraft(event.target.value)}
                        placeholder={
                          canEditCounselorNotes
                            ? "Summarize the important topics, concerns, and outcomes discussed during counseling."
                            : "Only the assigned counselor or Super Admin can edit this field."
                        }
                      />
                    </label>

                    <label className="counselor-note-field">
                      <span>Counselor's Observation</span>
                      <textarea
                        rows="6"
                        value={observationDraft}
                        readOnly={!canEditCounselorNotes}
                        onChange={event => setObservationDraft(event.target.value)}
                        placeholder={
                          canEditCounselorNotes
                            ? "Record relevant professional observations from the counseling interaction."
                            : "Only the assigned counselor or Super Admin can edit this field."
                        }
                      />
                    </label>

                    <label className="counselor-note-field">
                      <span>Recommendations</span>
                      <textarea
                        rows="6"
                        value={recommendationsDraft}
                        readOnly={!canEditCounselorNotes}
                        onChange={event => setRecommendationsDraft(event.target.value)}
                        placeholder={
                          canEditCounselorNotes
                            ? "Record follow-up steps, support recommendations, or other counselor guidance."
                            : "Only the assigned counselor or Super Admin can edit this field."
                        }
                      />
                    </label>

                  </div>

                  <div className="counseling-notes-meta">
                    <span>
                      Assigned counselor:{" "}
                      <strong>{assignedCounselorLabel}</strong>
                    </span>

                    <span>
                      Last updated:{" "}
                      <strong>{formatTimestamp(counselingProfile?.updatedAt)}</strong>
                    </span>
                  </div>

                  {notesMessage && (
                    <div className="success-box">
                      {notesMessage}
                    </div>
                  )}

                  {notesError && (
                    <div className="error-box">
                      {notesError}
                    </div>
                  )}

                  {canEditCounselorNotes
                    ? (
                      <button
                        type="button"
                        className="primary-button counseling-notes-save"
                        disabled={notesSaving}
                        onClick={saveNotes}
                      >
                        <Save size={18} />
                        {notesSaving ? "Saving..." : "Save Counselor Notes"}
                      </button>
                    )
                    : (
                      <div className="profile-note">
                        {isPreviousAssignedCounselor
                          ? "Counselor notes are read-only because this user was transferred to another assigned counselor. Your access is retained for documentation."
                          : "Counselor notes are locked because another counselor is assigned to this user. Super Admin can still edit them."}
                      </div>
                    )
                  }

                </>

              )
            }

          </section>

        </div>

      </section>

    </div>

  );
}
