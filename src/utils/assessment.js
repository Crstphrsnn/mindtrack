// ======================================================
// STANDARDIZED PSYCHOLOGICAL ASSESSMENTS
// MindTrack
//
// Instruments:
// 1. WHO-5 Well-Being Index
// 2. Patient Health Questionnaire-9 (PHQ-9)
// 3. Generalized Anxiety Disorder-7 (GAD-7)
// 4. Depression Anxiety Stress Scales-21 (DASS-21)
//
// IMPORTANT:
// - Instrument scores are screening results, not diagnoses.
// - "priority" below is a MindTrack operational monitoring
//   priority. It is NOT an official score or category of
//   WHO-5, PHQ-9, GAD-7, or DASS-21.
// ======================================================


export const WHO5_TITLE =
  "World Health Organization-Five Well-Being Index (WHO-5)";

export const PHQ9_TITLE =
  "Patient Health Questionnaire-9 (PHQ-9)";

export const GAD7_TITLE =
  "Generalized Anxiety Disorder-7 (GAD-7)";

export const DASS21_TITLE =
  "Depression Anxiety Stress Scales-21 (DASS-21)";


export const who5Questions = [
  {
    id: "who5_q1",
    text: "I have felt cheerful and in good spirits"
  },
  {
    id: "who5_q2",
    text: "I have felt calm and relaxed"
  },
  {
    id: "who5_q3",
    text: "I have felt active and vigorous"
  },
  {
    id: "who5_q4",
    text: "I woke up feeling fresh and rested"
  },
  {
    id: "who5_q5",
    text: "My daily life has been filled with things that interest me"
  }
];


export const who5Choices = [
  {
    label: "All of the time",
    helper: "Almost always",
    value: 5
  },
  {
    label: "Most of the time",
    helper: "Often",
    value: 4
  },
  {
    label: "More than half of the time",
    helper: "More often than not",
    value: 3
  },
  {
    label: "Less than half of the time",
    helper: "Sometimes, but less often",
    value: 2
  },
  {
    label: "Some of the time",
    helper: "Only sometimes",
    value: 1
  },
  {
    label: "At no time",
    helper: "Never",
    value: 0
  }
];


export const phq9Questions = [
  {
    id: "phq9_q1",
    text: "Little interest or pleasure in doing things"
  },
  {
    id: "phq9_q2",
    text: "Feeling down, depressed, or hopeless"
  },
  {
    id: "phq9_q3",
    text: "Trouble falling or staying asleep, or sleeping too much"
  },
  {
    id: "phq9_q4",
    text: "Feeling tired or having little energy"
  },
  {
    id: "phq9_q5",
    text: "Poor appetite or overeating"
  },
  {
    id: "phq9_q6",
    text: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down"
  },
  {
    id: "phq9_q7",
    text: "Trouble concentrating on things, such as reading the newspaper or watching television"
  },
  {
    id: "phq9_q8",
    text: "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual"
  },
  {
    id: "phq9_q9",
    text: "Thoughts that you would be better off dead or of hurting yourself in some way"
  }
];


export const phq9Choices = [
  {
    label: "Not at all",
    helper: "It did not happen",
    value: 0
  },
  {
    label: "Several days",
    helper: "It happened on a few days",
    value: 1
  },
  {
    label: "More than half the days",
    helper: "It happened on many days",
    value: 2
  },
  {
    label: "Nearly every day",
    helper: "It happened almost every day",
    value: 3
  }
];


export const phq9DifficultyChoices = [
  "Not difficult at all",
  "Somewhat difficult",
  "Very difficult",
  "Extremely difficult"
];


export const gad7Questions = [
  {
    id: "gad7_q1",
    text: "Feeling nervous, anxious or on edge"
  },
  {
    id: "gad7_q2",
    text: "Not being able to stop or control worrying"
  },
  {
    id: "gad7_q3",
    text: "Worrying too much about different things"
  },
  {
    id: "gad7_q4",
    text: "Trouble relaxing"
  },
  {
    id: "gad7_q5",
    text: "Being so restless that it is hard to sit still"
  },
  {
    id: "gad7_q6",
    text: "Becoming easily annoyed or irritable"
  },
  {
    id: "gad7_q7",
    text: "Feeling afraid as if something awful might happen"
  }
];


export const gad7Choices = [
  {
    label: "Not at all",
    helper: "It did not happen",
    value: 0
  },
  {
    label: "Several days",
    helper: "It happened on a few days",
    value: 1
  },
  {
    label: "More than half the days",
    helper: "It happened on many days",
    value: 2
  },
  {
    label: "Nearly every day",
    helper: "It happened almost every day",
    value: 3
  }
];


