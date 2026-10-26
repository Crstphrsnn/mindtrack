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
// - The stored "priority" field now contains the highest
//   standardized SEVERITY LABEL found across PHQ-9, GAD-7,
//   and the three DASS-21 subscales.
// - WHO-5 is NOT converted into a severity category because
//   the provided scoring standard uses only its cut-off.
// - PHQ-9 item 9 remains a separate safetyFlag and does not
//   change the standardized severity label.
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


export const ASSESSMENT_SCORING_VERSION =
  "MINDTRACK-STANDARD-SCORING-2026-10-R2";

export const MONITORING_PRIORITY_VERSION =
  "MINDTRACK-STANDARD-SEVERITY-2026-10";


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

  return "Minimal / none";
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


function dass21DepressionSeverity(score) {

  if (score >= 28) {
    return "Extremely Severe";
  }

  if (score >= 21) {
    return "Severe";
  }

  if (score >= 14) {
    return "Moderate";
  }

  if (score >= 10) {
    return "Mild";
  }

  return "Normal";
}


function dass21AnxietySeverity(score) {

  if (score >= 20) {
    return "Extremely Severe";
  }

  if (score >= 15) {
    return "Severe";
  }

  if (score >= 10) {
    return "Moderate";
  }

  if (score >= 8) {
    return "Mild";
  }

  return "Normal";
}


function dass21StressSeverity(score) {

  if (score >= 34) {
    return "Extremely Severe";
  }

  if (score >= 26) {
    return "Severe";
  }

  if (score >= 19) {
    return "Moderate";
  }

  if (score >= 15) {
    return "Mild";
  }

  return "Normal";
}


function severityRank(value) {

  const severity =
    String(value || "")
      .trim()
      .toLowerCase();


  const ranks = {
    "normal": 0,
    "minimal": 0,
    "minimal / none": 0,
    "mild": 1,
    "moderate": 2,
    "moderately severe": 3,
    "severe": 4,
    "extremely severe": 5
  };


  return ranks[severity] ?? -1;
}


function deriveMonitoringPriority({
  phq9SeverityLabel,
  gad7SeverityLabel,
  dass21DepressionSeverityLabel,
  dass21AnxietySeverityLabel,
  dass21StressSeverityLabel
}) {

  const candidates = [
    {
      source: "PHQ-9",
      severity: phq9SeverityLabel
    },
    {
      source: "GAD-7",
      severity: gad7SeverityLabel
    },
    {
      source: "DASS-21 Depression",
      severity: dass21DepressionSeverityLabel
    },
    {
      source: "DASS-21 Anxiety",
      severity: dass21AnxietySeverityLabel
    },
    {
      source: "DASS-21 Stress",
      severity: dass21StressSeverityLabel
    }
  ];


  const ranked =
    candidates.map(
      item => ({
        ...item,
        rank:
          severityRank(
            item.severity
          )
      })
    );


  const highestRank =
    Math.max(
      ...ranked.map(
        item => item.rank
      )
    );


  // When every instrument is in its lowest range, use the
  // PHQ-9 wording from the provided standard as the overall
  // display label instead of inventing a new category.
  if (highestRank <= 0) {

    return {
      priority:
        "Minimal / none",
      source:
        "PHQ-9 / GAD-7 / DASS-21",
      reasons:
        [
          "PHQ-9 is Minimal / none, GAD-7 is Minimal, and all DASS-21 subscales are Normal."
        ]
    };
  }


  const highest =
    ranked.filter(
      item =>
        item.rank ===
        highestRank
    );


  const selectedLabel =
    highestRank === 5
      ? "Extremely Severe"
      : highestRank === 4
        ? "Severe"
        : highestRank === 3
          ? "Moderately severe"
          : highestRank === 2
            ? "Moderate"
            : "Mild";


  return {
    priority:
      selectedLabel,

    source:
      highest
        .map(
          item => item.source
        )
        .join(", "),

    reasons:
      highest.map(
        item =>
          `${item.source} is ${item.severity}.`
      )
  };
}


