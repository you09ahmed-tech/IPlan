import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import { auth } from "../firebase/config";
import { saveQuest } from "../firebase/quests";
import { savePlan } from "../firebase/plans";

const CHAT_STORAGE_KEY = "iplanPlanningChatMessages";
const BREAKDOWN_DRAFT_KEY = "iplanBreakdownPlannerDraft";

const EXAMPLE_PROMPTS = [
  "I need to finish my Physics IA conclusion",
  "I don't know how to start my Physics IA",
  "I have Business homework on SWOT",
  "I am stuck on Chemistry equilibrium questions",
];

const SUBJECT_KEYWORDS = [
  { subject: "Biology", keywords: ["biology", "bio ia", "cell", "organism", "enzyme", "ecosystem"] },
  { subject: "Chemistry", keywords: ["chemistry", "chem ia", "titration", "mole", "equilibrium", "reaction"] },
  { subject: "Physics", keywords: ["physics", "mechanics", "circuit", "kinematics", "wave"] },
  { subject: "Mathematics", keywords: ["math", "maths", "mathematics", "calculus", "statistics"] },
  { subject: "English", keywords: ["english", "literature", "poem", "novel", "individual oral"] },
  { subject: "History", keywords: ["history", "historical", "revolution"] },
  { subject: "Economics", keywords: ["economics", "econ ", "supply and demand", "market"] },
  { subject: "Business Management", keywords: ["business management", "business ia", "business homework", "business", "marketing plan", "swot", "ansoff", "stakeholder"] },
  { subject: "Psychology", keywords: ["psychology", "psych ia"] },
  { subject: "Computer Science", keywords: ["computer science", "programming", "cs ia"] },
];

const TOPIC_KEYWORDS = [
  { topic: "waves", keywords: ["wave"] },
  { topic: "equilibrium", keywords: ["equilibrium"] },
  { topic: "swot", keywords: ["swot"] },
  { topic: "io", keywords: ["individual oral", " io ", "io script", "io introduction"] },
  { topic: "forces", keywords: ["force", "newton"] },
  { topic: "electricity", keywords: ["circuit", "voltage", "resistance", "current"] },
  { topic: "energy", keywords: ["kinetic energy", "potential energy", "energy transfer"] },
  { topic: "stoichiometry", keywords: ["mole", "stoichiometry"] },
  { topic: "acids-bases", keywords: ["acid", " base ", "ph scale"] },
  { topic: "organic", keywords: ["organic chemistry", "functional group", "mechanism"] },
  { topic: "ansoff", keywords: ["ansoff"] },
  { topic: "motivation-theory", keywords: ["motivation theory", "maslow", "herzberg"] },
];

const DEFAULT_FLAVOR = {
  unit: "the exact requirement",
  checkWord: "Check you are explaining, not just describing",
  visual: "a clear diagram or table",
};

const SUBJECT_FLAVOR = {
  Physics: {
    unit: "the equation and units involved",
    checkWord: "Check your units and significant figures line up",
    visual: "a labeled diagram (forces, motion, waves, or circuit as relevant)",
  },
  Chemistry: {
    unit: "the balanced equation",
    checkWord: "Check your significant figures and units",
    visual: "a particle, bonding, or energy-level diagram",
  },
  Biology: {
    unit: "the process or mechanism",
    checkWord: "Check you explained structure-function, not just described it",
    visual: "a labeled process diagram",
  },
  Mathematics: {
    unit: "the correct formula or method",
    checkWord: "Check your answer is a reasonable size",
    visual: "one fully worked example",
  },
  "Business Management": {
    unit: "the specific tool or concept",
    checkWord: "Check every point is linked to case evidence, not generic theory",
    visual: "a table applying the tool directly to the case",
  },
  Economics: {
    unit: "a correctly labeled diagram",
    checkWord: "Check you have a real-world example and an evaluation line",
    visual: "a correctly labeled diagram",
  },
  English: {
    unit: "a specific technique and quotation",
    checkWord: "Check you are analyzing effect, not summarizing plot",
    visual: "a quotation with a clear reference",
  },
  History: {
    unit: "a piece of evidence",
    checkWord: "Check you have a clear argument, not just a narrative",
    visual: "a cause-consequence chain",
  },
  "Computer Science": {
    unit: "the exact algorithm step",
    checkWord: "Check you tested one case at a time",
    visual: "a trace table",
  },
  Psychology: {
    unit: "the study or theory",
    checkWord: "Check you linked the study back to the actual question",
    visual: "an aim-procedure-findings summary",
  },
};

const STAGE_LABELS = {
  conclusion: "the conclusion",
  introduction: "the introduction",
  method: "the method section",
  analysis: "the analysis section",
  evaluation: "the evaluation section",
  editing: "editing what you already have",
  revising: "active recall practice",
  "exam practice": "timed exam practice",
  "solving questions": "the questions you're stuck on",
  researching: "gathering your evidence",
  outlining: "planning your structure",
  starting: "getting started",
  continuing: "making direct progress",
  "overdue recovery": "restarting this task",
  "stuck/blocked": "unsticking yourself",
  overwhelmed: "just the very first step",
};