export const dass21Questions = [
  {
    id: "dass21_q1",
    text: "I found it hard to wind down"
  },
  {
    id: "dass21_q2",
    text: "I was aware of dryness of my mouth"
  },
  {
    id: "dass21_q3",
    text: "I couldn't seem to experience any positive feeling at all"
  },
  {
    id: "dass21_q4",
    text: "I experienced breathing difficulty (eg, excessively rapid breathing, breathlessness in the absence of physical exertion)"
  },
  {
    id: "dass21_q5",
    text: "I found it difficult to work up the initiative to do things"
  },
  {
    id: "dass21_q6",
    text: "I tended to over-react to situations"
  },
  {
    id: "dass21_q7",
    text: "I experienced trembling (eg, in the hands)"
  },
  {
    id: "dass21_q8",
    text: "I felt that I was using a lot of nervous energy"
  },
  {
    id: "dass21_q9",
    text: "I was worried about situations in which I might panic and make a fool of myself"
  },
  {
    id: "dass21_q10",
    text: "I felt that I had nothing to look forward to"
  },
  {
    id: "dass21_q11",
    text: "I found myself getting agitated"
  },
  {
    id: "dass21_q12",
    text: "I found it difficult to relax"
  },
  {
    id: "dass21_q13",
    text: "I felt down-hearted and blue"
  },
  {
    id: "dass21_q14",
    text: "I was intolerant of anything that kept me from getting on with what I was doing"
  },
  {
    id: "dass21_q15",
    text: "I felt I was close to panic"
  },
  {
    id: "dass21_q16",
    text: "I was unable to become enthusiastic about anything"
  },
  {
    id: "dass21_q17",
    text: "I felt I wasn't worth much as a person"
  },
  {
    id: "dass21_q18",
    text: "I felt that I was rather touchy"
  },
  {
    id: "dass21_q19",
    text: "I was aware of the action of my heart in the absence of physical exertion (eg, sense of heart rate increase, heart missing a beat)"
  },
  {
    id: "dass21_q20",
    text: "I felt scared without any good reason"
  },
  {
    id: "dass21_q21",
    text: "I felt that life was meaningless"
  }
];


export const dass21Choices = [
  {
    label: "Did not apply to me at all",
    helper: "This did not happen to me",
    value: 0
  },
  {
    label: "Applied to me to some degree, or some of the time",
    helper: "This happened a little or sometimes",
    value: 1
  },
  {
    label: "Applied to me to a considerable degree, or a good part of time",
    helper: "This happened quite a lot or often",
    value: 2
  },
  {
    label: "Applied to me very much, or most of the time",
    helper: "This happened a lot or most of the time",
    value: 3
  }
];


export const scoredQuestionIds = [
  ...who5Questions.map(
    question => question.id
  ),
  ...phq9Questions.map(
    question => question.id
  ),
  ...gad7Questions.map(
    question => question.id
  ),
  ...dass21Questions.map(
    question => question.id
  )
];


function sumAnswers(
  questions,
  answers
) {

  return questions.reduce(
    (total, question) =>
      total +
      Number(
        answers[
          question.id
        ] ?? 0
      ),
    0
  );
}


function phq9Severity(score) {

  if (score >= 20) {
    return "Severe";
  }

  if (score >= 15) {
    return "Moderately severe";
  }

  if (score >= 10) {
    return "Moderate";
  }

  if (score >= 5) {
    return "Mild";
  }

  return "Minimal";
}


function gad7Severity(score) {

  if (score >= 15) {
    return "Severe";
  }

  if (score >= 10) {
    return "Moderate";
  }

  if (score >= 5) {
    return "Mild";
  }

  return "Minimal";
}


function deriveMonitoringPriority({
  who5Percentage,
  phq9Score,
  gad7Score,
  safetyFlag
}) {

  if (safetyFlag) {
    return "Critical";
  }


  if (
    who5Percentage < 50 ||
    phq9Score >= 10 ||
    gad7Score >= 10
  ) {

    return "High";
  }


  if (
    phq9Score >= 5 ||
    gad7Score >= 5
  ) {

    return "Moderate";
  }


  return "Low";
}


function monitoringRecommendation({
  priority,
  who5BelowCutoff,
  safetyFlag
}) {

  if (priority === "Critical") {

    return (
      "Prompt counselor safety review is recommended because the PHQ-9 self-harm/death item was endorsed. " +
      "This screening result is not a diagnosis."
    );
  }


  if (priority === "High") {

    if (who5BelowCutoff) {

      return (
        "Counselor review and further assessment are recommended. " +
        "The WHO-5 result is below its suggested cut-off and/or another screening score is elevated."
      );
    }


    return (
      "Counselor review and further assessment are recommended based on the screening results."
    );
  }


  if (priority === "Moderate") {

    return (
      "Continue monitoring and consider counseling or follow-up support based on the user's concerns and functioning."
    );
  }


  return (
    "Continue routine wellness monitoring. The screening results should still be interpreted together with the user's context."
  );
}


