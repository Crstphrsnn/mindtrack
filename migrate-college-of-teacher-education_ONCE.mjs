import fs from "node:fs";
import process from "node:process";

import {
  cert,
  getApps,
  initializeApp
} from "firebase-admin/app";

import {
  FieldValue,
  getFirestore
} from "firebase-admin/firestore";


function argValue(flag) {
  const index =
    process.argv.indexOf(flag);

  return index >= 0
    ? process.argv[index + 1]
    : "";
}


const keyPath =
  argValue("--key") ||
  "./serviceAccountKey.json";


const dryRun =
  process.argv.includes(
    "--dry-run"
  );


if (!fs.existsSync(keyPath)) {
  console.error(
    `Service account key not found: ${keyPath}`
  );
  process.exit(1);
}


const serviceAccount =
  JSON.parse(
    fs.readFileSync(
      keyPath,
      "utf8"
    )
  );


if (getApps().length === 0) {
  initializeApp({
    credential:
      cert(
        serviceAccount
      )
  });
}


const db =
  getFirestore();


const TARGET =
  "College of Teacher Education";


const LEGACY_VALUES =
  new Set([
    "coe",
    "cte",
    "college of education",
    "college of teacher education"
  ]);


function shouldMigrate(value) {
  if (
    typeof value !==
    "string"
  ) {
    return false;
  }

  return LEGACY_VALUES.has(
    value
      .trim()
      .toLowerCase()
  ) &&
    value !==
      TARGET;
}


const COLLECTION_FIELDS = {
  users: [
    "department",
    "assignedCounselorDepartment"
  ],

  counselorDirectory: [
    "department"
  ],

  assessments: [
    "department",
    "assignedCounselorDepartment"
  ],

  consultations: [
    "department",
    "assignedCounselorDepartment"
  ],

  counselingProfiles: [
    "department",
    "assignedCounselorDepartment"
  ],

  referrals: [
    "department",
    "assignedCounselorDepartment"
  ],

  feedback: [
    "department"
  ],

  transferRequests: [
    "ownerDepartment",
    "requestedByDepartment",
    "acceptedByDepartment"
  ],

  transferAccess: [
    "counselorDepartment"
  ]
};


let batch =
  db.batch();

let writes =
  0;

let documentsChanged =
  0;

let fieldsChanged =
  0;


async function flush(force = false) {
  if (
    writes === 0 ||
    (
      !force &&
      writes < 400
    )
  ) {
    return;
  }

  if (!dryRun) {
    await batch.commit();
  }

  batch =
    db.batch();

  writes =
    0;
}


console.log("");
console.log(
  dryRun
    ? "MindTrack College of Teacher Education migration — DRY RUN"
    : "MindTrack College of Teacher Education migration"
);
console.log("");


for (
  const [
    collectionName,
    fields
  ] of Object.entries(
    COLLECTION_FIELDS
  )
) {
  const snapshot =
    await db
      .collection(
        collectionName
      )
      .get();

  for (
    const document of
      snapshot.docs
  ) {
    const data =
      document.data();

    const update =
      {};

    const changedFields =
      [];

    for (
      const field of fields
    ) {
      if (
        shouldMigrate(
          data[field]
        )
      ) {
        update[field] =
          TARGET;

        changedFields.push(
          `${field}: "${data[field]}" -> "${TARGET}"`
        );
      }
    }

    if (
      changedFields.length ===
      0
    ) {
      continue;
    }

    documentsChanged +=
      1;

    fieldsChanged +=
      changedFields.length;

    if (
      collectionName ===
      "counselorDirectory"
    ) {
      update.updatedAt =
        FieldValue.serverTimestamp();
    }

    console.log(
      `${dryRun ? "[DRY RUN] " : ""}${collectionName}/${document.id}`
    );

    for (
      const line of
        changedFields
    ) {
      console.log(
        `  - ${line}`
      );
    }

    if (!dryRun) {
      batch.update(
        document.ref,
        update
      );

      writes +=
        1;

      await flush();
    }
  }
}


await flush(true);


console.log("");
console.log(
  `Documents ${dryRun ? "that would change" : "changed"}: ${documentsChanged}`
);
console.log(
  `Department fields ${dryRun ? "that would change" : "changed"}: ${fieldsChanged}`
);


if (dryRun) {
  console.log("");
  console.log(
    "Dry run complete. No Firestore data was changed."
  );
  console.log(
    "If every listed change is correct, run:"
  );
  console.log(
    "node migrate-college-of-teacher-education_ONCE.mjs"
  );
} else {
  console.log("");
  console.log(
    "College of Teacher Education migration complete."
  );
}