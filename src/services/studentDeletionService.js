import { supabase } from "./supabase";

/** Only the database can authorize this operation; client checks are UI-only. */
export async function deleteTestStudentAccount(studentId, reason, confirmation) {
  if (!/^[0-9a-f-]{36}$/i.test(String(studentId || ""))) {
    throw new Error("Invalid student account ID.");
  }
  if (confirmation !== "DELETE ACCOUNT") {
    throw new Error("Type DELETE ACCOUNT to confirm.");
  }
  const cleanReason = String(reason || "").trim();
  if (cleanReason.length < 10 || cleanReason.length > 500) {
    throw new Error("Provide a reason between 10 and 500 characters.");
  }
  const { data, error } = await supabase.rpc("mindtrack_admin_delete_test_student", {
    p_student_id: studentId,
    p_confirmation: confirmation,
    p_reason: cleanReason
  });
  if (error) throw new Error(error.message || "Account deletion failed.");
  if (data !== true) throw new Error("Database did not confirm deletion.");
  window.dispatchEvent(new Event("mindtrack:profiles-changed"));
  window.dispatchEvent(new Event("mindtrack:counseling-changed"));
  return true;
}