function monitoringRecommendation({
  priority,
  who5BelowCutoff,
  safetyFlag
}) {

  const notes = [];


  if (
    priority ===
    "Extremely Severe"
  ) {
    notes.push(
      "At least one DASS-21 subscale is in the Extremely Severe range."
    );
  } else if (
    priority ===
    "Severe"
  ) {
    notes.push(
      "At least one screening result is in the Severe range; professional assessment is appropriate."
    );
  } else if (
    priority ===
    "Moderately severe"
  ) {
    notes.push(
      "PHQ-9 is in the Moderately severe range; prompt professional assessment is appropriate."
    );
  } else if (
    priority ===
    "Moderate"
  ) {
    notes.push(
      "At least one screening result is in the Moderate range; further assessment should be considered."
    );
  } else if (
    priority ===
    "Mild"
  ) {
    notes.push(
      "At least one screening result is in the Mild range; monitoring may be appropriate."
    );
  } else {
    notes.push(
      "PHQ-9 and GAD-7 are in their minimal ranges and DASS-21 subscales are Normal."
    );
  }


  if (who5BelowCutoff) {
    notes.push(
      "WHO-5 is below the suggested poor-well-being cut-off; further assessment may be appropriate."
    );
  } else {
    notes.push(
      "WHO-5 is at or above the suggested poor-well-being cut-off."
    );
  }


  if (safetyFlag) {
    notes.push(
      "PHQ-9 item 9 was endorsed; MindTrack keeps this as a separate safety alert for counselor review."
    );
  }


  notes.push(
    "These screening results are not diagnoses."
  );


  return notes.join(" ");
}

function numericValue(
  value,
  fallback = null
) {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


function storedDASSAdjustedScore(
  scale
) {

  const adjusted =
    numericValue(
      scale?.adjustedScore
    );

  if (adjusted !== null) {
    return adjusted;
  }


  const raw =
    numericValue(
      scale?.rawScore
    );

  return raw !== null
    ? raw * 2
    : null;
}


function buildAssessmentResult({
  who5RawScore,
  who5Percentage,
  phq9Score,
  gad7Score,
  dass21DepressionRaw,
  dass21AnxietyRaw,
  dass21StressRaw,
  dass21DepressionAdjusted,
  dass21AnxietyAdjusted,
  dass21StressAdjusted,
  phq9Difficulty,
  safetyFlag
}) {

  const who5BelowCutoff =
    who5RawScore <= 12;


  const phq9SeverityLabel =
    phq9Severity(phq9Score);


  const gad7SeverityLabel =
    gad7Severity(gad7Score);


  const dass21DepressionSeverityLabel =
    dass21DepressionSeverity(
      dass21DepressionAdjusted
    );


  const dass21AnxietySeverityLabel =
    dass21AnxietySeverity(
      dass21AnxietyAdjusted
    );


  const dass21StressSeverityLabel =
    dass21StressSeverity(
      dass21StressAdjusted
    );


  const priorityResult =
    deriveMonitoringPriority({
      phq9SeverityLabel,
      gad7SeverityLabel,
      dass21DepressionSeverityLabel,
      dass21AnxietySeverityLabel,
      dass21StressSeverityLabel
    });


  const recommendation =
    monitoringRecommendation({
      priority:
        priorityResult.priority,
      who5BelowCutoff,
      safetyFlag
    });


  const dass21TotalRawScore =
    dass21DepressionRaw +
    dass21AnxietyRaw +
    dass21StressRaw;


  return {
    score:
      who5Percentage,

    scoringVersion:
      ASSESSMENT_SCORING_VERSION,

    priorityModelVersion:
      MONITORING_PRIORITY_VERSION,

    priority:
      priorityResult.priority,

    prioritySource:
      priorityResult.source,

    priorityReasons:
      priorityResult.reasons,

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
        cutoffRawScore:
          13,
        cutoffPercentageScore:
          52,
        interpretation:
          who5BelowCutoff
            ? "Below the suggested WHO-5 poor-well-being cut-off (raw 0-12 / percentage 0-48); further assessment may be appropriate."
            : "At or above the suggested WHO-5 poor-well-being cut-off (raw 13-25 / percentage 52-100)."
      },


      phq9: {
        title:
          PHQ9_TITLE,
        totalScore:
          phq9Score,
        maximumScore:
          27,
        severity:
          phq9SeverityLabel,
        screeningThreshold:
          10,
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
          gad7SeverityLabel,
        screeningThreshold:
          10
      },


      dass21: {
        title:
          DASS21_TITLE,
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
          severity:
            dass21DepressionSeverityLabel,
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
          severity:
            dass21AnxietySeverityLabel,
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
          severity:
            dass21StressSeverityLabel,
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
          "DASS-21 uses three 7-item subscales. Each raw subscale score (0-21) is multiplied by 2 before applying the standard adult severity ranges."
      }
    }
  };
}


