import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  db,
  firebaseEnabled
} from "./firebase";


const LOCAL_KEY =
  "mindtrack_demo_database";


const seed = {

  users: [

    {
      id: "sa-1",
      name: "System Super Admin",
      email: "superadmin@psu.edu.ph",
      role: "super_admin",
      department: "All"
    },

    {
      id: "c-1",
      name: "CCS Guidance Counselor",
      email: "counselor.ccs@psu.edu.ph",
      role: "counselor",
      department: "CCS"
    },

    {
      id: "u-1",
      name: "Juan Dela Cruz",
      email: "student@psu.edu.ph",
      role: "student",
      department: "CCS",
      userNumber: "2024-12345"
    },

    {
      id: "f-1",
      name: "Maria Faculty",
      email: "faculty@psu.edu.ph",
      role: "faculty",
      department: "CTE",
      userNumber: "EMP-1001"
    },

    {
      id: "p-1",
      name: "Pedro Personnel",
      email: "personnel@psu.edu.ph",
      role: "personnel",
      department: "Administration",
      userNumber: "EMP-2001"
    }

  ],


  assessments: [],

  consultations: [],

  referrals: [],

  notifications: [],

  counselingProfiles: [],

  transferRequests: [],

  transferAccess: [],

  feedback: []

};


function readLocal() {

  const current =
    localStorage.getItem(
      LOCAL_KEY
    );


  if (!current) {

    localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify(
        seed
      )
    );


    return structuredClone(
      seed
    );
  }


  try {

    return JSON.parse(
      current
    );

  } catch (error) {

    console.error(
      "Unable to read local MindTrack data:",
      error
    );


    localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify(
        seed
      )
    );


    return structuredClone(
      seed
    );
  }
}


function writeLocal(
  data
) {

  localStorage.setItem(
    LOCAL_KEY,
    JSON.stringify(
      data
    )
  );


  window.dispatchEvent(
    new Event(
      "mindtrack-local-change"
    )
  );
}


function timestampToMillis(
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
      value.seconds * 1000 +
      Math.floor(
        (
          value.nanoseconds ||
          0
        ) /
        1000000
      )
    );
  }


  if (
    value instanceof Date
  ) {

    return value.getTime();
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
  rows
) {

  return [
    ...rows
  ].sort(
    (
      a,
      b
    ) =>
      timestampToMillis(
        b.createdAt ||
        b.updatedAt
      ) -
      timestampToMillis(
        a.createdAt ||
        a.updatedAt
      )
  );
}


export function resetDemoData() {

  writeLocal(
    structuredClone(
      seed
    )
  );
}


// =====================================================
// REALTIME COLLECTION SUBSCRIPTION
// =====================================================

export function subscribeCollection(
  name,
  callback,
  filters = {},
  onError = null
) {

  if (
    typeof callback !==
    "function"
  ) {

    console.error(
      `subscribeCollection("${name}") requires a callback function.`
    );


    return () => {};
  }


  // ===================================================
  // FIREBASE / FIRESTORE
  // ===================================================

  if (firebaseEnabled) {

    try {

      const constraints = [];


      if (
        filters.ownerId
      ) {

        constraints.push(
          where(
            "ownerId",
            "==",
            filters.ownerId
          )
        );
      }


      if (
        filters.department
      ) {

        constraints.push(
          where(
            "department",
            "==",
            filters.department
          )
        );
      }


      if (
        filters.role
      ) {

        constraints.push(
          where(
            "role",
            "==",
            filters.role
          )
        );
      }


      if (
        filters.status
      ) {

        constraints.push(
          where(
            "status",
            "==",
            filters.status
          )
        );
      }


      if (
        filters.assignedCounselorId
      ) {

        constraints.push(
          where(
            "assignedCounselorId",
            "==",
            filters.assignedCounselorId
          )
        );
      }


      if (
        filters.counselorId
      ) {

        constraints.push(
          where(
            "counselorId",
            "==",
            filters.counselorId
          )
        );
      }


      if (
        filters.requestedById
      ) {

        constraints.push(
          where(
            "requestedById",
            "==",
            filters.requestedById
          )
        );
      }


      if (
        filters.transferRequestId
      ) {

        constraints.push(
          where(
            "transferRequestId",
            "==",
            filters.transferRequestId
          )
        );
      }


      if (
        filters.active !==
        undefined
      ) {

        constraints.push(
          where(
            "active",
            "==",
            filters.active
          )
        );
      }


      const collectionQuery =
        query(
          collection(
            db,
            name
          ),
          ...constraints
        );


      const unsubscribe =
        onSnapshot(

          collectionQuery,


          snapshot => {

            const rows =
              snapshot.docs.map(
                item => ({

                  id:
                    item.id,

                  ...item.data()

                })
              );


            callback(
              newestFirst(
                rows
              )
            );
          },


          error => {

            console.error(
              `Unable to load ${name}:`,
              error
            );


            // Keep React components alive even when
            // Firestore rejects a query.
            callback([]);


            if (
              typeof onError ===
              "function"
            ) {

              onError(
                error
              );
            }
          }

        );


      return unsubscribe;

    } catch (error) {

      console.error(
        `Unable to create ${name} subscription:`,
        error
      );


      callback([]);


      if (
        typeof onError ===
        "function"
      ) {

        onError(
          error
        );
      }


      return () => {};
    }
  }


  // ===================================================
  // LOCAL / DEMO DATABASE
  // ===================================================

  const emit = () => {

    try {

      const data =
        readLocal();


      let rows =
        [
          ...(
            data[name] ||
            []
          )
        ];


      if (
        filters.ownerId
      ) {

        rows =
          rows.filter(
            row =>
              row.ownerId ===
              filters.ownerId
          );
      }


      if (
        filters.department
      ) {

        rows =
          rows.filter(
            row =>
              row.department ===
              filters.department
          );
      }


      if (
        filters.role
      ) {

        rows =
          rows.filter(
            row =>
              row.role ===
              filters.role
          );
      }


      if (
        filters.status
      ) {

        rows =
          rows.filter(
            row =>
              row.status ===
              filters.status
          );
      }


      if (
        filters.assignedCounselorId
      ) {

        rows =
          rows.filter(
            row =>
              row.assignedCounselorId ===
              filters.assignedCounselorId
          );
      }


      if (
        filters.counselorId
      ) {

        rows =
          rows.filter(
            row =>
              row.counselorId ===
              filters.counselorId
          );
      }


      if (
        filters.requestedById
      ) {

        rows =
          rows.filter(
            row =>
              row.requestedById ===
              filters.requestedById
          );
      }


      if (
        filters.transferRequestId
      ) {

        rows =
          rows.filter(
            row =>
              row.transferRequestId ===
              filters.transferRequestId
          );
      }


      if (
        filters.active !==
        undefined
      ) {

        rows =
          rows.filter(
            row =>
              row.active ===
              filters.active
          );
      }


      callback(
        newestFirst(
          rows
        )
      );

    } catch (error) {

      console.error(
        `Unable to load local ${name}:`,
        error
      );


      callback([]);


      if (
        typeof onError ===
        "function"
      ) {

        onError(
          error
        );
      }
    }
  };


  emit();


  window.addEventListener(
    "mindtrack-local-change",
    emit
  );


  return () => {

    window.removeEventListener(
      "mindtrack-local-change",
      emit
    );
  };
}


