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


const PRIVATE_FIELDS = [
  "phoneNumber",
  "address",
  "facebookAccount",
  "contactPersonName",
  "contactPersonPhone"
];


const usersSnapshot =
  await db
    .collection("users")
    .get();


let candidates = 0;
let cleaned = 0;
let skipped = 0;


for (
  const userDoc
  of usersSnapshot.docs
) {

  const user =
    userDoc.data();


  const existingPrivateFields =
    PRIVATE_FIELDS.filter(
      field =>
        Object.prototype.hasOwnProperty.call(
          user,
          field
        )
    );


  // This user already has no duplicate
  // private fields in users/{uid}.
  if (
    existingPrivateFields.length === 0
  ) {

    continue;
  }


  candidates += 1;


  // ------------------------------------------
  // Safety check:
  // Never remove the old fields unless the
  // private-profile document already exists.
  // ------------------------------------------
  const privateProfileSnapshot =
    await db
      .collection(
        "userPrivateProfiles"
      )
      .doc(
        userDoc.id
      )
      .get();


  if (
    !privateProfileSnapshot.exists
  ) {

    console.warn(
      `SKIP: users/${userDoc.id} - userPrivateProfiles document does not exist`
    );

    skipped += 1;

    continue;
  }


  const privateProfile =
    privateProfileSnapshot.data();


  // ------------------------------------------
  // Confirm required fields were migrated.
  // ------------------------------------------
  const missingFields =
    PRIVATE_FIELDS.filter(
      field =>
        !Object.prototype.hasOwnProperty.call(
          privateProfile,
          field
        )
    );


  if (
    missingFields.length > 0
  ) {

    console.warn(
      `SKIP: users/${userDoc.id} - private profile is missing: ${missingFields.join(
        ", "
      )}`
    );

    skipped += 1;

    continue;
  }


  console.log(
    `${
      APPLY
        ? "CLEAN"
        : "DRY RUN"
    }: users/${userDoc.id}`
  );

  console.log(
    `  Remove: ${existingPrivateFields.join(
      ", "
    )}`
  );


  if (
    !APPLY
  ) {

    continue;
  }


  const patch = {};


  for (
    const field
    of existingPrivateFields
  ) {

    patch[field] =
      FieldValue.delete();
  }


  await userDoc.ref.update(
    patch
  );


  cleaned += 1;
}


console.log("");
console.log(
  `Users containing duplicate private fields: ${candidates}`
);

console.log(
  `Skipped for safety: ${skipped}`
);


if (
  APPLY
) {

  console.log(
    `Cleaned: ${cleaned}`
  );

} else {

  console.log(
    "No Firestore data was changed."
  );

  console.log(
    "Review the results, then run again with --apply."
  );
}