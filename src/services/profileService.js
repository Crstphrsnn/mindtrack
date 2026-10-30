import { supabase } from "./supabase";

// Phase 4B: read-only, scoped Supabase access. No Firebase fallback.
// Database RPCs enforce authorization; client filters are presentation only.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

export async function listMindTrackAccounts() {
  const rows = await rpc("mindtrack_list_user_profiles");
  if (!Array.isArray(rows)) throw new Error("Unexpected account list response from Supabase.");
  return rows.filter(row => row && UUID.test(String(row.id || "")));
}

function legacyObject(row) {
  return row?.legacy_data && typeof row.legacy_data === "object" && !Array.isArray(row.legacy_data)
    ? row.legacy_data : {};
}

function timeLabel(time) {
  if (!time) return "";
  const match = String(time).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return String(time);
  const hour = Number(match[1]);
  if (hour > 23) return String(time);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
}

function mapAssessment(row) {
  const old = legacyObject(row);
  return {
    ...old,
    id: row.id,
    ownerId: row.owner_id || row.student_id || "",
    createdAt: row.created_at || old.createdAt || null,
    updatedAt: row.updated_at || old.updatedAt || null,
    status: row.status || old.status || "For review",
    priority: row.priority || old.priority || "",
    score: row.score ?? old.score ?? null,
    counselorRemarks: row.counselor_remarks ?? old.counselorRemarks ?? "",
    instrumentResults: {
      who5: { percentageScore: row.who5_percentage ?? null },
      phq9: { totalScore: row.phq9_score ?? null },
      gad7: { totalScore: row.gad7_score ?? null },
      dass21: {
        depression: { adjustedScore: row.depression_score ?? null },
        anxiety: { adjustedScore: row.anxiety_score ?? null },
        stress: { adjustedScore: row.stress_score ?? null }
      },
      ...(old.instrumentResults || {}),
      ...(row.instrument_results || {})
    },
    answers: row.answers && typeof row.answers === "object" ? row.answers : (old.answers || {})
  };
}

function mapConsultation(row) {
  const old = legacyObject(row);
  return {
    ...old,
    id: row.id,
    ownerId: row.student_id || old.ownerId || "",
    assignedCounselorId: row.counselor_id || old.assignedCounselorId || "",
    assignedCounselorName: old.assignedCounselorName || "",
    category: row.category ?? old.category ?? "",
    concern: row.category ?? old.concern ?? "",
    message: row.message ?? old.message ?? "",
    mode: row.mode ?? old.mode ?? "",
    status: row.status || old.status || "Pending approval",
    sessionNumber: row.session_number ?? old.sessionNumber ?? null,
    date: row.scheduled_date || old.date || "",
    time: row.scheduled_time ? timeLabel(row.scheduled_time) : (old.time || ""),
    counselorRemarks: row.counselor_remarks ?? old.counselorRemarks ?? "",
    createdAt: row.created_at || old.createdAt || null,
    updatedAt: row.updated_at || old.updatedAt || null
  };
}

function mapSessionNote(row) {
  const old = legacyObject(row);
  return {
    ...old,
    id: row.id,
    consultationId: row.consultation_id || old.consultationId || "",
    caseHistory: row.case_history ?? old.caseHistory ?? "",
    counselingSessionSummary: row.counseling_session_summary ?? old.counselingSessionSummary ?? "",
    counselorObservation: row.counselor_observation ?? old.counselorObservation ?? "",
    recommendedActions: row.recommendations ?? old.recommendedActions ?? "",
    recommendations: row.recommendations ?? old.recommendations ?? "",
    createdAt: row.created_at || old.createdAt || null,
    updatedAt: row.updated_at || old.updatedAt || null,
    updatedByName: old.updatedByName || ""
  };
}

function mapPrivateProfile(row) {
  if (!row) return null;
  const old = legacyObject(row);
  return {
    ...old,
    phoneNumber: row.phone_number ?? old.phoneNumber ?? "",
    address: row.address ?? old.address ?? "",
    facebookAccount: row.facebook_account ?? old.facebookAccount ?? "",
    contactPersonName: row.contact_person_name ?? old.contactPersonName ?? "",
    contactPersonPhone: row.contact_person_phone ?? old.contactPersonPhone ?? ""
  };
}

export async function getMindTrackProfileBundle(profile) {
  const id = String(profile?.id || "");
  if (!UUID.test(id)) throw new Error("Invalid user profile ID.");
  const bundle = await rpc("mindtrack_get_user_profile_bundle", { p_user_id: id });
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) {
    throw new Error("Unexpected user profile response from Supabase.");
  }
  const transferRequests = Array.isArray(bundle.transferRequests) ? bundle.transferRequests : [];
  const approved = transferRequests.filter(row =>
    ["approved", "accepted", "completed"].includes(String(row.status || "").trim().toLowerCase())
  );
  const pending = transferRequests.some(row =>
    ["pending", "pending approval", "requested"].includes(String(row.status || "").trim().toLowerCase())
  );
  const cp = bundle.counselingProfile || {};
  const cpLegacy = legacyObject(cp);
  const previousCounselorIds = [...new Set([
    ...(Array.isArray(cpLegacy.previousCounselorIds) ? cpLegacy.previousCounselorIds : []),
    ...approved.map(row => row.requested_by).filter(Boolean)
  ])];
  return {
    assessments: (Array.isArray(bundle.assessments) ? bundle.assessments : []).map(mapAssessment),
    consultations: (Array.isArray(bundle.consultations) ? bundle.consultations : []).map(mapConsultation),
    sessionNotes: (Array.isArray(bundle.sessionNotes) ? bundle.sessionNotes : []).map(mapSessionNote),
    privateProfile: mapPrivateProfile(bundle.privateProfile),
    counselingProfile: {
      ...cpLegacy,
      assignedCounselorId: profile.assignedCounselorId || "",
      assignedCounselorName: profile.assignedCounselorName || "",
      assignedCounselorDepartment: profile.assignedCounselorDepartment || "",
      transferActive: cp.transfer_active === true || profile.transferActive === true || approved.length > 0,
      previousCounselorIds,
      profileTransferStatus: pending ? "Pending approval" : "",
      transferRequestId: pending ? transferRequests.find(row =>
        ["pending", "pending approval", "requested"].includes(String(row.status || "").trim().toLowerCase())
      )?.id || "" : ""
    }
  };
}
