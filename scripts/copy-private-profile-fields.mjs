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

const users =
  await db
    .collection(
      "users"
    )
    .get();

const privateFields = [
  "phoneNumber",
  "address",
  "facebookAccount",
  "contactPersonName",
  "contactPersonPhone"
];

let copied = 0;

for (
  const item
  of users.docs
) {

  const user =
    item.data();

  const privateData = {
    ownerId:
      item.id
  };

  let hasPrivateData =
    false;

  for (
    const field
    of privateFields
  ) {

    if (
      field in user
    ) {

      privateData[field] =
        user[field] ??
        "";

      hasPrivateData =
        true;
    }
  }

  if (
    !hasPrivateData
  ) {
    continue;
  }

  privateData.updatedAt =
    FieldValue.serverTimestamp();

  console.log(
    `${APPLY ? "COPY" : "DRY RUN"}: users/${item.id} -> userPrivateProfiles/${item.id}`
  );

  if (APPLY) {

    await db
      .collection(
        "userPrivateProfiles"
      )
      .doc(
        item.id
      )
      .set(
        privateData,
        {
          merge:
            true
        }
      );
  }

  copied += 1;
}

console.log({
  copied,
  applied:
    APPLY
});

console.log(
  "This script intentionally DOES NOT delete fields from users. Verify the app first, then remove old fields in a separate migration."
);
