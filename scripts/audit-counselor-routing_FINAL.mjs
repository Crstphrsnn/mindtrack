import fs from "node:fs";
import path from "node:path";

import {
  cert,
  initializeApp
} from "firebase-admin/app";

import {
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


const counselorSnapshot =
  await db
    .collection(
      "users"
    )
    .where(
      "role",
      "==",
      "counselor"
    )
    .get();


const directorySnapshot =
  await db
    .collection(
      "counselorDirectory"
    )
    .get();


const directoryRows =
  directorySnapshot.docs.map(
    item => ({
      documentId:
        item.id,

      ...item.data()
    })
  );


const mismatchedUserIds = [];

const missingDirectory = [];

const duplicateDirectory = [];

const departmentMismatches = [];


for (
  const counselorDoc of
  counselorSnapshot.docs
) {

  const counselor =
    counselorDoc.data();


  const authUid =
    counselorDoc.id;


  const storedId =
    String(
      counselor.id ||
      ""
    ).trim();


  if (
    storedId !==
    authUid
  ) {

    mismatchedUserIds.push({
      uid:
        authUid,

      storedId,

      name:
        counselor.name ||
        "",

      department:
        counselor.department ||
        ""
    });
  }


  const matchingDirectory =
    directoryRows.filter(
      row =>
        String(
          row.counselorId ||
          row.documentId ||
          ""
        ).trim() ===
        authUid
    );


  if (
    matchingDirectory.length ===
    0
  ) {

    missingDirectory.push({
      uid:
        authUid,

      name:
        counselor.name ||
        "",

      department:
        counselor.department ||
        ""
    });

    continue;
  }


  if (
    matchingDirectory.length >
    1
  ) {

    duplicateDirectory.push({
      uid:
        authUid,

      name:
        counselor.name ||
        "",

      matches:
        matchingDirectory.map(
          row => ({
            documentId:
              row.documentId,

            counselorId:
              row.counselorId ||
              "",

            department:
              row.department ||
              "",

            active:
              row.active ===
              true
          })
        )
    });
  }


  for (
    const directory of
    matchingDirectory
  ) {

    if (
      String(
        directory.department ||
        ""
      ).trim() !==
      String(
        counselor.department ||
        ""
      ).trim()
    ) {

      departmentMismatches.push({
        uid:
          authUid,

        name:
          counselor.name ||
          "",

        userDepartment:
          counselor.department ||
          "",

        directoryDocumentId:
          directory.documentId,

        directoryDepartment:
          directory.department ||
          ""
      });
    }
  }
}


console.log(
  JSON.stringify(
    {
      applied:
        APPLY,

      counselors:
        counselorSnapshot.size,

      mismatchedUserIds,

      missingDirectory,

      duplicateDirectory,

      departmentMismatches
    },
    null,
    2
  )
);


if (!APPLY) {

  console.log(
    "Dry run only. Re-run with --apply to normalize users/{counselorUid}.id to the Firestore document/Auth UID. Directory mismatches are reported only and are not changed automatically."
  );

  process.exit(0);
}


let batch =
  db.batch();

let operationCount =
  0;


for (
  const item of
  mismatchedUserIds
) {

  batch.update(
    db
      .collection(
        "users"
      )
      .doc(
        item.uid
      ),
    {
      id:
        item.uid
    }
  );


  operationCount +=
    1;


  if (
    operationCount >=
    400
  ) {

    await batch.commit();

    batch =
      db.batch();

    operationCount =
      0;
  }
}


if (
  operationCount >
  0
) {

  await batch.commit();
}


console.log(
  `Normalized ${mismatchedUserIds.length} counselor users/{uid}.id field(s).`
);


if (
  missingDirectory.length ||
  duplicateDirectory.length ||
  departmentMismatches.length
) {

  console.log(
    "Important: counselorDirectory warnings remain. Review the dry-run JSON and correct those records in Firebase Console before relying on counselor routing."
  );
}