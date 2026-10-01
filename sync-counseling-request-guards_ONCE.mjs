import fs from "node:fs";
import process from "node:process";
import admin from "firebase-admin";

function argValue(flag) {
  const index =
    process.argv.indexOf(flag);

  return index >= 0
    ? process.argv[index + 1]
    : "";
}

const keyPath =
  argValue("--key") ||
  "./serviceAccountKey.json";

const dryRun =
  process.argv.includes(
    "--dry-run"
  );

if (!fs.existsSync(keyPath)) {
  console.error(
    `Service account key not found: ${keyPath}`
  );

  console.error(
    "Use --key ./path/to/serviceAccountKey.json if needed."
  );

  process.exit(1);
}

const serviceAccount =
  JSON.parse(
    fs.readFileSync(
      keyPath,
      "utf8"
    )
  );

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential:
      admin.credential.cert(
        serviceAccount
      )
  });
}

const db =
  admin.firestore();

const RELEASE_STATUSES =
  new Set([
    "Follow up is recommended",
    "Concluded"
  ]);

function millis(value) {
  if (
    value &&
    typeof value.toMillis ===
      "function"
  ) {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return 0;
}

const snap =
  await db
    .collection("consultations")
    .get();

const byOwner =
  new Map();

for (const doc of snap.docs) {
  const data =
    doc.data();

  const ownerId =
    String(
      data.ownerId || ""
    ).trim();

  if (!ownerId) {
    continue;
  }

  if (!byOwner.has(ownerId)) {
    byOwner.set(
      ownerId,
      []
    );
  }

  byOwner.get(ownerId).push({
    id:
      doc.id,

    status:
      String(
        data.status ||
        "Pending approval"
      ).trim(),

    createdAt:
      data.createdAt,

    updatedAt:
      data.updatedAt
  });
}

console.log(
  `Counseling owners found: ${byOwner.size}`
);

let changed = 0;
let duplicateOwners = 0;

let batch =
  db.batch();

let writes = 0;

async function flush(force = false) {
  if (
    writes === 0 ||
    (!force && writes < 400)
  ) {
    return;
  }

  if (!dryRun) {
    await batch.commit();
  }

  batch =
    db.batch();

  writes = 0;
}

for (
  const [
    ownerId,
    requests
  ] of byOwner.entries()
) {

  requests.sort(
    (a, b) =>
      Math.max(
        millis(b.updatedAt),
        millis(b.createdAt)
      ) -
      Math.max(
        millis(a.updatedAt),
        millis(a.createdAt)
      )
  );

  const active =
    requests.filter(
      request =>
        !RELEASE_STATUSES.has(
          request.status
        )
    );

  if (active.length > 1) {
    duplicateOwners += 1;

    console.warn("");
    console.warn(
      `WARNING: ${ownerId} has ${active.length} active counseling requests:`
    );

    for (const request of active) {
      console.warn(
        `  - ${request.id} | ${request.status}`
      );
    }

    console.warn(
      "All are preserved in the guard. The user will remain blocked from a new request until counselors properly close/release the older active cases."
    );
  }

  const latest =
    requests[0];

  const guardData = {
    ownerId,

    activeRequestIds:
      active.map(
        request =>
          request.id
      ),

    activeRequestCount:
      active.length,

    latestRequestId:
      latest.id,

    latestStatus:
      latest.status,

    updatedById:
      "migration",

    updatedAt:
      admin.firestore
        .FieldValue
        .serverTimestamp()
  };

  console.log(
    `${dryRun ? "[DRY RUN] " : ""}${ownerId}: ${active.length} active request(s); latest=${latest.id} [${latest.status}]`
  );

  changed += 1;

  if (!dryRun) {
    batch.set(
      db
        .collection(
          "counselingRequestGuards"
        )
        .doc(ownerId),
      guardData,
      {
        merge: true
      }
    );

    writes += 1;

    await flush();
  }
}

await flush(true);

console.log("");
console.log(
  `Guard documents ${dryRun ? "that would be written" : "written"}: ${changed}`
);

console.log(
  `Users with multiple legacy active requests: ${duplicateOwners}`
);

if (dryRun) {
  console.log(
    "Dry run complete. No Firestore data was changed."
  );
} else {
  console.log(
    "Counseling request guard synchronization complete."
  );
}