function generateId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getSubjectFlavor(subject) {
  return SUBJECT_FLAVOR[subject] || DEFAULT_FLAVOR;
}

/* ----------------------------- */
/* DETECTION */
/* ----------------------------- */

function detectSubject(text) {
  const lower = text.toLowerCase();

  const match = SUBJECT_KEYWORDS.find((entry) =>
    entry.keywords.some((keyword) => lower.includes(keyword))
  );

  return match ? match.subject : "";
}

function detectTopic(text) {
  const lower = ` ${text.toLowerCase()} `;

  const match = TOPIC_KEYWORDS.find((entry) =>
    entry.keywords.some((keyword) => lower.includes(keyword))
  );

  return match ? match.topic : "";
}

function detectTaskType(text) {
  const lower = text.toLowerCase();

  if (/\bee\b/.test(lower) || lower.includes("extended essay")) return "EE";
  if (/\bia\b/.test(lower) || lower.includes("internal assessment")) return "IA";
  if (lower.includes("tok") || lower.includes("theory of knowledge")) return "TOK";
  if (lower.includes("cas")) return "CAS";
  if (lower.includes("exam") || lower.includes("mock") || lower.includes("past paper")) return "Exam Prep";
  if (lower.includes("revis")) return "Revision";
  if (lower.includes("essay")) return "Essay";
  if (lower.includes("read")) return "Reading";
  if (lower.includes("project")) return "Project";

  return "Homework";
}

function detectTaskStage(text) {
  const lower = text.toLowerCase();

  if (lower.includes("overwhelm") || lower.includes("too much") || lower.includes("stress")) {
    return "overwhelmed";
  }

  if (lower.includes("stuck") || lower.includes("confused") || lower.includes("lost")) {
    return "stuck/blocked";
  }

  if (
    lower.includes("overdue") ||
    lower.includes("missed") ||
    lower.includes("behind") ||
    (lower.includes("late") && !lower.includes("latest"))
  ) {
    return "overdue recovery";
  }

  if (lower.includes("conclusion") || lower.includes("conclude")) {
    return "conclusion";
  }

  if (lower.includes("intro")) {
    return "introduction";
  }

  if (
    lower.includes("method") ||
    lower.includes("procedure") ||
    lower.includes("variable") ||
    lower.includes("materials")
  ) {
    return "method";
  }

  if (
    lower.includes("analysis") ||
    lower.includes("analyse") ||
    lower.includes("analyze") ||
    lower.includes("calculate") ||
    lower.includes(" data")
  ) {
    return "analysis";
  }

  if (lower.includes("evaluat") || lower.includes("limitation") || lower.includes("improvement")) {
    return "evaluation";
  }

  if (
    lower.includes("edit") ||
    lower.includes("rewrite") ||
    lower.includes("polish") ||
    (lower.includes("improve") && !lower.includes("improvement"))
  ) {
    return "editing";
  }

  if (lower.includes("revis") || lower.includes("study for")) {
    return "revising";
  }

  if (lower.includes("exam") || lower.includes("past paper") || lower.includes("mock test")) {
    return "exam practice";
  }

  if (lower.includes("question") || lower.includes("worksheet") || lower.includes("problem")) {
    return "solving questions";
  }

  if (lower.includes("research") || lower.includes("source") || lower.includes("evidence")) {
    return "researching";
  }

  if (lower.includes("outline") || lower.includes("structure") || lower.includes("plan")) {
    return "outlining";
  }

  if (
    lower.includes("start") ||
    lower.includes("begin") ||
    lower.includes("know where to start") ||
    lower.includes("know how to start")
  ) {
    return "starting";
  }

  if (lower.includes("finish") || lower.includes("continue") || lower.includes("complete")) {
    return "continuing";
  }

  return "generic";
}

function detectEmotionalState(text) {
  const lower = text.toLowerCase();

  if (
    lower.includes("overwhelm") ||
    lower.includes("too much") ||
    lower.includes("stress") ||
    lower.includes("can't do this") ||
    lower.includes("cant do this")
  ) {
    return "overwhelmed";
  }

  if (
    lower.includes("stuck") ||
    lower.includes("confused") ||
    lower.includes("lost") ||
    lower.includes("don't understand") ||
    lower.includes("dont understand")
  ) {
    return "stuck";
  }

  if (
    lower.includes("overdue") ||
    lower.includes("late") ||
    lower.includes("missed") ||
    lower.includes("behind")
  ) {
    return "overdue";
  }

  return "neutral";
}

