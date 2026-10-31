import { supabase } from "./supabase";
import { normalizeVacantSlots } from "../utils/studentAvailability.mjs";

// RPCs authorize students to edit only their own slots, and the currently
// assigned counselor (or Super Admin) to read the student's slots.
export async function getStudentVacantSlots(studentId) {
  if (!studentId) return [];
  const { data, error } = await supabase.rpc("mindtrack_list_student_vacant_slots", {
    p_student_id: studentId
  });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error("Unexpected student availability response.");
  return normalizeVacantSlots(data);
}

export async function saveMyStudentVacantSlots(slots) {
  const normalized = normalizeVacantSlots(slots);
  const { error } = await supabase.rpc("mindtrack_set_my_vacant_slots", {
    p_slots: normalized
  });
  if (error) throw error;
  return normalized;
}