export function calculateAssessment(
  answers,
  phq9Difficulty = ""
) {

  const who5RawScore =
    sumAnswers(
      who5Questions,
      answers
    );


  const who5Percentage =
    who5RawScore * 4;


  const phq9Score =
    sumAnswers(
      phq9Questions,
      answers
    );


  const gad7Score =
    sumAnswers(
      gad7Questions,
      answers
    );


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


  function sumQuestionIds(ids) {

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


  const safetyFlag =
    Number(
      answers.phq9_q9 ??
      0
    ) > 0;


  return buildAssessmentResult({
    who5RawScore,
    who5Percentage,
    phq9Score,
    gad7Score,
    dass21DepressionRaw,
    dass21AnxietyRaw,
    dass21StressRaw,
    dass21DepressionAdjusted:
      dass21DepressionRaw * 2,
    dass21AnxietyAdjusted:
      dass21AnxietyRaw * 2,
    dass21StressAdjusted:
      dass21StressRaw * 2,
    phq9Difficulty,
    safetyFlag
  });
}


export function recalculateAssessmentRecord(
  record
) {

  if (
    record?.answers &&
    typeof record.answers === "object"
  ) {

    const completeAnswerCount =
      scoredQuestionIds.filter(
        id =>
          record.answers[id] !==
            undefined
      ).length;


    if (
      completeAnswerCount ===
      scoredQuestionIds.length
    ) {

      return calculateAssessment(
        record.answers,
        record.phq9Difficulty ||
        record.instrumentResults
          ?.phq9
          ?.difficulty ||
        ""
      );
    }
  }


  const results =
    record?.instrumentResults;


  if (!results) {
    return null;
  }


  const who5Percentage =
    numericValue(
      results?.who5
        ?.percentageScore,
      numericValue(
        record?.score
      )
    );


  let who5RawScore =
    numericValue(
      results?.who5
        ?.rawScore
    );


  if (
    who5RawScore === null &&
    who5Percentage !== null
  ) {
    who5RawScore =
      Math.round(
        who5Percentage / 4
      );
  }


  const phq9Score =
    numericValue(
      results?.phq9
        ?.totalScore
    );


  const gad7Score =
    numericValue(
      results?.gad7
        ?.totalScore
    );


  const depressionAdjusted =
    storedDASSAdjustedScore(
      results?.dass21
        ?.depression
    );


  const anxietyAdjusted =
    storedDASSAdjustedScore(
      results?.dass21
        ?.anxiety
    );


  const stressAdjusted =
    storedDASSAdjustedScore(
      results?.dass21
        ?.stress
    );


  if (
    who5RawScore === null ||
    who5Percentage === null ||
    phq9Score === null ||
    gad7Score === null ||
    depressionAdjusted === null ||
    anxietyAdjusted === null ||
    stressAdjusted === null
  ) {
    return null;
  }


  const depressionRaw =
    numericValue(
      results?.dass21
        ?.depression
        ?.rawScore,
      depressionAdjusted / 2
    );


  const anxietyRaw =
    numericValue(
      results?.dass21
        ?.anxiety
        ?.rawScore,
      anxietyAdjusted / 2
    );


  const stressRaw =
    numericValue(
      results?.dass21
        ?.stress
        ?.rawScore,
      stressAdjusted / 2
    );


  return buildAssessmentResult({
    who5RawScore,
    who5Percentage,
    phq9Score,
    gad7Score,
    dass21DepressionRaw:
      depressionRaw,
    dass21AnxietyRaw:
      anxietyRaw,
    dass21StressRaw:
      stressRaw,
    dass21DepressionAdjusted:
      depressionAdjusted,
    dass21AnxietyAdjusted:
      anxietyAdjusted,
    dass21StressAdjusted:
      stressAdjusted,
    phq9Difficulty:
      record.phq9Difficulty ||
      results?.phq9
        ?.difficulty ||
      "",
    safetyFlag:
      Boolean(
        record?.safetyFlag
      )
  });
}
