import fs from "fs";
import path from "path";

const root = process.cwd();

const appPath = path.join(
  root,
  "src",
  "App.jsx"
);

const profilePath = path.join(
  root,
  "src",
  "components",
  "UserProfileFullScreen.jsx"
);


function requireFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `File not found: ${filePath}\nRun this script from the MindTrack project root.`
    );
  }
}


function backup(filePath) {
  const backupPath =
    `${filePath}.transfer-ownership-backup`;

  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(
      filePath,
      backupPath
    );
  }
}


function replaceOnce(
  text,
  oldText,
  newText,
  label
) {
  if (!text.includes(oldText)) {
    throw new Error(
      `Patch target not found: ${label}\nYour source may be different from the current MindTrack GitHub version.`
    );
  }

  return text.replace(
    oldText,
    newText
  );
}


function sectionReplace(
  fullText,
  startMarker,
  endMarker,
  transform,
  label
) {
  const start =
    fullText.indexOf(
      startMarker
    );

  const end =
    fullText.indexOf(
      endMarker,
      start
    );


  if (
    start < 0 ||
    end < 0
  ) {
    throw new Error(
      `Unable to locate section: ${label}`
    );
  }


  const section =
    fullText.slice(
      start,
      end
    );


  const changed =
    transform(
      section
    );


  return (
    fullText.slice(
      0,
      start
    ) +
    changed +
    fullText.slice(
      end
    )
  );
}


requireFile(
  appPath
);

requireFile(
  profilePath
);


backup(
  appPath
);

backup(
  profilePath
);


let app =
  fs.readFileSync(
    appPath,
    "utf8"
  );


let profile =
  fs.readFileSync(
    profilePath,
    "utf8"
  );


// =====================================================
// APP.JSX
// =====================================================


// -----------------------------------------------------
// 1. TRANSFERRED OWNER COLLECTION HOOK
// -----------------------------------------------------

const transferHelpersMarker = `

// ======================================================
// COUNSELOR TRANSFER HELPERS
// ======================================================
`;


if (
  !app.includes(
    "function useTransferredOwnerRows("
  )
) {

  const hook = `

// ======================================================
// TRANSFERRED-OWNER COLLECTION HOOK
// Lets the currently assigned counselor load records for
// users transferred from another college/department.
// ======================================================

function useTransferredOwnerRows(
  collectionName,
  counselorId
) {

  const [rows, setRows] =
    useState([]);


  useEffect(
    () => {

      if (!counselorId) {

        setRows([]);

        return undefined;
      }


      let rowUnsubscribers = [];


      const accessQuery =
        query(
          collection(
            db,
            "transferAccess"
          ),

          where(
            "counselorId",
            "==",
            counselorId
          ),

          where(
            "active",
            "==",
            true
          )
        );


      const accessUnsubscribe =
        onSnapshot(
          accessQuery,

          accessSnapshot => {

            rowUnsubscribers.forEach(
              unsubscribe =>
                unsubscribe()
            );


            rowUnsubscribers = [];


            const rowsByOwner =
              new Map();


            if (
              accessSnapshot.empty
            ) {

              setRows([]);

              return;
            }


            accessSnapshot.docs.forEach(
              accessDoc => {

                const access =
                  accessDoc.data();


                if (!access.ownerId) {
                  return;
                }


                const ownerQuery =
                  query(
                    collection(
                      db,
                      collectionName
                    ),

                    where(
                      "ownerId",
                      "==",
                      access.ownerId
                    )
                  );


                const rowUnsubscribe =
                  onSnapshot(
                    ownerQuery,

                    snapshot => {

                      rowsByOwner.set(
                        access.ownerId,

                        snapshot.docs.map(
                          item => ({
                            id:
                              item.id,

                            ...item.data()
                          })
                        )
                      );


                      setRows(
                        mergeRowsById(
                          ...Array.from(
                            rowsByOwner.values()
                          )
                        )
                      );
                    },

                    error => {

                      console.error(
                        \`Unable to load transferred \${collectionName} records:\`,
                        error
                      );
                    }
                  );


                rowUnsubscribers.push(
                  rowUnsubscribe
                );
              }
            );
          },

          error => {

            console.error(
              "Unable to load transfer access:",
              error
            );


            setRows([]);
          }
        );


      return () => {

        accessUnsubscribe();


        rowUnsubscribers.forEach(
          unsubscribe =>
            unsubscribe()
        );
      };

    },

    [
      collectionName,
      counselorId
    ]
  );


  return rows;
}
`;


  app =
    replaceOnce(
      app,
      transferHelpersMarker,
      hook +
        transferHelpersMarker,
      "insert transferred-owner hook"
    );
}


