import assert from "node:assert/strict";

import {
  calculateAssessment
} from "../src/utils/assessment.js";


function emptyAnswers() {
  const answers = {};

  [
    "who5_q1","who5_q2","who5_q3","who5_q4","who5_q5",
    "phq9_q1","phq9_q2","phq9_q3","phq9_q4","phq9_q5","phq9_q6","phq9_q7","phq9_q8","phq9_q9",
    "gad7_q1","gad7_q2","gad7_q3","gad7_q4","gad7_q5","gad7_q6","gad7_q7",
    ...Array.from({ length: 21 }, (_, i) => `dass21_q${i + 1}`)
  ].forEach(id => {
    answers[id] = 0;
  });

  return answers;
}


// Lowest ranges => overall label uses the PHQ-9 source wording.
{
  const a = emptyAnswers();
  a.who5_q1 = 5;
  a.who5_q2 = 5;
  a.who5_q3 = 5;
  a.who5_q4 = 5;
  a.who5_q5 = 5;

  const r = calculateAssessment(a);
  assert.equal(r.priority, "Minimal / none");
  assert.equal(r.instrumentResults.phq9.severity, "Minimal / none");
  assert.equal(r.instrumentResults.gad7.severity, "Minimal");
  assert.equal(r.instrumentResults.dass21.depression.severity, "Normal");
}


// PHQ-9 score 5 => Mild.
{
  const a = emptyAnswers();
  a.phq9_q1 = 3;
  a.phq9_q2 = 2;
  const r = calculateAssessment(a);
  assert.equal(r.instrumentResults.phq9.totalScore, 5);
  assert.equal(r.instrumentResults.phq9.severity, "Mild");
  assert.equal(r.priority, "Mild");
}


// PHQ-9 score 10 => Moderate.
{
  const a = emptyAnswers();
  a.phq9_q1 = 3;
  a.phq9_q2 = 3;
  a.phq9_q3 = 3;
  a.phq9_q4 = 1;
  const r = calculateAssessment(a);
  assert.equal(r.instrumentResults.phq9.totalScore, 10);
  assert.equal(r.priority, "Moderate");
}


// PHQ-9 score 15 => Moderately severe.
{
  const a = emptyAnswers();
  for (let i = 1; i <= 5; i += 1) {
    a[`phq9_q${i}`] = 3;
  }
  const r = calculateAssessment(a);
  assert.equal(r.instrumentResults.phq9.totalScore, 15);
  assert.equal(r.priority, "Moderately severe");
}


// PHQ-9 score 20 => Severe.
{
  const a = emptyAnswers();
  for (let i = 1; i <= 6; i += 1) {
    a[`phq9_q${i}`] = 3;
  }
  a.phq9_q7 = 2;
  const r = calculateAssessment(a);
  assert.equal(r.instrumentResults.phq9.totalScore, 20);
  assert.equal(r.priority, "Severe");
}


// DASS Depression raw 14 => adjusted 28 => Extremely Severe.
{
  const a = emptyAnswers();
  ["dass21_q3","dass21_q5","dass21_q10","dass21_q13","dass21_q16","dass21_q17","dass21_q21"]
    .forEach((id, index) => {
      a[id] = index < 4 ? 2 : 2;
    });
  // raw 14 exactly
  const r = calculateAssessment(a);
  assert.equal(r.instrumentResults.dass21.depression.rawScore, 14);
  assert.equal(r.instrumentResults.dass21.depression.adjustedScore, 28);
  assert.equal(r.instrumentResults.dass21.depression.severity, "Extremely Severe");
  assert.equal(r.priority, "Extremely Severe");
}


// WHO-5 below cutoff remains a cut-off interpretation, not a severity label.
{
  const a = emptyAnswers();
  a.who5_q1 = 2;
  a.who5_q2 = 2;
  a.who5_q3 = 2;
  a.who5_q4 = 3;
  a.who5_q5 = 3; // raw 12 => 48
  const r = calculateAssessment(a);
  assert.equal(r.instrumentResults.who5.rawScore, 12);
  assert.equal(r.instrumentResults.who5.percentageScore, 48);
  assert.equal(r.instrumentResults.who5.belowCutoff, true);
  assert.equal(r.priority, "Minimal / none");
}


// PHQ item 9 stays a separate safety flag and does not create a non-standard severity.
{
  const a = emptyAnswers();
  a.phq9_q9 = 1;
  const r = calculateAssessment(a);
  assert.equal(r.instrumentResults.phq9.totalScore, 1);
  assert.equal(r.instrumentResults.phq9.severity, "Minimal / none");
  assert.equal(r.priority, "Minimal / none");
  assert.equal(r.safetyFlag, true);
}


console.log("Assessment severity verification passed.");
