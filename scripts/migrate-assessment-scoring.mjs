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
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}


const applyChanges = process.argv.includes("--apply");

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

keyPath = path.resolve(keyPath);

if (!fs.existsSync(keyPath)) {
  console.error("Service account file not found:", keyPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();


function sameValue(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}


function viewNeedsUpdate(currentView, patch) {
  if (!currentView) return true;

  return (
    currentView.priority !== patch.priority ||
    currentView.scoringVersion !== patch.scoringVersion ||
    currentView.priorityModelVersion !== patch.priorityModelVersion ||
    currentView.recommendation !== patch.recommendation ||
    currentView.status !== patch.status ||
    currentView.reviewed !== patch.reviewed ||
    currentView.counselorRemarks !== patch.counselorRemarks
  );
}


async function main() {
  console.log(
    applyChanges
      ? "APPLY MODE: historical assessment results will be recalculated and synchronized."
      : "DRY RUN: no Firestore records will be changed. Add --apply after reviewing the output."
  );

  console.log("Target scoring version:", ASSESSMENT_SCORING_VERSION);
  console.log("Target monitoring severity version:", MONITORING_PRIORITY_VERSION);

  const snapshot = await db.collection("assessments").get();

  let scanned = 0;
  let assessmentUpdated = 0;
  let assessmentUnchanged = 0;
  let skipped = 0;
  let userViewUpdated = 0;
  let userViewCreated = 0;

  let batch = db.batch();
  let pendingWrites = 0;

  async function commitBatch() {
    if (!applyChanges || pendingWrites === 0) return;
    await batch.commit();
    batch = db.batch();
    pendingWrites = 0;
  }

  for (const assessmentDoc of snapshot.docs) {
    scanned += 1;

    const current = assessmentDoc.data();
    const recalculated = recalculateAssessmentRecord(current);

    if (!recalculated) {
      skipped += 1;
      console.warn(
        `SKIP ${assessmentDoc.id}: not enough saved item answers / standardized instrument scores to recalculate safely.`
      );
      continue;
    }

    const assessmentPatch = {
      score: recalculated.score,
      assessmentVersion: ASSESSMENT_SCORING_VERSION,
      scoringVersion: ASSESSMENT_SCORING_VERSION,
      priorityModelVersion: MONITORING_PRIORITY_VERSION,
      priority: recalculated.priority,
      prioritySource: recalculated.prioritySource || "",
      priorityReasons: recalculated.priorityReasons || [],
      recommendation: recalculated.recommendation,
      safetyFlag: recalculated.safetyFlag,
      instrumentResults: recalculated.instrumentResults,
      rescoredAt: FieldValue.serverTimestamp()
    };

    const assessmentNeedsUpdate =
      current.assessmentVersion !== ASSESSMENT_SCORING_VERSION ||
      current.scoringVersion !== ASSESSMENT_SCORING_VERSION ||
      current.priorityModelVersion !== MONITORING_PRIORITY_VERSION ||
      current.priority !== recalculated.priority ||
      current.recommendation !== recalculated.recommendation ||
      current.safetyFlag !== recalculated.safetyFlag ||
      !sameValue(current.instrumentResults, recalculated.instrumentResults);

    if (assessmentNeedsUpdate) {
      assessmentUpdated += 1;
      console.log(
        `ASSESSMENT ${assessmentDoc.id}: ${current.priority || "(none)"} -> ${recalculated.priority}`
      );

      if (applyChanges) {
        batch.set(assessmentDoc.ref, assessmentPatch, { merge: true });
        pendingWrites += 1;
      }
    } else {
      assessmentUnchanged += 1;
    }

    // Always reconcile the user-facing mirror independently. This avoids
    // an old assessmentUserViews severity remaining visible even when the
    // main assessment document was already rescored earlier.
    const viewRef = db.collection("assessmentUserViews").doc(assessmentDoc.id);
    const viewSnapshot = await viewRef.get();
    const viewData = viewSnapshot.exists ? viewSnapshot.data() : null;

    const viewPatch = {
      assessmentId: assessmentDoc.id,
      ownerId: current.ownerId || "",
      ownerName: current.ownerName || "",
      role: current.role || "",
      department: current.department || "",
      program: current.program || "",
      priority: recalculated.priority,
      prioritySource: recalculated.prioritySource || "",
      recommendation: recalculated.recommendation,
      scoringVersion: ASSESSMENT_SCORING_VERSION,
      priorityModelVersion: MONITORING_PRIORITY_VERSION,
      status: current.status || "For review",
      counselorRemarks: current.counselorRemarks || "",
      reviewed: current.reviewed === true,
      reviewedById: current.reviewedById || "",
      reviewedByName: current.reviewedByName || "",
      reviewedByRole: current.reviewedByRole || "",
      safetyFlag: recalculated.safetyFlag,
      updatedAt: FieldValue.serverTimestamp()
    };

    if (!viewSnapshot.exists) {
      userViewCreated += 1;
      viewPatch.createdAt = current.createdAt || FieldValue.serverTimestamp();
    }

    if (viewNeedsUpdate(viewData, viewPatch)) {
      userViewUpdated += 1;
      console.log(
        `USER VIEW ${assessmentDoc.id}: ${viewData?.priority || "(missing)"} -> ${recalculated.priority}`
      );

      if (applyChanges) {
        batch.set(viewRef, viewPatch, { merge: true });
        pendingWrites += 1;
      }
    }

    if (pendingWrites >= 400) {
      await commitBatch();
    }
  }

  await commitBatch();

  console.log("\nMigration summary");
  console.log("Scanned assessments:", scanned);
  console.log("Assessment documents to update / updated:", assessmentUpdated);
  console.log("Assessment documents already current:", assessmentUnchanged);
  console.log("assessmentUserViews to update / updated:", userViewUpdated);
  console.log("Missing assessmentUserViews to create / created:", userViewCreated);
  console.log("Skipped safely:", skipped);

  if (!applyChanges) {
    console.log(
      "\nNo data was changed. Review the output, then re-run with --apply."
    );
  }
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Assessment scoring migration failed:", error);
    process.exit(1);
  });
