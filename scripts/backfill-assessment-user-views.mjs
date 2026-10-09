import fs from "node:fs";
import path from "node:path";

import {
  cert,
  initializeApp
} from "firebase-admin/app";

import {
  FieldValue,
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


const assessmentsSnapshot =
  await db
    .collection(
      "assessments"
    )
    .get();


const planned = [];


for (
  const assessmentDoc of
  assessmentsSnapshot.docs
) {

  const row =
    assessmentDoc.data();


  if (
    !row.ownerId
  ) {

    continue;
  }


  planned.push({
    id:
      assessmentDoc.id,

    data: {
      assessmentId:
        assessmentDoc.id,

      ownerId:
        row.ownerId,

      ownerName:
        row.ownerName ||
        "",

      role:
        row.role ||
        "",

      department:
        row.department ||
        "",

      program:
        row.program ||
        "",

      priority:
        row.priority ||
        "Low",

      recommendation:
        row.recommendation ||
        "",

      status:
        row.status ||
        "For review",

      counselorRemarks:
        row.counselorRemarks ||
        "",

      reviewed:
        row.reviewed ===
        true,

      reviewedById:
        row.reviewedById ||
        "",

      reviewedByName:
        row.reviewedByName ||
        "",

      reviewedByRole:
        row.reviewedByRole ||
        "",

      createdAt:
        row.createdAt ||
        FieldValue.serverTimestamp(),

      updatedAt:
        row.updatedAt ||
        row.createdAt ||
        FieldValue.serverTimestamp()
    }
  });
}


console.log(
  JSON.stringify(
    {
      applied:
        APPLY,

      assessments:
        assessmentsSnapshot.size,

      userViewsToWrite:
        planned.length
    },
    null,
    2
  )
);


if (!APPLY) {

  console.log(
    "Dry run only. Re-run with --apply to create score-free assessmentUserViews documents for existing assessments."
  );

  process.exit(0);
}


let batch =
  db.batch();

let operations =
  0;

let written =
  0;


async function flush() {

  if (!operations) {
    return;
  }


  await batch.commit();


  written +=
    operations;


  batch =
    db.batch();

  operations =
    0;
}


for (
  const item of
  planned
) {

  batch.set(
    db
      .collection(
        "assessmentUserViews"
      )
      .doc(
        item.id
      ),
    item.data,
    {
      merge:
        false
    }
  );


  operations +=
    1;


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
      applied:
        true,

      written,

      collection:
        "assessmentUserViews",

      scoreFieldsCopied:
        false
    },
    null,
    2
  )
);