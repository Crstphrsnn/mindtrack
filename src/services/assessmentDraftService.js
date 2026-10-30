import { supabase } from "./supabase";

// Dedicated progress storage: the legacy assessment_drafts schema was not
// provided, so this uses a new, isolated table without changing old records.
const TABLE = "mindtrack_assessment_progress";

export async function loadAssessmentProgress(studentId) {
  if (!studentId) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select("draft, client_updated_at")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) throw new Error(error.message || "Could not load assessment draft.");
  if (!data) return null;

  return {
    ...data.draft,
    updatedAt: data.client_updated_at,
  };
}

export async function saveAssessmentProgress(studentId, snapshot) {
  if (!studentId) throw new Error("Sign in to save your assessment.");

  const { error } = await supabase.from(TABLE).upsert(
    {
      student_id: studentId,
      draft: {
        version: snapshot.version,
        answers: snapshot.answers,
        phq9Difficulty: snapshot.phq9Difficulty,
        notes: snapshot.notes,
        pageIndex: snapshot.pageIndex,
      },
      client_updated_at: snapshot.updatedAt,
    },
    { onConflict: "student_id" }
  );

  if (error) throw new Error(error.message || "Could not save assessment draft.");
}

export async function deleteAssessmentProgress(studentId) {
  if (!studentId) return;
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("student_id", studentId);

  if (error) throw new Error(error.message || "Could not clear assessment draft.");
}