function detectPriority(text, stage) {
  const lower = text.toLowerCase();

  if (stage === "overdue recovery") {
    return "High";
  }

  if (
    lower.includes("urgent") ||
    lower.includes("asap") ||
    lower.includes("due tomorrow") ||
    lower.includes("due today") ||
    lower.includes("overdue")
  ) {
    return "High";
  }

  if (lower.includes("no rush") || lower.includes("whenever") || lower.includes("not urgent")) {
    return "Low";
  }

  return "Medium";
}

function detectDifficulty(text) {
  const lower = text.toLowerCase();

  if (
    lower.includes("overwhelm") ||
    lower.includes("stuck") ||
    lower.includes("stressed") ||
    lower.includes("hard") ||
    lower.includes("difficult") ||
    lower.includes("know where to start") ||
    lower.includes("know how to start")
  ) {
    return "Hard";
  }

  if (lower.includes("easy") || lower.includes("quick") || lower.includes("simple")) {
    return "Easy";
  }

  return "Medium";
}

function estimateTime(analysis) {
  const { taskType, stage, difficulty } = analysis;

  if (["conclusion", "introduction", "evaluation", "editing"].includes(stage)) {
    return 30;
  }

  if (stage === "solving questions" || stage === "stuck/blocked") {
    return 30;
  }

  if (stage === "revising" || stage === "exam practice") {
    return 45;
  }

  if (taskType === "IA" || taskType === "EE") {
    return 60;
  }

  if (taskType === "TOK") {
    return 45;
  }

  if (difficulty === "Hard") return 30;
  if (difficulty === "Easy") return 20;

  return 40;
}

/* ----------------------------- */
/* TOPIC-SPECIFIC STEP GENERATORS */
/* ----------------------------- */

function physicsWavesSteps() {
  return [
    "List every wave subtopic you're responsible for: speed, frequency/period, superposition/interference, refraction, and energy transfer.",
    "Write the key formula for each subtopic from memory before checking your notes (for example v = fλ, T = 1/f).",
    "Draw one labeled wave diagram showing wavelength, amplitude, and direction of travel.",
    "Answer one exam-style question per subtopic without looking at notes first.",
    "Check your answers against your notes and mark exactly what you got wrong.",
    "Rewrite the correct method next to each mistake in your own words.",
  ];
}

function chemistryEquilibriumSteps() {
  return [
    "Identify exactly which equilibrium concept the question is testing (Kc/Kp, a Le Chatelier shift, or an ICE table).",
    "Write out the balanced equation and the equilibrium expression if a numerical answer is needed.",
    "List every known value from the question, including units.",
    "Check your units and significant figures match what the question is asking for.",
    "Work through one guided example step-by-step, writing out each stage of the calculation.",
    "Try one exam-style equilibrium question on your own without checking the method first.",
  ];
}

function businessSwotSteps() {
  return [
    "Write a one-line definition of SWOT so every point stays focused on what it actually measures.",
    "Read the case study once fully before writing anything.",
    "List 2-3 internal Strengths and 2-3 internal Weaknesses, each tied to a specific line from the case.",
    "List 2-3 external Opportunities and 2-3 external Threats from the case's market or industry context.",
    "For each point, add one sentence explaining why it matters for the business's decision.",
    "Write a short evaluation: which factor matters most right now, and why.",
  ];
}

function englishIoIntroSteps(isEditing) {
  if (isEditing) {
    return [
      "Open your current IO script and find the introduction section specifically.",
      "Check whether your global issue is stated in one clear sentence — rewrite it if it isn't.",
      "Confirm both texts are named correctly with their exact titles.",
      "Tighten your thesis so it states your specific argument, not just the general topic.",
      "Cut vague filler wording (for example 'this shows society') and replace it with a precise claim.",
      "Read your introduction aloud once and time it against your IO time limit.",
    ];
  }

  return [
    "Decide your global issue in one precise sentence before writing anything else.",
    "Name both texts exactly as they will appear in your IO.",
    "Write a thesis that states your specific argument about how the texts explore the global issue.",
    "Draft two sentences previewing the two areas of analysis you'll cover in the body.",
    "Read the introduction aloud and check it fits your time limit.",
  ];
}

/* ----------------------------- */
/* IA STAGE GENERATORS */
/* ----------------------------- */

function iaStartingSteps(subject) {
  const flavor = getSubjectFlavor(subject);

  return [
    "Write your research question as one precise, measurable sentence.",
    "List your independent, dependent, and control variables on three separate lines.",
    `Decide the specific method you'll use to collect data, including ${flavor.unit}.`,
    "Write a rough investigation aim in 1-2 sentences.",
    "Decide exactly what data you need and roughly how many trials or data points.",
    "Do not write the conclusion yet — that comes after you have real data.",
  ];
}

function iaMethodSteps() {
  return [
    "List your independent, dependent, and control variables clearly.",
    "Write your materials or apparatus list before the method steps.",
    "Write your procedure as numbered steps, specific enough that someone else could repeat it.",
    "State exactly how each control variable will be kept constant.",
    "Add a safety or ethical consideration if your investigation involves people, chemicals, or hazards.",
    "Re-read your procedure and check every step produces data you'll actually use.",
  ];
}

