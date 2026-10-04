import fs from "node:fs";
import path from "node:path";

import {
  cert,
  initializeApp
} from "firebase-admin/app";

import {
  FieldValue,
  Timestamp,
  getFirestore
} from "firebase-admin/firestore";


const APPLY =
  process.argv.includes(
    "--apply"
  );


const serviceAccountPath =
  path.resolve(
    process.cwd(),
    "serviceAccountKey.json"
  );


if (
  !fs.existsSync(
    serviceAccountPath
  )
) {

  throw new Error(
    "serviceAccountKey.json was not found in the project root."
  );
}


const serviceAccount =
  JSON.parse(
    fs.readFileSync(
      serviceAccountPath,
      "utf8"
    )
  );


initializeApp({
  credential:
    cert(
      serviceAccount
    )
});


const db =
  getFirestore();


const GENERAL_USER_ROLES =
  new Set([
    "student",
    "teaching",
    "non_teaching",
    "faculty",
    "personnel"
  ]);


function millis(
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

    return (
      value.seconds *
      1000
    );
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


function newestFirst(
  a,
  b
) {

  return (
    millis(
      b.createdAt
    ) -
    millis(
      a.createdAt
    )
  );
}


const [
  usersSnapshot,
  assessmentsSnapshot,
  locksSnapshot
] =
  await Promise.all([
    db.collection(
      "users"
    ).get(),

    db.collection(
      "assessments"
    ).get(),

    db.collection(
      "assessmentLocks"
    ).get()
  ]);


const assessmentsByOwner =
  new Map();


for (
  const item of
  assessmentsSnapshot.docs
) {

  const row = {
    id:
      item.id,

    ...item.data()
  };


  const ownerId =
    String(
      row.ownerId ||
      ""
    ).trim();


  if (!ownerId) {
    continue;
  }


  if (
    !assessmentsByOwner.has(
      ownerId
    )
  ) {

    assessmentsByOwner.set(
      ownerId,
      []
    );
  }


  assessmentsByOwner
    .get(
      ownerId
    )
    .push(
      row
    );
}


for (
  const rows of
  assessmentsByOwner.values()
) {

  rows.sort(
    newestFirst
  );
}


const existingLocks =
  new Map(
    locksSnapshot.docs.map(
      item => [
        item.id,
        item.data()
      ]
    )
  );


const planned = [];


for (
  const userDoc of
  usersSnapshot.docs
) {

  const profile =
    userDoc.data();


  if (
    !GENERAL_USER_ROLES.has(
      profile.role
    )
  ) {
    continue;
  }


  const ownerId =
    userDoc.id;


  const rows =
    assessmentsByOwner.get(
      ownerId
    ) ||
    [];


  const active =
    rows.find(
      row =>
        row.status !==
        "Concluded"
    ) ||
    null;


  const latest =
    active ||
    rows[0] ||
    null;


  const oldLock =
    existingLocks.get(
      ownerId
    ) ||
    null;


  let status =
    "Eligible";

  let latestAssessmentId =
    "";

  let concludedAt =
    null;

  let earlyReassessmentAllowed =
    false;


  if (latest) {

    latestAssessmentId =
      latest.id;


    if (
      latest.status ===
      "Concluded"
    ) {

      status =
        "Concluded";


      concludedAt =
        latest.concludedAt ||
        latest.updatedAt ||
        latest.createdAt ||
        Timestamp.now();


      earlyReassessmentAllowed =
        Boolean(
          oldLock &&
          oldLock.latestAssessmentId ===
            latest.id &&
          oldLock.status ===
            "Concluded" &&
          oldLock.earlyReassessmentAllowed ===
            true
        );

    } else {

      status =
        String(
          latest.status ||
          "For review"
        );
    }
  }


  planned.push({
    ownerId,

    data: {
      ownerId,

      department:
        String(
          profile.department ||
          latest?.department ||
          ""
        ).trim(),

      latestAssessmentId,

      status,

      concludedAt,

      earlyReassessmentAllowed,

      updatedAt:
        FieldValue.serverTimestamp()
    }
  });
}


console.log(
  JSON.stringify(
    {
      users:
        usersSnapshot.size,

      assessments:
        assessmentsSnapshot.size,

      existingLocks:
        locksSnapshot.size,

      locksToWrite:
        planned.length,

      applied:
        APPLY
    },
    null,
    2
  )
);


if (!APPLY) {

  console.log(
    "Dry run only. Re-run with --apply to write assessmentLocks."
  );

  process.exit(0);
}


let batch =
  db.batch();

let operations = 0;

let written = 0;


async function flush() {

  if (!operations) {
    return;
  }


  await batch.commit();

  written +=
    operations;


  batch =
    db.batch();

  operations = 0;
}


for (
  const item of
  planned
) {

  batch.set(
    db.collection(
      "assessmentLocks"
    ).doc(
      item.ownerId
    ),
    item.data,
    {
      merge: false
    }
  );


  operations += 1;


  if (
    operations >=
    400
  ) {

    await flush();
  }
}


await flush();


console.log(
  JSON.stringify(
    {
      written,
      applied:
        true
    },
    null,
    2
  )
);