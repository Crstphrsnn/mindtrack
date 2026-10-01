import fs from "node:fs";
import process from "node:process";
import admin from "firebase-admin";

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : "";
}

const keyPath =
  argValue("--key") ||
  "./serviceAccountKey.json";

const dryRun =
  process.argv.includes("--dry-run");

if (!fs.existsSync(keyPath)) {
  console.error(`Service account key not found: ${keyPath}`);
  console.error("Use --key ./path/to/serviceAccountKey.json if needed.");
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

const collegeAliases = new Map([
  ["coe", "College of Education"],
  ["cte", "College of Education"],
  ["college of education", "College of Education"],

  ["cthm", "College of Tourism and Hospitality Management"],
  ["college of tourism and hospitality management", "College of Tourism and Hospitality Management"],

  ["cit", "College of Industrial Technology"],
  ["college of industrial technology", "College of Industrial Technology"],

  ["casl", "College of Arts, Sciences and Letters"],
  ["cal", "College of Arts, Sciences and Letters"],
  ["college of arts, sciences and letters", "College of Arts, Sciences and Letters"],

  ["ccs", "College of Computing Sciences"],
  ["college of computing sciences", "College of Computing Sciences"],

  ["cbpa", "College of Business and Public Administration"],
  ["college of business and public administration", "College of Business and Public Administration"]
]);

function canonicalCollege(value) {
  const clean =
    String(value || "")
      .trim();

  if (!clean) {
    return "Not recorded";
  }

  return (
    collegeAliases.get(
      clean.toLowerCase()
    ) ||
    clean
  );
}

function normalizedGender(value) {
  const clean =
    String(value || "")
      .trim()
      .toLowerCase();

  if (clean === "male") {
    return "Male";
  }

  if (clean === "female") {
    return "Female";
  }

  return "Not recorded";
}

const usersSnap =
  await db
    .collection("users")
    .get();

const users =
  new Map();

const missingGenderUsers = [];

for (const doc of usersSnap.docs) {
  const data = doc.data();

  const user = {
    id: doc.id,
    role:
      String(
        data.role || ""
      ).trim(),
    gender:
      normalizedGender(
        data.gender
      ),
    department:
      canonicalCollege(
        data.department
      ),
    program:
      String(
        data.program || ""
      ).trim()
  };

  users.set(
    doc.id,
    user
  );

  if (
    [
      "student",
      "teaching",
      "non_teaching",
      "faculty",
      "personnel"
    ].includes(user.role) &&
    user.gender === "Not recorded"
  ) {
    missingGenderUsers.push({
      id: doc.id,
      name:
        String(
          data.name || ""
        ).trim(),
      email:
        String(
          data.email || ""
        ).trim()
    });
  }
}

async function backfillCollection(
  collectionName
) {

  const snap =
    await db
      .collection(
        collectionName
      )
      .get();

  let changed = 0;
  let skippedNoOwner = 0;

  let batch =
    db.batch();

  let batchWrites = 0;

  async function commitBatchIfNeeded(force = false) {
    if (
      batchWrites === 0 ||
      (!force && batchWrites < 400)
    ) {
      return;
    }

    if (!dryRun) {
      await batch.commit();
    }

    batch =
      db.batch();

    batchWrites = 0;
  }

  for (const item of snap.docs) {
    const data =
      item.data();

    const ownerId =
      String(
        data.ownerId || ""
      ).trim();

    const owner =
      users.get(ownerId);

    if (!owner) {
      skippedNoOwner += 1;
      continue;
    }

    const patch = {
      role:
        owner.role ||
        String(
          data.role || ""
        ).trim(),

      gender:
        owner.gender,

      department:
        owner.department,

      program:
        owner.program,

      analyticsBackfilledAt:
        admin.firestore
          .FieldValue
          .serverTimestamp()
    };

    const changedFields =
      Object.entries(patch)
        .filter(
          ([key, value]) => {
            if (
              key ===
              "analyticsBackfilledAt"
            ) {
              return false;
            }

            return data[key] !== value;
          }
        )
        .map(
          ([key]) => key
        );

    if (
      changedFields.length === 0
    ) {
      continue;
    }

    changed += 1;

    console.log(
      `${dryRun ? "[DRY RUN] " : ""}${collectionName}/${item.id}: ${changedFields.join(", ")}`
    );

    if (!dryRun) {
      batch.set(
        item.ref,
        patch,
        {
          merge: true
        }
      );

      batchWrites += 1;

      await commitBatchIfNeeded();
    }
  }

  await commitBatchIfNeeded(true);

  return {
    total: snap.size,
    changed,
    skippedNoOwner
  };
}

console.log("");
console.log(
  `User accounts loaded: ${users.size}`
);

if (missingGenderUsers.length > 0) {
  console.log("");
  console.log(
    `General-user accounts still missing gender: ${missingGenderUsers.length}`
  );

  for (const user of missingGenderUsers) {
    console.log(
      `- ${user.name || "(no name)"} | ${user.email || user.id}`
    );
  }

  console.log("");
  console.log(
    "Do not infer gender from names. Ask these users to open Profile and select Male or Female, then rerun this script if you want historical records updated."
  );
}

const assessmentResult =
  await backfillCollection(
    "assessments"
  );

const consultationResult =
  await backfillCollection(
    "consultations"
  );

console.log("");
console.log(
  "Assessment backfill:",
  assessmentResult
);

console.log(
  "Consultation backfill:",
  consultationResult
);

if (dryRun) {
  console.log("");
  console.log(
    "Dry run complete. No Firestore records were changed."
  );
} else {
  console.log("");
  console.log(
    "Analytics demographic backfill complete."
  );
}