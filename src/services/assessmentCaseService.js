

import { supabase } from "./supabase";

function announceAssessmentChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("mindtrack:assessments-changed")
    );
  }
}

export async function updateAssessmentCase({
  assessmentId,
  status,
  remarks = ""
}) {
  if (!assessmentId) {
    throw new Error("Assessment ID is missing.");
  }

  const cleanStatus = String(status || "").trim();

  if (!cleanStatus) {
    throw new Error("Assessment status is required.");
  }

  const { data, error } = await supabase.rpc(
    "update_assessment_case",
    {
      p_assessment_id: assessmentId,
      p_status: cleanStatus,
      p_remarks: String(remarks || "")
    }
  );

  if (error) {
    console.error(
      "Supabase assessment case update error:",
      error
    );

    throw new Error(
      error.message ||
      "Unable to update the psychological assessment case."
    );
  }

  announceAssessmentChange();

  return data;
}

export async function deleteAssessmentCase(assessmentId) {
  if (!assessmentId) {
    throw new Error("Assessment ID is missing.");
  }

  const { data, error } = await supabase.rpc(
    "delete_assessment_case",
    {
      p_assessment_id: assessmentId
    }
  );

  if (error) {
    console.error(
      "Supabase assessment cleanup error:",
      error
    );

    throw new Error(
      error.message ||
      "Unable to delete the assessment safely."
    );
  }

  announceAssessmentChange();

  return data === true;
}
