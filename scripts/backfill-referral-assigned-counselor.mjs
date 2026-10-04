import fs from "node:fs";
import {
  cert,
  initializeApp
} from "firebase-admin/app";
import {
  FieldValue,
  getFirestore
} from "firebase-admin/firestore";

const APPLY =
  process.argv.includes("--apply");

const serviceAccount =
  JSON.parse(
    fs.readFileSync(
      "./serviceAccountKey.json",
      "utf8"
    )
  );

initializeApp({
  credential:
    cert(serviceAccount)
});

const db =
  getFirestore();

const [
  directorySnap,
  referralsSnap
] =
  await Promise.all([
    db
      .collection(
        "counselorDirectory"
      )
      .where(
        "active",
        "==",
        true
      )
      .get(),

    db
      .collection(
        "referrals"
      )
      .get()
  ]);

const byDepartment =
  new Map();

for (
  const item
  of directorySnap.docs
) {

  const counselor = {
    id:
      item.id,

    ...item.data()
  };

  const key =
    String(
      counselor.department ||
      ""
    ).trim();

  if (
    !byDepartment.has(
      key
    )
  ) {

    byDepartment.set(
      key,
      []
    );
  }

  byDepartment
    .get(
      key
    )
    .push(
      counselor
    );
}

let updated = 0;
let skipped = 0;

for (
  const item
  of referralsSnap.docs
) {

  const row =
    item.data();

  if (
    row.assignedCounselorId
  ) {
    continue;
  }

  const matches =
    byDepartment.get(
      String(
        row.department ||
        ""
      ).trim()
    ) || [];

  if (
    matches.length !==
    1
  ) {

    skipped += 1;

    console.warn(
      `SKIP ${item.id}: expected exactly 1 active counselor for ${row.department || "(blank)"}, found ${matches.length}`
    );

    continue;
  }

  const counselor =
    matches[0];

  const patch = {
    assignedCounselorId:
      counselor.counselorId ||
      counselor.id,

    assignedCounselorName:
      counselor.name ||
      "Guidance Counselor",

    assignedCounselorDepartment:
      counselor.department ||
      row.department ||
      "",

    updatedAt:
      FieldValue.serverTimestamp()
  };

  console.log(
    `${APPLY ? "WRITE" : "DRY RUN"}: referrals/${item.id}`,
    patch
  );

  if (APPLY) {

    await item.ref.update(
      patch
    );
  }

  updated += 1;
}

console.log({
  updated,
  skipped,
  applied:
    APPLY
});
