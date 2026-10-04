import fs from "node:fs";

import {
  cert,
  initializeApp
} from "firebase-admin/app";

import {
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


const slotsSnapshot =
  await db
    .collection(
      "counselingScheduleSlots"
    )
    .get();


let orphaned = 0;
let deleted = 0;


for (
  const slotDoc
  of slotsSnapshot.docs
) {

  const slot =
    slotDoc.data();


  const consultationId =
    String(
      slot.consultationId ||
      ""
    ).trim();


  // ---------------------------------------------
  // Slot has no consultationId
  // ---------------------------------------------
  if (!consultationId) {

    orphaned += 1;


    console.warn(
      `${
        APPLY
          ? "DELETE"
          : "DRY RUN"
      }: ${slotDoc.ref.path} has no consultationId`
    );


    if (APPLY) {

      await slotDoc.ref.delete();

      deleted += 1;
    }


    continue;
  }


  // ---------------------------------------------
  // Check linked consultation
  // ---------------------------------------------
  const consultationSnapshot =
    await db
      .collection(
        "consultations"
      )
      .doc(
        consultationId
      )
      .get();


  // Consultation still exists,
  // so leave the slot alone.
  if (
    consultationSnapshot.exists
  ) {

    continue;
  }


  // ---------------------------------------------
  // Linked consultation does not exist
  // ---------------------------------------------
  orphaned += 1;


  console.warn(
    `${
      APPLY
        ? "DELETE"
        : "DRY RUN"
    }: ${slotDoc.ref.path} -> missing consultations/${consultationId}`
  );


  if (APPLY) {

    await slotDoc.ref.delete();

    deleted += 1;
  }
}


console.log("");
console.log(
  `Orphaned counseling schedule slots found: ${orphaned}`
);


if (APPLY) {

  console.log(
    `Deleted: ${deleted}`
  );

} else {

  console.log(
    "No data was changed."
  );

  console.log(
    "Review the records above, then run again with --apply to delete them."
  );
}