import { supabase } from "./supabase";

function changed() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("mindtrack:counseling-changed"));
  }
}

async function callRpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

export async function submitCounselingRequest(form) {
  const data = await callRpc("mindtrack_submit_counseling_request", {
    p_mode: String(form.mode || ""),
    p_date: form.date || null,
    p_time: String(form.time || ""),
    p_category: String(form.category || ""),
    p_message: String(form.message || "")
  });
  changed();
  return data;
}

export async function editCounselingRequest(id, form) {
  const data = await callRpc("mindtrack_edit_counseling_request", {
    p_consultation_id: id,
    p_mode: String(form.mode || ""),
    p_date: form.date || null,
    p_time: String(form.time || ""),
    p_category: String(form.category || ""),
    p_message: String(form.message || "")
  });
  changed();
  return data === true;
}

export async function updateCounselingRequest(id, status, remarks = "", schedule = {}) {
  const data = await callRpc("mindtrack_update_counseling_request", {
    p_consultation_id: id,
    p_status: String(status || ""),
    p_remarks: String(remarks || ""),
    p_date: schedule.date || null,
    p_time: schedule.time || null
  });
  changed();
  return Number(data || 0);
}

export async function getCounselingNotes(id) {
  return await callRpc("mindtrack_get_counseling_notes", {
    p_consultation_id: id
  });
}

export async function saveCounselingNotes(id, notes) {
  const data = await callRpc("mindtrack_save_counseling_notes", {
    p_consultation_id: id,
    p_case_history: String(notes.caseHistory || ""),
    p_session_summary: String(notes.counselingSessionSummary || ""),
    p_observation: String(notes.counselorObservation || ""),
    p_recommendations: String(notes.recommendedActions || "")
  });
  if (data !== true) throw new Error("Private counseling notes were not saved.");
  changed();
  return true;
}
