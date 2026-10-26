import assert from "node:assert/strict";

import {
  ASSESSMENT_SCORING_VERSION,
  MONITORING_PRIORITY_VERSION,
  calculateAssessment
} from "../src/utils/assessment.js";


function blankAnswers() {
  const answers = {};

  [
    ...Array.from({ length: 5 }, (_, i) => `who5_q${i + 1}`),
    ...Array.from({ length: 9 }, (_, i) => `phq9_q${i + 1}`),
    ...Array.from({ length: 7 }, (_, i) => `gad7_q${i + 1}`),
    ...Array.from({ length: 21 }, (_, i) => `dass21_q${i + 1}`)
  ].forEach(id => {
    answers[id] = 0;
  });

  return answers;
}


// PHQ-9 and GAD-7 use the same additive formula pattern:
// sum each 0-3 response. The item counts and severity cut-offs differ.
{
  const a = blankAnswers();

  [3, 2, 1, 3, 0, 2, 1].forEach((value, index) => {
    a[`phq9_q${index + 1}`] = value;
    a[`gad7_q${index + 1}`] = value;
  });

  const r = calculateAssessment(a);

  assert.equal(r.instrumentResults.phq9.totalScore, 12);
  assert.equal(r.instrumentResults.gad7.totalScore, 12);
  assert.equal(r.instrumentResults.phq9.formula, "Q1+Q2+Q3+Q4+Q5+Q6+Q7+Q8+Q9");
  assert.equal(r.instrumentResults.gad7.formula, "Q1+Q2+Q3+Q4+Q5+Q6+Q7");
  assert.equal(r.instrumentResults.phq9.maximumScore, 27);
  assert.equal(r.instrumentResults.gad7.maximumScore, 21);
}


// PHQ-9 boundaries from the supplied standard.
for (const [score, expected] of [
  [0, "Minimal / none"],
  [4, "Minimal / none"],
  [5, "Mild"],
  [9, "Mild"],
  [10, "Moderate"],
  [14, "Moderate"],
  [15, "Moderately severe"],
  [19, "Moderately severe"],
  [20, "Severe"],
  [27, "Severe"]
]) {
  const a = blankAnswers();
  let remaining = score;
  for (let i = 1; i <= 9; i += 1) {
    const v = Math.min(3, remaining);
    a[`phq9_q${i}`] = v;
    remaining -= v;
  }
  const r = calculateAssessment(a);
  assert.equal(r.instrumentResults.phq9.totalScore, score);
  assert.equal(r.instrumentResults.phq9.severity, expected);
}


// GAD-7 boundaries from the supplied standard.
for (const [score, expected] of [
  [0, "Minimal"],
  [4, "Minimal"],
  [5, "Mild"],
  [9, "Mild"],
  [10, "Moderate"],
  [14, "Moderate"],
  [15, "Severe"],
  [21, "Severe"]
]) {
  const a = blankAnswers();
  let remaining = score;
  for (let i = 1; i <= 7; i += 1) {
    const v = Math.min(3, remaining);
    a[`gad7_q${i}`] = v;
    remaining -= v;
  }
  const r = calculateAssessment(a);
  assert.equal(r.instrumentResults.gad7.totalScore, score);
  assert.equal(r.instrumentResults.gad7.severity, expected);
}


// WHO-5 cut-off: raw 12 -> 48 below; raw 13 -> 52 at/above.
{
  const a = blankAnswers();
  [3, 3, 2, 2, 2].forEach((v, i) => { a[`who5_q${i + 1}`] = v; });
  const r = calculateAssessment(a);
  assert.equal(r.instrumentResults.who5.rawScore, 12);
  assert.equal(r.instrumentResults.who5.percentageScore, 48);
  assert.equal(r.instrumentResults.who5.belowCutoff, true);
}
{
  const a = blankAnswers();
  [3, 3, 3, 2, 2].forEach((v, i) => { a[`who5_q${i + 1}`] = v; });
  const r = calculateAssessment(a);
  assert.equal(r.instrumentResults.who5.rawScore, 13);
  assert.equal(r.instrumentResults.who5.percentageScore, 52);
  assert.equal(r.instrumentResults.who5.belowCutoff, false);
}


// DASS-21 uses the multiplied 0-42 subscale scores.
{
  const a = blankAnswers();
  // Depression raw 7 -> adjusted 14 -> Moderate.
  const ids = [3, 5, 10, 13, 16, 17, 21];
  ids.forEach((n, i) => { a[`dass21_q${n}`] = i === 0 ? 1 : 1; });
  const r = calculateAssessment(a);
  assert.equal(r.instrumentResults.dass21.depression.rawScore, 7);
  assert.equal(r.instrumentResults.dass21.depression.adjustedScore, 14);
  assert.equal(r.instrumentResults.dass21.depression.severity, "Moderate");
}
{
  const a = blankAnswers();
  // Anxiety raw 10 -> adjusted 20 -> Extremely Severe.
  const values = [2, 2, 2, 1, 1, 1, 1];
  [2, 4, 7, 9, 15, 19, 20].forEach((n, i) => { a[`dass21_q${n}`] = values[i]; });
  const r = calculateAssessment(a);
  assert.equal(r.instrumentResults.dass21.anxiety.rawScore, 10);
  assert.equal(r.instrumentResults.dass21.anxiety.adjustedScore, 20);
  assert.equal(r.instrumentResults.dass21.anxiety.severity, "Extremely Severe");
}


// Overall MindTrack monitoring severity uses the highest standardized
// severity among PHQ-9, GAD-7, and the DASS-21 subscales.
{
  const a = blankAnswers();
  a.phq9_q1 = 3;
  a.phq9_q2 = 2; // PHQ-9 Mild (5)
  a.gad7_q1 = 3;
  a.gad7_q2 = 3;
  a.gad7_q3 = 3;
  a.gad7_q4 = 1; // GAD-7 Moderate (10)
  const r = calculateAssessment(a);
  assert.equal(r.instrumentResults.phq9.severity, "Mild");
  assert.equal(r.instrumentResults.gad7.severity, "Moderate");
  assert.equal(r.priority, "Moderate");
}


// PHQ-9 item 9 stays a separate safety flag; it does not invent a
// non-standard severity category.
{
  const a = blankAnswers();
  a.phq9_q9 = 1;
  const r = calculateAssessment(a);
  assert.equal(r.instrumentResults.phq9.totalScore, 1);
  assert.equal(r.instrumentResults.phq9.severity, "Minimal / none");
  assert.equal(r.safetyFlag, true);
  assert.equal(r.priority, "Minimal / none");
}


console.log("Assessment scoring verification passed.");
console.log("Scoring version:", ASSESSMENT_SCORING_VERSION);
console.log("Monitoring severity version:", MONITORING_PRIORITY_VERSION);