function iaAnalysisSteps(subject) {
  const flavor = getSubjectFlavor(subject);

  return [
    "Organize your raw data into a clearly labeled table first.",
    "Process your data (averages, uncertainties, or transformations) and show one worked calculation.",
    `Create ${flavor.visual} to represent your processed data.`,
    "Describe the trend in your data in plain language before interpreting it.",
    "Connect the trend directly back to your research question.",
    `${flavor.checkWord}.`,
  ];
}

function iaConclusionSteps() {
  return [
    "Re-read your research question before writing anything.",
    "Look at your final processed result, not your raw data.",
    "Write one sentence that directly answers your research question.",
    "Add two bullet points explaining exactly how your processed data supports that answer.",
    "Mention one genuine limitation that affected your specific results.",
    "Do not introduce any new data or calculations in this section.",
  ];
}

function iaEvaluationSteps() {
  return [
    "List every limitation that actually affected your specific results — not generic ones.",
    "For each limitation, explain its impact on reliability or validity specifically.",
    "Suggest one realistic, specific improvement for each limitation (not just 'repeat the experiment').",
    "Avoid vague comments like 'human error' — name the exact source of error instead.",
    "Rank your limitations by how much they actually affected your result.",
  ];
}

/* ----------------------------- */
/* EE STAGE GENERATORS */
/* ----------------------------- */

function eeStartingSteps() {
  return [
    "Write your research question as one focused, arguable sentence.",
    "List 3-5 sources you already have or know you can access.",
    "Write one sentence on why this question is worth investigating.",
    "Decide the rough structure: how many main argument sections will you need?",
    "Do not start drafting body paragraphs yet — confirm your research question is focused first.",
  ];
}

function eeResearchingSteps() {
  return [
    "List every source you're currently using in one place.",
    "For each source, write one sentence on what evidence or argument it gives you.",
    "Flag which sources are primary versus secondary.",
    "Identify any gap where you still need more evidence.",
    "Note the citation details now so you don't lose them later.",
  ];
}

function eeWritingSteps() {
  return [
    "Restate your thesis at the top of the section you're about to write.",
    "Write the topic sentence for this paragraph — what is this paragraph proving?",
    "Add your strongest piece of evidence for this specific point.",
    "Explain how that evidence supports your argument, not just what it says.",
    "Link the paragraph back to your research question in the final sentence.",
  ];
}

function eeEditingSteps() {
  return [
    "Read through for argument clarity first — ignore grammar on this pass.",
    "Check every paragraph has a clear point that links back to your thesis.",
    "Check every piece of evidence is cited correctly.",
    "Cut any sentence that repeats a point you already made.",
    "Read your introduction and conclusion together and check they match.",
  ];
}

function eeConclusionSteps() {
  return [
    "Re-read your research question before writing your conclusion.",
    "Write one paragraph that directly answers your research question.",
    "Synthesize your strongest 2-3 arguments instead of just repeating them.",
    "Do not introduce any new evidence in the conclusion.",
    "Add one sentence on the wider significance of your argument.",
  ];
}

/* ----------------------------- */
/* TOK / REVISION / HOMEWORK / ESSAY / GENERIC */
/* ----------------------------- */

function tokSteps(rawText) {
  const lower = rawText.toLowerCase();
  const isExhibition = lower.includes("exhibition");

  if (isExhibition) {
    return [
      "Write your IA prompt at the top so every choice ties back to it.",
      "Choose one real-world object and describe it specifically, not generically.",
      "Write your claim: what does this object show about the prompt?",
      "Explain the connection between the object and the claim directly.",
      "Add one counterclaim or alternative perspective.",
      "Check your commentary stays under the word limit per object.",
    ];
  }

  return [
    "Write the exact prescribed title or your claim in one sentence.",
    "Choose one specific real-world example to support your claim.",
    "Explain exactly how the example supports the claim — don't just describe it.",
    "Add one counterclaim that challenges your claim.",
    "Evaluate which side is more convincing and why.",
  ];
}

function revisionSteps(subject, topic) {
  if (subject === "Physics" && topic === "waves") {
    return physicsWavesSteps();
  }

  const flavor = getSubjectFlavor(subject);

  return [
    `List your weakest topics in ${subject || "this subject"} and rank them from worst to best.`,
    "Write 5 questions from memory on your weakest topic before checking notes.",
    `${flavor.checkWord} against your notes only after attempting the questions.`,
    "Do one timed exam-style question under real exam conditions.",
    "Mark your own answer and write down the exact reason for each mistake.",
    "Add the correct method to a mistakes log so you don't repeat it.",
  ];
}

