// MindTrack - official six-college counselor roster (2026)
// This file is a compatibility layer: it preserves the existing programs in
// src/config/programs.js without guessing or replacing any program names.
// It supports both the old and the renamed college keys during migration.
import { collegePrograms as existingCollegePrograms } from "./programs";

export const COLLEGE_COUNSELOR_ROSTER = Object.freeze([
  { college: "College of Teacher Education", counselor: "Ms. April Santos" },
  { college: "College of Hospitality and Tourism Management", counselor: "Ms. Christine Agpoon" },
  { college: "College of Business and Public Administration", counselor: "Ms. Trisha Decena" },
  { college: "College of Industrial Technology", counselor: "Ms. Victoria Ferrer" },
  { college: "College of Computing Sciences", counselor: "Ms. Joanna Mangapot" },
  { college: "College of Arts, Sciences and Letters", counselor: "Ms. Sarah Rico" }
]);

export const COLLEGE_OPTIONS = Object.freeze(
  COLLEGE_COUNSELOR_ROSTER.map(({ college }) => college)
);

const PREVIOUS_COLLEGE_NAMES = Object.freeze({
  "College of Teacher Education": "College of Education",
  "College of Hospitality and Tourism Management":
    "College of Tourism and Hospitality Management"
});

export function collegePrograms(college) {
  const officialName = String(college || "").trim();
  if (!COLLEGE_OPTIONS.includes(officialName)) return [];

  // Prefer the new name if src/config/programs.js has already been updated.
  const currentPrograms = existingCollegePrograms(officialName);
  if (Array.isArray(currentPrograms) && currentPrograms.length > 0) {
    return currentPrograms;
  }

  // Otherwise use the existing program list under the previous college name.
  // This does not change any program names or move them between colleges.
  const previousName = PREVIOUS_COLLEGE_NAMES[officialName];
  if (previousName) {
    const previousPrograms = existingCollegePrograms(previousName);
    if (Array.isArray(previousPrograms)) return previousPrograms;
  }

  return Array.isArray(currentPrograms) ? currentPrograms : [];
}
