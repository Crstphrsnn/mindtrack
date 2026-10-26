import fs from "fs";
import path from "path";
import { initializeApp, cert } from "firebase-admin/app";
import {
  FieldValue,
  getFirestore
} from "firebase-admin/firestore";

import {
  ASSESSMENT_SCORING_VERSION,
  MONITORING_PRIORITY_VERSION,
  recalculateAssessmentRecord
} from "../src/utils/assessment.js";


function readArg(name) {
  const index =
    process.argv.indexOf(name);

  return index >= 0
    ? process.argv[index + 1]
    : null;
}


const applyChanges =
  process.argv.includes("--apply");


let keyPath =
  readArg("--key") ||
  process.env.FIREBASE_SERVICE_ACCOUNT ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS;


if (!keyPath) {
  console.error(
    "Service account path is required. Use --key ./serviceAccountKey.json or set FIREBASE_SERVICE_ACCOUNT."
  );
  process.exit(1);
}


keyPath =
  path.resolve(keyPath);


if (!fs.existsSync(keyPath)) {
  console.error(
    "Service account file not found:",
    keyPath
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


initializeApp({
  credential:
    cert(serviceAccount)
});


const db =
  getFirestore();


function sameValue(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}


async function main() {

  console.log(
    applyChanges
      ? "APPLY MODE: Firestore assessment records will be updated."
      : "DRY RUN: no Firestore records will be changed. Add --apply after reviewing the output."
  );

  console.log(
    "Target scoring version:",
    ASSESSMENT_SCORING_VERSION
  );


  const snapshot =
    await db
      .collection("assessments")
      .get();


  let scanned = 0;
  let changed = 0;
  let unchanged = 0;
  let skipped = 0;
  let viewCreated = 0;

  let batch =
    db.batch();

  let pendingWrites = 0;


  async function commitBatch() {

    if (
      !applyChanges ||
      pendingWrites === 0
    ) {
      return;
    }

    await batch.commit();
    batch = db.batch();
    pendingWrites = 0;
  }


  for (const assessmentDoc of snapshot.docs) {
    scanned += 1;

    const current =
      assessmentDoc.data();

    const recalculated =
      recalculateAssessmentRecord(
        current
      );


    if (!recalculated) {
      skipped += 1;

      console.warn(
        `SKIP ${assessmentDoc.id}: insufficient saved item answers / standardized instrument scores to recalculate safely.`
      );

      continue;
    }


    const assessmentPatch = {
      score:
        recalculated.score,
      assessmentVersion:
        ASSESSMENT_SCORING_VERSION,
      scoringVersion:
        ASSESSMENT_SCORING_VERSION,
      priorityModelVersion:
        MONITORING_PRIORITY_VERSION,
      priority:
        recalculated.priority,
      prioritySource:
        recalculated.prioritySource || "",
      priorityReasons:
        recalculated.priorityReasons,
      recommendation:
        recalculated.recommendation,
      safetyFlag:
        recalculated.safetyFlag,
      instrumentResults:
        recalculated.instrumentResults,
      rescoredAt:
        FieldValue.serverTimestamp()
    };


    const materiallyChanged =
      current.scoringVersion !==
        ASSESSMENT_SCORING_VERSION ||
      current.priority !==
        recalculated.priority ||
      !sameValue(
        current.instrumentResults,
        recalculated.instrumentResults
      );


    if (!materiallyChanged) {
      unchanged += 1;
      continue;
    }


    changed += 1;

    console.log(
      `UPDATE ${assessmentDoc.id}: ${current.priority || "(none)"} -> ${recalculated.priority}`
    );


    if (applyChanges) {
      batch.set(
        assessmentDoc.ref,
        assessmentPatch,
        { merge: true }
      );
      pendingWrites += 1;
    }


    const viewRef =
      db.collection(
        "assessmentUserViews"
      ).doc(
        assessmentDoc.id
      );


    const viewSnapshot =
      await viewRef.get();


    const viewPatch = {
      assessmentId:
        assessmentDoc.id,
      ownerId:
        current.ownerId || "",
      ownerName:
        current.ownerName || "",
      role:
        current.role || "",
      department:
        current.department || "",
      program:
        current.program || "",
      priority:
        recalculated.priority,
      prioritySource:
        recalculated.prioritySource || "",
      recommendation:
        recalculated.recommendation,
      scoringVersion:
        ASSESSMENT_SCORING_VERSION,
      priorityModelVersion:
        MONITORING_PRIORITY_VERSION,
      status:
        current.status ||
        "For review",
      counselorRemarks:
        current.counselorRemarks ||
        "",
      reviewed:
        current.reviewed === true,
      reviewedById:
        current.reviewedById ||
        "",
      reviewedByName:
        current.reviewedByName ||
        "",
      reviewedByRole:
        current.reviewedByRole ||
        "",
      updatedAt:
        FieldValue.serverTimestamp()
    };


    if (!viewSnapshot.exists) {
      viewCreated += 1;
      viewPatch.createdAt =
        current.createdAt ||
        FieldValue.serverTimestamp();
    }


    if (applyChanges) {
      batch.set(
        viewRef,
        viewPatch,
        { merge: true }
      );
      pendingWrites += 1;
    }


    if (pendingWrites >= 400) {
      await commitBatch();
    }
  }


  await commitBatch();


  console.log("\nMigration summary");
  console.log("Scanned:", scanned);
  console.log("Would update / updated:", changed);
  console.log("Already current:", unchanged);
  console.log("Skipped safely:", skipped);
  console.log("Missing assessmentUserViews recreated:", viewCreated);


  if (!applyChanges) {
    console.log(
      "\nNo data was changed. Re-run with --apply after reviewing the dry-run output."
    );
  }
}


main()
  .then(
    () => process.exit(0)
  )
  .catch(
    error => {
      console.error(
        "Assessment scoring migration failed:",
        error
      );
      process.exit(1);
    }
  );
