import React, {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Calendar,
  Clock3,
  FileText,
  X
} from "lucide-react";

import {
  doc,
  onSnapshot
} from "firebase/firestore";

import { db } from "../services/firebase";
import {
  subscribeCollection
} from "../services/dataService";

import {
  dass21Choices,
  dass21Questions,
  gad7Choices,
  gad7Questions,
  phq9Choices,
  phq9Questions,
  who5Choices,
  who5Questions
} from "../utils/assessment";


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


function normalizeCounselingStatus(
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


function consultationSortValue(
  row
) {

  if (
    row?.date
  ) {

    const timeText =
      String(
        row.time ||
        ""
      ).trim();


    const match =
      timeText.match(
        /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
      );


    if (match) {

      let hours =
        Number(
          match[1]
        );


      const minutes =
        Number(
          match[2]
        );


      const period =
        match[3]
          .toUpperCase();


      if (
        period ===
          "PM" &&
        hours !==
          12
      ) {

        hours +=
          12;
      }


      if (
        period ===
          "AM" &&
        hours ===
          12
      ) {

        hours =
          0;
      }


      const date =
        new Date(
          `${row.date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`
        );


      if (
        !Number.isNaN(
          date.getTime()
        )
      ) {

        return date.getTime();
      }
    }


    const dateOnly =
      new Date(
        `${row.date}T00:00:00`
      );


    if (
      !Number.isNaN(
        dateOnly.getTime()
      )
    ) {

      return dateOnly.getTime();
    }
  }


  return (
    recordTimestampMillis(
      row?.updatedAt
    ) ||
    recordTimestampMillis(
      row?.createdAt
    )
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
    sessionNotes,
    setSessionNotes
  ] = useState([]);


  const [
    sessionNotesError,
    setSessionNotesError
  ] = useState("");


  const [
    selectedHistorySessionId,
    setSelectedHistorySessionId
  ] = useState("");


  const [
    selectedAssessmentHistoryId,
    setSelectedAssessmentHistoryId
  ] = useState("");


  const [
    counselingProfile,
    setCounselingProfile
  ] = useState(null);


  useEffect(
    () => {

      if (
        !profile?.id ||
        !currentUser?.id
      ) {

        setSessionNotes([]);
        setSessionNotesError("");

        return undefined;
      }


      const consultationIds =
        Array.from(
          new Set(
            consultations
              .map(
                row =>
                  row.id
              )
              .filter(Boolean)
          )
        );


      if (
        consultationIds.length ===
        0
      ) {

        setSessionNotes([]);
        setSessionNotesError("");

        return undefined;
      }


      let active =
        true;


      const notesById =
        new Map();


      setSessionNotesError("");


      const unsubscribers =
        consultationIds.map(
          consultationId => {

            const noteRef =
              doc(
                db,
                "counselingSessionNotes",
                consultationId
              );


            return onSnapshot(
              noteRef,

              snapshot => {

                if (!active) {
                  return;
                }


                if (
                  snapshot.exists()
                ) {

                  notesById.set(
                    consultationId,
                    {
                      id:
                        snapshot.id,
                      ...snapshot.data()
                    }
                  );

                } else {

                  notesById.delete(
                    consultationId
                  );
                }


                setSessionNotes(
                  Array.from(
                    notesById.values()
                  )
                );
              },

              error => {

                if (!active) {
                  return;
                }


                console.error(
                  `Unable to load counseling session notes for ${consultationId}:`,
                  error
                );


                notesById.delete(
                  consultationId
                );


                setSessionNotes(
                  Array.from(
                    notesById.values()
                  )
                );


                setSessionNotesError(
                  error?.code ===
                    "permission-denied"
                    ? "Some counseling session notes could not be loaded because the current Firestore rules do not allow this counselor to read them."
                    : (
                        error?.message ||
                        "Unable to load some counseling session notes."
                      )
                );
              }
            );
          }
        );


      return () => {

        active =
          false;


        unsubscribers.forEach(
          unsubscribe => {

            try {
              unsubscribe();
            } catch {
              // Ignore listener cleanup errors.
            }
          }
        );
      };

    },

    [
      profile?.id,
      currentUser?.id,
      consultations
    ]
  );


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


  useEffect(
    () => {

      if (!profile?.id) {
        return undefined;
      }


      setNotesLoading(true);


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


            setNotesLoading(false);
          },

          error => {

            console.error(
              "Unable to load counseling profile:",
              error
            );


            setCounselingProfile(
              null
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
      return String(value);
    }


    return matchedChoice.helper
      ? `${matchedChoice.label} — ${matchedChoice.helper}`
      : matchedChoice.label;
  }


  function renderProfileAssessmentAnswerGroup(
    title,
    questions,
    choices,
    row
  ) {

    return (

      <section className="profile-assessment-answer-group">

        <h5>
          {title}
        </h5>


        <div className="profile-assessment-answer-list">

          {questions.map(
            (
              question,
              index
            ) => (

              <div
                className="profile-assessment-answer-item"
                key={
                  question.id
                }
              >

                <p>
                  <span>
                    {index + 1}.
                  </span>
                  {" "}
                  {question.text}
                </p>

                <strong>
                  {
                    assessmentAnswerLabel(
                      row.answers?.[
                        question.id
                      ],
                      choices
                    )
                  }
                </strong>

              </div>

            )
          )}

        </div>

      </section>

    );
  }


  const sortedAssessments =
    useMemo(
      () =>
        [...assessments]
          .sort(
            (
              a,
              b
            ) =>
              recordTimestampMillis(
                b.createdAt
              ) -
              recordTimestampMillis(
                a.createdAt
              )
          ),
      [
        assessments
      ]
    );


  const latestAssessment =
    sortedAssessments[0] ||
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


  const assignedCounselorLabel =
    counselingProfile
      ?.assignedCounselorName

      || (
        assignedCounselorId
          ? "Assigned counselor"
          : "Not assigned yet"
      );


  const upcomingSchedules =
    useMemo(
      () =>
        consultations
          .filter(
            row =>
              [
                "Pending approval",
                "For review",
                "Scheduled for counseling",
                "Schedule for counseling",
                "Approved",
                "Rescheduled"
              ].includes(
                row.status
              ) &&
              row.date
          )
          .sort(
            (a, b) => {

              const dateDifference =
                String(
                  a.date ||
                  ""
                ).localeCompare(
                  String(
                    b.date ||
                    ""
                  )
                );


              if (
                dateDifference !==
                0
              ) {

                return dateDifference;
              }


              return String(
                a.time ||
                ""
              ).localeCompare(
                String(
                  b.time ||
                  ""
                )
              );
            }
          ),

      [
        consultations
      ]
    );


  const terminatedSessions =
    useMemo(
      () =>
        consultations
          .filter(
            row =>
              normalizeCounselingStatus(
                row.status
              ) ===
              "Terminated"
          )
          .sort(
            (
              first,
              second
            ) => {

              const firstSessionNumber =
                Number(
                  first.sessionNumber ||
                  0
                ) ||
                0;


              const secondSessionNumber =
                Number(
                  second.sessionNumber ||
                  0
                ) ||
                0;


              if (
                firstSessionNumber &&
                secondSessionNumber &&
                firstSessionNumber !==
                  secondSessionNumber
              ) {

                return (
                  secondSessionNumber -
                  firstSessionNumber
                );
              }


              return (
                consultationSortValue(
                  second
                ) -
                consultationSortValue(
                  first
                )
              );
            }
          ),
      [
        consultations
      ]
    );


  const notesByConsultationId =
    useMemo(
      () =>
        new Map(
          sessionNotes.map(
            note => [
              note.consultationId ||
              note.id,
              note
            ]
          )
        ),
      [
        sessionNotes
      ]
    );


  const consultationsById =
    useMemo(
      () =>
        new Map(
          consultations.map(
            row => [
              row.id,
              row
            ]
          )
        ),
      [
        consultations
      ]
    );


  const latestSessionNote =
    useMemo(
      () =>
        [...sessionNotes]
          .sort(
            (
              first,
              second
            ) => {

              const firstSession =
                consultationsById.get(
                  first.consultationId ||
                  first.id
                );


              const secondSession =
                consultationsById.get(
                  second.consultationId ||
                  second.id
                );


              const firstSessionNumber =
                Number(
                  firstSession
                    ?.sessionNumber ||
                  0
                ) ||
                0;


              const secondSessionNumber =
                Number(
                  secondSession
                    ?.sessionNumber ||
                  0
                ) ||
                0;


              if (
                firstSessionNumber &&
                secondSessionNumber &&
                firstSessionNumber !==
                  secondSessionNumber
              ) {

                return (
                  secondSessionNumber -
                  firstSessionNumber
                );
              }


              const firstSessionTime =
                consultationSortValue(
                  firstSession ||
                  {}
                );


              const secondSessionTime =
                consultationSortValue(
                  secondSession ||
                  {}
                );


              if (
                firstSessionTime !==
                secondSessionTime
              ) {

                return (
                  secondSessionTime -
                  firstSessionTime
                );
              }


              return (
                recordTimestampMillis(
                  second.updatedAt ||
                  second.createdAt
                ) -
                recordTimestampMillis(
                  first.updatedAt ||
                  first.createdAt
                )
              );
            }
          )[0] ||
        null,
      [
        sessionNotes,
        consultationsById
      ]
    );


  const latestSessionForNote =
    latestSessionNote
      ? consultationsById.get(
          latestSessionNote.consultationId ||
          latestSessionNote.id
        ) ||
        null
      : null;


  const selectedHistorySession =
    terminatedSessions.find(
      row =>
        row.id ===
        selectedHistorySessionId
    ) ||
    null;


  const selectedHistoryNote =
    selectedHistorySession
      ? notesByConsultationId.get(
          selectedHistorySession.id
        ) ||
        null
      : null;


  useEffect(
    () => {

      setCaseHistoryDraft(
        latestSessionNote
          ?.caseHistory ||
        ""
      );


      setSessionSummaryDraft(
        latestSessionNote
          ?.counselingSessionSummary ||
        ""
      );


      setObservationDraft(
        latestSessionNote
          ?.counselorObservation ||
        ""
      );


      setRecommendationsDraft(
        latestSessionNote
          ?.recommendedActions ||
        ""
      );

    },
    [
      latestSessionNote
    ]
  );


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


          <section className="user-profile-modal-card profile-account-section">

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


          <section className="user-profile-modal-card profile-schedule-section">

            <div className="user-profile-section-title">

              <div>

                <h3>
                  Counseling Schedule
                </h3>

                <p>
                  Shows the user's requested, approved, scheduled, or rescheduled counseling date and time so the counselor can quickly track the next counseling activity.
                </p>

              </div>

              <Calendar
                size={24}
              />

            </div>


            {upcomingSchedules.length === 0

              ? (

                <div className="user-profile-empty">
                  No counseling request schedule is available yet.
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

                          <small className="profile-schedule-type-label">
                            {
                              [
                                "Pending approval",
                                "For review"
                              ].includes(
                                row.status
                              )
                                ? "Requested schedule"
                                : "Counseling schedule"
                            }
                          </small>

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


          {currentUser.role ===
            "counselor" && (

            <section className="user-profile-modal-card profile-assessment-history-section">

              <div className="user-profile-section-title">

                <div>

                  <h3>
                    Psychological Assessment History
                  </h3>

                  <p>
                    Counselor-only assessment history from newest to oldest.
                    Select View answers to review the user's saved item-level responses.
                  </p>

                </div>

                <FileText
                  size={24}
                />

              </div>


              {sortedAssessments.length ===
                0

                ? (

                  <div className="user-profile-empty">
                    No psychological assessment history.
                  </div>

                )

                : (

                  <div className="profile-history-list">

                    {sortedAssessments.map(
                      row => {

                        const results =
                          row.instrumentResults;


                        const answersOpen =
                          selectedAssessmentHistoryId ===
                            row.id;


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


                            <p className="profile-assessment-priority-row">

                              <span>
                                Monitoring Priority
                              </span>

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

                              <small className="profile-assessment-remark">

                                <b>
                                  Counselor remark
                                </b>

                                <span>
                                  {row.counselorRemarks}
                                </span>

                              </small>

                            )}


                            <div className="profile-assessment-history-actions">

                              <button
                                type="button"
                                className="secondary-button profile-assessment-answer-toggle"
                                onClick={
                                  () =>
                                    setSelectedAssessmentHistoryId(
                                      current =>
                                        current ===
                                          row.id
                                          ? ""
                                          : row.id
                                    )
                                }
                              >
                                {
                                  answersOpen
                                    ? "Hide answers"
                                    : "View answers"
                                }
                              </button>

                            </div>


                            {answersOpen && (

                              <div className="profile-assessment-answers-panel">

                                {!row.answers ||
                                typeof row.answers !==
                                  "object"

                                  ? (

                                    <div className="user-profile-empty">
                                      This older assessment does not contain saved item-level answers.
                                    </div>

                                  )

                                  : (

                                    <>

                                      {
                                        renderProfileAssessmentAnswerGroup(
                                          "WHO-5 Well-Being Index",
                                          who5Questions,
                                          who5Choices,
                                          row
                                        )
                                      }


                                      {
                                        renderProfileAssessmentAnswerGroup(
                                          "PHQ-9",
                                          phq9Questions,
                                          phq9Choices,
                                          row
                                        )
                                      }


                                      <div className="profile-assessment-difficulty-row">

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
                                        renderProfileAssessmentAnswerGroup(
                                          "GAD-7",
                                          gad7Questions,
                                          gad7Choices,
                                          row
                                        )
                                      }


                                      {
                                        renderProfileAssessmentAnswerGroup(
                                          "DASS-21",
                                          dass21Questions,
                                          dass21Choices,
                                          row
                                        )
                                      }

                                    </>

                                  )
                                }

                              </div>

                            )}

                          </article>

                        );
                      }
                    )}

                  </div>

                )
              }

            </section>

          )}


          <section className="user-profile-modal-card profile-counseling-history-section">

            <div className="user-profile-section-title">

              <div>

                <h3>
                  Counseling Request History
                </h3>

                <p>
                  Terminated counseling sessions are shown from most recent to oldest. Select a session number to view that session's private counseling notes.
                </p>

              </div>

              <Clock3
                size={24}
              />

            </div>


            {terminatedSessions.length === 0

              ? (

                <div className="user-profile-empty">
                  No terminated counseling sessions yet.
                </div>

              )

              : (

                <>

                  <div className="profile-session-history-list">

                    {terminatedSessions.map(
                      (
                        row,
                        index
                      ) => {

                        const sessionNumber =
                          Number(
                            row.sessionNumber ||
                            0
                          ) ||
                          (
                            terminatedSessions.length -
                            index
                          );


                        return (

                          <button
                            type="button"
                            key={
                              row.id
                            }
                            className={
                              selectedHistorySessionId ===
                                row.id
                                ? "profile-session-history-button selected"
                                : "profile-session-history-button"
                            }
                            onClick={
                              () =>
                                setSelectedHistorySessionId(
                                  current =>
                                    current ===
                                      row.id
                                      ? ""
                                      : row.id
                                )
                            }
                          >
                            Session
                            {" "}
                            {sessionNumber}
                          </button>

                        );
                      }
                    )}

                  </div>


                  {selectedHistorySession && (

                    <div className="profile-session-note-view">

                      <div className="profile-session-note-heading">

                        <strong>
                          Session
                          {" "}
                          {
                            selectedHistorySession.sessionNumber ||
                            "—"
                          }
                          {" "}
                          Counseling Notes
                        </strong>

                        <span>
                          Counselor-only documentation
                        </span>

                      </div>


                      {selectedHistoryNote

                        ? (

                          <div className="profile-session-note-grid">

                            <div className="profile-session-note-field">
                              <span>
                                Case History
                              </span>
                              <p>
                                {
                                  selectedHistoryNote.caseHistory ||
                                  "No case history recorded for this session."
                                }
                              </p>
                            </div>


                            <div className="profile-session-note-field">
                              <span>
                                Summary of Counseling Session
                              </span>
                              <p>
                                {
                                  selectedHistoryNote.counselingSessionSummary ||
                                  "No counseling session summary recorded."
                                }
                              </p>
                            </div>


                            <div className="profile-session-note-field">
                              <span>
                                Counselor's Observation
                              </span>
                              <p>
                                {
                                  selectedHistoryNote.counselorObservation ||
                                  "No counselor observation recorded."
                                }
                              </p>
                            </div>


                            <div className="profile-session-note-field">
                              <span>
                                Recommended Actions
                              </span>
                              <p>
                                {
                                  selectedHistoryNote.recommendedActions ||
                                  "No recommended actions recorded."
                                }
                              </p>
                            </div>

                          </div>

                        )

                        : (

                          <div className="user-profile-empty">
                            No private counseling notes were saved for this session.
                          </div>

                        )
                      }

                    </div>

                  )}

                </>

              )
            }

          </section>


          <section className="user-profile-modal-card counseling-notes-card">

            {sessionNotesError && (
              <div className="error-box">
                {sessionNotesError}
              </div>
            )}


            <div className="user-profile-section-title">

              <div>

                <h3>
                  Counselor Notes
                </h3>

                <p>
                  These notes come from the user's most recent counseling session with saved private notes. Use Counseling Request History above to open notes from earlier terminated sessions.
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

              : !latestSessionNote

                ? (

                  <div className="user-profile-empty">
                    No private counseling notes are available from a completed counseling session yet.
                  </div>

                )

                : (

                  <>

                    <div className="profile-recent-session-note-banner">

                      <strong>
                        Most recent counseling session
                      </strong>

                      <span>
                        Session
                        {" "}
                        {
                          latestSessionForNote
                            ?.sessionNumber ||
                          "—"
                        }
                      </span>

                    </div>


                    <div className="counselor-notes-grid">

                      <label className="counselor-note-field">
                        <span>
                          Case History
                        </span>

                        <textarea
                          rows="6"
                          value={
                            caseHistoryDraft
                          }
                          readOnly
                        />
                      </label>


                      <label className="counselor-note-field">
                        <span>
                          Summary of Counseling Session
                        </span>

                        <textarea
                          rows="6"
                          value={
                            sessionSummaryDraft
                          }
                          readOnly
                        />
                      </label>


                      <label className="counselor-note-field">
                        <span>
                          Counselor's Observation
                        </span>

                        <textarea
                          rows="6"
                          value={
                            observationDraft
                          }
                          readOnly
                        />
                      </label>


                      <label className="counselor-note-field">
                        <span>
                          Recommended Actions
                        </span>

                        <textarea
                          rows="6"
                          value={
                            recommendationsDraft
                          }
                          readOnly
                        />
                      </label>

                    </div>


                    <div className="counseling-notes-meta">

                      <span>
                        Last documented by:
                        {" "}
                        <strong>
                          {
                            latestSessionNote.updatedByName ||
                            assignedCounselorLabel
                          }
                        </strong>
                      </span>

                      <span>
                        Last updated:
                        {" "}
                        <strong>
                          {
                            formatTimestamp(
                              latestSessionNote.updatedAt
                            )
                          }
                        </strong>
                      </span>

                    </div>

                  </>

                )
            }

          </section>

        </div>

      </section>

    </div>

  );
}