// -----------------------------------------------------
// 2. USER PROFILES
// -----------------------------------------------------

app =
  sectionReplace(
    app,

    "function UserProfilesContent({",

    "// ======================================================\n// USER NOTIFICATIONS",

    section => {

      if (
        !section.includes(
          "TRANSFER OWNERSHIP FILTER"
        )
      ) {

        const combinedMarker = `  const combinedRows =
    isSuperAdmin
      ? departmentRows
      : mergeRowsById(
          departmentRows,
          transferredRows
        );`;


        const replacement = `  // TRANSFER OWNERSHIP FILTER
  // Home-department counselors should no longer see a user
  // in User Profiles after the user has been assigned to
  // another counselor. The new counselor still receives the
  // user through transferAccess.

  const activeDepartmentRows =
    isSuperAdmin

      ? departmentRows

      : departmentRows.filter(
          account => {

            const counselingProfile =
              profileTransferMap[
                account.id
              ];


            return !(
              counselingProfile
                ?.transferActive &&

              counselingProfile
                ?.assignedCounselorId &&

              counselingProfile
                .assignedCounselorId !==
                currentUser.id
            );
          }
        );


  const combinedRows =
    isSuperAdmin

      ? departmentRows

      : mergeRowsById(
          activeDepartmentRows,
          transferredRows
        );`;


        section =
          replaceOnce(
            section,
            combinedMarker,
            replacement,
            "User Profiles combined rows"
          );


        const insertBeforeCombined =
          "  // TRANSFER OWNERSHIP FILTER";


        const effect = `  // Keep the assignment state for users from the counselor's
  // home department. This is used only to remove users who
  // have already been transferred to another counselor.

  useEffect(
    () => {

      if (isSuperAdmin) {
        return undefined;
      }


      const profileQuery =
        query(
          collection(
            db,
            "counselingProfiles"
          ),

          where(
            "department",
            "==",
            currentUser.department
          )
        );


      return onSnapshot(
        profileQuery,

        snapshot => {

          const map = {};


          snapshot.docs.forEach(
            item => {

              map[
                item.id
              ] =
                item.data();
            }
          );


          setProfileTransferMap(
            map
          );
        },

        error => {

          console.error(
            "Unable to load counseling assignment state:",
            error
          );


          setProfileTransferMap(
            {}
          );
        }
      );

    },

    [
      isSuperAdmin,
      currentUser.department
    ]
  );


`;


        section =
          section.replace(
            insertBeforeCombined,

            effect +
              insertBeforeCombined
          );
      }


      return section;
    },

    "UserProfilesContent"
  );


// -----------------------------------------------------
// 3. ASSESSMENT CASES
// -----------------------------------------------------

