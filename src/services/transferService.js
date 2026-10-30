import { supabase } from "./supabase";

function refreshTransferViews() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("mindtrack:counseling-changed"));
  window.dispatchEvent(new Event("mindtrack:notifications-changed"));
}

async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

// The database enforces one approved transfer per student, even across tabs.
export async function requestCounselorTransfer(studentId, targetCounselorId, reason, consultationId = null) {
  if (!studentId || !targetCounselorId) {
    throw new Error("Choose a student and receiving counselor.");
  }
  const cleanReason = String(reason || "").trim();
  if (cleanReason.length < 3 || cleanReason.length > 1000) {
    throw new Error("Enter a transfer reason of 3 to 1000 characters.");
  }
  const id = await rpc("mindtrack_request_counselor_transfer", {
    p_student_id: studentId,
    p_target_counselor_id: targetCounselorId,
    p_reason: cleanReason,
    p_consultation_id: consultationId || null
  });
  refreshTransferViews();
  return id;
}

export async function approveCounselorTransfer(transferId) {
  if (!transferId) throw new Error("Choose a transfer request.");
  const confirmed = await rpc("mindtrack_approve_counselor_transfer", {
    p_transfer_id: transferId
  });
  if (confirmed !== true) throw new Error("Supabase did not confirm transfer approval.");
  refreshTransferViews();
  return true;
}

export async function cancelCounselorTransfer(transferId, reason) {
  if (!transferId) throw new Error("Choose a transfer request.");
  const cleanReason = String(reason || "").trim();
  if (cleanReason.length < 3 || cleanReason.length > 1000) {
    throw new Error("Enter a cancellation reason of 3 to 1000 characters.");
  }
  const confirmed = await rpc("mindtrack_cancel_counselor_transfer", {
    p_transfer_id: transferId,
    p_reason: cleanReason
  });
  if (confirmed !== true) throw new Error("Supabase did not confirm cancellation.");
  refreshTransferViews();
  return true;
}

export async function listTransferableUsers() {
  const rows = await rpc("mindtrack_list_transferable_users");
  return Array.isArray(rows) ? rows : [];
}