// =====================================================
// ADD RECORD
// =====================================================

export async function addRecord(
  name,
  payload
) {

  if (firebaseEnabled) {

    try {

      return await addDoc(
        collection(
          db,
          name
        ),
        {

          ...payload,

          createdAt:
            serverTimestamp()

        }
      );

    } catch (error) {

      console.error(
        `Unable to add record to ${name}:`,
        error
      );


      throw error;
    }
  }


  const data =
    readLocal();


  const record = {

    id:
      crypto.randomUUID(),

    ...payload,

    createdAt:
      new Date()
        .toISOString()

  };


  data[name] = [

    record,

    ...(
      data[name] ||
      []
    )

  ];


  writeLocal(
    data
  );


  return record;
}


// =====================================================
// UPDATE RECORD
// =====================================================

export async function updateRecord(
  name,
  id,
  changes
) {

  if (
    !id
  ) {

    throw new Error(
      `Unable to update ${name}: missing document ID.`
    );
  }


  if (firebaseEnabled) {

    try {

      return await updateDoc(
        doc(
          db,
          name,
          id
        ),
        {

          ...changes,

          updatedAt:
            serverTimestamp()

        }
      );

    } catch (error) {

      console.error(
        `Unable to update ${name}/${id}:`,
        error
      );


      throw error;
    }
  }


  const data =
    readLocal();


  data[name] =
    (
      data[name] ||
      []
    ).map(
      row =>
        row.id ===
          id

          ? {

              ...row,

              ...changes,

              updatedAt:
                new Date()
                  .toISOString()

            }

          : row
    );


  writeLocal(
    data
  );
}


// =====================================================
// CREATE / UPDATE USER
// =====================================================

export async function upsertUser(
  user
) {

  if (
    !user?.id
  ) {

    throw new Error(
      "Unable to save user: missing user ID."
    );
  }


  if (firebaseEnabled) {

    try {

      return await setDoc(
        doc(
          db,
          "users",
          user.id
        ),

        user,

        {
          merge:
            true
        }
      );

    } catch (error) {

      console.error(
        `Unable to save user ${user.id}:`,
        error
      );


      throw error;
    }
  }


  const data =
    readLocal();


  const index =
    data.users.findIndex(
      item =>
        item.id ===
          user.id ||
        item.email ===
          user.email
    );


  if (
    index >= 0
  ) {

    data.users[index] = {

      ...data.users[index],

      ...user

    };

  } else {

    data.users.push(
      user
    );
  }


  writeLocal(
    data
  );
}


// =====================================================
// FIND DEMO USER
// =====================================================

export function findDemoUser(
  email
) {

  if (!email) {

    return undefined;
  }


  return readLocal()
    .users
    .find(
      user =>
        String(
          user.email ||
          ""
        )
          .toLowerCase() ===

        String(
          email
        )
          .toLowerCase()
    );
}