app =
  sectionReplace(
    app,

    "function Cases() {",

    "// ======================================================\n// COUNSELING REQUEST MANAGEMENT",

    section => {

      const oldRows = `  const assessmentFilters =
    isSuperAdmin
      ? {}
      : {
          department:
            user.department
        };


  const rows =
    useRows(
      "assessments",
      assessmentFilters
    );`;


      const newRows = `  const assessmentFilters =
    isSuperAdmin
      ? {}
      : {
          department:
            user.department
        };


  const departmentAssessmentRows =
    useRows(
      "assessments",
      assessmentFilters
    );


  const transferredAssessmentRows =
    useTransferredOwnerRows(
      "assessments",

      isSuperAdmin
        ? ""
        : user.id
    );


  const rows =
    isSuperAdmin

      ? departmentAssessmentRows

      : mergeRowsById(
          departmentAssessmentRows,
          transferredAssessmentRows
        );


  const departmentCaseProfiles =
    useRows(
      "counselingProfiles",

      isSuperAdmin

        ? {
            ownerId:
              "__NO_ACCESS__"
          }

        : {
            department:
              user.department
          }
    );


  const assignedCaseProfiles =
    useRows(
      "counselingProfiles",

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


  const caseProfileMap =
    {};


  mergeRowsById(
    departmentCaseProfiles,
    assignedCaseProfiles
  ).forEach(
    counselingProfile => {

      const ownerId =
        counselingProfile.ownerId ||
        counselingProfile.id;


      if (ownerId) {

        caseProfileMap[
          ownerId
        ] =
          counselingProfile;
      }
    }
  );


  function assessmentIsReadOnly(
    row
  ) {

    if (
      isSuperAdmin ||
      user.role !==
        "counselor"
    ) {

      return false;
    }


    const counselingProfile =
      caseProfileMap[
        row?.ownerId
      ];


    return Boolean(
      counselingProfile
        ?.assignedCounselorId &&

      counselingProfile
        .assignedCounselorId !==
        user.id
    );
  }`;


      if (
        !section.includes(
          "function assessmentIsReadOnly("
        )
      ) {

        section =
          replaceOnce(
            section,
            oldRows,
            newRows,
            "Assessment Cases record ownership"
          );
      }


      const saveStart = `  async function saveAssessmentUpdate() {

    if (!selected) {
      return;
    }`;


      const saveReplacement = `  async function saveAssessmentUpdate() {

    if (!selected) {
      return;
    }


    if (
      assessmentIsReadOnly(
        selected
      )
    ) {

      alert(
        "This user has been transferred to another counselor. You may view the assessment record, but only the currently assigned counselor can change its status or remarks."
      );


      return;
    }`;


      if (
        !section.includes(
          "This user has been transferred to another counselor. You may view the assessment record"
        )
      ) {

        section =
          replaceOnce(
            section,
            saveStart,
            saveReplacement,
            "Assessment save read-only guard"
          );
      }


      const reviewNote = `                <p className="assessment-review-record-note">
                  Changes below apply only to the currently selected assessment dated
                  {" "}
                  {
                    formatRecordDateTime(
                      selected.createdAt
                    )
                  }.
                </p>`;


      const reviewNoteReplacement = `${reviewNote}


                {assessmentIsReadOnly(
                  selected
                ) && (

                  <div className="notice">

                    Read-only record: this user has been transferred to another counselor. You can still review the assessment history and scores, but you cannot change the assessment status or counselor remarks.

                  </div>

                )}`;


      if (
        !section.includes(
          "Read-only record: this user has been transferred to another counselor"
        )
      ) {

        section =
          replaceOnce(
            section,
            reviewNote,
            reviewNoteReplacement,
            "Assessment read-only notice"
          );
      }


      section =
        section.replace(
          `                    value={
                      statusDraft
                    }

                    onChange={`,

          `                    value={
                      statusDraft
                    }

                    disabled={
                      assessmentIsReadOnly(
                        selected
                      )
                    }

                    onChange={`
        );


      section =
        section.replace(
          `                    rows="9"

                    value={
                      remarksDraft
                    }

                    onChange={`,

          `                    rows="9"

                    value={
                      remarksDraft
                    }

                    readOnly={
                      assessmentIsReadOnly(
                        selected
                      )
                    }

                    onChange={`
        );


      section =
        section.replace(
          `                    disabled={
                      savingCase
                    }

                    onClick={`,

          `                    disabled={
                      savingCase ||
                      assessmentIsReadOnly(
                        selected
                      )
                    }

                    onClick={`
        );


      section =
        section.replace(
          `                      savingCase
                        ? "Saving..."
                        : "Save case update"`,

          `                      assessmentIsReadOnly(
                        selected
                      )
                        ? "Read only"
                        : savingCase
                          ? "Saving..."
                          : "Save case update"`
        );


      return section;
    },

    "Cases"
  );


