import React, {



  useEffect,



  useMemo,



  useState



} from "react";







import {
  Calendar,
  Clock3,
  X
} from "lucide-react";







import {
  collection,
  onSnapshot,
  query,
  where
} from "firebase/firestore";







import { db } from "../services/firebase";



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





      const constraints = [

        where(

          "ownerId",

          "==",

          profile.id

        )

      ];





      const isSameDepartmentCounselor =

        currentUser.role ===

          "counselor" &&

        currentUser.department ===

          profile.department;





      // Same-department counselors use both ownerId and

      // department. A transferred counselor from another

      // department uses ownerId only because access is

      // granted through the approved transfer.

      if (isSameDepartmentCounselor) {



        constraints.push(

          where(

            "department",

            "==",

            profile.department

          )

        );

      }





      const rowsQuery =

        query(

          collection(

            db,

            collectionName

          ),

          ...constraints

        );





      return onSnapshot(

        rowsQuery,



        snapshot => {



          setRows(

            snapshot.docs.map(

              item => ({

                id:

                  item.id,



                ...item.data()

              })

            )

          );

        },



        error => {



          console.error(

            `Unable to load ${collectionName} for ${profile.id}:`,

            error

          );





          // Keep the profile page open even when a Firestore

          // listener is denied. This avoids another blank page.

          setRows([]);

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











function displayRoleValue(



  role



) {







  if (role === "student") {



    return "Student";



  }











  if (
    role === "teaching" ||
    role === "faculty"
  ) {



    return "Teaching";



  }











  if (
    role === "non_teaching" ||
    role === "personnel"
  ) {



    return "Non-teaching";



  }











  if (role === "counselor") {



    return "Guidance Counselor";



  }











  if (role === "super_admin") {



    return "Super Administrator";



  }











  return role ||



    "—";



}











function displayFieldValue(



  value



) {







  if (



    value === null ||



    value === undefined ||



    String(value).trim() === ""



  ) {







    return "Not provided";



  }











  return String(value);



}











export default function UserProfileFullScreen({



  profile,



  currentUser,



  onClose



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











  const assignmentRecord =
    useMemo(
      () =>
        consultations.find(
          row =>
            row.assignedCounselorId &&
            row.transferStatus ===
              "Approved"
        ) ||
        consultations.find(
          row =>
            row.assignedCounselorId &&
            row.status ===
              "Schedule for counseling"
        ) ||
        consultations.find(
          row =>
            row.assignedCounselorId
        ) ||
        null,
      [
        consultations
      ]
    );


  const assignedCounselorId =
    assignmentRecord
      ?.assignedCounselorId ||
    "";


  const assignedCounselorName =
    assignmentRecord
      ?.assignedCounselorName ||
    "";


  const assignedCounselorDepartment =
    assignmentRecord
      ?.assignedCounselorDepartment ||
    "";


  const isFormerAssignedCounselor =
    Boolean(
      currentUser.role ===
        "counselor" &&
      assignmentRecord
        ?.transferredFromCounselorId ===
        currentUser.id &&
      assignedCounselorId &&
      assignedCounselorId !==
        currentUser.id
    );


  const isCrossCollegeTransferred =
    Boolean(
      assignmentRecord
        ?.transferStatus ===
        "Approved" &&
      assignedCounselorDepartment &&
      profile.department &&
      assignedCounselorDepartment !==
        profile.department
    );


  const assignedCounselorLabel =
    assignedCounselorName ||
    (
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



                    displayFieldValue(



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











                {isCrossCollegeTransferred && (







                  <span className="transferred-profile-badge">



                    Transferred



                  </span>







                )}







              </div>











              <p>



                {



                  displayFieldValue(



                    profile.email



                  )



                }



              </p>











              <div className="user-profile-header-badges">







                <span className="profile-role-badge">



                  {



                    displayRoleValue(



                      profile.role



                    )



                  }



                </span>











                <span className="assigned-counselor-badge">



                  Assigned Counselor:



                  {" "}



                  {assignedCounselorLabel}







                  {assignedCounselorDepartment && (



                    <>



                      {" · "}



                      {assignedCounselorDepartment}



                    </>



                  )}



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







          {isFormerAssignedCounselor && (







            <div className="notice">



              This user has been transferred to another counselor. Your previous case records remain available for reference, but private case information is managed from Counseling Requests by the currently assigned counselor or Super Admin.



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



                    displayFieldValue(



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



                    displayRoleValue(



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



                    displayFieldValue(



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



                      displayFieldValue(



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



                    displayFieldValue(



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



                    displayFieldValue(



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



                    displayFieldValue(



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



                    displayFieldValue(



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



                    displayFieldValue(



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



                    displayFieldValue(



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











          







        </div>







      </section>







    </div>







  );



}
