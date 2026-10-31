export const PROGRAMS_BY_COLLEGE = {
  "College of Arts, Sciences and Letters": [
    "Bachelor of Arts in English Language",
    "Bachelor of Arts in Economics",
    "Bachelor of Science in Biology",
    "Bachelor of Science in Nutrition and Dietetics",
    "Bachelor of Science in Social Work"
  ],

  "College of Business and Public Administration": [
    "Bachelor of Public Administration",
    "Bachelor of Science in Business Administration - Major in Financial Management",
    "Bachelor of Science in Business Administration - Major in Operations Management"
  ],

  "College of Computing Sciences": [
    "Bachelor of Science in Computer Science",
    "Bachelor of Science in Information Technology",
    "Bachelor of Science in Mathematics - Major in Pure Math",
    "Bachelor of Science in Mathematics - Major in Statistics",
    "Bachelor of Science in Mathematics - Major in CIT"
  ],

  "College of Tourism and Hospitality Management": [
    "Bachelor of Science in Hospitality Management",
     "Bachelor of Science in Tourism Management"
  ],

  "College of Education": [
    "Bachelor of Secondary Education",
    "Bachelor of Technical-Vocational Teacher Education - Major in Automotive Technology",
    "Bachelor of Technical-Vocational Teacher Education - Major in Drafting Technology",
    "Bachelor of Technical-Vocational Teacher Education - Major in Electrical Technology",
    "Bachelor of Technical-Vocational Teacher Education - Major in Electronics Technology",
    "Bachelor of Technical-Vocational Teacher Education - Major in Food Service Management",
    "Bachelor of Technical-Vocational Teacher Education - Major in Garments, Fashion and Design",
    "Bachelor of Technology and Livelihood Education"
  ],

  "College of Industrial Technology": [
    "Bachelor of Industrial Technology - Major in Automotive Technology",
    "Bachelor of Industrial Technology - Major in Drafting Technology",
    "Bachelor of Industrial Technology - Major in Electrical Technology",
    "Bachelor of Industrial Technology - Major in Electronics Technology",
    "Bachelor of Industrial Technology - Major in Food Service Management",
    "Bachelor of Industrial Technology - Major in Garments, Fashion and Design",
    "Bachelor of Industrial Technology - Major in Mechanical Technology"
  ]
};


export const COLLEGE_OPTIONS =
  Object.keys(
    PROGRAMS_BY_COLLEGE
  );


export function collegePrograms(college) {

  return (
    PROGRAMS_BY_COLLEGE[
      college
    ] || []
  );
}
