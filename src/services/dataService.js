import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, firebaseEnabled } from "./firebase";

const LOCAL_KEY = "mindtrack_demo_database";

const seed = {
  users: [
    { id: "sa-1", name: "System Super Admin", email: "superadmin@psu.edu.ph", role: "super_admin", department: "All" },
    { id: "c-1", name: "CCS Guidance Counselor", email: "counselor.ccs@psu.edu.ph", role: "counselor", department: "CCS" },
    { id: "u-1", name: "Juan Dela Cruz", email: "student@psu.edu.ph", role: "student", department: "CCS", userNumber: "2024-12345" },
    { id: "f-1", name: "Maria Faculty", email: "faculty@psu.edu.ph", role: "faculty", department: "CTE", userNumber: "EMP-1001" },
    { id: "p-1", name: "Pedro Personnel", email: "personnel@psu.edu.ph", role: "personnel", department: "Administration", userNumber: "EMP-2001" }
  ],
  assessments: [],
  consultations: [],
  referrals: [],
  notifications: []
};

function readLocal() {
  const current = localStorage.getItem(LOCAL_KEY);
  if (!current) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(seed));
    return structuredClone(seed);
  }
  return JSON.parse(current);
}

function writeLocal(data) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("mindtrack-local-change"));
}

export function resetDemoData() {
  writeLocal(structuredClone(seed));
}

export function subscribeCollection(name, callback, filters = {}) {
  if (firebaseEnabled) {
    let q = query(collection(db, name), orderBy("createdAt", "desc"));
    if (filters.ownerId) q = query(collection(db, name), where("ownerId", "==", filters.ownerId));
    if (filters.department) q = query(collection(db, name), where("department", "==", filters.department));
    return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }

  const emit = () => {
    const data = readLocal();
    let rows = [...(data[name] || [])];
    if (filters.ownerId) rows = rows.filter(r => r.ownerId === filters.ownerId);
    if (filters.department) rows = rows.filter(r => r.department === filters.department);
    rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    callback(rows);
  };
  emit();
  window.addEventListener("mindtrack-local-change", emit);
  return () => window.removeEventListener("mindtrack-local-change", emit);
}

export async function addRecord(name, payload) {
  if (firebaseEnabled) {
    return addDoc(collection(db, name), { ...payload, createdAt: serverTimestamp() });
  }
  const data = readLocal();
  const record = { id: crypto.randomUUID(), ...payload, createdAt: new Date().toISOString() };
  data[name] = [record, ...(data[name] || [])];
  writeLocal(data);
  return record;
}

export async function updateRecord(name, id, changes) {
  if (firebaseEnabled) {
    return updateDoc(doc(db, name, id), { ...changes, updatedAt: serverTimestamp() });
  }
  const data = readLocal();
  data[name] = (data[name] || []).map(r => r.id === id ? { ...r, ...changes, updatedAt: new Date().toISOString() } : r);
  writeLocal(data);
}

export async function upsertUser(user) {
  if (firebaseEnabled) {
    return setDoc(doc(db, "users", user.id), user, { merge: true });
  }
  const data = readLocal();
  const index = data.users.findIndex(u => u.id === user.id || u.email === user.email);
  if (index >= 0) data.users[index] = { ...data.users[index], ...user };
  else data.users.push(user);
  writeLocal(data);
}

export function findDemoUser(email) {
  return readLocal().users.find(u => u.email.toLowerCase() === email.toLowerCase());
}
