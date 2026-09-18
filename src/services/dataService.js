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
  notifications: []
};


function readLocal() {

  const current =
    localStorage.getItem(
      LOCAL_KEY
    );


  if (!current) {

    localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify(seed)
    );

    return structuredClone(
      seed
    );
  }


  return JSON.parse(
    current
  );
}


function writeLocal(data) {

  localStorage.setItem(
    LOCAL_KEY,
    JSON.stringify(data)
  );


  window.dispatchEvent(
    new Event(
      "mindtrack-local-change"
    )
  );
}


function timestampToMillis(value) {

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
        ) / 1000000
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


function newestFirst(rows) {

  return [...rows].sort(
    (a, b) =>
      timestampToMillis(
        b.createdAt
      ) -
      timestampToMillis(
        a.createdAt
      )
  );
}


export function resetDemoData() {

  writeLocal(
    structuredClone(seed)
  );
}


export function subscribeCollection(
  name,
  callback,
  filters = {}
) {

  if (firebaseEnabled) {

    const constraints = [];


    if (filters.ownerId) {

      constraints.push(
        where(
          "ownerId",
          "==",
          filters.ownerId
        )
      );
    }


    if (filters.department) {

      constraints.push(
        where(
          "department",
          "==",
          filters.department
        )
      );
    }


    const q =
      query(
        collection(
          db,
          name
        ),
        ...constraints
      );


    return onSnapshot(
      q,
      snap => {

        const rows =
          snap.docs.map(
            item => ({
              id: item.id,
              ...item.data()
            })
          );


        callback(
          newestFirst(
            rows
          )
        );
      }
    );
  }


  const emit = () => {

    const data =
      readLocal();


    let rows =
      [
        ...(
          data[name] ||
          []
        )
      ];


    if (filters.ownerId) {

      rows =
        rows.filter(
          row =>
            row.ownerId ===
            filters.ownerId
        );
    }


    if (filters.department) {

      rows =
        rows.filter(
          row =>
            row.department ===
            filters.department
        );
    }


    callback(
      newestFirst(
        rows
      )
    );
  };


  emit();


  window.addEventListener(
    "mindtrack-local-change",
    emit
  );


  return () =>
    window.removeEventListener(
      "mindtrack-local-change",
      emit
    );
}


export async function addRecord(
  name,
  payload
) {

  if (firebaseEnabled) {

    return addDoc(
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
  }


  const data =
    readLocal();


  const record = {
    id:
      crypto.randomUUID(),

    ...payload,

    createdAt:
      new Date().toISOString()
  };


  data[name] = [
    record,
    ...(
      data[name] ||
      []
    )
  ];


  writeLocal(data);


  return record;
}


export async function updateRecord(
  name,
  id,
  changes
) {

  if (firebaseEnabled) {

    return updateDoc(
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
  }


  const data =
    readLocal();


  data[name] =
    (
      data[name] ||
      []
    ).map(
      row =>
        row.id === id
          ? {
              ...row,
              ...changes,
              updatedAt:
                new Date().toISOString()
            }
          : row
    );


  writeLocal(data);
}


export async function upsertUser(
  user
) {

  if (firebaseEnabled) {

    return setDoc(
      doc(
        db,
        "users",
        user.id
      ),
      user,
      {
        merge: true
      }
    );
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


  if (index >= 0) {

    data.users[index] = {
      ...data.users[index],
      ...user
    };

  } else {

    data.users.push(user);
  }


  writeLocal(data);
}


export function findDemoUser(
  email
) {

  return readLocal()
    .users
    .find(
      user =>
        user.email
          .toLowerCase() ===
        email.toLowerCase()
    );
}