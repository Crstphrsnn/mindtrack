import fs from "node:fs";
import {
  cert,
  initializeApp
} from "firebase-admin/app";
import {
  getFirestore
} from "firebase-admin/firestore";

const serviceAccount =
  JSON.parse(
    fs.readFileSync(
      "./serviceAccountKey.json",
      "utf8"
    )
  );

initializeApp({
  credential:
    cert(serviceAccount)
});

const db =
  getFirestore();

const VALID_ASSESSMENT_STATUSES =
  new Set([
    "For review",
    "Counseling is recommended",
    "Follow up is recommended",
    "Counseling is optional",
    "Approved",
    "Concluded"
  ]);

const [
  assessments,
  consultations,
  referrals,
  transfers,
  slots,
  counselors
] =
  await Promise.all([
    db.collection("assessments").get(),
    db.collection("consultations").get(),
    db.collection("referrals").get(),
    db.collection("transferRequests").get(),
    db.collection("counselingScheduleSlots").get(),
    db.collection("counselorDirectory").get()
  ]);

const issues = [];

const counselorIds =
  new Set(
    counselors.docs.map(
      item =>
        item.data()
          .counselorId ||
        item.id
    )
  );

const consultationById =
  new Map(
    consultations.docs.map(
      item => [
        item.id,
        item.data()
      ]
    )
  );

for (
  const item
  of assessments.docs
) {

  const assessment =
    item.data();

  if (
    !VALID_ASSESSMENT_STATUSES.has(
      assessment.status
    )
  ) {

    issues.push(
      `assessment ${item.id}: invalid status ${JSON.stringify(assessment.status)}`
    );
  }
}

for (
  const item
  of consultations.docs
) {

  const consultation =
    item.data();

  if (
    consultation.assignedCounselorId &&
    !counselorIds.has(
      consultation
        .assignedCounselorId
    )
  ) {

    issues.push(
      `consultation ${item.id}: assignedCounselorId not in counselorDirectory`
    );
  }
}

for (
  const item
  of referrals.docs
) {

  const referral =
    item.data();

  if (
    !referral
      .assignedCounselorId
  ) {

    issues.push(
      `referral ${item.id}: missing assignedCounselorId`
    );

  } else if (
    !counselorIds.has(
      referral
        .assignedCounselorId
    )
  ) {

    issues.push(
      `referral ${item.id}: assigned counselor missing from counselorDirectory`
    );
  }
}

for (
  const item
  of slots.docs
) {

  const slot =
    item.data();

  const consultation =
    consultationById.get(
      slot.consultationId
    );

  if (!consultation) {

    issues.push(
      `slot ${item.id}: consultation ${slot.consultationId} does not exist`
    );

    continue;
  }

  if (
    consultation.date !==
      slot.date ||
    consultation.time !==
      slot.time
  ) {

    issues.push(
      `slot ${item.id}: date/time does not match consultation ${slot.consultationId}`
    );
  }

  if (
    consultation
      .assignedCounselorId &&
    consultation
      .assignedCounselorId !==
      slot.counselorId
  ) {

    issues.push(
      `slot ${item.id}: counselor does not match consultation ${slot.consultationId}`
    );
  }
}

for (
  const item
  of transfers.docs
) {

  const transfer =
    item.data();

  if (
    transfer.status ===
      "Approved" &&
    !transfer.acceptedById
  ) {

    issues.push(
      `transfer ${item.id}: Approved but acceptedById is empty`
    );
  }
}

console.log(
  `Audit complete. Issues: ${issues.length}`
);

for (
  const issue
  of issues
) {

  console.log(
    `- ${issue}`
  );
}

process.exitCode =
  issues.length
    ? 2
    : 0;