function homeworkSteps(subject, topic) {
  if (subject === "Business Management" && topic === "swot") {
    return businessSwotSteps();
  }

  const flavor = getSubjectFlavor(subject);

  return [
    "Read the exact instructions once and underline what must actually be submitted.",
    "Number each part of the task so nothing gets missed.",
    "Start with the smallest or clearest part first to build momentum.",
    `Work through it using ${flavor.unit} rather than a vague explanation.`,
    "If you get stuck on one part, write the exact question you'd ask a teacher and move to the next part.",
    "Review your answers against the instructions before calling it done.",
  ];
}

function essaySteps(stage) {
  if (stage === "conclusion") {
    return [
      "Re-read your essay question before writing the conclusion.",
      "Write one sentence that directly answers the question.",
      "Summarize your strongest two arguments without repeating them word-for-word.",
      "Do not introduce new evidence in the conclusion.",
    ];
  }

  return [
    "Write your thesis as one specific, arguable sentence.",
    "Plan one paragraph per main point, each with a clear topic sentence.",
    "Add one piece of evidence per paragraph.",
    "Explain how each piece of evidence supports your point.",
    "Link each paragraph back to your thesis in the final sentence.",
  ];
}

function genericSteps(subject) {
  const flavor = getSubjectFlavor(subject);

  return [
    "Write down exactly what a finished version of this task needs to include.",
    "Break it into 2-3 smaller sections instead of treating it as one big task.",
    `Start with the part that uses ${flavor.unit} you already understand best.`,
    "Work for one focused block without switching between sections.",
    "Check your progress against the original instructions before stopping.",
  ];
}

/* ----------------------------- */
/* DISPATCHERS */
/* ----------------------------- */

function applyUrgencyOverlay(steps, analysis) {
  const { emotionalState } = analysis;

  if (emotionalState === "overwhelmed") {
    return [
      "Set a 10-minute timer and only look at step 1 below — you do not need to solve everything today.",
      ...steps.slice(0, 4),
    ];
  }

  if (emotionalState === "stuck") {
    return [
      steps[0],
      "If step 1 doesn't click within 5 minutes, write down the exact word or part you don't understand and move to step 2 anyway.",
      ...steps.slice(1, 5),
    ];
  }

  if (emotionalState === "overdue") {
    return [
      "Decide right now: reschedule this properly in Calendar, or commit to the next block below — don't leave it silently overdue.",
      ...steps.slice(0, 5),
    ];
  }

  return steps;
}

function generateExactNextSteps(analysis, rawText) {
  const { subject, taskType, stage, topic } = analysis;
  const lower = rawText.toLowerCase();

  let steps;

  if (subject === "Chemistry" && topic === "equilibrium") {
    steps = chemistryEquilibriumSteps();
  } else if (subject === "Business Management" && topic === "swot") {
    steps = businessSwotSteps();
  } else if (subject === "English" && topic === "io" && stage === "introduction") {
    const isEditing = /\b(edit|improve|rewrite|polish)\b/.test(lower);
    steps = englishIoIntroSteps(isEditing);
  } else if (subject === "Physics" && topic === "waves" && (stage === "revising" || taskType === "Revision" || taskType === "Exam Prep")) {
    steps = physicsWavesSteps();
  } else if (taskType === "IA") {
    if (stage === "method") steps = iaMethodSteps();
    else if (stage === "analysis") steps = iaAnalysisSteps(subject);
    else if (stage === "conclusion") steps = iaConclusionSteps();
    else if (stage === "evaluation") steps = iaEvaluationSteps();
    else steps = iaStartingSteps(subject);
  } else if (taskType === "EE") {
    if (stage === "researching") steps = eeResearchingSteps();
    else if (stage === "editing") steps = eeEditingSteps();
    else if (stage === "conclusion") steps = eeConclusionSteps();
    else if (stage === "continuing" || stage === "analysis") steps = eeWritingSteps();
    else steps = eeStartingSteps();
  } else if (taskType === "TOK") {
    steps = tokSteps(rawText);
  } else if (taskType === "Revision" || taskType === "Exam Prep") {
    steps = revisionSteps(subject, topic);
  } else if (taskType === "Essay") {
    steps = essaySteps(stage);
  } else if (taskType === "Homework") {
    steps = homeworkSteps(subject, topic);
  } else {
    steps = genericSteps(subject);
  }

  const withOverlay = applyUrgencyOverlay(steps, analysis).filter(Boolean);

  return withOverlay.slice(0, 7);
}

