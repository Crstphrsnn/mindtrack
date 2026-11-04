import { supabase } from "./supabase";

function refreshReferralViews() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("mindtrack:referrals-changed"));
    window.dispatchEvent(new Event("mindtrack:notifications-changed"));
  }
}

async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

export async function listReferrals() {
  const rows = await rpc("mindtrack_list_referrals");
  return Array.isArray(rows) ? rows : [];
}

export async function submitReferral(form, user) {
  let id;
  try {
    id = await rpc("mindtrack_submit_referral_slip", {
    p_person_name: String(form?.personName || "").trim(),
    p_person_type: String(form?.personType || ""),
    p_department: String(form?.department || "").trim(),
    p_program: form?.personType === "Student"
      ? String(form?.program || "").trim()
      : "",
    p_contact: String(form?.contact || ""),
    p_reason: String(form?.reason || "").trim(),
    p_urgency: String(form?.urgency || ""),
    p_slip: {
      yearLevel: form?.personType === "Student" ? String(form?.yearLevel || "").trim() : "",
      age: form?.age ? Number(form.age) : null,
      address: String(form?.address || "").trim(),
      parentGuardian: form?.personType === "Student" ? String(form?.parentGuardian || "").trim() : "",
      natureOfProblem: String(form?.reason || "").trim(),
      recommendation: String(form?.recommendation || "").trim(),
      signatureName: String(form?.signatureName || "").trim(),
      position: String(form?.position || "").trim(),
      referrerRole: String(user?.role || "")
    }
    });
  } catch (error) {
    if (error?.code === "PGRST202" || /mindtrack_submit_referral_slip.*not found|schema cache/i.test(error?.message || "")) {
      throw new Error("Referral Slip database migration is not installed. Ask the Super Admin to run 01_REFERRAL_SLIP_DETAILS.sql before submitting.");
    }
    throw error;
  }
  if (!id) throw new Error("Supabase did not confirm the referral submission.");
  refreshReferralViews();
  return id;
}

export async function getReferralSlip(referralId) {
  if (!referralId) throw new Error("Select a referral before opening the slip.");
  return rpc("mindtrack_get_referral_slip", { p_referral_id: referralId });
}

export async function updateReferral(id, status, remarks) {
  if (!id) throw new Error("Select a referral before saving.");
  const confirmed = await rpc("mindtrack_update_referral", {
    p_referral_id: id,
    p_status: String(status || ""),
    p_remarks: String(remarks || "")
  });
  if (confirmed !== true) throw new Error("Supabase did not confirm the referral update.");
  refreshReferralViews();
  return true;
}

const noteKeys = [
  "caseHistory", "counselingSessionSummary", "counselorObservation", "recommendations"
];

export async function getReferralNotes(referralId) {
  if (!referralId) throw new Error("Select a referral before opening private notes.");
  const result = await rpc("mindtrack_get_referral_notes", { p_referral_id: referralId });
  return Object.fromEntries(noteKeys.map(key => [key, String(result?.[key] ?? "")]));
}

export async function saveReferralNotes(referralId, notes) {
  if (!referralId) throw new Error("Select a referral before saving private notes.");
  const expected = Object.fromEntries(noteKeys.map(key => [key, String(notes?.[key] ?? "")]));
  const confirmed = await rpc("mindtrack_save_referral_notes", {
    p_referral_id: referralId,
    p_notes: expected
  });
  if (confirmed !== true) throw new Error("Supabase did not confirm the private notes save.");

  // Read back the saved values so the UI does not show a false success message.
  let actual;
  try {
    actual = await getReferralNotes(referralId);
  } catch (error) {
    throw new Error(`Notes may have saved, but verification failed: ${error?.message || "Unable to reload notes."}`);
  }
  if (noteKeys.some(key => actual[key] !== expected[key])) {
    throw new Error("Supabase acknowledged the save, but the private notes could not be verified. Reopen the referral before retrying.");
  }
  refreshReferralViews();
  return true;
}
