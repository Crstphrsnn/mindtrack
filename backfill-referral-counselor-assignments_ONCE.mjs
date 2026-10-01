import fs from "node:fs";
import process from "node:process";

import {
  cert,
  getApps,
  initializeApp
} from "firebase-admin/app";

import {
  FieldValue,
  getFirestore
} from "firebase-admin/firestore";


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

  process.exit(1);
}


const serviceAccount =
  JSON.parse(
    fs.readFileSync(
      keyPath,
      "utf8"
    )
  );


if (getApps().length === 0) {
  initializeApp({
    credential:
      cert(
        serviceAccount
      )
  });
}


const db =
  getFirestore();


function normalizeDepartment(value) {

  const clean =
    String(
      value || ""
    )
      .trim()
      .toLowerCase();


  const aliases = {
    coe:
      "college of education",

    cte:
      "college of education",

    cthm:
      "college of tourism and hospitality management",

    cit:
      "college of industrial technology",

    casl:
      "college of arts, sciences and letters",

    cal:
      "college of arts, sciences and letters",

    ccs:
      "college of computing sciences",

    cbpa:
      "college of business and public administration"
  };


  return aliases[clean] || clean;
}


const [
  directorySnap,
  referralsSnap
] =
  await Promise.all([
    db
      .collection(
        "counselorDirectory"
      )
      .get(),

    db
      .collection(
        "referrals"
      )
      .get()
  ]);


const counselors =
  directorySnap.docs
    .map(
      document => ({
        id:
          document.id,

        ...document.data()
      })
    )
    .filter(
      counselor =>
        counselor.active !==
          false &&
        counselor.id &&
        counselor.department
    );


console.log("");
console.log(
  dryRun
    ? "MindTrack referral counselor assignment backfill — DRY RUN"
    : "MindTrack referral counselor assignment backfill"
);

console.log(
  `Active counselor directory entries: ${counselors.length}`
);

console.log(
  `Referral documents: ${referralsSnap.size}`
);


let assigned = 0;
let alreadyAssigned = 0;
let unmatched = 0;

let batch =
  db.batch();

let writes = 0;


async function flush(force = false) {

  if (
    writes === 0 ||
    (
      !force &&
      writes < 400
    )
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
  const referralDoc of
    referralsSnap.docs
) {

  const referral =
    referralDoc.data();


  if (
    String(
      referral.assignedCounselorId ||
      ""
    ).trim()
  ) {

    alreadyAssigned += 1;
    continue;
  }


  const department =
    String(
      referral.department ||
      ""
    ).trim();


  const counselor =
    counselors.find(
      row =>
        normalizeDepartment(
          row.department
        ) ===
        normalizeDepartment(
          department
        )
    );


  if (!counselor) {

    unmatched += 1;

    console.warn(
      `No counselor match for referrals/${referralDoc.id} [${department || "missing department"}]`
    );

    continue;
  }


  assigned += 1;


  console.log(
    `${dryRun ? "[DRY RUN] " : ""}referrals/${referralDoc.id} -> ${counselor.name || "Guidance Counselor"} [${counselor.department}]`
  );


  if (!dryRun) {

    batch.set(
      referralDoc.ref,
      {
        assignedCounselorId:
          counselor.id,

        assignedCounselorName:
          counselor.name ||
          "Guidance Counselor",

        assignedCounselorDepartment:
          counselor.department,

        counselorAssignmentBackfilledAt:
          FieldValue.serverTimestamp()
      },
      {
        merge:
          true
      }
    );


    writes += 1;

    await flush();
  }
}


await flush(true);


console.log("");
console.log(
  `Referrals ${dryRun ? "that would be assigned" : "assigned"}: ${assigned}`
);

console.log(
  `Already assigned: ${alreadyAssigned}`
);

console.log(
  `Unmatched referrals: ${unmatched}`
);


if (dryRun) {

  console.log("");
  console.log(
    "Dry run complete. No Firestore data was changed."
  );

  console.log(
    "If the counselor matches look correct, run:"
  );

  console.log(
    "node backfill-referral-counselor-assignments_ONCE.mjs"
  );

} else {

  console.log("");
  console.log(
    "Referral counselor assignment backfill complete."
  );
}