export function calculateAssessment(
  answers,
  phq9Difficulty = ""
) {

  // WHO-5
  const who5RawScore =
    sumAnswers(
      who5Questions,
      answers
    );


  const who5Percentage =
    who5RawScore * 4;


  const who5BelowCutoff =
    who5RawScore < 13 ||
    who5Percentage < 50;


  // PHQ-9
  const phq9Score =
    sumAnswers(
      phq9Questions,
      answers
    );


  // GAD-7
  const gad7Score =
    sumAnswers(
      gad7Questions,
      answers
    );


  // ======================================================
  // DASS-21 SUBSCALES
  // ======================================================

  const dass21DepressionIds = [
    "dass21_q3",
    "dass21_q5",
    "dass21_q10",
    "dass21_q13",
    "dass21_q16",
    "dass21_q17",
    "dass21_q21"
  ];


  const dass21AnxietyIds = [
    "dass21_q2",
    "dass21_q4",
    "dass21_q7",
    "dass21_q9",
    "dass21_q15",
    "dass21_q19",
    "dass21_q20"
  ];


  const dass21StressIds = [
    "dass21_q1",
    "dass21_q6",
    "dass21_q8",
    "dass21_q11",
    "dass21_q12",
    "dass21_q14",
    "dass21_q18"
  ];


  function sumQuestionIds(
    ids
  ) {

    return ids.reduce(
      (total, id) =>
        total +
        Number(
          answers[id] ??
          0
        ),
      0
    );
  }


  const dass21DepressionRaw =
    sumQuestionIds(
      dass21DepressionIds
    );


  const dass21AnxietyRaw =
    sumQuestionIds(
      dass21AnxietyIds
    );


  const dass21StressRaw =
    sumQuestionIds(
      dass21StressIds
    );


  const dass21DepressionAdjusted =
    dass21DepressionRaw * 2;


  const dass21AnxietyAdjusted =
    dass21AnxietyRaw * 2;


  const dass21StressAdjusted =
    dass21StressRaw * 2;


  const dass21TotalRawScore =
    dass21DepressionRaw +
    dass21AnxietyRaw +
    dass21StressRaw;


  // PHQ-9 item 9 safety signal
  const safetyFlag =
    Number(
      answers.phq9_q9 ??
      0
    ) > 0;


  const priority =
    deriveMonitoringPriority({
      who5Percentage,
      phq9Score,
      gad7Score,
      safetyFlag
    });


  const recommendation =
    monitoringRecommendation({
      priority,
      who5BelowCutoff,
      safetyFlag
    });


  return {

    score:
      who5Percentage,

    priority,

    recommendation,

    safetyFlag,


    instrumentResults: {

      who5: {

        title:
          WHO5_TITLE,

        rawScore:
          who5RawScore,

        maximumRawScore:
          25,

        percentageScore:
          who5Percentage,

        belowCutoff:
          who5BelowCutoff,

        interpretation:
          who5BelowCutoff
            ? "Below the WHO-5 suggested cut-off; further assessment is indicated."
            : "At or above the WHO-5 suggested cut-off."
      },


      phq9: {

        title:
          PHQ9_TITLE,

        totalScore:
          phq9Score,

        maximumScore:
          27,

        severity:
          phq9Severity(
            phq9Score
          ),

        difficulty:
          phq9Difficulty ||
          "Not provided"
      },


      gad7: {

        title:
          GAD7_TITLE,

        totalScore:
          gad7Score,

        maximumScore:
          21,

        severity:
          gad7Severity(
            gad7Score
          )
      },


      dass21: {

        title:
          DASS21_TITLE,


        // Backward compatibility
        totalScore:
          dass21TotalRawScore,

        totalRawScore:
          dass21TotalRawScore,

        maximumTotalRawScore:
          63,


        depression: {

          rawScore:
            dass21DepressionRaw,

          maximumRawScore:
            21,

          adjustedScore:
            dass21DepressionAdjusted,

          maximumAdjustedScore:
            42,

          itemNumbers: [
            3,
            5,
            10,
            13,
            16,
            17,
            21
          ]
        },


        anxiety: {

          rawScore:
            dass21AnxietyRaw,

          maximumRawScore:
            21,

          adjustedScore:
            dass21AnxietyAdjusted,

          maximumAdjustedScore:
            42,

          itemNumbers: [
            2,
            4,
            7,
            9,
            15,
            19,
            20
          ]
        },


        stress: {

          rawScore:
            dass21StressRaw,

          maximumRawScore:
            21,

          adjustedScore:
            dass21StressAdjusted,

          maximumAdjustedScore:
            42,

          itemNumbers: [
            1,
            6,
            8,
            11,
            12,
            14,
            18
          ]
        },


        scoringNote:
          "DASS-21 is scored as three separate 7-item scales: Depression, Anxiety, and Stress. Each raw subscale is 0-21. Adult DASS-21 raw subscale scores are multiplied by 2 for comparison with the corresponding full DASS scale. MindTrack does not assign DASS-21 severity labels."
      }

    }

  };
}