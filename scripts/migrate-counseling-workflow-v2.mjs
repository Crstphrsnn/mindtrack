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


const SERVICE_ACCOUNT_PATH =
  path.resolve(
    process.cwd(),
    "serviceAccountKey.json"
  );


const COUNSELING_STATUS_MAP =
  new Map([
    [
      "Schedule for counseling",
      "Scheduled for counseling"
    ],
    [
      "Follow up is recommended",
      "Follow up Counseling is recommended"
    ],
    [
      "Concluded",
      "Terminated"
    ]
  ]);


const SESSION_STATUSES =
  new Set([
    "Scheduled for counseling",
    "Rescheduled",
    "Terminated"
  ]);


function normalizeCounselingStatus(
  value
) {

  const status =
    String(
      value ||
      ""
    ).trim();


  return (
    COUNSELING_STATUS_MAP.get(
      status
    ) ||
    status
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


function scheduledMillis(
  row
) {

  const date =
    String(
      row.date ||
      ""
    ).trim();


  const time =
    String(
      row.time ||
      ""
    ).trim();


  if (
    date &&
    time
  ) {

    const match =
      time.match(
        /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
      );


    if (match) {

      let hour =
        Number(
          match[1]
        );


      const minute =
        Number(
          match[2]
        );


      const period =
        match[3]
          .toUpperCase();


      if (
        period ===
          "PM" &&
        hour !==
          12
      ) {

        hour +=
          12;
      }


      if (
        period ===
          "AM" &&
        hour ===
          12
      ) {

        hour =
          0;
      }


      const parsed =
        new Date(
          `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`
        ).getTime();


      if (
        !Number.isNaN(
          parsed
        )
      ) {

        return parsed;
      }
    }


    const dateOnly =
      new Date(
        `${date}T00:00:00`
      ).getTime();


    if (
      !Number.isNaN(
        dateOnly
      )
    ) {

      return dateOnly;
    }
  }


  return (
    timestampMillis(
      row.createdAt
    ) ||
    timestampMillis(
      row.updatedAt
    ) ||
    0
  );
}


function mergeUpdate(
  map,
  id,
  fields
) {

  map.set(
    id,
    {
      ...(
        map.get(
          id
        ) ||
        {}
      ),
      ...fields
    }
  );
}


if (
  !fs.existsSync(
    SERVICE_ACCOUNT_PATH
  )
) {

  throw new Error(
    "serviceAccountKey.json was not found in the project root."
  );
}


const serviceAccount =
  JSON.parse(
    fs.readFileSync(
      SERVICE_ACCOUNT_PATH,
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


const [
  consultationsSnapshot,
  locksSnapshot,
  profilesSnapshot,
  usersSnapshot,
  transfersSnapshot,
  notificationsSnapshot,
  transferAccessSnapshot,
  sessionNotesSnapshot
] =
  await Promise.all([
    db
      .collection(
        "consultations"
      )
      .get(),

    db
      .collection(
        "counselingRequestLocks"
      )
      .get(),

    db
      .collection(
        "counselingProfiles"
      )
      .get(),

    db
      .collection(
        "users"
      )
      .get(),

    db
      .collection(
        "transferRequests"
      )
      .get(),

    db
      .collection(
        "notifications"
      )
      .get(),

    db
      .collection(
        "transferAccess"
      )
      .get(),

    db
      .collection(
        "counselingSessionNotes"
      )
      .get()
  ]);


const users =
  new Map(
    usersSnapshot.docs.map(
      item => [
        item.id,
        {
          id:
            item.id,
          ...item.data()
        }
      ]
    )
  );


const existingProfiles =
  new Map(
    profilesSnapshot.docs.map(
      item => [
        item.id,
        {
          id:
            item.id,
          ...item.data()
        }
      ]
    )
  );


const existingSessionNoteIds =
  new Set(
    sessionNotesSnapshot.docs.map(
      item =>
        item.id
    )
  );


const consultationRows =
  consultationsSnapshot.docs.map(
    item => ({
      id:
        item.id,
      ...item.data()
    })
  );


const consultationById =
  new Map(
    consultationRows.map(
      row => [
        row.id,
        row
      ]
    )
  );


const consultationUpdates =
  new Map();


let statusMigrations =
  0;

let roleBackfills =
  0;

let sessionNumberWrites =
  0;

let lockStatusMigrations =
  0;

let profileCounterWrites =
  0;

let transferStatusMigrations =
  0;

let transferTargetBackfills =
  0;


for (
  const row of
  consultationRows
) {

  const normalizedStatus =
    normalizeCounselingStatus(
      row.status
    );


  if (
    normalizedStatus !==
      String(
        row.status ||
        ""
      ).trim()
  ) {

    mergeUpdate(
      consultationUpdates,
      row.id,
      {
        status:
          normalizedStatus,

        updatedAt:
          FieldValue.serverTimestamp()
      }
    );


    statusMigrations +=
      1;
  }


  if (
    !row.role &&
    row.ownerId
  ) {

    const owner =
      users.get(
        row.ownerId
      );


    if (
      owner?.role
    ) {

      mergeUpdate(
        consultationUpdates,
        row.id,
        {
          role:
            owner.role,

          updatedAt:
            FieldValue.serverTimestamp()
        }
      );


      roleBackfills +=
        1;
    }
  }
}


const sessionsByOwner =
  new Map();


const assignedSessionNumbers =
  new Map();


for (
  const row of
  consultationRows
) {

  const normalizedStatus =
    normalizeCounselingStatus(
      row.status
    );


  if (
    !row.ownerId ||
    !SESSION_STATUSES.has(
      normalizedStatus
    )
  ) {

    continue;
  }


  if (
    !sessionsByOwner.has(
      row.ownerId
    )
  ) {

    sessionsByOwner.set(
      row.ownerId,
      []
    );
  }


  sessionsByOwner
    .get(
      row.ownerId
    )
    .push({
      ...row,
      status:
        normalizedStatus
    });
}


const profileWrites =
  new Map();


for (
  const [
    ownerId,
    sessions
  ] of
  sessionsByOwner.entries()
) {

  sessions.sort(
    (
      first,
      second
    ) => {

      const timeDifference =
        scheduledMillis(
          first
        ) -
        scheduledMillis(
          second
        );


      if (
        timeDifference !==
          0
      ) {

        return timeDifference;
      }


      const createdDifference =
        timestampMillis(
          first.createdAt
        ) -
        timestampMillis(
          second.createdAt
        );


      if (
        createdDifference !==
          0
      ) {

        return createdDifference;
      }


      return String(
        first.id
      ).localeCompare(
        String(
          second.id
        )
      );
    }
  );


  sessions.forEach(
    (
      session,
      index
    ) => {

      const sessionNumber =
        index + 1;


      assignedSessionNumbers.set(
        session.id,
        sessionNumber
      );


      if (
        Number(
          session.sessionNumber ||
          0
        ) !==
        sessionNumber
      ) {

        mergeUpdate(
          consultationUpdates,
          session.id,
          {
            sessionNumber,

            updatedAt:
              FieldValue.serverTimestamp()
          }
        );


        sessionNumberWrites +=
          1;
      }
    }
  );


  const sessionCount =
    sessions.length;


  const existingProfile =
    existingProfiles.get(
      ownerId
    );


  if (existingProfile) {

    const needsCounterUpdate =
      Number(
        existingProfile.sessionCount ||
        0
      ) !==
        sessionCount ||
      Number(
        existingProfile.lastSessionNumber ||
        0
      ) !==
        sessionCount;


    if (
      needsCounterUpdate
    ) {

      profileWrites.set(
        ownerId,
        {
          merge:
            true,

          data: {
            sessionCount,

            lastSessionNumber:
              sessionCount,

            updatedAt:
              FieldValue.serverTimestamp()
          }
        }
      );


      profileCounterWrites +=
        1;
    }

  } else {

    const owner =
      users.get(
        ownerId
      ) ||
      {};


    const latestSession =
      sessions[
        sessions.length -
        1
      ] ||
      {};


    profileWrites.set(
      ownerId,
      {
        merge:
          true,

        data: {
          ownerId,

          ownerName:
            owner.name ||
            latestSession.ownerName ||
            "",

          department:
            owner.department ||
            latestSession.department ||
            "",

          assignedCounselorId:
            latestSession.assignedCounselorId ||
            "",

          assignedCounselorName:
            latestSession.assignedCounselorName ||
            "",

          assignedCounselorDepartment:
            latestSession.assignedCounselorDepartment ||
            "",

          previousCounselorIds:
            [],

          previousCounselorNames:
            [],

          sessionCount,

          lastSessionNumber:
            sessionCount,

          updatedById:
            "migration-counseling-workflow-v2",

          updatedByName:
            "Counseling workflow migration",

          updatedAt:
            FieldValue.serverTimestamp()
        }
      }
    );


    profileCounterWrites +=
      1;
  }
}


const sessionNoteWrites =
  new Map();


let legacyRecentSessionNotesCopied =
  0;


for (
  const [
    ownerId,
    sessions
  ] of
  sessionsByOwner.entries()
) {

  const terminatedSessions =
    sessions.filter(
      session =>
        normalizeCounselingStatus(
          session.status
        ) ===
        "Terminated"
    );


  if (
    terminatedSessions.length ===
    0
  ) {

    continue;
  }


  const latestTerminatedSession =
    terminatedSessions[
      terminatedSessions.length -
      1
    ];


  if (
    existingSessionNoteIds.has(
      latestTerminatedSession.id
    )
  ) {

    continue;
  }


  const counselingProfile =
    existingProfiles.get(
      ownerId
    );


  if (!counselingProfile) {
    continue;
  }


  const caseHistory =
    String(
      counselingProfile.caseHistory ||
      ""
    ).trim();


  const counselingSessionSummary =
    String(
      counselingProfile.counselingSessionSummary ||
      ""
    ).trim();


  const counselorObservation =
    String(
      counselingProfile.counselorObservation ||
      ""
    ).trim();


  const recommendedActions =
    String(
      counselingProfile.recommendations ||
      counselingProfile.notes ||
      ""
    ).trim();


  if (
    !caseHistory &&
    !counselingSessionSummary &&
    !counselorObservation &&
    !recommendedActions
  ) {

    continue;
  }


  const sessionNumber =
    assignedSessionNumbers.get(
      latestTerminatedSession.id
    ) ||
    Number(
      latestTerminatedSession.sessionNumber ||
      0
    ) ||
    terminatedSessions.length;


  sessionNoteWrites.set(
    latestTerminatedSession.id,
    {
      consultationId:
        latestTerminatedSession.id,

      ownerId,

      ownerName:
        latestTerminatedSession.ownerName ||
        counselingProfile.ownerName ||
        users.get(
          ownerId
        )?.name ||
        "",

      department:
        latestTerminatedSession.department ||
        counselingProfile.department ||
        users.get(
          ownerId
        )?.department ||
        "",

      assignedCounselorId:
        latestTerminatedSession.assignedCounselorId ||
        counselingProfile.assignedCounselorId ||
        "",

      assignedCounselorName:
        latestTerminatedSession.assignedCounselorName ||
        counselingProfile.assignedCounselorName ||
        "",

      assignedCounselorDepartment:
        latestTerminatedSession.assignedCounselorDepartment ||
        counselingProfile.assignedCounselorDepartment ||
        "",

      sessionNumber,

      caseHistory,

      counselingSessionSummary,

      counselorObservation,

      recommendedActions,

      updatedById:
        counselingProfile.updatedById ||
        "migration-counseling-workflow-v2",

      updatedByName:
        counselingProfile.updatedByName ||
        counselingProfile.assignedCounselorName ||
        "Counseling workflow migration",

      updatedByRole:
        "counselor",

      createdAt:
        counselingProfile.updatedAt ||
        latestTerminatedSession.updatedAt ||
        latestTerminatedSession.createdAt ||
        FieldValue.serverTimestamp(),

      updatedAt:
        counselingProfile.updatedAt ||
        latestTerminatedSession.updatedAt ||
        FieldValue.serverTimestamp()
    }
  );


  legacyRecentSessionNotesCopied +=
    1;
}


const lockUpdates =
  new Map();


for (
  const lockDoc of
  locksSnapshot.docs
) {

  const row =
    lockDoc.data();


  const normalizedStatus =
    normalizeCounselingStatus(
      row.status
    );


  if (
    normalizedStatus !==
      String(
        row.status ||
        ""
      ).trim()
  ) {

    lockUpdates.set(
      lockDoc.id,
      {
        status:
          normalizedStatus,

        updatedAt:
          FieldValue.serverTimestamp()
      }
    );


    lockStatusMigrations +=
      1;
  }
}


const transferUpdates =
  new Map();

const transferIdsToDelete =
  new Set();

const transferIdsToClean =
  new Set();


for (
  const transferDoc of
  transfersSnapshot.docs
) {

  const row =
    transferDoc.data();


  const rawStatus =
    String(
      row.status ||
      ""
    ).trim();


  const isPending =
    rawStatus ===
      "Pending" ||
    rawStatus ===
      "Pending approval";


  const hasTarget =
    Boolean(
      row.targetCounselorId
    );


  if (
    isPending &&
    !hasTarget
  ) {

    transferIdsToDelete.add(
      transferDoc.id
    );


    transferIdsToClean.add(
      transferDoc.id
    );


    continue;
  }


  const update = {};


  const normalizedConsultationStatus =
    normalizeCounselingStatus(
      row.consultationStatus
    );


  if (
    row.consultationStatus &&
    normalizedConsultationStatus !==
      row.consultationStatus
  ) {

    update.consultationStatus =
      normalizedConsultationStatus;


    transferStatusMigrations +=
      1;
  }


  if (
    rawStatus ===
      "Pending"
  ) {

    update.status =
      "Pending approval";


    update.updatedAt =
      FieldValue.serverTimestamp();


    transferStatusMigrations +=
      1;
  }


  if (
    !row.targetCounselorId &&
    rawStatus ===
      "Approved" &&
    row.acceptedById
  ) {

    const acceptedCounselor =
      users.get(
        row.acceptedById
      ) ||
      {};


    update.targetCounselorId =
      row.acceptedById;


    update.targetCounselorName =
      row.acceptedByName ||
      acceptedCounselor.name ||
      "Guidance Counselor";


    update.targetCounselorDepartment =
      row.acceptedByDepartment ||
      acceptedCounselor.department ||
      "";


    transferTargetBackfills +=
      1;
  }


  if (
    row.targetCounselorId &&
    (
      !row.targetCounselorName ||
      !row.targetCounselorDepartment
    )
  ) {

    const targetCounselor =
      users.get(
        row.targetCounselorId
      ) ||
      {};


    if (
      !row.targetCounselorName &&
      targetCounselor.name
    ) {

      update.targetCounselorName =
        targetCounselor.name;
    }


    if (
      !row.targetCounselorDepartment &&
      targetCounselor.department
    ) {

      update.targetCounselorDepartment =
        targetCounselor.department;
    }


    if (
      Object.keys(
        update
      ).some(
        key =>
          key.startsWith(
            "targetCounselor"
          )
      )
    ) {

      transferTargetBackfills +=
        1;
    }
  }


  if (
    Object.keys(
      update
    ).length
  ) {

    transferUpdates.set(
      transferDoc.id,
      update
    );
  }
}


for (
  const transferId of
  transferIdsToClean
) {

  const transfer =
    transfersSnapshot.docs
      .find(
        item =>
          item.id ===
          transferId
      )
      ?.data();


  if (
    !transfer?.consultationId
  ) {

    continue;
  }


  const consultation =
    consultationById.get(
      transfer.consultationId
    );


  if (
    consultation &&
    consultation.transferRequestId ===
      transferId
  ) {

    mergeUpdate(
      consultationUpdates,
      transfer.consultationId,
      {
        transferStatus:
          FieldValue.delete(),

        transferRequestId:
          FieldValue.delete(),

        updatedAt:
          FieldValue.serverTimestamp()
      }
    );
  }
}


const notificationIdsToDelete =
  new Set();


for (
  const notificationDoc of
  notificationsSnapshot.docs
) {

  const row =
    notificationDoc.data();


  if (
    transferIdsToClean.has(
      row.sourceId
    ) ||
    transferIdsToClean.has(
      row.transferRequestId
    )
  ) {

    notificationIdsToDelete.add(
      notificationDoc.id
    );
  }
}


const accessIdsToDelete =
  new Set();


for (
  const accessDoc of
  transferAccessSnapshot.docs
) {

  const row =
    accessDoc.data();


  if (
    transferIdsToClean.has(
      row.transferRequestId
    )
  ) {

    accessIdsToDelete.add(
      accessDoc.id
    );
  }
}


const operations = [];


for (
  const [
    id,
    fields
  ] of
  consultationUpdates.entries()
) {

  operations.push({
    type:
      "update",

    ref:
      db
        .collection(
          "consultations"
        )
        .doc(
          id
        ),

    data:
      fields
  });
}


for (
  const [
    id,
    fields
  ] of
  lockUpdates.entries()
) {

  operations.push({
    type:
      "update",

    ref:
      db
        .collection(
          "counselingRequestLocks"
        )
        .doc(
          id
        ),

    data:
      fields
  });
}


for (
  const [
    id,
    write
  ] of
  profileWrites.entries()
) {

  operations.push({
    type:
      "set",

    ref:
      db
        .collection(
          "counselingProfiles"
        )
        .doc(
          id
        ),

    data:
      write.data,

    options: {
      merge:
        write.merge
    }
  });
}


for (
  const [
    consultationId,
    fields
  ] of
  sessionNoteWrites.entries()
) {

  operations.push({
    type:
      "set",

    ref:
      db
        .collection(
          "counselingSessionNotes"
        )
        .doc(
          consultationId
        ),

    data:
      fields,

    options: {
      merge:
        false
    }
  });
}


for (
  const [
    id,
    fields
  ] of
  transferUpdates.entries()
) {

  if (
    transferIdsToDelete.has(
      id
    )
  ) {

    continue;
  }


  operations.push({
    type:
      "update",

    ref:
      db
        .collection(
          "transferRequests"
        )
        .doc(
          id
        ),

    data:
      fields
  });
}


for (
  const id of
  transferIdsToDelete
) {

  operations.push({
    type:
      "delete",

    ref:
      db
        .collection(
          "transferRequests"
        )
        .doc(
          id
        )
  });
}


for (
  const id of
  notificationIdsToDelete
) {

  operations.push({
    type:
      "delete",

    ref:
      db
        .collection(
          "notifications"
        )
        .doc(
          id
        )
  });
}


for (
  const id of
  accessIdsToDelete
) {

  operations.push({
    type:
      "delete",

    ref:
      db
        .collection(
          "transferAccess"
        )
        .doc(
          id
        )
  });
}


const report = {
  apply:
    APPLY,

  sourceCounts: {
    consultations:
      consultationsSnapshot.size,

    counselingRequestLocks:
      locksSnapshot.size,

    counselingProfiles:
      profilesSnapshot.size,

    users:
      usersSnapshot.size,

    transferRequests:
      transfersSnapshot.size,

    counselingSessionNotes:
      sessionNotesSnapshot.size
  },

  plannedChanges: {
    consultationDocuments:
      consultationUpdates.size,

    statusMigrations,

    roleBackfills,

    sessionNumberWrites,

    legacyRecentSessionNotesCopied,

    counselingRequestLockDocuments:
      lockUpdates.size,

    lockStatusMigrations,

    counselingProfileDocuments:
      profileWrites.size,

    profileCounterWrites,

    transferDocumentsUpdated:
      transferUpdates.size,

    transferStatusMigrations,

    transferTargetBackfills,

    legacyPendingTransfersRemoved:
      transferIdsToDelete.size,

    legacyTransferNotificationsRemoved:
      notificationIdsToDelete.size,

    legacyTransferAccessRemoved:
      accessIdsToDelete.size,

    totalWrites:
      operations.length
  }
};


console.log(
  JSON.stringify(
    report,
    null,
    2
  )
);


if (!APPLY) {

  console.log(
    "\nDry run only. No Firestore documents were changed."
  );


  console.log(
    "If the counts are correct, run again with --apply."
  );


  process.exit(0);
}


const BATCH_LIMIT =
  400;


let batch =
  db.batch();

let batchSize =
  0;

let committedWrites =
  0;


async function commitBatch() {

  if (
    batchSize ===
    0
  ) {

    return;
  }


  await batch.commit();


  committedWrites +=
    batchSize;


  batch =
    db.batch();

  batchSize =
    0;
}


for (
  const operation of
  operations
) {

  if (
    operation.type ===
      "update"
  ) {

    batch.update(
      operation.ref,
      operation.data
    );

  } else if (
    operation.type ===
      "set"
  ) {

    batch.set(
      operation.ref,
      operation.data,
      operation.options
    );

  } else if (
    operation.type ===
      "delete"
  ) {

    batch.delete(
      operation.ref
    );
  }


  batchSize +=
    1;


  if (
    batchSize >=
      BATCH_LIMIT
  ) {

    await commitBatch();
  }
}


await commitBatch();


console.log(
  JSON.stringify(
    {
      applied:
        true,

      committedWrites
    },
    null,
    2
  )
);


console.log(
  "\nCounseling workflow v2 migration completed."
);