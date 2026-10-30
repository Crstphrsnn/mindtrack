import { supabase } from "./supabase";

// This is intentionally NOT a general-purpose delete API. Only a Super Admin
// can delete an unprocessed/cancelled request without schedules, private notes,
// or transfer history. The database validates every condition and writes an audit.
export async function deleteUnprocessedCounselingRequest(consultationId, reason) {
  if (!consultationId) throw new Error("Counseling request ID is missing.");
  const cleanReason = String(reason || "").trim();
  if (cleanReason.length < 10 || cleanReason.length > 500) {
    throw new Error("Provide a cleanup reason between 10 and 500 characters.");
  }

  const { data, error } = await supabase.rpc(
    "mindtrack_admin_delete_unprocessed_counseling_request",
    { p_consultation_id: consultationId, p_reason: cleanReason }
  );
  if (error) {
    // Do not mask authorization or data-integrity errors from Supabase.
    throw new Error(error.message || "Supabase rejected the administrative cleanup.");
  }
  if (data !== true) throw new Error("Supabase did not confirm the cleanup.");

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("mindtrack:counseling-changed"));
    window.dispatchEvent(new Event("mindtrack:notifications-changed"));
  }
  return true;
}
