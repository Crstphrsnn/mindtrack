import { supabase } from "./supabase";

// Only the assessment payload is sent. The RPC enforces the
// one-active-assessment rule on the server.
export async function submitAssessment(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Assessment data is missing or invalid.");
  }

  const { data, error } = await supabase.rpc(
    "submit_psychological_assessment",
    { p_payload: payload }
  );

  if (error) {
    console.error("Supabase assessment submission error:", error);
    throw new Error(
      error.message ||
      "Unable to submit the psychological assessment."
    );
  }

  if (!data) {
    throw new Error(
      "Supabase did not return an assessment ID. Please verify the submission before trying again."
    );
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mindtrack:assessments-changed"));
  }

  return data;
}
