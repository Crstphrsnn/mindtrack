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


const GENERAL_USER_ROLES =
  new Set([
    "student",
    "teaching",
    "non_teaching",
    "faculty",
    "personnel"
  ]);


const TERMINAL_STATUSES =
  new Set([
    "Concluded",
    "Cancelled",
    "Canceled"
  ]);


function timestampMillis(
  value
) {

  if (!value) {
    return 0;
  }


  if (
    typeof value.toMillis ===
    "function"
  ) {

    return value.toMillis();
  }


  if (
    typeof value.seconds ===
    "number"
  ) {

    return (
      value.seconds *
      1000
    );
  }


  const parsed =
    new Date(
      value
    ).getTime();


  return Number.isNaN(
    parsed
  )
    ? 0
    : parsed;
}


function newestFirst(
  a,
  b
) {

  return (
    timestampMillis(
      b.createdAt
    ) -
    timestampMillis(
      a.createdAt
    )
  );
}


const [
  usersSnapshot,
  consultationsSnapshot,
  locksSnapshot
] =
  await Promise.all([
    db.collection(
      "users"
    ).get(),

    db.collection(
      "consultations"
    ).get(),

    db.collection(
      "counselingRequestLocks"
    ).get()
  ]);


const consultationsByOwner =
  new Map();


for (
  const document of
  consultationsSnapshot.docs
) {

  const row = {
    id:
      document.id,

    ...document.data()
  };


  const ownerId =
    String(
      row.ownerId ||
      ""
    ).trim();


  if (!ownerId) {
    continue;
  }


  if (
    !consultationsByOwner.has(
      ownerId
    )
  ) {

    consultationsByOwner.set(
      ownerId,
      []
    );
  }


  consultationsByOwner
    .get(
      ownerId
    )
    .push(
      row
    );
}


for (
  const rows of
  consultationsByOwner.values()
) {

  rows.sort(
    newestFirst
  );
}


const existingLocks =
  new Map(
    locksSnapshot.docs.map(
      item => [
        item.id,
        item.data()
      ]
    )
  );


const planned = [];

const multipleActiveRequests = [];


for (
  const userDoc of
  usersSnapshot.docs
) {

  const profile =
    userDoc.data();


  if (
    !GENERAL_USER_ROLES.has(
      profile.role
    )
  ) {

    continue;
  }


  const ownerId =
    userDoc.id;


  const rows =
    consultationsByOwner.get(
      ownerId
    ) ||
    [];


  const activeRows =
    rows.filter(
      row =>
        !TERMINAL_STATUSES.has(
          String(
            row.status ||
            ""
          ).trim()
        )
    );


  if (
    activeRows.length >
    1
  ) {

    multipleActiveRequests.push({
      ownerId,

      name:
        profile.name ||
        "",

      activeRequests:
        activeRows.map(
          row => ({
            id:
              row.id,

            status:
              row.status ||
              "",

            date:
              row.date ||
              "",

            time:
              row.time ||
              ""
          })
        )
    });
  }


  const latest =
    activeRows[0] ||
    rows[0] ||
    null;


  let latestConsultationId =
    "";

  let status =
    "Eligible";


  if (latest) {

    latestConsultationId =
      latest.id;


    const rawStatus =
      String(
        latest.status ||
        "Pending approval"
      ).trim();


    status =
      rawStatus ===
        "Canceled"
        ? "Cancelled"
        : rawStatus;
  }


  const existed =
    existingLocks.has(
      ownerId
    );


  planned.push({
    ownerId,
    existed,

    data: {
      ownerId,

      department:
        String(
          profile.department ||
          latest?.department ||
          ""
        ).trim(),

      latestConsultationId,

      status,

      updatedAt:
        FieldValue.serverTimestamp()
    }
  });
}


console.log(
  JSON.stringify(
    {
      applied:
        APPLY,

      users:
        usersSnapshot.size,

      consultations:
        consultationsSnapshot.size,

      existingLocks:
        locksSnapshot.size,

      locksToWrite:
        planned.length,

      ownersWithMultipleActiveRequests:
        multipleActiveRequests
    },
    null,
    2
  )
);


if (!APPLY) {

  console.log(
    "Dry run only. Review ownersWithMultipleActiveRequests, then re-run with --apply to write counselingRequestLocks."
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
        "counselingRequestLocks"
      )
      .doc(
        item.ownerId
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

      written
    },
    null,
    2
  )
);


if (
  multipleActiveRequests.length >
  0
) {

  console.log(
    "Important: some users already have multiple non-terminal counseling requests. The newest active request now owns the submission lock. Review older duplicate requests and conclude/cancel them as appropriate."
  );
}


console.log(
  "Counseling request lock migration complete."
);