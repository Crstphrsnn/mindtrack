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

const counselors =
  await db
    .collection("users")
    .where(
      "role",
      "==",
      "counselor"
    )
    .get();

console.log(
  `Counselors found: ${counselors.size}`
);

for (const item of counselors.docs) {

  const user =
    item.data();

  const record = {
    counselorId:
      item.id,

    name:
      user.name ||
      "Guidance Counselor",

    department:
      user.department ||
      "",

    active:
      true,

    updatedAt:
      FieldValue.serverTimestamp()
  };

  console.log(
    `${APPLY ? "WRITE" : "DRY RUN"}: counselorDirectory/${item.id}`,
    record
  );

  if (APPLY) {

    await db
      .collection(
        "counselorDirectory"
      )
      .doc(
        item.id
      )
      .set(
        record,
        {
          merge:
            true
        }
      );
  }
}

console.log(
  APPLY
    ? "Counselor directory updated."
    : "Dry run only. Re-run with --apply to write."
);
