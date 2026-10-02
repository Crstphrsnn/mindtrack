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


function statusAllowsAnotherAssessment(status) {

  const clean =
    String(
      status || ""
    ).trim();


  // "For referral" was displayed as Approved by older MindTrack
  // builds, so preserve it as a released legacy case.
  return (
    clean === "Approved" ||
    clean === "For referral"
  );
}


function timeValue(value) {

  if (!value) {
    return 0;
  }


  if (
    typeof value.toMillis ===
    "function"
  ) {

    return value.toMillis();
  }


  const parsed =
    new Date(value).getTime();


  return Number.isFinite(parsed)
    ? parsed
    : 0;
}


const assessmentsSnap =
  await db
    .collection(
      "assessments"
    )
    .get();


const byOwner =
  new Map();


for (
  const assessmentDoc of
    assessmentsSnap.docs
) {

  const row = {
    id:
      assessmentDoc.id,

    ...assessmentDoc.data()
  };


  if (!row.ownerId) {
    continue;
  }


  if (
    !byOwner.has(
      row.ownerId
    )
  ) {

    byOwner.set(
      row.ownerId,
      []
    );
  }


  byOwner
    .get(
      row.ownerId
    )
    .push(row);
}


console.log("");
console.log(
  dryRun
    ? "MindTrack assessment guard backfill — DRY RUN"
    : "MindTrack assessment guard backfill"
);

console.log(
  `Assessment records: ${assessmentsSnap.size}`
);

console.log(
  `Users with assessment history: ${byOwner.size}`
);


let processed = 0;
let activeUsers = 0;
let releasedUsers = 0;

let batch =
  db.batch();

let writes = 0;


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

  writes = 0;
}


for (
  const [
    ownerId,
    rows
  ] of byOwner.entries()
) {

  const sorted =
    [...rows].sort(
      (a, b) =>
        timeValue(
          b.createdAt
        ) -
        timeValue(
          a.createdAt
        )
    );


  const activeRows =
    sorted.filter(
      row =>
        !statusAllowsAnotherAssessment(
          row.status
        )
    );


  const latest =
    activeRows[0] ||
    sorted[0];


  if (!latest) {
    continue;
  }


  const activeAssessmentIds =
    activeRows.map(
      row =>
        row.id
    );


  processed += 1;


  if (
    activeAssessmentIds.length >
    0
  ) {

    activeUsers += 1;

  } else {

    releasedUsers += 1;
  }


  console.log(
    `${dryRun ? "[DRY RUN] " : ""}${ownerId}: active=${activeAssessmentIds.length}, latest=${latest.id}, status=${latest.status || "For review"}`
  );


  if (!dryRun) {

    const guardRef =
      db
        .collection(
          "assessmentSubmissionGuards"
        )
        .doc(
          ownerId
        );


    batch.set(
      guardRef,
      {
        ownerId,

        activeAssessmentIds,

        activeAssessmentCount:
          activeAssessmentIds.length,

        latestAssessmentId:
          latest.id,

        latestStatus:
          latest.status ||
          "For review",

        updatedById:
          "assessment-guard-backfill",

        updatedAt:
          FieldValue.serverTimestamp()
      },
      {
        merge:
          true
      }
    );


    writes += 1;

    await flush();
  }
}


await flush(true);


console.log("");
console.log(
  `Guard documents ${dryRun ? "that would be written" : "written"}: ${processed}`
);

console.log(
  `Users currently blocked by a non-Approved assessment: ${activeUsers}`
);

console.log(
  `Users currently released for another assessment: ${releasedUsers}`
);


if (dryRun) {

  console.log("");
  console.log(
    "Dry run complete. No Firestore data was changed."
  );

  console.log(
    "If the active/released results are correct, run:"
  );

  console.log(
    "node backfill-assessment-submission-guards_ONCE.mjs"
  );

} else {

  console.log("");
  console.log(
    "Assessment submission guard backfill complete."
  );
}