// -----------------------------------------------------
// 4. COUNSELING REQUESTS
// -----------------------------------------------------

app =
  sectionReplace(
    app,

    "function CounselingRequestsManagement() {",

    "// ======================================================\n// COUNSELOR SCHEDULE",

    section => {

      const oldAssessmentRows = `  const assessmentRows =
    useRows(
      "assessments",
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
    );`;


      const newAssessmentRows = `  const departmentAssessmentRows =
    useRows(
      "assessments",

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


  const transferredAssessmentRows =
    useTransferredOwnerRows(
      "assessments",

      !hasAccess ||
      isSuperAdmin

        ? ""

        : user.id
    );


  const assessmentRows =
    isSuperAdmin

      ? departmentAssessmentRows

      : mergeRowsById(
          departmentAssessmentRows,
          transferredAssessmentRows
        );`;


      if (
        !section.includes(
          "const transferredAssessmentRows ="
        )
      ) {

        section =
          replaceOnce(
            section,
            oldAssessmentRows,
            newAssessmentRows,
            "Counseling transferred assessment data"
          );
      }


      const helperMarker = `  const isSuperAdmin =
    user.role ===
    "super_admin";`;


      const helper = `${helperMarker}


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
  }`;


      if (
        !section.includes(
          "function requestIsReadOnly("
        )
      ) {

        section =
          replaceOnce(
            section,
            helperMarker,
            helper,
            "Counseling request read-only helper"
          );
      }


      const saveStart = `  async function saveRequestUpdate() {

    if (!selected) {
      return;
    }`;


      const saveReplacement = `  async function saveRequestUpdate() {

    if (!selected) {
      return;
    }


    if (
      requestIsReadOnly(
        selected
      )
    ) {

      alert(
        "This counseling case has been transferred to another counselor. You may view the record, but only the currently assigned counselor can make changes."
      );


      return;
    }`;


      if (
        !section.includes(
          "This counseling case has been transferred to another counselor"
        )
      ) {

        section =
          replaceOnce(
            section,
            saveStart,
            saveReplacement,
            "Counseling save read-only guard"
          );
      }


      const reviewHeading = `                <h3>
                  Counselor Review
                </h3>`;


      const reviewHeadingReplacement = `${reviewHeading}


                {requestIsReadOnly(
                  selected
                ) && (

                  <div className="notice">

                    Read-only record: this counseling case has been transferred to another counselor. You can view the request and previous remarks, but you cannot change them.

                  </div>

                )}`;


      if (
        !section.includes(
          "Read-only record: this counseling case has been transferred"
        )
      ) {

        section =
          replaceOnce(
            section,
            reviewHeading,
            reviewHeadingReplacement,
            "Counseling read-only notice"
          );
      }


      section =
        section.replace(
          `                    value={
                      statusDraft
                    }

                    onChange={
                      e =>`,

          `                    value={
                      statusDraft
                    }

                    disabled={
                      requestIsReadOnly(
                        selected
                      )
                    }

                    onChange={
                      e =>`
        );


      section =
        section.replace(
          `                    rows="9"

                    value={
                      remarksDraft
                    }

                    onChange={
                      e =>`,

          `                    rows="9"

                    value={
                      remarksDraft
                    }

                    readOnly={
                      requestIsReadOnly(
                        selected
                      )
                    }

                    onChange={
                      e =>`
        );


      section =
        section.replace(
          `                    disabled={
                      saving
                    }

                    onClick={`,

          `                    disabled={
                      saving ||
                      requestIsReadOnly(
                        selected
                      )
                    }

                    onClick={`
        );


      section =
        section.replace(
          `                      saving
                        ? "Saving..."
                        : "Save request update"`,

          `                      requestIsReadOnly(
                        selected
                      )
                        ? "Read only"
                        : saving
                          ? "Saving..."
                          : "Save request update"`
        );


      section =
        section.replace(
          `                      Review request
                    </button>`,

          `                      {
                        requestIsReadOnly(
                          row
                        )
                          ? "View record"
                          : "Review request"
                      }
                    </button>`
        );


      return section;
    },

    "CounselingRequestsManagement"
  );


