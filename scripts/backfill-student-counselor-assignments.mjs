import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");

function argumentValue(flag, fallback = "") {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1]
    ? process.argv[index + 1]
    : fallback;
}

function clean(value) {
  return String(value ?? "").trim();
}

function normalized(value) {
  return clean(value).toLowerCase();
}

const keyPath = argumentValue(
  "--key",
  "./serviceAccountKey.json"
);

if (!fs.existsSync(keyPath)) {
  console.error(`Service account key not found: ${keyPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(
  fs.readFileSync(keyPath, "utf8")
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

console.log(
  APPLY
    ? "APPLY MODE: existing student counselor assignments may be updated."
    : "DRY RUN: no Firestore documents will be changed."
);

const directorySnapshot = await db
  .collection("counselorDirectory")
  .get();

const activeCounselors = directorySnapshot.docs
  .map(item => ({
    id: item.id,
    ...item.data()
  }))
  .filter(item =>
    item.active === true &&
    clean(item.counselorId || item.id) &&
    clean(item.name) &&
    clean(item.department)
  );

const counselorsByDepartment = new Map();

for (const counselor of activeCounselors) {
  const key = normalized(counselor.department);
  const list = counselorsByDepartment.get(key) || [];
  list.push(counselor);
  counselorsByDepartment.set(key, list);
}

const studentsSnapshot = await db
  .collection("users")
  .where("role", "==", "student")
  .get();

let checked = 0;
let changed = 0;
let unchanged = 0;
let skippedNoDepartment = 0;
let skippedNoCounselor = 0;
let skippedMultipleCounselors = 0;

for (const studentDoc of studentsSnapshot.docs) {
  checked += 1;

  const student = studentDoc.data();
  const studentId = studentDoc.id;
  const studentName = clean(student.name) || studentId;
  const department = clean(student.department);

  if (!department) {
    skippedNoDepartment += 1;
    console.log(`SKIP ${studentName}: no college / office.`);
    continue;
  }

  // counselingProfiles is authoritative once a counseling case or transfer
  // exists. Never overwrite a transferred/current case assignment with the
  // student's original college routing.
  const counselingProfileDoc = await db
    .collection("counselingProfiles")
    .doc(studentId)
    .get();

  let resolvedCounselor = null;
  let source = "college";

  if (counselingProfileDoc.exists) {
    const caseProfile = counselingProfileDoc.data();
    const currentId = clean(caseProfile.assignedCounselorId);
    const currentName = clean(caseProfile.assignedCounselorName);
    const currentDepartment = clean(caseProfile.assignedCounselorDepartment);

    if (currentId && currentName) {
      resolvedCounselor = {
        counselorId: currentId,
        name: currentName,
        department: currentDepartment || department
      };
      source = "counselingProfile";
    }
  }

  if (!resolvedCounselor) {
    const matches = counselorsByDepartment.get(
      normalized(department)
    ) || [];

    if (matches.length === 0) {
      skippedNoCounselor += 1;
      console.log(
        `SKIP ${studentName}: no active counselor configured for ${department}.`
      );
      continue;
    }

    if (matches.length > 1) {
      skippedMultipleCounselors += 1;
      console.log(
        `SKIP ${studentName}: ${matches.length} active counselors are configured for ${department}. Keep exactly one active counselor before running the migration again.`
      );
      continue;
    }

    const match = matches[0];
    resolvedCounselor = {
      counselorId: clean(match.counselorId || match.id),
      name: clean(match.name),
      department: clean(match.department)
    };
  }

  const currentId = clean(student.assignedCounselorId);
  const currentName = clean(student.assignedCounselorName);
  const currentDepartment = clean(student.assignedCounselorDepartment);

  const alreadyCorrect =
    currentId === resolvedCounselor.counselorId &&
    currentName === resolvedCounselor.name &&
    currentDepartment === resolvedCounselor.department;

  if (alreadyCorrect) {
    unchanged += 1;
    console.log(
      `OK ${studentName}: ${resolvedCounselor.name} (${source}).`
    );
    continue;
  }

  changed += 1;
  console.log(
    `${APPLY ? "UPDATE" : "WOULD UPDATE"} ${studentName}: ${currentName || "Not assigned"} -> ${resolvedCounselor.name} [${resolvedCounselor.department}] (${source}).`
  );

  if (APPLY) {
    await studentDoc.ref.update({
      assignedCounselorId: resolvedCounselor.counselorId,
      assignedCounselorName: resolvedCounselor.name,
      assignedCounselorDepartment: resolvedCounselor.department,
      counselorAssignmentUpdatedAt: FieldValue.serverTimestamp()
    });
  }
}

console.log("\nSummary");
console.log(`Students checked: ${checked}`);
console.log(`${APPLY ? "Updated" : "Would update"}: ${changed}`);
console.log(`Already correct: ${unchanged}`);
console.log(`Skipped - no college / office: ${skippedNoDepartment}`);
console.log(`Skipped - no active counselor: ${skippedNoCounselor}`);
console.log(`Skipped - multiple active counselors: ${skippedMultipleCounselors}`);

if (!APPLY) {
  console.log("\nDry run only. Re-run with --apply after reviewing the output.");
}
