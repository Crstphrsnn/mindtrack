import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { collegePrograms } from "../src/config/programs.js";

const cte = "College of Education";
const specializations = [
  "Bachelor of Technical-Vocational Teacher Education - Specialization in Automotive Technology",
  "Bachelor of Technical-Vocational Teacher Education - Specialization in Drafting Technology",
  "Bachelor of Technical-Vocational Teacher Education - Specialization in Electrical Technology",
  "Bachelor of Technical-Vocational Teacher Education - Specialization in Electronics Technology",
  "Bachelor of Technical-Vocational Teacher Education - Specialization in Food Service Management",
  "Bachelor of Technical-Vocational Teacher Education - Specialization in Garments, Fashion and Design",
];

test("CTE offers all six BTVTEd specializations", () => {
  const choices = collegePrograms(cte);
  for (const program of specializations) {
    assert.ok(choices.includes(program), `Missing CTE program: ${program}`);
  }
  assert.equal(new Set(choices).size, choices.length, "Duplicate program options");
});

test("Existing CTE programs are preserved for older records", () => {
  const choices = collegePrograms(cte);
  for (const program of [
    "Bachelor of Secondary Education",
    "Bachelor of Technical-Vocational Teacher Education",
    "Bachelor of Technology and Livelihood Education"
  ]) {
    assert.ok(choices.includes(program), `Missing existing CTE program: ${program}`);
  }
});

test("CTE specializations do not appear under other colleges", () => {
  for (const college of [
    "College of Computing Sciences",
    "College of Industrial Technology",
    "College of Arts, Sciences and Letters"
  ]) {
    for (const program of specializations) {
      assert.ok(!collegePrograms(college).includes(program), `${program} appeared in ${college}`);
    }
  }
});

test("CTE alias remains mapped to College of Education", () => {
  const roster = readFileSync(new URL("../src/config/collegeRoster.js", import.meta.url), "utf8");
  assert.match(roster, /"College of Teacher Education": "College of Education"/);
});