function toActionFragment(step) {
  const trimmed = step.replace(/\.$/, "");
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function generateRecommendedNextAction(analysis, exactNextSteps) {
  const minutes = analysis.estimatedMinutes;
  const focusLabel =
    STAGE_LABELS[analysis.stage] || `this ${(analysis.taskType || "task").toLowerCase()}`;

  const firstStep = exactNextSteps[0];
  const secondStep = exactNextSteps[1];

  if (!firstStep) {
    return `Spend ${minutes} minutes on ${focusLabel}.`;
  }

  if (!secondStep) {
    return `Spend ${minutes} minutes on ${focusLabel}: ${toActionFragment(firstStep)}.`;
  }

  return `Spend ${minutes} minutes only on ${focusLabel}: ${toActionFragment(
    firstStep
  )}, then ${toActionFragment(secondStep)}.`;
}

function generateCommonMistake(analysis) {
  const { subject, taskType, stage, topic } = analysis;

  if (subject === "Physics" && topic === "waves") {
    return "A common mistake is mixing up frequency and period, or forgetting units in your final answer — always check f = 1/T and include units.";
  }

  if (subject === "Chemistry" && topic === "equilibrium") {
    return "A common mistake is forgetting that Kc only changes with temperature, not with added reactants or a catalyst — don't confuse a position shift with a value change.";
  }

  if (subject === "Business Management" && topic === "swot") {
    return "A common mistake is listing generic SWOT points without linking each one to specific evidence from the case — every point needs a 'because...' from the case.";
  }

  if (subject === "English" && topic === "io") {
    return "A common mistake is naming the global issue too broadly (for example 'identity') instead of precisely (for example 'the tension between inherited and chosen identity') — precision matters more than scope.";
  }

  if (taskType === "IA") {
    if (stage === "conclusion") {
      return "A common mistake is introducing new data or calculations in the conclusion — this section should only interpret results already presented in the analysis.";
    }

    if (stage === "evaluation") {
      return "A common mistake is writing vague limitations like 'human error' — examiners want a specific source of error and its real effect on your result.";
    }

    if (stage === "method") {
      return "A common mistake is writing a procedure that's too vague to repeat — include exact quantities, equipment, and how each control variable is kept constant.";
    }

    if (stage === "analysis") {
      return "A common mistake is presenting a graph or table without explaining what the trend actually means in relation to your research question.";
    }

    return "A common mistake at this stage is choosing a research question that isn't specific or measurable enough to actually investigate.";
  }

  if (taskType === "EE") {
    if (stage === "conclusion") {
      return "A common mistake is introducing new evidence in the conclusion instead of synthesizing what you already argued.";
    }

    if (stage === "editing") {
      return "A common mistake is editing for grammar before checking whether the argument itself is clear — fix structure first, wording second.";
    }

    return "A common mistake is drifting away from your exact research question as you write — check every paragraph still answers it directly.";
  }

  if (taskType === "TOK") {
    return "A common mistake is describing an example without explicitly explaining how it supports your claim — the link has to be stated, not implied.";
  }

  if (taskType === "Revision" || taskType === "Exam Prep") {
    return "A common mistake is just re-reading notes, which feels productive but doesn't test recall — always test yourself before checking the answer.";
  }

  if (taskType === "Essay") {
    return "A common mistake is summarizing evidence instead of explaining why it supports your argument — always add the 'so what' after every quote or data point.";
  }

  if (subject) {
    const flavor = getSubjectFlavor(subject);
    return `A common mistake in ${subject} is describing instead of explaining — ${flavor.checkWord.toLowerCase()}.`;
  }

  return "A common mistake is trying to finish the whole task in one sitting — a focused single step now is more useful than a vague full attempt.";
}

function buildAssistantReply(originalMessage) {
  const subject = detectSubject(originalMessage);
  const taskType = detectTaskType(originalMessage);
  const stage = detectTaskStage(originalMessage);
  const emotionalState = detectEmotionalState(originalMessage);
  const topic = detectTopic(originalMessage);
  const priority = detectPriority(originalMessage, stage);
  const difficulty = detectDifficulty(originalMessage);

  const analysis = { subject, taskType, stage, emotionalState, topic, priority, difficulty };
  analysis.estimatedMinutes = estimateTime(analysis);

  const exactNextSteps = generateExactNextSteps(analysis, originalMessage);
  const suggestedFirstStep = exactNextSteps[0];
  const recommendedAction = generateRecommendedNextAction(analysis, exactNextSteps);
  const commonMistake = generateCommonMistake(analysis);

  return {
    id: generateId(),
    role: "assistant",
    originalMessage,
    subject,
    taskType,
    stage,
    emotionalState,
    topic,
    priority,
    difficulty,
    estimatedMinutes: analysis.estimatedMinutes,
    suggestedFirstStep,
    recommendedAction,
    exactNextSteps,
    commonMistake,
    trackedQuestId: "",
    createdAt: new Date().toISOString(),
  };
}

function getXPFromDifficulty(difficulty) {
  if (difficulty === "Easy") return 40;
  if (difficulty === "Hard") return 120;
  return 80;
}

function normalizeAssistantMessage(message) {
  if (!message || message.role !== "assistant") {
    return message;
  }

  return {
    ...message,
    originalMessage:
      message.originalMessage || message.rawText || message.text || "",
    subject: message.subject || "",
    taskType: message.taskType || "Homework",
    priority: message.priority || "Medium",
    difficulty: message.difficulty || "Medium",
    estimatedMinutes: message.estimatedMinutes || 40,
    suggestedFirstStep:
      message.suggestedFirstStep ||
      message.firstStep ||
      "Open your materials and write down what a finished version of this task should look like.",
    recommendedAction:
      message.recommendedAction ||
      "Spend a focused 25-30 minutes on the next concrete step for this task.",
    exactNextSteps: Array.isArray(message.exactNextSteps)
      ? message.exactNextSteps
      : [],
    commonMistake:
      message.commonMistake ||
      "A common mistake is trying to finish the whole task in one sitting — a focused single step now is more useful than a vague full attempt.",
    trackedQuestId: message.trackedQuestId || "",
  };
}

function loadStoredMessages() {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(normalizeAssistantMessage);
  } catch (error) {
    console.error("Error loading saved planning chat:", error);
    return [];
  }
}

