import fs from "fs";
import path from "path";

const root = process.cwd();

const profilePath = path.join(
  root,
  "src",
  "components",
  "UserProfileFullScreen.jsx"
);

if (!fs.existsSync(profilePath)) {
  throw new Error(
    `File not found: ${profilePath}\nRun this script from the MindTrack project root.`
  );
}

const backupPath =
  `${profilePath}.white-screen-backup`;

if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(
    profilePath,
    backupPath
  );
}

let code =
  fs.readFileSync(
    profilePath,
    "utf8"
  );


// =====================================================
// FIX 1
// UserProfileFullScreen currently expects displayRole and
// displayValue props, but App.jsx opens it without passing
// those functions. Calling either undefined prop causes the
// React page to crash and results in a blank white screen.
// =====================================================

code = code.replace(
`export default function UserProfileFullScreen({
  profile,
  currentUser,
  onClose,
  displayRole,
  displayValue
}) {`,
`export default function UserProfileFullScreen({
  profile,
  currentUser,
  onClose
}) {`
);


// If an earlier local version is formatted slightly
// differently, remove the two optional props individually.
code = code.replace(
  /,\s*displayRole\s*,\s*displayValue\s*\n?\}\)\s*\{/,
  "\n}) {"
);


// Replace calls with local, guaranteed helper functions.
code = code.replace(
  /\bdisplayRole\(/g,
  "displayRoleValue("
);

code = code.replace(
  /\bdisplayValue\(/g,
  "displayFieldValue("
);


// Add safe display helpers once.
if (
  !code.includes(
    "function displayRoleValue("
  )
) {

  const marker =
    "export default function UserProfileFullScreen({";


  const helpers = `function displayRoleValue(
  role
) {

  if (role === "student") {
    return "Student";
  }


  if (role === "faculty") {
    return "Faculty";
  }


  if (role === "personnel") {
    return "Personnel";
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


`;


  if (!code.includes(marker)) {
    throw new Error(
      "Unable to locate UserProfileFullScreen component declaration."
    );
  }


  code = code.replace(
    marker,
    helpers + marker
  );
}


// =====================================================
// FIX 2
// Load the selected user's assessment/counseling records
// using ownerId. This is required for transferred users
// whose department is different from the new counselor.
// The latest Firestore transfer rules authorize this.
// =====================================================

const oldProfileQuery = `      const isSuperAdmin =
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


const newProfileQuery = `      return subscribeCollection(
        collectionName,
        setRows,
        {
          ownerId:
            profile.id
        }
      );`;


if (code.includes(oldProfileQuery)) {

  code = code.replace(
    oldProfileQuery,
    newProfileQuery
  );
}


// =====================================================
// FIX 3
// Make former counselor state explicit.
// The existing canEditCounselorNotes logic already blocks
// edits when another counselor is assigned; this adds a
// readable state/notice without changing permissions.
// =====================================================

const canEditBlock = `  const canEditCounselorNotes =
    isSuperAdmin ||
    isAssignedCounselor ||
    (
      isSameDepartmentCounselor &&
      !assignedCounselorId
    );`;


if (
  code.includes(canEditBlock) &&
  !code.includes(
    "const isFormerAssignedCounselor ="
  )
) {

  code = code.replace(
    canEditBlock,

`${canEditBlock}


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
    );`
  );
}


const modalBody =
  `        <div className="user-profile-modal-body">`;


if (
  code.includes(modalBody) &&
  !code.includes(
    "Your previous case records remain available for reference"
  )
) {

  code = code.replace(
    modalBody,

`${modalBody}

          {isFormerAssignedCounselor && (

            <div className="notice">
              This user has been transferred to another counselor. Your previous case records remain available for reference, but this profile and its counselor notes are read-only for you.
            </div>

          )}`
  );
}


// =====================================================
// SAFETY CHECKS
// =====================================================

if (
  code.includes(
    "displayRole("
  ) ||
  code.includes(
    "displayValue("
  )
) {

  throw new Error(
    "The white-screen fix was incomplete because old display helper calls still exist."
  );
}


if (
  !code.includes(
    "function displayRoleValue("
  ) ||
  !code.includes(
    "function displayFieldValue("
  )
) {

  throw new Error(
    "Safe display helper functions were not inserted."
  );
}


fs.writeFileSync(
  profilePath,
  code,
  "utf8"
);


console.log("");
console.log(
  "MindTrack User Profile white-screen fix applied successfully."
);
console.log("");
console.log(
  "Updated:"
);
console.log(
  "  src/components/UserProfileFullScreen.jsx"
);
console.log("");
console.log(
  "Backup:"
);
console.log(
  `  ${backupPath}`
);
console.log("");
console.log(
  "Next commands:"
);
console.log(
  "  npm run build"
);
console.log(
  "  npm run dev"
);