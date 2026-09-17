export const questions = [
  { id: "q1", text: "I feel overwhelmed by my responsibilities.", domain: "stress", weight: 1.0 },
  { id: "q2", text: "I feel nervous, anxious, or unable to relax.", domain: "anxiety", weight: 1.2 },
  { id: "q3", text: "I have difficulty sleeping or staying asleep.", domain: "sleep", weight: 0.9 },
  { id: "q4", text: "I feel sad, hopeless, or uninterested in usual activities.", domain: "mood", weight: 1.2 },
  { id: "q5", text: "I have difficulty concentrating on school or work.", domain: "functioning", weight: 0.9 },
  { id: "q6", text: "My concerns affect my attendance, performance, or relationships.", domain: "functioning", weight: 1.1 },
  { id: "q7", text: "I feel that I do not have enough social support.", domain: "support", weight: 0.8 },
  { id: "q8", text: "I have thoughts of hurting myself or feel unsafe.", domain: "safety", weight: 3.0, safety: true }
];

export const choices = [
  { label: "Never", value: 0 },
  { label: "Rarely", value: 1 },
  { label: "Sometimes", value: 2 },
  { label: "Often", value: 3 },
  { label: "Almost always", value: 4 }
];

export function calculateAssessment(answers) {
  const maximum = questions.reduce((sum, q) => sum + (4 * q.weight), 0);
  const raw = questions.reduce((sum, q) => sum + ((answers[q.id] || 0) * q.weight), 0);
  const score = Math.round((raw / maximum) * 100);
  const safetyFlag = (answers.q8 || 0) >= 2;

  let priority = "Low";
  let recommendation = "Continue regular wellness monitoring and use healthy coping strategies.";
  let followUpDays = 30;

  if (score >= 75 || safetyFlag) {
    priority = "Critical";
    recommendation = "Immediate counselor review is required. Prioritize a same-day safety check and appropriate referral.";
    followUpDays = 0;
  } else if (score >= 50) {
    priority = "High";
    recommendation = "Schedule individual counseling within 24–48 hours and create a follow-up plan.";
    followUpDays = 7;
  } else if (score >= 25) {
    priority = "Moderate";
    recommendation = "Offer counseling within one week and provide practical coping and support resources.";
    followUpDays = 7;
  }

  return { score, priority, recommendation, followUpDays, safetyFlag };
}
