import fs from "node:fs";
import path from "node:path";

import {
  cert,
  initializeApp
} from "firebase-admin/app";

import {
  FieldValue,
  Timestamp,
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


const TIME_MAP = {
  "8:00 AM": "08:00",
  "9:00 AM": "09:00",
  "10:00 AM": "10:00",
  "11:00 AM": "11:00",
  "1:00 PM": "13:00",
  "2:00 PM": "14:00",
  "3:00 PM": "15:00",
  "4:00 PM": "16:00"
};


function scheduledAtFrom(
  date,
  time
) {

  const normalizedTime =
    TIME_MAP[
      time
    ] ||
    time;


  if (
    !date ||
    !normalizedTime
  ) {

    return null;
  }


  const value =
    new Date(
      `${date}T${normalizedTime}`
    );


  if (
    Number.isNaN(
      value.getTime()
    )
  ) {

    return null;
  }


  return Timestamp.fromDate(
    value
  );
}


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


  return 0;
}


const [
  transfersSnapshot,
  profilesSnapshot
] =
  await Promise.all([
    db.collection(
      "transferRequests"
    ).get(),

    db.collection(
      "counselingProfiles"
    ).get()
  ]);


const profileByOwner =
  new Map(
    profilesSnapshot.docs.map(
      document => [
        document.id,
        document.data()
      ]
    )
  );


const transferUpdates = [];

const historyByOwner =
  new Map();


for (
  const document of
  transfersSnapshot.docs
) {

  const row =
    document.data();


  if (
    !row.scheduledAt
  ) {

    const scheduledAt =
      scheduledAtFrom(
        row.date,
        row.time
      );


    if (scheduledAt) {

      transferUpdates.push({
        ref:
          document.ref,

        data: {
          scheduledAt
        }
      });
    }
  }


  if (
    row.status !==
      "Approved" ||
    !row.ownerId
  ) {

    continue;
  }


  if (
    !historyByOwner.has(
      row.ownerId
    )
  ) {

    historyByOwner.set(
      row.ownerId,
      []
    );
  }


  historyByOwner
    .get(
      row.ownerId
    )
    .push({
      id:
        document.id,

      ...row
    });
}


const profileUpdates = [];


for (
  const [
    ownerId,
    approvedTransfers
  ] of
  historyByOwner.entries()
) {

  approvedTransfers.sort(
    (a, b) =>
      timestampMillis(
        a.approvedAt ||
        a.updatedAt
      ) -
      timestampMillis(
        b.approvedAt ||
        b.updatedAt
      )
  );


  const existing =
    profileByOwner.get(
      ownerId
    ) ||
    {};


  const previousCounselorIds =
    Array.from(
      new Set([
        ...(
          Array.isArray(
            existing.previousCounselorIds
          )
            ? existing.previousCounselorIds
            : []
        ),

        ...approvedTransfers.map(
          row =>
            row.requestedById
        )
      ].filter(Boolean))
    );


  const previousCounselorNames =
    Array.from(
      new Set([
        ...(
          Array.isArray(
            existing.previousCounselorNames
          )
            ? existing.previousCounselorNames
            : []
        ),

        ...approvedTransfers.map(
          row =>
            row.requestedByName
        )
      ].filter(Boolean))
    );


  const latest =
    approvedTransfers[
      approvedTransfers.length -
      1
    ];


  profileUpdates.push({
    ref:
      db
        .collection(
          "counselingProfiles"
        )
        .doc(
          ownerId
        ),

    data: {
      previousCounselorIds,
      previousCounselorNames,

      lastTransferId:
        latest.id,

      transferredAt:
        latest.approvedAt ||
        latest.updatedAt ||
        FieldValue.serverTimestamp()
    }
  });
}


console.log(
  JSON.stringify(
    {
      applied:
        APPLY,

      transferRequests:
        transfersSnapshot.size,

      counselingProfiles:
        profilesSnapshot.size,

      transferScheduledAtUpdates:
        transferUpdates.length,

      counselingProfileHistoryUpdates:
        profileUpdates.length
    },
    null,
    2
  )
);


if (!APPLY) {

  console.log(
    "Dry run only. Re-run with --apply to backfill transfer scheduledAt and previous-counselor documentation metadata."
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
  [
    ...transferUpdates,
    ...profileUpdates
  ]
) {

  batch.set(
    item.ref,
    item.data,
    {
      merge:
        true
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