// -----------------------------------------------------
// 5. COUNSELOR SCHEDULE
// -----------------------------------------------------

app =
  sectionReplace(
    app,

    "function Schedule() {",

    "// ======================================================\n// ACCOUNT MANAGEMENT",

    section => {

      const oldRows = `  const rows =
    isSuperAdmin
      ? departmentRows
      : mergeRowsById(
          departmentRows,
          transferredAssignedRows
        );`;


      const newRows = `  const activeDepartmentRows =
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
        );`;


      if (
        !section.includes(
          "const activeDepartmentRows ="
        )
      ) {

        section =
          replaceOnce(
            section,
            oldRows,
            newRows,
            "Counselor Schedule transfer ownership"
          );
      }


      return section;
    },

    "Schedule"
  );


// =====================================================
// USERPROFILEFULLSCREEN.JSX
// =====================================================


// -----------------------------------------------------
// Load selected user's records by ownerId.
// -----------------------------------------------------

const oldProfileRows = `      const isSuperAdmin =
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
      );`;


const newProfileRows = `      return subscribeCollection(
        collectionName,
        setRows,
        {
          ownerId:
            profile.id
        }
      );`;


if (
  profile.includes(
    oldProfileRows
  )
) {

  profile =
    replaceOnce(
      profile,
      oldProfileRows,
      newProfileRows,
      "UserProfileFullScreen specific-owner records"
    );
}


// -----------------------------------------------------
// Detect former counselor.
// -----------------------------------------------------

const canEditMarker = `  const canEditCounselorNotes =
    isSuperAdmin ||
    isAssignedCounselor ||
    (
      isSameDepartmentCounselor &&
      !assignedCounselorId
    );`;


const canEditReplacement = `${canEditMarker}


  const isFormerAssignedCounselor =
    Boolean(
      currentUser.role ===
        "counselor" &&

      counselingProfile
        ?.transferredFromCounselorId ===
        currentUser.id &&

      assignedCounselorId &&

      assignedCounselorId !==
        currentUser.id
    );`;


if (
  !profile.includes(
    "const isFormerAssignedCounselor ="
  )
) {

  profile =
    replaceOnce(
      profile,
      canEditMarker,
      canEditReplacement,
      "Former counselor state"
    );
}


// -----------------------------------------------------
// Add read-only notice.
// -----------------------------------------------------

const bodyMarker =
  `        <div className="user-profile-modal-body">`;


const bodyReplacement = `${bodyMarker}


          {isFormerAssignedCounselor && (

            <div className="notice">

              This user has been transferred to another counselor. Your previous case records remain available for reference, but this profile and its counselor notes are read-only for you.

            </div>

          )}`;


if (
  !profile.includes(
    "Your previous case records remain available for reference"
  )
) {

  profile =
    replaceOnce(
      profile,
      bodyMarker,
      bodyReplacement,
      "Former counselor read-only notice"
    );
}


// =====================================================
// WRITE UPDATED FILES
// =====================================================

fs.writeFileSync(
  appPath,
  app,
  "utf8"
);


fs.writeFileSync(
  profilePath,
  profile,
  "utf8"
);


console.log("");

console.log(
  "MindTrack transfer ownership patch applied."
);

console.log("");

console.log(
  "Updated:"
);

console.log(
  "  src/App.jsx"
);

console.log(
  "  src/components/UserProfileFullScreen.jsx"
);

console.log("");

console.log(
  "Backups:"
);

console.log(
  `  ${appPath}.transfer-ownership-backup`
);

console.log(
  `  ${profilePath}.transfer-ownership-backup`
);

console.log("");

console.log(
  "Next:"
);

console.log(
  "  1. Publish the updated Firestore rules."
);

console.log(
  "  2. Run: npm run build"
);

console.log(
  "  3. Run: npm run dev"
);

console.log(
  "  4. Test transfer with both old and new counselors."
);