function AIAssistant({ setPage, setQuests }) {
  const [messages, setMessages] = useState(loadStoredMessages);
  const [draftText, setDraftText] = useState("");
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  function handleSendMessage(rawText) {
    const trimmed = rawText.trim();

    if (trimmed === "" || thinking) {
      return;
    }

    const userMessage = {
      id: generateId(),
      role: "user",
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, userMessage]);
    setDraftText("");
    setThinking(true);

    window.setTimeout(() => {
      const assistantMessage = buildAssistantReply(trimmed);
      setMessages((current) => [...current, assistantMessage]);
      setThinking(false);
    }, 700);
  }

  function handleSubmit(event) {
    event.preventDefault();
    handleSendMessage(draftText);
  }

  function handleClearChat() {
    const confirmed = window.confirm(
      "Clear this planning chat? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  }

  function handleBreakThisDown(message) {
    const estimatedHours = Math.max(
      0.5,
      Math.round((message.estimatedMinutes / 60) * 4) / 4
    );

    const isStuckOrConfused =
      message.emotionalState === "stuck" || message.stage === "stuck/blocked";

    const isContinuingWork = [
      "continuing",
      "editing",
      "conclusion",
      "evaluation",
      "analysis",
    ].includes(message.stage);

    const draft = {
      task: message.originalMessage,
      subject: message.subject || "",
      taskType: message.taskType,
      priority: message.priority,
      difficulty: message.difficulty,
      dueDate: "",
      estimatedHours: String(estimatedHours),
      heaviness:
        message.difficulty === "Hard"
          ? "4"
          : message.difficulty === "Easy"
          ? "2"
          : "3",
      stuckOn: isStuckOrConfused ? message.originalMessage : "",
      alreadyDone: isContinuingWork
        ? `Already working on the ${message.stage.replace("/", " / ")} stage.`
        : "",
      planningContext: {
        stage: message.stage,
        emotionalState: message.emotionalState,
        exactNextSteps: message.exactNextSteps,
        commonMistake: message.commonMistake,
      },
      breakdown: null,
      sessionDates: {},
      sessionTimes: {},
      plannerMode: "",
      activeTaskSaved: false,
    };

    localStorage.setItem(BREAKDOWN_DRAFT_KEY, JSON.stringify(draft));
    setPage("breakdown");
  }

  async function handleTrackAsTask(message) {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("You need to be logged in to track this task.");
      return;
    }

    if (message.trackedQuestId) {
      setPage("dashboard");
      return;
    }

    const questToSave = {
      title: message.originalMessage,
      subject: message.subject || "General",
      taskType: message.taskType,
      difficulty: message.difficulty,
      priority: message.priority,
      dueDate: "",
      estimatedMinutes: message.estimatedMinutes,
      xp: getXPFromDifficulty(message.difficulty),
      subtasks:
        message.exactNextSteps && message.exactNextSteps.length > 0
          ? message.exactNextSteps
          : [message.suggestedFirstStep],
      completed: false,
      status: "active",
      source: "AI Planning Chat",
      createdAt: new Date().toISOString(),
    };

    try {
      const savedQuest = await saveQuest(currentUser.uid, questToSave);

      if (setQuests) {
        setQuests((currentQuests) => [savedQuest, ...(currentQuests || [])]);
      }

      setMessages((currentMessages) =>
        currentMessages.map((current) =>
          current.id === message.id
            ? { ...current, trackedQuestId: savedQuest.id }
            : current
        )
      );

      alert("This task is now being tracked on your Dashboard.");
    } catch (error) {
      console.error("Error tracking task from planning chat:", error);
      alert("Something went wrong while tracking this task.");
    }
  }

  async function handleScheduleLater(message) {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("You need to be logged in to save this plan.");
      return;
    }

    const planToSave = {
      goal: message.originalMessage,
      title: message.originalMessage,
      subject: message.subject || "General",
      taskType: message.taskType,
      priority: message.priority,
      difficulty: message.difficulty,
      dueDate: "",
      estimatedMinutes: message.estimatedMinutes,
      advice: message.recommendedAction,
      steps: message.exactNextSteps || [],
      commonMistake: message.commonMistake,
      source: "AI Planning Chat",
      savedFrom: "AI Planning Chat",
      savedAt: new Date().toISOString(),
    };

    try {
      await savePlan(currentUser.uid, planToSave);

      alert(
        "Draft plan saved to Saved Plans. You can schedule it into Calendar whenever you are ready."
      );

      setPage("plans");
    } catch (error) {
      console.error("Error saving draft plan from planning chat:", error);
      alert("Something went wrong while saving this draft plan.");
    }
  }

  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">IB Planning Chat</p>
            <h1>AI Planning Assistant 🧭</h1>

            <p>
              Explain a task in plain language and get specific, rule-based
              next steps.
            </p>
          </div>

          {messages.length > 0 && (
            <button type="button" className="danger-btn" onClick={handleClearChat}>
              Clear Chat
            </button>
          )}
        </div>

        <section className="planning-chat-card">
          <div className="planning-chat-log">
            {messages.length === 0 ? (
              <div className="planning-chat-empty">
                <h3>Tell IPlan what is on your mind</h3>

                <p>
                  Try one of these examples, or type your own IB task in plain
                  language.
                </p>

                <div className="planning-chat-examples">
                  {EXAMPLE_PROMPTS.map((example) => (
                    <button
                      type="button"
                      key={example}
                      onClick={() => handleSendMessage(example)}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) =>
                message.role === "user" ? (
                  <div className="chat-bubble chat-bubble-user" key={message.id}>
                    <p>{message.text}</p>
                  </div>
                ) : (
                  (() => {
                    const safeSubject = message.subject || "";
                    const safeTaskType = message.taskType || "Homework";
                    const safePriority = message.priority || "Medium";
                    const safeEstimatedMinutes = message.estimatedMinutes || 40;
                    const safeSuggestedFirstStep =
                      message.suggestedFirstStep ||
                      message.firstStep ||
                      "Open your materials and write down what a finished version of this task should look like.";
                    const safeRecommendedAction =
                      message.recommendedAction ||
                      "Spend a focused 25-30 minutes on the next concrete step for this task.";
                    const safeCommonMistake =
                      message.commonMistake ||
                      "A common mistake is trying to finish the whole task in one sitting — a focused single step now is more useful than a vague full attempt.";
                    const safeExactNextSteps = Array.isArray(message.exactNextSteps)
                      ? message.exactNextSteps
                      : [];

                    return (
                      <div className="chat-bubble chat-bubble-assistant" key={message.id}>
                        <p className="chat-bubble-label">IPlan Planning Assistant</p>

                        <div className="chat-analysis-grid">
                          <div>
                            <span>Subject</span>
                            <strong>{safeSubject || "Not detected"}</strong>
                          </div>

                          <div>
                            <span>Task type</span>
                            <strong>{safeTaskType}</strong>
                          </div>

                          <div>
                            <span>Priority</span>
                            <strong>{safePriority}</strong>
                          </div>

                          <div>
                            <span>Estimated time</span>
                            <strong>{safeEstimatedMinutes} min</strong>
                          </div>
                        </div>

                        <div className="priority-explanation-box">
                          <h3>Suggested first step</h3>
                          <p>{safeSuggestedFirstStep}</p>
                        </div>

                        <div className="priority-explanation-box">
                          <h3>Recommended next action</h3>
                          <p>{safeRecommendedAction}</p>
                        </div>

                        {safeExactNextSteps.length > 0 && (
                          <div className="priority-explanation-box chat-steps-box">
                            <h3>Exact next steps</h3>

                            <ol className="chat-steps-list">
                              {safeExactNextSteps.map((step, index) => (
                                <li key={index}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}

                        <div className="chat-mistake-box">
                          <h3>Common mistake to avoid</h3>
                          <p>{safeCommonMistake}</p>
                        </div>

                        <div className="chat-action-row">
                      <button
                        type="button"
                        onClick={() => handleBreakThisDown(message)}
                      >
                        Break this down
                      </button>

                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => handleTrackAsTask(message)}
                      >
                        {message.trackedQuestId
                          ? "View on Dashboard"
                          : "Track as task"}
                      </button>

                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => handleScheduleLater(message)}
                      >
                        Schedule later
                      </button>
                        </div>
                      </div>
                    );
                  })()
                )
              )
            )}

            {thinking && (
              <div className="chat-bubble chat-bubble-assistant chat-thinking">
                <p>IPlan is organizing your task...</p>
              </div>
            )}
          </div>

          <form className="planning-chat-input-row" onSubmit={handleSubmit}>
            <textarea
              placeholder="Example: I need to finish my Physics IA conclusion"
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
            />

            <button
              type="submit"
              disabled={draftText.trim() === "" || thinking}
            >
              Send
            </button>
          </form>
        </section>

        <div className="integrity-note">
          This assistant uses built-in IB planning logic, not a live AI
          model. It will not write your IA, EE, or essays for you.
        </div>
      </main>
    </div>
  );
}

export default AIAssistant;
