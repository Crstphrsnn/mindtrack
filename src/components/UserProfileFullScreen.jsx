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


      const isSuperAdmin =
        currentUser.role ===
        "super_admin";


      const filters =
        isSuperAdmin
          ? {
              ownerId:
                profile.id
            }
          : {
              department:
                currentUser.department
            };


      return subscribeCollection(
        collectionName,

        incomingRows => {

          const ownRows =
            isSuperAdmin

              ? incomingRows

              : incomingRows.filter(
                  row =>
                    row.ownerId ===
                    profile.id
                );


          setRows(
            ownRows
          );
        },

        filters
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
  displayRole,
  displayValue
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
    notesDraft,
    setNotesDraft
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


            setNotesDraft(
              data?.notes ||
              ""
            );


            setNotesLoading(false);
          },

          error => {

            console.error(
              "Unable to load counseling notes:",
              error
            );


            setCounselingProfile(
              null
            );


            setNotesError(
              error?.code ===
              "permission-denied"

                ? "You do not have permission to view counseling notes for this user."

                : (
                    error?.message ||
                    "Unable to load counseling notes."
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


  const canEditNotes =
    isSuperAdmin ||
    (
      isSameDepartmentCounselor &&
      (
        !assignedCounselorId ||
        assignedCounselorId ===
          currentUser.id
      )
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

    if (!canEditNotes) {
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

          notes:
            notesDraft.trim(),

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
        "Counseling notes saved successfully."
      );

    } catch (error) {

      console.error(
        "Unable to save counseling notes:",
        error
      );


      setNotesError(
        error?.code ===
        "permission-denied"

          ? "You are not allowed to edit the counseling notes for this user."

          : (
              error?.message ||
              "Unable to save counseling notes."
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

                <span className="profile-role-badge">
                  {
                    displayRole(
                      profile.role
                    )
                  }
                </span>


                <span className="assigned-counselor-badge">
                  Assigned Counselor:
                  {" "}
                  {
                    assignedCounselorLabel
                  }
                </span>

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
                      profile.phoneNumber
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
                      profile.address
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
                      profile.facebookAccount
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
                      profile.contactPersonName
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
                      profile.contactPersonPhone
                    )
                  }
                </strong>
              </div>

            </div>


            <div className="profile-note">
              Profile information is view-only for counselors and Super Admin.
            </div>

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
                  Counseling Notes
                </h3>

                <p>
                  Private counselor notes for this user. Only the assigned counselor or Super Admin can edit them.
                </p>

              </div>

              <FileText
                size={24}
              />

            </div>


            {notesLoading

              ? (

                <div className="user-profile-empty">
                  Loading counseling notes...
                </div>

              )

              : (

                <>

                  <label>
                    Notes

                    <textarea
                      rows="10"
                      value={notesDraft}
                      readOnly={
                        !canEditNotes
                      }
                      onChange={
                        event =>
                          setNotesDraft(
                            event.target.value
                          )
                      }
                      placeholder={
                        canEditNotes
                          ? "Enter private counseling notes for this user."
                          : "Only the assigned counselor or Super Admin can edit these notes."
                      }
                    />
                  </label>


                  <div className="counseling-notes-meta">

                    <span>
                      Assigned counselor:
                      {" "}
                      <strong>
                        {
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
                            counselingProfile
                              ?.updatedAt
                          )
                        }
                      </strong>
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


                  {canEditNotes

                    ? (

                      <button
                        type="button"
                        className="primary-button counseling-notes-save"
                        disabled={
                          notesSaving
                        }
                        onClick={
                          saveNotes
                        }
                      >

                        <Save
                          size={18}
                        />

                        {
                          notesSaving
                            ? "Saving..."
                            : "Save Counseling Notes"
                        }

                      </button>

                    )

                    : (

                      <div className="profile-note">
                        These notes are locked because another counselor is assigned to this user. Super Admin can still edit them.
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
