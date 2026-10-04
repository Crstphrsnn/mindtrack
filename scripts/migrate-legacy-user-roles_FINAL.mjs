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


const LEGACY_ROLE_MAP = {
  faculty:
    "teaching",

  personnel:
    "non_teaching"
};


const TARGETS = [
  {
    collection:
      "users",

    field:
      "role"
  },

  {
    collection:
      "assessments",

    field:
      "role"
  },

  {
    collection:
      "feedback",

    field:
      "role"
  },

  {
    collection:
      "referrals",

    field:
      "referrerRole"
  }
];


const changes = [];


for (
  const target of
  TARGETS
) {

  for (
    const [
      oldRole,
      newRole
    ] of
    Object.entries(
      LEGACY_ROLE_MAP
    )
  ) {

    const snapshot =
      await db
        .collection(
          target.collection
        )
        .where(
          target.field,
          "==",
          oldRole
        )
        .get();


    for (
      const document of
      snapshot.docs
    ) {

      changes.push({
        ref:
          document.ref,

        collection:
          target.collection,

        field:
          target.field,

        id:
          document.id,

        oldRole,

        newRole
      });
    }
  }
}


const summary =
  changes.reduce(
    (
      result,
      item
    ) => {

      const key =
        `${item.collection}.${item.field}`;


      result[key] =
        (
          result[key] ||
          0
        ) + 1;


      return result;
    },
    {}
  );


console.log(
  JSON.stringify(
    {
      applied:
        APPLY,

      totalChanges:
        changes.length,

      byCollection:
        summary
    },
    null,
    2
  )
);


if (!APPLY) {

  console.log(
    "Dry run only. Re-run with --apply to convert legacy faculty/personnel role values."
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
  const change of
  changes
) {

  batch.update(
    change.ref,
    {
      [change.field]:
        change.newRole
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


console.log(
  "Legacy role migration complete. New canonical roles are teaching and non_teaching."
);