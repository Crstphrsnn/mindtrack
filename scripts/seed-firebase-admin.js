import fs from "fs";
import path from "path";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function usage() {
  console.log(`Usage: node scripts/seed-firebase-admin.js --key /path/to/serviceAccount.json`);
  console.log(`Or set env FIREBASE_SERVICE_ACCOUNT to the service account JSON path.`);
}

const argv = process.argv.slice(2);
let keyPath = null;
if (argv.includes("--key")) keyPath = argv[argv.indexOf("--key") + 1];
keyPath = keyPath || process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  usage();
  process.exit(1);
}

keyPath = path.resolve(keyPath);
if (!fs.existsSync(keyPath)) {
  console.error("Service account file not found:", keyPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));

initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth();
const db = getFirestore();

const demoUsers = [
  { email: "superadmin@psu.edu.ph", password: "password123", name: "System Super Admin", role: "super_admin", department: "All" },
  { email: "counselor.ccs@psu.edu.ph", password: "password123", name: "CCS Guidance Counselor", role: "counselor", department: "CCS" },
  { email: "student@psu.edu.ph", password: "password123", name: "Juan Dela Cruz", role: "student", department: "CCS", userNumber: "2024-12345" },
  { email: "faculty@psu.edu.ph", password: "password123", name: "Maria Faculty", role: "faculty", department: "CTE", userNumber: "EMP-1001" },
  { email: "personnel@psu.edu.ph", password: "password123", name: "Pedro Personnel", role: "personnel", department: "Administration", userNumber: "EMP-2001" },
];

async function upsertDemoUser(u) {
  try {
    let uid;
    try {
      const existing = await auth.getUserByEmail(u.email);
      uid = existing.uid;
      console.log(`Found existing user ${u.email} -> ${uid}`);
    } catch (err) {
      const created = await auth.createUser({ email: u.email, password: u.password, displayName: u.name });
      uid = created.uid;
      console.log(`Created user ${u.email} -> ${uid}`);
    }

    const doc = {
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
    };
    if (u.userNumber) doc.userNumber = u.userNumber;

    await db.collection("users").doc(uid).set(doc, { merge: true });
    console.log(`Wrote users/${uid}`);
  } catch (e) {
    console.error(`Failed for ${u.email}:`, e.message || e);
  }
}

async function main() {
  for (const u of demoUsers) {
    // eslint-disable-next-line no-await-in-loop
    await upsertDemoUser(u);
  }
  console.log("Done seeding demo users.");
  process.exit(0);
}

main();
