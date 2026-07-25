import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";

import { saveBreakdown } from "../firebase/breakdowns";
import { saveStudySession } from "../firebase/sessions";
import { savePlan } from "../firebase/plans";
import { loadSubjects } from "../firebase/subjects";
import { saveQuest } from "../firebase/quests";

import { auth } from "../firebase/config";

const PLANNER_DRAFT_KEY = "iplanBreakdownPlannerDraft";

const taskTypes = [
  "Homework",
  "Revision",
  "Exam Prep",
  "IA",
  "EE",
  "TOK",
  "CAS",
  "Essay",
  "Reading",
  "Project",
  "Other",
];

// Task-type "components" a session can be linked to, ordered roughly in the
// order a task naturally progresses. Milestone index selects which one a
// given session focuses on, so build-phase steps stay concrete instead of
// generic across every task type.
const TASK_TYPE_COMPONENTS = {
  ia: [
    "the exact IA requirement",
    "the required sections",
    "a first rough section",
    "the evidence, data, and explanations",
    "the IA criteria/rubric",
  ],
  ee: [
    "the research question",
    "the sources and thesis",
    "the argument structure",
    "a full section draft",
    "citations and conclusion",
  ],
  tok: [
    "the prompt or title",
    "the claim or knowledge issue",
    "a real-world example",
    "a counterclaim",
    "the evaluation",
  ],
  revision: [
    "the topic checklist",
    "key formulas and terms",
    "active recall practice",
    "exam-style questions",
    "the mistake log",
  ],
  essay: [
    "the question and thesis",
    "the paragraph plan",
    "supporting evidence",
    "a full paragraph draft",
    "the conclusion",
  ],
  generic: [
    "what the task is asking for",
    "the main sections",
    "a rough version of one part",
    "the weak points",
    "the final version",
  ],
};

const START_STEPS = {
  ia: [
    "Find the IA instructions or teacher feedback.",
    "Write the exact IA requirement in one sentence.",
    "Identify what section or criterion this task belongs to.",
    "Write what a finished version should include.",
    "Mark the first section you will work on next.",
  ],
  ee: [
    "Find the EE guide or supervisor feedback.",
    "Write your research question in one sentence.",
    "List the sources or notes you already have.",
    "Write what a finished section should include.",
    "Mark the first part you will work on next.",
  ],
  tok: [
    "Find the TOK prompt or exhibition instructions.",
    "Write the exact prompt or title in one sentence.",
    "Identify the knowledge question this connects to.",
    "Write what a finished response should include.",
    "Mark the first part you will work on next.",
  ],
  revision: [
    "Find the syllabus, notes, or past papers for this topic.",
    "Write the exact topic or unit you are revising.",
    "List what you already remember without checking notes.",
    "Write what you need to be able to do by the exam.",
    "Mark the weakest area to start with.",
  ],
  essay: [
    "Find the essay question or task instructions.",
    "Write the question and your rough answer in one sentence.",
    "List the points you could use to answer it.",
    "Write what a finished essay should include.",
    "Mark the first paragraph you will work on next.",
  ],
  generic: [
    "Find the task instructions or materials.",
    "Write what the task is asking for in one sentence.",
    "List the main parts or sections of the task.",
    "Write what a finished version should include.",
    "Mark the first part you will work on next.",
  ],
};

const REVIEW_STEPS = {
  ia: [
    "List the IA sections you already have.",
    "Mark each section as complete, weak, or missing.",
    "Compare your weakest section against the IA criteria/rubric.",
    "Write 2-3 bullet points for what needs to improve.",
    "Decide what section the next session should target.",
  ],
  ee: [
    "List the EE sections you already have.",
    "Mark each section as complete, weak, or missing.",
    "Check citations and evidence against your thesis.",
    "Write 2-3 bullet points for what needs to improve.",
    "Decide what section the next session should target.",
  ],
  tok: [
    "List the parts of your response you already have.",
    "Mark each part as complete, weak, or missing.",
    "Check that your evaluation considers more than one perspective.",
    "Write 2-3 bullet points for what needs to improve.",
    "Decide what part the next session should target.",
  ],
  revision: [
    "List the topics you have revised so far.",
    "Mark each topic as strong, shaky, or weak.",
    "Redo the questions you got wrong earlier.",
    "Write 2-3 mistakes to avoid repeating.",
    "Decide which topic the next session should target.",
  ],
  essay: [
    "List the paragraphs you already have.",
    "Mark each paragraph as complete, weak, or missing.",
    "Check each paragraph links back to your thesis.",
    "Write 2-3 bullet points for what needs to improve.",
    "Decide what paragraph the next session should target.",
  ],
  generic: [
    "List the parts of the task you already have.",
    "Mark each part as complete, weak, or missing.",
    "Choose the weakest or most urgent part.",
    "Write 2-3 bullet points for what needs to improve.",
    "Decide what the next session should target.",
  ],
};

// Keyword-triggered overrides: when the task or the linked milestone
// mentions one of these, steps should focus on that stage specifically,
// regardless of task type.
const STAGE_FOCUS_STEPS = {
  conclusion: [
    "Reread your results or main findings.",
    "Write one sentence that directly answers your research question or task.",
    "State whether your findings support, partly support, or don't support it.",
    "Add one limitation or uncertainty that matters.",
    "Write one sentence on what this means or what comes next.",
  ],
  evaluation: [
    "List the main limitations or weaknesses so far.",
    "Rank them by how much they affect your result or argument.",
    "Write one realistic improvement for the top limitation.",
    "Check the improvement is specific, not just 'be more careful'.",
    "Note anything a marker would flag as missing.",
  ],
  method: [
    "List your variables: what you changed, measured, and kept constant.",
    "Write the procedure as clear, repeatable steps.",
    "Check the procedure would let someone else repeat it.",
    "Note any controls or repeats you included.",
    "Mark any step that still needs more detail.",
  ],
  analysis: [
    "Organize your raw data into a clear table.",
    "Create one graph or chart that shows the main trend.",
    "Write one sentence describing what the trend shows.",
    "Check units, labels, and uncertainties are included.",
    "Decide if a calculation or statistical test is still needed.",
  ],
};

const EXTENSION_PHASES = ["draft", "improve", "review", "final check"];

const EXTENSION_STEP_SETS = {
  draft: (component) => [
    `Open your latest version of ${component}.`,
    "Write the next rough part without editing.",
    "Keep going until you have something concrete, even if messy.",
    "Mark the next part to write after this.",
  ],
  improve: (component) => [
    `Reread ${component} with fresh eyes.`,
    "Underline any part that's unclear or weak.",
    "Rewrite the weakest sentence or section.",
    "Check it now matches what the task or rubric expects.",
  ],
  "final check": () => [
    "Read through the full task from start to finish.",
    "Check every required part is present.",
    "Fix formatting, wording, or small errors.",
    "Confirm it is ready to submit or hand in.",
  ],
};

function getCriteriaLabel(taskTypeCategory) {
  if (taskTypeCategory === "ia") {
    return "the IA criteria";
  }

  if (taskTypeCategory === "ee") {
    return "the EE requirements";
  }

  if (taskTypeCategory === "tok") {
    return "the TOK assessment criteria";
  }

  return "the task requirements";
}

// When the task title itself names a specific stage (conclusion, evaluation,
// method, analysis, introduction, revision), the milestones should reflect
// that stage directly instead of the generic five-step task-type milestones.
// Only combinations that make real sense are hand-authored; anything else
// falls back to the normal per-task-type milestones in
// getTaskSpecificMilestones.
const STAGE_SPECIFIC_MILESTONES = {
  ia: {
    conclusion: (criteria) => [
      "Re-read the research question and your final processed result",
      "Write a direct answer to the research question",
      "Explain how the data supports the conclusion",
      "Add limitations or uncertainty that matter",
      `Check the conclusion against ${criteria}`,
    ],
    evaluation: (criteria) => [
      "Re-read your results and identify the weakest parts",
      "List the main limitations in your method or data",
      "Explain how each limitation affects your conclusion",
      "Suggest one realistic improvement for the biggest limitation",
      `Check the evaluation against ${criteria}`,
    ],
    method: (criteria) => [
      "List your variables: independent, dependent, and controlled",
      "Write the procedure as clear, repeatable steps",
      "Check the procedure would let someone else repeat it",
      "Note safety, controls, and repeat trials",
      `Check the method against ${criteria}`,
    ],
    analysis: (criteria) => [
      "Organize your raw data into a clear table",
      "Process the data with averages, calculations, or uncertainties",
      "Create a graph or chart that shows the main trend",
      "Write what the trend or pattern shows",
      `Check the analysis against ${criteria}`,
    ],
    introduction: (criteria) => [
      "State the topic and why it is worth investigating",
      "Write the research question clearly",
      "Give the background theory needed to understand it",
      "State your hypothesis or prediction",
      `Check the introduction against ${criteria}`,
    ],
    revision: (criteria) => [
      "Re-read the IA from start to finish",
      "List the sections that need rewriting",
      "Rewrite the weakest section first",
      "Check the flow and consistency between sections",
      `Check the full IA against ${criteria}`,
    ],
  },
  ee: {
    conclusion: (criteria) => [
      "Re-read your research question and main argument",
      "Write a direct answer to the research question",
      "Explain how your evidence supports this answer",
      "Note the limitations of your argument or sources",
      `Check the conclusion against ${criteria}`,
    ],
    evaluation: (criteria) => [
      "Re-read your argument and identify its weakest point",
      "List the limitations in your sources or reasoning",
      "Explain how each limitation affects your argument",
      "Suggest how the argument could be strengthened",
      `Check the evaluation against ${criteria}`,
    ],
    method: (criteria) => [
      "List what you investigated and how",
      "Write your research approach clearly",
      "Check it is clear enough for a reader to follow",
      "Note any limitations in your approach",
      `Check the method against ${criteria}`,
    ],
    analysis: (criteria) => [
      "Organize your evidence or data clearly",
      "Identify the main pattern or argument it supports",
      "Write what this evidence shows in your own words",
      "Check the evidence directly supports your thesis",
      `Check the analysis against ${criteria}`,
    ],
    introduction: (criteria) => [
      "State your topic and why it matters",
      "Write your research question clearly",
      "Give the background context a reader needs",
      "State your thesis or line of argument",
      `Check the introduction against ${criteria}`,
    ],
    revision: (criteria) => [
      "Re-read the EE from start to finish",
      "List the sections that need rewriting",
      "Rewrite the weakest section first",
      "Check the argument flows from section to section",
      `Check the full EE against ${criteria}`,
    ],
  },
  tok: {
    conclusion: (criteria) => [
      "Re-read the prompt and your main claim",
      "Write a direct answer to the prompt",
      "Explain how your example supports this answer",
      "Add a counterclaim or alternative perspective",
      `Check your response against ${criteria}`,
    ],
    evaluation: (criteria) => [
      "Re-read your claim and real-world example",
      "List possible weaknesses in your reasoning",
      "Consider an alternative perspective or counterclaim",
      "Explain what this means for your original claim",
      `Check the evaluation against ${criteria}`,
    ],
    introduction: (criteria) => [
      "State the prompt and your first response to it",
      "Identify the knowledge question involved",
      "Give the context or background needed to understand it",
      "State your claim clearly",
      `Check the introduction against ${criteria}`,
    ],
  },
  essay: {
    conclusion: (criteria) => [
      "Re-read the question and your thesis",
      "Write a direct answer that restates your thesis",
      "Summarize how your points support this answer",
      "Note any nuance or limitation worth mentioning",
      `Check the conclusion against ${criteria}`,
    ],
    introduction: (criteria) => [
      "State the question and your first impression of it",
      "Give the context the reader needs",
      "State your thesis clearly",
      "Preview the points you will make",
      `Check the introduction against ${criteria}`,
    ],
  },
};

// Companion to STAGE_SPECIFIC_MILESTONES, aligned by index (entry N here
// describes milestone N in that bank). Used only when a stage was detected,
// so session titles and exact steps are built from what each milestone in
// the session's group actually says instead of the generic task-type
// machinery. `tag` is a 1-3 word label for the compact badge theme line;
// `shortTitle` becomes the session title; `steps` are 2 concrete actions.
const STAGE_MILESTONE_DETAILS = {
  ia: {
    conclusion: [
      {
        tag: "Research question",
        shortTitle: "Revisit the research question",
        outcome:
          "know exactly what your research question and final result are, side by side",
        steps: [
          "Open your IA and re-read the research question.",
          "Re-read your final processed result or main finding.",
          "Write both down side by side in your own words.",
          "Note anything that still feels unclear before moving on.",
        ],
      },
      {
        tag: "Direct answer",
        shortTitle: "Answer the research question",
        outcome:
          "have a clear one-sentence answer to the research question, backed by your result",
        steps: [
          "Write one direct sentence that answers the research question.",
          "Make sure it does not just repeat the method or introduction.",
          "Check it uses your actual result, not a general statement.",
          "Read it aloud to check it sounds like a real answer.",
        ],
      },
      {
        tag: "Data support",
        shortTitle: "Connect data to your answer",
        outcome:
          "have shown exactly how your data leads to your conclusion, not just stated it",
        steps: [
          "Point to the specific trend or result that supports your answer.",
          "Write one sentence linking the data directly to your conclusion.",
          "Check the link is specific, not just 'the data shows this'.",
          "Cut anything that repeats the analysis instead of using it.",
        ],
      },
      {
        tag: "Limitations",
        shortTitle: "Add limitations",
        outcome:
          "have named the limitations that genuinely affect your result, not a generic list",
        steps: [
          "List the one or two limitations that most affect your result.",
          "Add a short note on uncertainty where it matters.",
          "Check each limitation is specific to your own experiment.",
          "Cut vague lines like 'human error' with no detail.",
        ],
      },
      {
        tag: "Final criteria check",
        shortTitle: "Check it against the criteria",
        outcome:
          "have checked your conclusion against the IA criteria and know exactly what's left to fix",
        steps: [
          "Re-read the IA criteria for the conclusion section.",
          "Check your conclusion answers the research question directly.",
          "Check the data support and limitations are both included.",
          "Fix anything the criteria call for that is still missing.",
        ],
      },
    ],
    evaluation: [
      {
        tag: "Weakest parts",
        shortTitle: "Spot the weakest parts",
        outcome: "know which parts of your results are genuinely weakest",
        steps: [
          "Re-read your results section with a critical eye.",
          "Underline the parts that feel weakest or most uncertain.",
          "Ask what a strict examiner would question first.",
          "Shortlist the two or three that matter most.",
        ],
      },
      {
        tag: "Limitations list",
        shortTitle: "List the limitations",
        outcome: "have a full, honest list of limitations in your method or data",
        steps: [
          "List every limitation in your method or data collection.",
          "Note which ones you have not mentioned yet.",
          "Group similar limitations together.",
          "Drop anything too minor to matter.",
        ],
      },
      {
        tag: "Impact explained",
        shortTitle: "Explain the impact",
        outcome:
          "can explain, in one sentence each, how every limitation actually affects your result",
        steps: [
          "Write one sentence per limitation on how it affects your result.",
          "Rank them from most to least serious.",
          "Check each sentence names a real effect, not just the limitation.",
          "Cut any that repeat the same point twice.",
        ],
      },
      {
        tag: "Improvement",
        shortTitle: "Suggest a real improvement",
        outcome:
          "have one specific, realistic improvement for your biggest limitation",
        steps: [
          "Write one specific, realistic improvement for your biggest limitation.",
          "Check it is not just 'be more careful'.",
          "Explain briefly how it would change the result.",
          "Keep it something you could actually have done.",
        ],
      },
      {
        tag: "Final criteria check",
        shortTitle: "Check it against the criteria",
        outcome:
          "have checked your evaluation against the IA criteria and know what's left to fix",
        steps: [
          "Re-read the IA criteria for the evaluation section.",
          "Check every limitation you listed has an impact explained.",
          "Check your improvement suggestion is specific and realistic.",
          "Fix anything the criteria call for that is still missing.",
        ],
      },
    ],
    method: [
      {
        tag: "Variables",
        shortTitle: "List your variables",
        outcome:
          "have your independent, dependent, and controlled variables clearly written out",
        steps: [
          "Write out your independent, dependent, and controlled variables.",
          "Check nothing important is missing.",
          "Check each variable is named precisely, with units.",
          "Note how each controlled variable was actually kept constant.",
        ],
      },
      {
        tag: "Procedure",
        shortTitle: "Write the procedure",
        outcome: "have your procedure written as clear, numbered steps",
        steps: [
          "Write your procedure as numbered, repeatable steps.",
          "Read it back as if you were a stranger following it.",
          "Add exact quantities, tools, and timings where missing.",
          "Cut anything vague like 'measure carefully'.",
        ],
      },
      {
        tag: "Repeatability",
        shortTitle: "Check it can be repeated",
        outcome: "know your procedure has enough detail for someone else to repeat it exactly",
        steps: [
          "Check every step has enough detail to repeat exactly.",
          "Add any missing quantities, tools, or timings.",
          "Have someone else read it and flag confusing steps.",
          "Fix anything they could not follow.",
        ],
      },
      {
        tag: "Safety & controls",
        shortTitle: "Note safety and controls",
        outcome: "have your safety considerations, controls, and repeat trials clearly noted",
        steps: [
          "Add safety considerations relevant to your method.",
          "Note your controls and how many repeat trials you did.",
          "Check repeat trials are enough to justify an average.",
          "Add anything you did to reduce risk or error.",
        ],
      },
      {
        tag: "Final criteria check",
        shortTitle: "Check it against the criteria",
        outcome: "have checked your method against the IA criteria and know what's left to fix",
        steps: [
          "Re-read the IA criteria for the method section.",
          "Check the procedure is detailed enough to be repeated.",
          "Check variables, safety, and controls are all included.",
          "Fix anything the criteria call for that is still missing.",
        ],
      },
    ],
    analysis: [
      {
        tag: "Raw data",
        shortTitle: "Organize your raw data",
        outcome: "have your raw data in a clear, properly labelled table",
        steps: [
          "Put your raw data into a clearly labelled table.",
          "Check units and uncertainties are included.",
          "Check the table is easy to read at a glance.",
          "Fix any missing or inconsistent values.",
        ],
      },
      {
        tag: "Processed data",
        shortTitle: "Process the data",
        outcome: "have the averages or calculations your analysis actually needs",
        steps: [
          "Calculate averages or the values your analysis needs.",
          "Show one worked calculation as an example.",
          "Check your uncertainty calculation is included.",
          "Double-check one value by hand to catch errors.",
        ],
      },
      {
        tag: "Graph",
        shortTitle: "Create the graph",
        outcome: "have one clear graph or chart that shows the main trend",
        steps: [
          "Create one graph or chart that shows the main trend.",
          "Label axes and units, and add a trendline if relevant.",
          "Check the scale makes the trend easy to see.",
          "Add error bars if your data has uncertainties.",
        ],
      },
      {
        tag: "Trend explained",
        shortTitle: "Explain the trend",
        outcome: "can explain what the trend shows and how it connects to your question",
        steps: [
          "Write one or two sentences describing what the trend shows.",
          "Connect it back to your research question.",
          "Note any anomalies or outliers you can see.",
          "Avoid just describing the graph shape with no meaning.",
        ],
      },
      {
        tag: "Final criteria check",
        shortTitle: "Check it against the criteria",
        outcome: "have checked your analysis against the IA criteria and know what's left to fix",
        steps: [
          "Re-read the IA criteria for the analysis section.",
          "Check your graph and calculations are both included.",
          "Check the trend is clearly explained, not just shown.",
          "Fix anything the criteria call for that is still missing.",
        ],
      },
    ],
    introduction: [
      {
        tag: "Topic",
        shortTitle: "State your topic",
        outcome: "have your topic and why it matters written in two clear sentences",
        steps: [
          "Write one sentence stating your topic.",
          "Write one sentence on why it is worth investigating.",
          "Check it would make sense to someone outside your class.",
          "Cut anything overly broad or generic.",
        ],
      },
      {
        tag: "Research question",
        shortTitle: "Write the research question",
        outcome: "have a precise research question that names your variables clearly",
        steps: [
          "Write your research question as one precise sentence.",
          "Check it names your variables clearly.",
          "Check it is specific enough to actually investigate.",
          "Compare it against your final method to check they match.",
        ],
      },
      {
        tag: "Background theory",
        shortTitle: "Give the background theory",
        outcome: "have the minimum background theory a reader needs, and nothing extra",
        steps: [
          "Write the minimum background theory a reader needs.",
          "Cut anything not directly relevant to your question.",
          "Check each idea leads naturally toward your question.",
          "Add one source or reference where it strengthens a claim.",
        ],
      },
      {
        tag: "Hypothesis",
        shortTitle: "State your hypothesis",
        outcome: "have a clear, testable hypothesis or prediction",
        steps: [
          "Write your hypothesis or prediction clearly.",
          "Check it is testable with your method.",
          "Check it connects logically to your background theory.",
          "State the direction you expect the result to go.",
        ],
      },
      {
        tag: "Final criteria check",
        shortTitle: "Check it against the criteria",
        outcome:
          "have checked your introduction against the IA criteria and know what's left to fix",
        steps: [
          "Re-read the IA criteria for the introduction section.",
          "Check the research question and hypothesis are both clear.",
          "Check the background theory supports the hypothesis.",
          "Fix anything the criteria call for that is still missing.",
        ],
      },
    ],
    revision: [
      {
        tag: "Full read-through",
        shortTitle: "Re-read the full IA",
        outcome: "have read the whole IA start to finish and know where it's weak",
        steps: [
          "Read the whole IA start to finish without editing.",
          "Note anything confusing as you go.",
          "Note anywhere the argument or logic feels thin.",
          "Keep a running list instead of fixing things mid-read.",
        ],
      },
      {
        tag: "Weak sections",
        shortTitle: "List the weak sections",
        outcome: "have a clear list of sections that need rewriting, ranked by weakest",
        steps: [
          "List every section that needs rewriting.",
          "Mark which one is weakest.",
          "Note why each one is weak, in a few words.",
          "Decide the order you will rewrite them in.",
        ],
      },
      {
        tag: "Rewrite",
        shortTitle: "Rewrite the weakest section",
        outcome: "have rewritten your weakest section, without touching the rest yet",
        steps: [
          "Rewrite your weakest section first.",
          "Do not edit other sections yet.",
          "Read it back and check it now feels solid.",
          "Note anything still unresolved for next time.",
        ],
      },
      {
        tag: "Flow & consistency",
        shortTitle: "Check the flow",
        outcome: "know the IA reads consistently from section to section",
        steps: [
          "Read section to section and check the flow makes sense.",
          "Fix any inconsistent terms or numbers.",
          "Check the conclusion still matches the introduction.",
          "Smooth over any abrupt transitions.",
        ],
      },
      {
        tag: "Final criteria check",
        shortTitle: "Check it against the criteria",
        outcome: "have checked the full IA against the criteria and know exactly what's left",
        steps: [
          "Re-read the IA criteria one more time.",
          "Check every section meets what it asks for.",
          "Check formatting, word count, and referencing.",
          "Fix anything the criteria call for that is still missing.",
        ],
      },
    ],
  },
  ee: {
    conclusion: [
      {
        tag: "Research question",
        shortTitle: "Revisit the research question",
        outcome:
          "know exactly what your research question and current argument are, side by side",
        steps: [
          "Re-read your research question and main argument.",
          "Note the strongest point you have made so far.",
          "Write both down side by side in your own words.",
          "Note anything that still feels unclear before moving on.",
        ],
      },
      {
        tag: "Direct answer",
        shortTitle: "Answer the research question",
        outcome:
          "have a clear one-sentence answer to the research question and know which argument supports it",
        steps: [
          "Write one direct sentence answering your research question.",
          "Make sure it is not just a summary.",
          "Check it names the argument that backs it up.",
          "Read it aloud to check it sounds like a real answer.",
        ],
      },
      {
        tag: "Evidence support",
        shortTitle: "Connect evidence to your answer",
        outcome:
          "have shown exactly how your strongest evidence supports your answer, not just stated it",
        steps: [
          "Choose the strongest piece of evidence or source.",
          "Write what this evidence proves.",
          "Explain how it supports your direct answer to the research question.",
          "Add one sentence connecting it back to your overall argument.",
          "Check that this is analysis, not just summary.",
        ],
      },
      {
        tag: "Limitations",
        shortTitle: "Add limitations",
        outcome:
          "have named the limitations that genuinely affect your argument, kept honest, not dismissive",
        steps: [
          "Note one or two limitations in your argument or sources.",
          "Keep it honest, not dismissive.",
          "Check each limitation is specific to your own argument.",
          "Cut vague lines that could apply to any essay.",
        ],
      },
      {
        tag: "Final requirements check",
        shortTitle: "Check it against the requirements",
        outcome:
          "have checked your conclusion against the EE requirements and know exactly what's left to fix",
        steps: [
          "Re-read the EE requirements for the conclusion.",
          "Check your conclusion directly answers the research question.",
          "Check the evidence support and limitations are both included.",
          "Fix anything the requirements call for that is still missing.",
        ],
      },
    ],
    evaluation: [
      {
        tag: "Weakest point",
        shortTitle: "Spot the weakest point",
        outcome: "know which part of your argument is genuinely weakest",
        steps: [
          "Re-read your argument with a critical eye.",
          "Identify the single weakest point.",
          "Ask what a strict examiner would question first.",
          "Note why it is weak, in a few words.",
        ],
      },
      {
        tag: "Limitations list",
        shortTitle: "List the limitations",
        outcome: "have a full, honest list of limitations in your sources or reasoning",
        steps: [
          "List limitations in your sources or reasoning.",
          "Note which sources are weakest.",
          "Group similar limitations together.",
          "Drop anything too minor to matter.",
        ],
      },
      {
        tag: "Impact explained",
        shortTitle: "Explain the impact",
        outcome:
          "can explain, in one sentence each, how every limitation actually affects your argument",
        steps: [
          "Write one sentence per limitation on its effect.",
          "Rank them by seriousness.",
          "Check each sentence names a real effect, not just the limitation.",
          "Cut any that repeat the same point twice.",
        ],
      },
      {
        tag: "Strengthening",
        shortTitle: "Suggest a real strengthening",
        outcome: "have one specific, realistic way to strengthen your argument",
        steps: [
          "Write one specific way to strengthen your argument.",
          "Check it is realistic given your word count.",
          "Explain briefly how it would change the argument.",
          "Keep it something you could actually add.",
        ],
      },
      {
        tag: "Final requirements check",
        shortTitle: "Check it against the requirements",
        outcome:
          "have checked your evaluation against the EE requirements and know what's left to fix",
        steps: [
          "Re-read the EE requirements for evaluation.",
          "Check each limitation has an explained impact.",
          "Check your strengthening suggestion is specific and realistic.",
          "Fix anything the requirements call for that is still missing.",
        ],
      },
    ],
    method: [
      {
        tag: "Investigation",
        shortTitle: "State what you investigated",
        outcome: "have what you investigated and how written in one clear paragraph",
        steps: [
          "Write what you investigated and how, in one paragraph.",
          "Check it matches your research question.",
          "Check it explains why you chose this approach.",
          "Cut anything that belongs in the introduction instead.",
        ],
      },
      {
        tag: "Approach",
        shortTitle: "Write your approach",
        outcome: "have your research approach written as clear, followable steps",
        steps: [
          "Write your research approach as clear steps.",
          "Read it back for clarity.",
          "Add detail anywhere it feels vague.",
          "Cut anything that repeats itself.",
        ],
      },
      {
        tag: "Clarity check",
        shortTitle: "Check it reads clearly",
        outcome: "know a reader could follow your approach without extra help",
        steps: [
          "Check a reader could follow your approach without help.",
          "Add any missing detail.",
          "Have someone else read it and flag confusing parts.",
          "Fix anything they could not follow.",
        ],
      },
      {
        tag: "Limitations",
        shortTitle: "Note limitations",
        outcome: "have one or two honest limitations in your approach noted briefly",
        steps: [
          "Note one or two limitations in your approach.",
          "Keep it brief and honest.",
          "Check each limitation is specific to your approach.",
          "Cut vague lines that could apply to any essay.",
        ],
      },
      {
        tag: "Final requirements check",
        shortTitle: "Check it against the requirements",
        outcome: "have checked your method against the EE requirements and know what's left to fix",
        steps: [
          "Re-read the EE requirements for method.",
          "Check your approach is clearly explained.",
          "Check limitations in your approach are included.",
          "Fix anything the requirements call for that is still missing.",
        ],
      },
    ],
    analysis: [
      {
        tag: "Evidence",
        shortTitle: "Organize your evidence",
        outcome: "have your evidence or data organized into a clear structure",
        steps: [
          "Organize your evidence or data into a clear structure.",
          "Group related points together.",
          "Check the structure matches your argument's order.",
          "Cut any evidence that does not clearly belong.",
        ],
      },
      {
        tag: "Main pattern",
        shortTitle: "Identify the main pattern",
        outcome: "have the main pattern your evidence supports written in one clear sentence",
        steps: [
          "Identify the main pattern your evidence supports.",
          "Write it as one clear sentence.",
          "Check it is specific, not just a general theme.",
          "Compare it against your thesis to check they align.",
        ],
      },
      {
        tag: "Explanation",
        shortTitle: "Explain what it shows",
        outcome: "have explained, in your own words, what the evidence actually shows",
        steps: [
          "Write what the evidence shows in your own words.",
          "Avoid just quoting sources.",
          "Check each sentence adds meaning, not just repeats the quote.",
          "Cut any explanation that just restates the evidence.",
        ],
      },
      {
        tag: "Thesis support",
        shortTitle: "Check it supports your thesis",
        outcome: "know every piece of evidence you kept directly supports your thesis",
        steps: [
          "Check each piece of evidence links back to your thesis.",
          "Cut anything that does not.",
          "Check the strongest evidence appears most prominently.",
          "Add one sentence connecting weaker evidence back to the thesis.",
        ],
      },
      {
        tag: "Final requirements check",
        shortTitle: "Check it against the requirements",
        outcome:
          "have checked your analysis against the EE requirements and know what's left to fix",
        steps: [
          "Re-read the EE requirements for analysis.",
          "Check your evidence clearly supports your thesis.",
          "Check the main pattern is explained, not just shown.",
          "Fix anything the requirements call for that is still missing.",
        ],
      },
    ],
    introduction: [
      {
        tag: "Topic",
        shortTitle: "State your topic",
        outcome: "have your topic and why it matters written in two clear sentences",
        steps: [
          "Write one sentence stating your topic.",
          "Write one sentence on why it matters.",
          "Check it would make sense to someone outside your class.",
          "Cut anything overly broad or generic.",
        ],
      },
      {
        tag: "Research question",
        shortTitle: "Write the research question",
        outcome: "have a precise research question that fits your word count",
        steps: [
          "Write your research question as one precise sentence.",
          "Check it is focused enough for your word count.",
          "Check it is specific enough to actually investigate.",
          "Compare it against your final argument to check they match.",
        ],
      },
      {
        tag: "Background context",
        shortTitle: "Give background context",
        outcome: "have the minimum context a reader needs, and nothing extra",
        steps: [
          "Write the minimum context a reader needs.",
          "Cut anything not directly relevant.",
          "Check each idea leads naturally toward your question.",
          "Add one source or reference where it strengthens a claim.",
        ],
      },
      {
        tag: "Thesis",
        shortTitle: "State your thesis",
        outcome: "have a clear thesis that previews your main points",
        steps: [
          "Write your thesis or line of argument clearly.",
          "Check it previews your main points.",
          "Check it directly answers your research question.",
          "Read it aloud to check it sounds confident, not vague.",
        ],
      },
      {
        tag: "Final requirements check",
        shortTitle: "Check it against the requirements",
        outcome:
          "have checked your introduction against the EE requirements and know what's left to fix",
        steps: [
          "Re-read the EE requirements for introduction.",
          "Check the research question and thesis are both clear.",
          "Check the background context supports the thesis.",
          "Fix anything the requirements call for that is still missing.",
        ],
      },
    ],
    revision: [
      {
        tag: "Full read-through",
        shortTitle: "Re-read the full EE",
        outcome: "have read the whole EE start to finish and know where it's weak",
        steps: [
          "Read the whole EE start to finish without editing.",
          "Note anything confusing as you go.",
          "Note anywhere the argument or evidence feels thin.",
          "Keep a running list instead of fixing things mid-read.",
        ],
      },
      {
        tag: "Weak sections",
        shortTitle: "List the weak sections",
        outcome: "have a clear list of sections that need rewriting, ranked by weakest",
        steps: [
          "List every section that needs rewriting.",
          "Mark which one is weakest.",
          "Note why each one is weak, in a few words.",
          "Decide the order you will rewrite them in.",
        ],
      },
      {
        tag: "Rewrite",
        shortTitle: "Rewrite the weakest section",
        outcome: "have rewritten your weakest section, without touching the rest yet",
        steps: [
          "Rewrite your weakest section first.",
          "Do not edit other sections yet.",
          "Read it back and check it now feels solid.",
          "Note anything still unresolved for next time.",
        ],
      },
      {
        tag: "Argument flow",
        shortTitle: "Check the argument flow",
        outcome: "know the argument flows logically from section to section",
        steps: [
          "Read section to section and check the argument flows.",
          "Fix any weak transitions.",
          "Check the conclusion still matches the introduction.",
          "Smooth over any abrupt jumps between points.",
        ],
      },
      {
        tag: "Final requirements check",
        shortTitle: "Check it against the requirements",
        outcome: "have checked the full EE against the requirements and know exactly what's left",
        steps: [
          "Re-read the EE requirements one more time.",
          "Check every section meets what it asks for.",
          "Check formatting, word count, and referencing.",
          "Fix anything the requirements call for that is still missing.",
        ],
      },
    ],
  },
  tok: {
    conclusion: [
      {
        tag: "Prompt",
        shortTitle: "Revisit the prompt",
        outcome: "know exactly what the prompt and your current claim are, side by side",
        steps: [
          "Re-read the prompt and your main claim.",
          "Note your strongest supporting example.",
          "Write both down side by side in your own words.",
          "Note anything that still feels unclear before moving on.",
        ],
      },
      {
        tag: "Direct answer",
        shortTitle: "Answer the prompt",
        outcome: "have a clear one-sentence answer to the prompt, backed by your claim",
        steps: [
          "Write one direct sentence answering the prompt.",
          "Make sure it is not just a summary.",
          "Check it names the claim that backs it up.",
          "Read it aloud to check it sounds like a real answer.",
        ],
      },
      {
        tag: "Example support",
        shortTitle: "Connect your example to your answer",
        outcome:
          "have shown exactly how your real-world example supports your answer, not just stated it",
        steps: [
          "Point to your strongest real-world example.",
          "Write one sentence linking it to your answer.",
          "Check the link is specific, not just 'this proves it'.",
          "Cut anything that just describes the example without using it.",
        ],
      },
      {
        tag: "Counterclaim",
        shortTitle: "Add a counterclaim",
        outcome: "have one genuine counterclaim, and a short reason your view still holds",
        steps: [
          "Add one counterclaim or alternative perspective.",
          "Explain briefly why your view still holds.",
          "Check the counterclaim is a real challenge, not a strawman.",
          "Keep your response to it short and confident.",
        ],
      },
      {
        tag: "Final criteria check",
        shortTitle: "Check it against the criteria",
        outcome:
          "have checked your response against the TOK assessment criteria and know what's left to fix",
        steps: [
          "Re-read the TOK assessment criteria.",
          "Check your response directly answers the prompt.",
          "Check your example support and counterclaim are both included.",
          "Fix anything the criteria call for that is still missing.",
        ],
      },
    ],
    evaluation: [
      {
        tag: "Claim & example",
        shortTitle: "Revisit your claim",
        outcome: "know exactly where your claim and example feel weakest",
        steps: [
          "Re-read your claim and real-world example.",
          "Note where it feels weakest.",
          "Ask what a strict examiner would question first.",
          "Shortlist the one or two weaknesses that matter most.",
        ],
      },
      {
        tag: "Weaknesses",
        shortTitle: "List the weaknesses",
        outcome: "have a specific, honest list of weaknesses in your reasoning",
        steps: [
          "List possible weaknesses in your reasoning.",
          "Be specific, not vague.",
          "Group similar weaknesses together.",
          "Drop anything too minor to matter.",
        ],
      },
      {
        tag: "Counterclaim",
        shortTitle: "Consider a counterclaim",
        outcome: "have taken one alternative perspective seriously, not just named it",
        steps: [
          "Write one alternative perspective or counterclaim.",
          "Take it seriously before responding to it.",
          "Write it as strongly as someone who believes it would.",
          "Check it genuinely challenges your original claim.",
        ],
      },
      {
        tag: "Implication",
        shortTitle: "Explain what it means for your claim",
        outcome: "know whether your claim needs qualifying after the counterclaim",
        steps: [
          "Explain what the counterclaim means for your original claim.",
          "Decide if your claim needs qualifying.",
          "Write one sentence on how your claim now looks, if changed.",
          "Keep the tone balanced, not defensive.",
        ],
      },
      {
        tag: "Final criteria check",
        shortTitle: "Check it against the criteria",
        outcome:
          "have checked your evaluation against the TOK assessment criteria and know what's left to fix",
        steps: [
          "Re-read the TOK assessment criteria.",
          "Check you have considered more than one perspective.",
          "Check the implication for your claim is clearly explained.",
          "Fix anything the criteria call for that is still missing.",
        ],
      },
    ],
    introduction: [
      {
        tag: "Prompt response",
        shortTitle: "State your first response",
        outcome: "have the prompt and your honest first response written down",
        steps: [
          "Write out the prompt and your first response to it.",
          "Keep your first response short and honest.",
          "Note what made you react that way.",
          "Avoid polishing it yet -- just get it down.",
        ],
      },
      {
        tag: "Knowledge question",
        shortTitle: "Identify the knowledge question",
        outcome: "have the knowledge question behind the prompt written as one clear question",
        steps: [
          "Identify the knowledge question behind the prompt.",
          "Write it as one clear question.",
          "Check it is genuinely about knowledge, not just opinion.",
          "Compare it against the prompt to check they connect.",
        ],
      },
      {
        tag: "Context",
        shortTitle: "Give context",
        outcome: "have the minimum context a reader needs, and nothing extra",
        steps: [
          "Write the minimum context a reader needs.",
          "Cut anything not directly relevant.",
          "Check each idea leads naturally toward your claim.",
          "Add one example where it clarifies the context.",
        ],
      },
      {
        tag: "Claim",
        shortTitle: "State your claim",
        outcome: "have a clear claim that responds directly to the prompt",
        steps: [
          "Write your claim as one clear sentence.",
          "Check it responds directly to the prompt.",
          "Check it connects logically to your knowledge question.",
          "Read it aloud to check it sounds confident, not vague.",
        ],
      },
      {
        tag: "Final criteria check",
        shortTitle: "Check it against the criteria",
        outcome:
          "have checked your introduction against the TOK assessment criteria and know what's left to fix",
        steps: [
          "Re-read the TOK assessment criteria.",
          "Check the knowledge question and claim are both clear.",
          "Check the context supports the claim.",
          "Fix anything the criteria call for that is still missing.",
        ],
      },
    ],
  },
  essay: {
    conclusion: [
      {
        tag: "Question & thesis",
        shortTitle: "Revisit the question",
        outcome: "know exactly what the question and your thesis are, side by side",
        steps: [
          "Re-read the question and your thesis statement.",
          "Note your strongest supporting point.",
          "Write both down side by side in your own words.",
          "Note anything that still feels unclear before moving on.",
        ],
      },
      {
        tag: "Restated thesis",
        shortTitle: "Restate your thesis as an answer",
        outcome: "have one sentence that directly answers the question, without new points",
        steps: [
          "Write one sentence that restates your thesis as an answer.",
          "Avoid introducing new points here.",
          "Check it uses the language of the question.",
          "Read it aloud to check it sounds like a real answer.",
        ],
      },
      {
        tag: "Point summary",
        shortTitle: "Summarize your points",
        outcome: "have briefly shown how your main points support this answer, not just listed them",
        steps: [
          "Summarize how your main points support this answer.",
          "Keep it brief, not a re-explanation.",
          "Check each point is clearly linked back to the thesis.",
          "Cut anything that repeats a body paragraph in full.",
        ],
      },
      {
        tag: "Nuance",
        shortTitle: "Add nuance",
        outcome: "have one honest nuance or limitation added, kept short and confident",
        steps: [
          "Add one nuance or limitation worth mentioning.",
          "Keep it short and confident.",
          "Check it does not undercut your whole argument.",
          "Avoid introducing a brand-new idea here.",
        ],
      },
      {
        tag: "Final requirements check",
        shortTitle: "Check it against the requirements",
        outcome:
          "have checked your conclusion against the task requirements and know exactly what's left to fix",
        steps: [
          "Re-read the task requirements for the conclusion.",
          "Check it directly answers the question.",
          "Check the point summary and nuance are both included.",
          "Fix anything the requirements call for that is still missing.",
        ],
      },
    ],
    introduction: [
      {
        tag: "Question",
        shortTitle: "State the question",
        outcome: "have the question and your honest first impression written down",
        steps: [
          "Write the question and your first impression of it.",
          "Keep it short and direct.",
          "Note what made you react that way.",
          "Avoid polishing it yet -- just get it down.",
        ],
      },
      {
        tag: "Context",
        shortTitle: "Give context",
        outcome: "have the minimum context a reader needs, and nothing extra",
        steps: [
          "Write the minimum context a reader needs.",
          "Cut anything not directly relevant.",
          "Check each idea leads naturally toward your thesis.",
          "Add one example where it clarifies the context.",
        ],
      },
      {
        tag: "Thesis",
        shortTitle: "State your thesis",
        outcome: "have a clear thesis that directly answers the question",
        steps: [
          "Write your thesis as one clear sentence.",
          "Check it directly answers the question.",
          "Check it is specific enough to argue in your word count.",
          "Read it aloud to check it sounds confident, not vague.",
        ],
      },
      {
        tag: "Point preview",
        shortTitle: "Preview your points",
        outcome: "have your points listed in order, each clearly supporting your thesis",
        steps: [
          "List the points you will make, in order.",
          "Check they each support your thesis.",
          "Check the order builds logically toward your conclusion.",
          "Cut any point that does not clearly belong.",
        ],
      },
      {
        tag: "Final requirements check",
        shortTitle: "Check it against the requirements",
        outcome:
          "have checked your introduction against the task requirements and know what's left to fix",
        steps: [
          "Re-read the task requirements for the introduction.",
          "Check the thesis and preview are both clear.",
          "Check the context supports the thesis.",
          "Fix anything the requirements call for that is still missing.",
        ],
      },
    ],
  },
};

// Splits milestoneCount milestones into sessionCount contiguous, non-skipping
// groups using rounded breakpoints (e.g. 5 milestones / 3 sessions ->
// [0,1], [2,2], [3,4] -- session 1 supports milestones 1-2, session 2
// supports milestone 3, session 3 supports milestones 4-5). Every milestone
// ends up covered by exactly one session; none are silently skipped.
function groupMilestonesForSessions(sessionCount, milestoneCount) {
  const groups = [];
  let prevBreak = 0;

  for (let index = 1; index <= sessionCount; index++) {
    let nextBreak = Math.round((milestoneCount * index) / sessionCount);
    nextBreak = Math.max(nextBreak, prevBreak + 1);
    nextBreak = Math.min(nextBreak, milestoneCount);

    groups.push([prevBreak, nextBreak - 1]);
    prevBreak = nextBreak;
  }

  return groups;
}

// Returns [startIndex, endIndex] (inclusive) of the milestone(s) a session
// supports. When there are at least as many milestones as sessions, each
// session gets a contiguous slice so no milestone is skipped. When there are
// more sessions than milestones, the first N sessions map 1:1 and any extra
// sessions extend the final milestone (see EXTENSION_PHASES).
function getMilestoneGroupForSession(index, sessionCount, milestoneCount) {
  if (milestoneCount <= 0) {
    return [0, 0];
  }

  if (sessionCount <= milestoneCount) {
    const groups = groupMilestonesForSessions(sessionCount, milestoneCount);
    return groups[index] || [milestoneCount - 1, milestoneCount - 1];
  }

  if (index < milestoneCount) {
    return [index, index];
  }

  return [milestoneCount - 1, milestoneCount - 1];
}

// Natural join for a milestone range: a single milestone reads as-is; a
// grouped range joins both endpoints with "&" so text stays readable
// wherever it's quoted (badges, success conditions, stuck-session prompts).
function getMilestoneRangeLabel(milestones, groupStart, groupEnd) {
  if (groupStart === groupEnd) {
    return milestones[groupStart];
  }

  return `${milestones[groupStart]} & ${milestones[groupEnd]}`;
}

// Combines the task-type component(s) a grouped session should work on into
// one natural phrase instead of repeating the same noun phrase.
function getComponentPhraseForGroup(componentList, groupStart, groupEnd) {
  const first = componentList[Math.min(groupStart, componentList.length - 1)];

  if (groupStart === groupEnd) {
    return first;
  }

  const last = componentList[Math.min(groupEnd, componentList.length - 1)];

  return `${first}, then ${last}`;
}

// Fallback theme tag for milestones without hand-authored STAGE_MILESTONE_DETAILS
// tags (generic, non-stage-specific tasks) -- keeps the badge's theme line
// short instead of dumping the full milestone sentence.
function truncateToWords(text, wordCount) {
  const words = text.split(" ");

  if (words.length <= wordCount) {
    return text;
  }

  return `${words.slice(0, wordCount).join(" ")}…`;
}

function Breakdown({ setPage, quests = [], setQuests }) {
  const [savedSubjects, setSavedSubjects] = useState([]);

  const [task, setTask] = useState("");
  const [subject, setSubject] = useState("");
  const [taskType, setTaskType] = useState("Homework");
  const [priority, setPriority] = useState("Medium");
  const [difficulty, setDifficulty] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [heaviness, setHeaviness] = useState("3");
  const [stuckOn, setStuckOn] = useState("");
  const [alreadyDone, setAlreadyDone] = useState("");

  const [breakdown, setBreakdown] = useState(null);
  const [sessionDates, setSessionDates] = useState({});
  const [sessionTimes, setSessionTimes] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [plannerMode, setPlannerMode] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [activeTaskSaved, setActiveTaskSaved] = useState(false);

  useEffect(() => {
    async function loadUserSubjects() {
      const user = auth.currentUser;

      if (!user) {
        return;
      }

      try {
        const subjects = await loadSubjects(user.uid);
        const safeSubjects = subjects || [];

        setSavedSubjects(safeSubjects);

        if (safeSubjects.length > 0) {
          setSubject((currentSubject) => currentSubject || safeSubjects[0].name);
        }
      } catch (error) {
        console.error("Error loading subjects for breakdown planner:", error);
      }
    }

    loadUserSubjects();
  }, []);

  useEffect(() => {
    const savedDraft = localStorage.getItem(PLANNER_DRAFT_KEY);

    if (!savedDraft) {
      setDraftLoaded(true);
      return;
    }

    try {
      const parsedDraft = JSON.parse(savedDraft);

      setTask(parsedDraft.task || "");
      setSubject(parsedDraft.subject || "");
      setTaskType(parsedDraft.taskType || "Homework");
      setPriority(parsedDraft.priority || "Medium");
      setDifficulty(parsedDraft.difficulty || "Medium");
      setDueDate(parsedDraft.dueDate || "");
      setEstimatedHours(parsedDraft.estimatedHours || "");
      setHeaviness(parsedDraft.heaviness || "3");
      setStuckOn(parsedDraft.stuckOn || "");
      setAlreadyDone(parsedDraft.alreadyDone || "");
      setBreakdown(parsedDraft.breakdown || null);
      setSessionDates(parsedDraft.sessionDates || {});
      setSessionTimes(parsedDraft.sessionTimes || {});
      setPlannerMode(parsedDraft.plannerMode || "");
      setActiveTaskSaved(parsedDraft.activeTaskSaved || false);
    } catch (error) {
      console.error("Failed to load planner draft:", error);
      localStorage.removeItem(PLANNER_DRAFT_KEY);
    }

    setDraftLoaded(true);
  }, []);

  useEffect(() => {
    if (!draftLoaded) {
      return;
    }

    const hasDraftContent =
      task.trim() !== "" ||
      subject.trim() !== "" ||
      taskType.trim() !== "" ||
      dueDate !== "" ||
      estimatedHours !== "" ||
      stuckOn.trim() !== "" ||
      alreadyDone.trim() !== "" ||
      breakdown !== null;

    if (!hasDraftContent) {
      return;
    }

    const draftToSave = {
      task,
      subject,
      taskType,
      priority,
      difficulty,
      dueDate,
      estimatedHours,
      heaviness,
      stuckOn,
      alreadyDone,
      breakdown,
      sessionDates,
      sessionTimes,
      plannerMode,
      activeTaskSaved,
    };

    localStorage.setItem(
      PLANNER_DRAFT_KEY,
      JSON.stringify(draftToSave)
    );
  }, [
    draftLoaded,
    task,
    subject,
    taskType,
    priority,
    difficulty,
    dueDate,
    estimatedHours,
    heaviness,
    stuckOn,
    alreadyDone,
    breakdown,
    sessionDates,
    sessionTimes,
    plannerMode,
    activeTaskSaved,
  ]);

  function clearPlannerDraft() {
    localStorage.removeItem(PLANNER_DRAFT_KEY);

    setTask("");
    setSubject(savedSubjects[0]?.name || "");
    setTaskType("Homework");
    setPriority("Medium");
    setDifficulty("Medium");
    setDueDate("");
    setEstimatedHours("");
    setHeaviness("3");
    setStuckOn("");
    setAlreadyDone("");
    setBreakdown(null);
    setSessionDates({});
    setSessionTimes({});
    setPlannerMode("");
    setActiveTaskSaved(false);
    setDraftLoaded(true);
  }

  function formatDate(date) {
    return date.toISOString().split("T")[0];
  }

  function getTodayDate() {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return today;
  }

  function getDueDateObject() {
    if (!dueDate) {
      return null;
    }

    const date = new Date(`${dueDate}T12:00:00`);
    date.setHours(12, 0, 0, 0);

    return date;
  }

  function suggestSessionDates(sessionCount) {
    const suggestedDates = {};
    const today = getTodayDate();
    const deadline = getDueDateObject();

    if (!deadline || deadline <= today) {
      for (let index = 0; index < sessionCount; index++) {
        const date = new Date(today);
        date.setDate(today.getDate() + index);
        suggestedDates[index] = formatDate(date);
      }

      return suggestedDates;
    }

    const availableDays = Math.max(
      1,
      Math.floor((deadline - today) / (1000 * 60 * 60 * 24))
    );

    for (let index = 0; index < sessionCount; index++) {
      const date = new Date(today);

      if (sessionCount === 1) {
        date.setDate(today.getDate());
      } else {
        const dayOffset = Math.floor((availableDays * index) / sessionCount);
        date.setDate(today.getDate() + dayOffset);
      }

      if (date >= deadline) {
        date.setDate(deadline.getDate() - 1);
      }

      suggestedDates[index] = formatDate(date);
    }

    return suggestedDates;
  }

  function suggestSessionTimes(sessionCount) {
    const suggestedTimes = {};
    const defaultTimes = ["17:00", "18:00", "19:00", "16:30", "20:00"];

    for (let index = 0; index < sessionCount; index++) {
      suggestedTimes[index] = defaultTimes[index % defaultTimes.length];
    }

    return suggestedTimes;
  }

  function getPreferredSessionLength(totalMinutes, heavyLevel) {
    if (heavyLevel >= 4) {
      return 30;
    }

    if (totalMinutes <= 90) {
      return 45;
    }

    return 50;
  }

  function getTaskSpecificMilestones() {
    const lowerTaskType = taskType.toLowerCase();
    const lowerSubject = subject.toLowerCase();

    const taskTypeCategory = resolveTaskTypeCategory();
    const stage = detectTaskStage(task);
    const stageBank = STAGE_SPECIFIC_MILESTONES[taskTypeCategory];

    if (stage && stageBank && stageBank[stage]) {
      return stageBank[stage](getCriteriaLabel(taskTypeCategory));
    }

    if (lowerTaskType.includes("ia")) {
      return [
        `Clarify the exact IA requirement for ${subject || "this subject"}`,
        "Identify the main sections that must be completed",
        "Create a rough draft for the first unfinished section",
        "Improve the explanation, evidence, and structure",
        "Review against the IA criteria before submission",
      ];
    }

    if (lowerTaskType.includes("ee")) {
      return [
        "Clarify the research focus and what needs to be done next",
        "Organize the research, sources, and notes",
        "Create or improve the essay structure",
        "Draft the next major section",
        "Review argument, citations, and clarity",
      ];
    }

    if (lowerTaskType.includes("tok")) {
      return [
        "Clarify the prompt or exhibition object focus",
        "Identify the claim, perspective, or knowledge issue",
        "Collect examples and supporting ideas",
        "Write a rough structure",
        "Review clarity, connection to TOK concepts, and evaluation",
      ];
    }

    if (lowerTaskType.includes("cas")) {
      return [
        "Clarify the CAS experience or project goal",
        "Decide the next practical action",
        "Prepare evidence or reflection notes",
        "Complete the activity or reflection chunk",
        "Review what still needs to be documented",
      ];
    }

    if (
      lowerTaskType.includes("essay") ||
      lowerTaskType.includes("writing") ||
      lowerTaskType.includes("paragraph")
    ) {
      return [
        "Clarify the question and decide the main argument",
        "Collect the strongest points or evidence",
        "Create a rough paragraph-by-paragraph structure",
        "Write the first rough draft without aiming for perfection",
        "Edit the argument, clarity, and final wording",
      ];
    }

    if (
      lowerTaskType.includes("revision") ||
      lowerTaskType.includes("study") ||
      lowerTaskType.includes("exam")
    ) {
      return [
        `List the weakest topics in ${subject || "this subject"}`,
        "Review the key concepts first",
        "Practise questions from the weakest area",
        "Check mistakes and rewrite corrections",
        "Do a final active recall review",
      ];
    }

    if (
      lowerSubject.includes("math") ||
      lowerSubject.includes("physics") ||
      lowerSubject.includes("chem")
    ) {
      return [
        "Identify the exact concept or question type",
        "Review the formula, rule, or method needed",
        "Solve one simple example slowly",
        "Practise similar questions independently",
        "Review mistakes and summarize the method",
      ];
    }

    return [
      "Clarify what the task is asking for",
      "Break the task into smaller sections",
      "Complete the first rough version",
      "Review and improve the weak parts",
      "Prepare the final version or next continuation step",
    ];
  }

  function resolveTaskTypeCategory() {
    const lowerTaskType = taskType.toLowerCase();

    if (lowerTaskType.includes("ia")) {
      return "ia";
    }

    if (lowerTaskType.includes("ee")) {
      return "ee";
    }

    if (lowerTaskType.includes("tok")) {
      return "tok";
    }

    if (
      lowerTaskType.includes("revision") ||
      lowerTaskType.includes("study") ||
      lowerTaskType.includes("exam")
    ) {
      return "revision";
    }

    if (
      lowerTaskType.includes("essay") ||
      lowerTaskType.includes("writing") ||
      lowerTaskType.includes("paragraph")
    ) {
      return "essay";
    }

    return "generic";
  }

  // Takes a plain text string (not a closure over `task`) so callers can
  // choose exactly what to scan: a single milestone (per-session, keeps
  // sessions varied) vs. task + milestone combined (only used for the final
  // review session, see getSessionSteps).
  function detectStageFocus(text) {
    const lowerText = text.toLowerCase();

    if (/\bconclusion(s)?\b/.test(lowerText)) {
      return "conclusion";
    }

    if (/\bevaluat\w*/.test(lowerText)) {
      return "evaluation";
    }

    if (
      /\bmethod(s|ology)?\b/.test(lowerText) ||
      /\bvariable(s)?\b/.test(lowerText) ||
      /\bprocedure(s)?\b/.test(lowerText)
    ) {
      return "method";
    }

    if (
      /\banalysis\b/.test(lowerText) ||
      /\b(raw )?data\b/.test(lowerText) ||
      /\btrend(s)?\b/.test(lowerText)
    ) {
      return "analysis";
    }

    return null;
  }

  // Same keywords as detectStageFocus, plus "introduction" and "revision"
  // which only matter at milestone-generation time (per-session step
  // generation already handles "revision" through the Revision task type).
  function detectTaskStage(text) {
    const baseStage = detectStageFocus(text);

    if (baseStage) {
      return baseStage;
    }

    const lowerText = text.toLowerCase();

    if (/\bintroduction(s)?\b/.test(lowerText) || /\bintro\b/.test(lowerText)) {
      return "introduction";
    }

    if (/\brevis(e|ion|ing)?\b/.test(lowerText) || /\brecall\b/.test(lowerText)) {
      return "revision";
    }

    return null;
  }

  function getStuckSteps(milestone) {
    return [
      "Write, in one sentence, exactly what feels confusing or stuck.",
      `Reread this part of the task: "${milestone}".`,
      "Pick the smallest possible next action, even a tiny one.",
      "Do only that one small action without trying to finish everything.",
      "Write what would make the next step clearer.",
    ];
  }

  // Names the component once, up front, then refers back to it with "it" --
  // repeating the same noun phrase in every line read as unnatural and
  // robotic, especially for grouped multi-milestone sessions.
  function buildComponentSteps(component) {
    const steps = [
      `Open your notes or materials for ${component}.`,
      "Write a rough version of it without editing.",
    ];

    if (stuckOn.trim() !== "") {
      steps.push(
        "Reread what you're stuck on and turn it into one specific question about it."
      );
    } else {
      steps.push("Check it against what the task or rubric expects.");
    }

    steps.push("Mark exactly one weak spot to fix later.");
    steps.push("Decide the very next action before you stop.");

    return steps;
  }

  function getSessionPurpose(index, totalSessions, milestoneCount) {
    if (index === 0) {
      return "Clarify and start";
    }

    if (index === totalSessions - 1) {
      return "Review and improve";
    }

    if (index >= milestoneCount) {
      const extensionPhase =
        EXTENSION_PHASES[(index - milestoneCount) % EXTENSION_PHASES.length];

      if (extensionPhase === "draft") {
        return "Draft the next part";
      }

      if (extensionPhase === "improve") {
        return "Improve and refine";
      }

      if (extensionPhase === "review") {
        return "Review and improve";
      }

      return "Final check";
    }

    return "Complete a focused chunk";
  }

  function getSessionFocus(
    index,
    totalSessions,
    heavyLevel,
    milestoneCount,
    component
  ) {
    if (index === 0 && heavyLevel >= 4) {
      return "Reduce resistance by starting gently and making the task feel less scary.";
    }

    if (index === 0) {
      return "Understand the task and create a simple structure before deeper work.";
    }

    if (index === totalSessions - 1) {
      return "Clean up the work, check weak points, and prepare the next action.";
    }

    if (index >= milestoneCount) {
      return `Extend your progress by working specifically on ${component}.`;
    }

    return `Make real progress on ${component} before moving on.`;
  }

  function getSessionSteps({
    index,
    totalSessions,
    milestoneCount,
    taskTypeCategory,
    milestone,
    component,
    heavyLevel,
  }) {
    if (index === 0) {
      if (stuckOn.trim() !== "" || heavyLevel >= 5) {
        return getStuckSteps(milestone);
      }

      return START_STEPS[taskTypeCategory];
    }

    // Only the milestone this session is linked to drives its stage focus,
    // not the whole task text -- otherwise a keyword in the task title
    // (e.g. "conclusion") would leak into every session and make them all
    // identical, regardless of which milestone each one actually supports.
    const milestoneStageFocus = detectStageFocus(milestone);

    if (index === totalSessions - 1) {
      // The final session is the one place the overall task text is also
      // considered: if the whole task is fundamentally about, say, the
      // conclusion, the closing session should sharpen toward that even if
      // none of the generic milestone labels say "conclusion" literally.
      const reviewStageFocus = detectStageFocus(`${task} ${milestone}`);

      if (reviewStageFocus && STAGE_FOCUS_STEPS[reviewStageFocus]) {
        return STAGE_FOCUS_STEPS[reviewStageFocus];
      }

      return REVIEW_STEPS[taskTypeCategory];
    }

    if (index >= milestoneCount) {
      const extensionPhase =
        EXTENSION_PHASES[(index - milestoneCount) % EXTENSION_PHASES.length];

      if (extensionPhase === "review") {
        return REVIEW_STEPS[taskTypeCategory];
      }

      if (milestoneStageFocus && STAGE_FOCUS_STEPS[milestoneStageFocus]) {
        return STAGE_FOCUS_STEPS[milestoneStageFocus];
      }

      return EXTENSION_STEP_SETS[extensionPhase](component);
    }

    if (milestoneStageFocus && STAGE_FOCUS_STEPS[milestoneStageFocus]) {
      return STAGE_FOCUS_STEPS[milestoneStageFocus];
    }

    return buildComponentSteps(component);
  }

  // Generic (non-stage-specific) fallback: keeps the milestone quote short
  // so grouped ranges don't turn into a wall of text.
  function getSuccessCondition(phase, milestone) {
    const shortMilestone = truncateToWords(milestone, 8);

    if (phase === "start") {
      return `You understand "${shortMilestone}" and know the first concrete action to take.`;
    }

    if (phase === "review") {
      return `You have checked your work against "${shortMilestone}" and know exactly what to fix next.`;
    }

    return `You have made real, visible progress on "${shortMilestone}".`;
  }

  // Stage-specific sessions use each milestone's hand-written `outcome`
  // instead of quoting the milestone text -- short, human, and specific
  // (e.g. "You have a clear one-sentence answer to the research question
  // and know which argument supports it.") rather than restating an
  // instruction like "Re-read your research question...".
  function getStageSuccessCondition(groupDetails) {
    const primary = groupDetails[groupDetails.length - 1];
    return `You ${primary.outcome}.`;
  }

  function createFallbackBreakdown() {
    const heavyLevel = Number(heaviness);
    const safeEstimatedHours = Number(estimatedHours) || 1;
    const totalMinutes = Math.round(safeEstimatedHours * 60);
    const preferredSessionLength = getPreferredSessionLength(
      totalMinutes,
      heavyLevel
    );

    const sessionCount = Math.max(
      1,
      Math.ceil(totalMinutes / preferredSessionLength)
    );

    const milestones = getTaskSpecificMilestones();
    const taskTypeCategory = resolveTaskTypeCategory();
    const componentList =
      TASK_TYPE_COMPONENTS[taskTypeCategory] || TASK_TYPE_COMPONENTS.generic;

    // Mirrors the same stage check getTaskSpecificMilestones uses. When it
    // matches, the milestones themselves are stage-specific (e.g. IA
    // conclusion), so session titles/steps/theme should be built from what
    // each milestone in the group actually says instead of the generic
    // task-type machinery -- otherwise titles/steps stay disconnected from
    // milestones that no longer follow the generic five-step shape.
    const stage = detectTaskStage(task);
    const milestoneDetailsBank = STAGE_MILESTONE_DETAILS[taskTypeCategory]?.[stage];
    const useStageDetails = Boolean(stage && milestoneDetailsBank);

    const sessions = [];
    let remainingMinutes = totalMinutes;

    for (let index = 0; index < sessionCount; index++) {
      const sessionsLeft = sessionCount - index;
      const durationMinutes = Math.ceil(remainingMinutes / sessionsLeft);

      const [groupStart, groupEnd] = getMilestoneGroupForSession(
        index,
        sessionCount,
        milestones.length
      );
      const milestone =
        getMilestoneRangeLabel(milestones, groupStart, groupEnd) || task;
      const component = getComponentPhraseForGroup(
        componentList,
        groupStart,
        groupEnd
      );

      const phase =
        index === 0 ? "start" : index === sessionCount - 1 ? "review" : "build";

      const isStuckStart =
        index === 0 && (stuckOn.trim() !== "" || heavyLevel >= 5);

      let sessionTitleLabel;
      let sessionSteps;
      let milestoneTheme;
      let sessionSuccessCondition;

      if (useStageDetails) {
        const groupDetails = milestoneDetailsBank.slice(
          groupStart,
          groupEnd + 1
        );
        const isLastSession = index === sessionCount - 1;

        sessionTitleLabel =
          isLastSession && groupDetails.length > 1
            ? `${groupDetails[0].shortTitle} and final check`
            : groupDetails[groupDetails.length - 1].shortTitle;

        sessionSteps = isStuckStart
          ? getStuckSteps(milestone)
          : groupDetails.flatMap((detail) => detail.steps);

        milestoneTheme = groupDetails.map((detail) => detail.tag).join(" → ");
        sessionSuccessCondition = getStageSuccessCondition(groupDetails);
      } else {
        sessionTitleLabel = getSessionPurpose(
          index,
          sessionCount,
          milestones.length
        );

        sessionSteps = getSessionSteps({
          index,
          totalSessions: sessionCount,
          milestoneCount: milestones.length,
          taskTypeCategory,
          milestone,
          component,
          heavyLevel,
        });

        milestoneTheme = milestones
          .slice(groupStart, groupEnd + 1)
          .map((milestoneText) => truncateToWords(milestoneText, 4))
          .join(" → ");
        sessionSuccessCondition = getSuccessCondition(phase, milestone);
      }

      sessions.push({
        title: `Session ${index + 1}: ${sessionTitleLabel}`,
        durationMinutes,
        duration: `${durationMinutes} minutes`,
        focus: getSessionFocus(
          index,
          sessionCount,
          heavyLevel,
          milestones.length,
          component
        ),
        milestoneStartIndex: groupStart,
        milestoneEndIndex: groupEnd,
        milestoneTitle: milestone,
        milestoneTheme,
        steps: sessionSteps,
        successCondition: sessionSuccessCondition,
        dontWorryAbout:
          index === 0
            ? "Do not worry about finishing. The goal is to start and understand the task."
            : index === sessionCount - 1
            ? "Do not aim for perfection. Improve the highest-impact parts first."
            : "Do not jump between sections. Stay with one focused chunk.",
      });

      remainingMinutes -= durationMinutes;
    }

    return {
      taskTitle: task,
      title: task,
      goal: task,
      subject,
      taskType,
      priority,
      difficulty,
      dueDate,
      estimatedHours: safeEstimatedHours,
      totalMinutes,
      heaviness,
      alreadyDone,
      stuckOn,
      source: "IPlan built-in planner",
      overallStrategy:
        "IPlan created this plan using your subject, task type, deadline, estimated task size, priority, difficulty, and heaviness level.",
      nextBestAction:
        heavyLevel >= 4
          ? "Open the task and work for only 10 minutes. Your only goal is to make the task feel less scary."
          : "Open your materials and define what a successful finished task should look like.",
      milestones,
      steps: milestones,
      sessions,
      schedule: sessions.map((session) => session.title),
      advice:
        "Start with the first session even if motivation is low. The goal is not to finish everything immediately; it is to make the task specific and easier to continue.",
      recoveryPlan:
        "If you miss a session, do not restart the whole plan. Move the missed session to the next available day and reduce the next session to its most important task.",
    };
  }

  function buildPlanToSave() {
    if (!breakdown) {
      return null;
    }

    return {
      ...breakdown,
      goal: breakdown.taskTitle || breakdown.title || task,
      title: breakdown.taskTitle || breakdown.title || task,
      subject: breakdown.subject || subject,
      taskType: breakdown.taskType || taskType,
      priority: breakdown.priority || priority,
      difficulty: breakdown.difficulty || difficulty,
      dueDate: breakdown.dueDate || dueDate,
      hours: breakdown.estimatedHours || estimatedHours,
      totalHours: breakdown.estimatedHours || estimatedHours,
      schedule: Array.isArray(breakdown.sessions)
        ? breakdown.sessions.map((session) => session.title)
        : [],
      sessions: breakdown.sessions || [],
      steps: breakdown.milestones || breakdown.steps || [],
      advice:
        breakdown.advice ||
        breakdown.nextBestAction ||
        "Start with the first session and focus on making progress, not perfection.",
      type: "AI Breakdown Plan",
      savedFrom: "AI Breakdown Planner",
      savedAt: new Date().toISOString(),
    };
  }

  function getQuestXPFromDifficulty(taskDifficulty) {
    if (taskDifficulty === "Easy") return 40;
    if (taskDifficulty === "Medium") return 80;
    if (taskDifficulty === "Hard") return 120;

    return 80;
  }

  function buildActiveTaskFromBreakdown() {
    if (!breakdown) {
      return null;
    }

    const milestoneSubtasks = Array.isArray(breakdown.milestones)
      ? breakdown.milestones
      : [];

    const sessionSubtasks = Array.isArray(breakdown.sessions)
      ? breakdown.sessions
          .map((session) => session.title)
          .filter((sessionTitle) => sessionTitle)
      : [];

    const subtasks =
      milestoneSubtasks.length > 0 ? milestoneSubtasks : sessionSubtasks;

    return {
      title: breakdown.taskTitle || breakdown.title || task,
      subject: breakdown.subject || subject,
      taskType: breakdown.taskType || taskType,
      priority: breakdown.priority || priority,
      difficulty: breakdown.difficulty || difficulty,
      dueDate: breakdown.dueDate || dueDate,
      estimatedMinutes:
        breakdown.totalMinutes || Math.round(Number(estimatedHours || 1) * 60),
      xp: getQuestXPFromDifficulty(breakdown.difficulty || difficulty),
      subtasks,
      completed: false,
      source: "AI Breakdown Planner",
      linkedPlanTitle: breakdown.taskTitle || breakdown.title || task,
      createdAt: new Date().toISOString(),
    };
  }

  async function generateBreakdown() {
    if (task.trim() === "") {
      alert("Please enter the task you want to organize.");
      return;
    }

    if (!subject) {
      alert("Please choose a subject.");
      return;
    }

    if (!dueDate) {
      alert("Please choose a due date.");
      return;
    }

    if (!estimatedHours || Number(estimatedHours) <= 0) {
      alert("Please enter how long you think this task will take.");
      return;
    }

    setLoading(true);

    try {
      const fallbackBreakdown = createFallbackBreakdown();

      const suggestedDates = suggestSessionDates(
        fallbackBreakdown.sessions.length
      );

      const suggestedTimes = suggestSessionTimes(
        fallbackBreakdown.sessions.length
      );

      setBreakdown(fallbackBreakdown);
      setSessionDates(suggestedDates);
      setSessionTimes(suggestedTimes);
      setPlannerMode("Built-in planner");
      setActiveTaskSaved(false);

      if (auth.currentUser) {
        await saveBreakdown(auth.currentUser.uid, fallbackBreakdown);
      }
    } catch (error) {
      console.error("Planner error:", error);
      alert("IPlan could not create the plan. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function saveBreakdownToSavedPlans() {
    if (!auth.currentUser) {
      alert("You must be logged in to save this plan.");
      return;
    }

    if (!breakdown) {
      alert("Generate a breakdown first.");
      return;
    }

    const planToSave = buildPlanToSave();

    if (!planToSave) {
      alert("IPlan could not prepare this plan for saving.");
      return;
    }

    try {
      setSavingPlan(true);

      await savePlan(auth.currentUser.uid, planToSave);

      alert("Plan saved to Saved Plans.");
      setPage("plans");
    } catch (error) {
      console.error("Error saving plan:", error);
      alert("Something went wrong while saving this plan.");
    } finally {
      setSavingPlan(false);
    }
  }

  async function addSessionsToCalendar() {
    if (!auth.currentUser) {
      alert("You must be logged in to save sessions.");
      return;
    }

    if (!breakdown) {
      alert("Generate a breakdown first.");
      return;
    }

    const missingSession = breakdown.sessions.find((session, index) => {
      return !sessionDates[index] || !sessionTimes[index];
    });

    if (missingSession) {
      alert("Please choose a date and time for every session.");
      return;
    }

    const planToSave = buildPlanToSave();

    if (!planToSave) {
      alert("IPlan could not prepare this plan for saving.");
      return;
    }

    try {
      await savePlan(auth.currentUser.uid, planToSave);

      for (let index = 0; index < breakdown.sessions.length; index++) {
        const session = breakdown.sessions[index];

        await saveStudySession(auth.currentUser.uid, {
          title: session.title,
          goal: breakdown.taskTitle || breakdown.title || task,
          subject: breakdown.subject || subject,
          taskType: breakdown.taskType || taskType,
          priority: breakdown.priority || priority,
          difficulty: breakdown.difficulty || difficulty,
          dueDate: breakdown.dueDate || dueDate,
          date: sessionDates[index],
          time: sessionTimes[index],
          duration: session.duration,
          durationMinutes: session.durationMinutes,
          focus: session.focus,
          tasks: session.steps || [],
          successCondition: session.successCondition,
          dontWorryAbout: session.dontWorryAbout,
          source: breakdown.source || "AI Breakdown Planner",
          status: "planned",
        });
      }

      clearPlannerDraft();

      alert("Plan saved and sessions added to your calendar.");
      setPage("calendar");
    } catch (error) {
      console.error("Error adding sessions to calendar:", error);
      alert("Something went wrong while saving this plan to the calendar.");
    }
  }

  async function trackBreakdownAsActiveTask() {
    if (!auth.currentUser) {
      alert("You must be logged in to track this task.");
      return;
    }

    if (!breakdown) {
      alert("Generate a breakdown first.");
      return;
    }

    if (activeTaskSaved) {
      setPage("dashboard");
      return;
    }

    const taskToSave = buildActiveTaskFromBreakdown();

    if (!taskToSave) {
      alert("IPlan could not create an active task from this plan.");
      return;
    }

    try {
      const savedTask = await saveQuest(auth.currentUser.uid, taskToSave);

      if (setQuests) {
        setQuests([savedTask, ...quests]);
      }

      setActiveTaskSaved(true);

      alert("This task is now being tracked on your Dashboard.");
    } catch (error) {
      console.error("Error creating active task:", error);
      alert("Something went wrong while tracking this task.");
    }
  }

  return (
    <div className="dashboard">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">AI Breakdown Planner</p>
            <h1>Break Down an IB Task 🧩</h1>

            <p>
              Turn a heavy IB task into clear steps, realistic study sessions,
              and a calendar-ready plan.
            </p>
          </div>

          <button type="button" onClick={() => setPage("plans")}>
            View Saved Plans
          </button>
        </div>

        <section className="breakdown-input-card">
          <div className="breakdown-input-intro">
            <h2>Task Details</h2>
          </div>

          <div className="breakdown-form-grid">
            <div className="form-group full-width">
              <label>Big task</label>
              <input
                type="text"
                placeholder="Example: Finish Biology IA method section"
                value={task}
                onChange={(event) => setTask(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Subject</label>
              {savedSubjects.length > 0 ? (
                <select
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                >
                  {savedSubjects.map((savedSubject) => (
                    <option key={savedSubject.id} value={savedSubject.name}>
                      {savedSubject.name}{" "}
                      {savedSubject.level ? `(${savedSubject.level})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Example: Biology"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                />
              )}
            </div>

            <div className="form-group">
              <label>IB task type</label>
              <select
                value={taskType}
                onChange={(event) => setTaskType(event.target.value)}
              >
                {taskTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>

            <div className="form-group">
              <label>Difficulty</label>
              <select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>

            <div className="form-group">
              <label>Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Estimated hours</label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                placeholder="Example: 3"
                value={estimatedHours}
                onChange={(event) => setEstimatedHours(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Heaviness level</label>
              <select
                value={heaviness}
                onChange={(event) => setHeaviness(event.target.value)}
              >
                <option value="1">1 — Easy</option>
                <option value="2">2 — Manageable</option>
                <option value="3">3 — Heavy</option>
                <option value="4">4 — Stressful</option>
                <option value="5">5 — Overwhelming</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>What have you already done?</label>
              <textarea
                placeholder="Example: I found sources and wrote a rough intro."
                value={alreadyDone}
                onChange={(event) => setAlreadyDone(event.target.value)}
              />
            </div>

            <div className="form-group full-width">
              <label>What are you stuck on?</label>
              <textarea
                placeholder="Example: I don’t know how to structure the method."
                value={stuckOn}
                onChange={(event) => setStuckOn(event.target.value)}
              />
            </div>

            <div className="breakdown-actions full-width">
              <button type="button" onClick={generateBreakdown}>
                {loading ? "Organizing..." : "Organize My Task"}
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={clearPlannerDraft}
              >
                Clear Draft
              </button>
            </div>
          </div>
        </section>

        {breakdown && (
          <>
            <section className="breakdown-strategy-card">
              <div>
                <p className="priority-label">
                  {plannerMode || "Built-in planner"}
                </p>

                <h2>Plan Strategy</h2>

                <p>{breakdown.overallStrategy}</p>
              </div>

              <div className="breakdown-summary-grid">
                <div>
                  <span>Due date</span>
                  <strong>{breakdown.dueDate}</strong>
                </div>

                <div>
                  <span>Total time</span>
                  <strong>{breakdown.totalMinutes} min</strong>
                </div>

                <div>
                  <span>Sessions</span>
                  <strong>{breakdown.sessions.length}</strong>
                </div>

                <div>
                  <span>Priority</span>
                  <strong>{breakdown.priority}</strong>
                </div>
              </div>

              <div className="next-action-box">
                <h3>Next Best Action</h3>
                <p>{breakdown.nextBestAction}</p>
              </div>

              <div className="breakdown-action-row">
                <div className="plan-action-item">
                  <button
                    type="button"
                    className="plan-action-button"
                    onClick={saveBreakdownToSavedPlans}
                    disabled={savingPlan}
                  >
                    {savingPlan ? "Saving..." : "Save to Saved Plans"}
                  </button>

                  <p className="plan-action-description">
                    Use this when you want to keep the full plan for later
                    without scheduling it yet.
                  </p>
                </div>

                <div className="plan-action-item">
                  <button
                    type="button"
                    className="plan-action-button"
                    onClick={addSessionsToCalendar}
                  >
                    Add to Calendar
                  </button>

                  <p className="plan-action-description">
                    Use this when you are ready to schedule actual dated study
                    sessions.
                  </p>
                </div>

                <div className="plan-action-item">
                  <button
                    type="button"
                    className="plan-action-button"
                    onClick={
                      activeTaskSaved
                        ? () => setPage("dashboard")
                        : trackBreakdownAsActiveTask
                    }
                  >
                    {activeTaskSaved
                      ? "View on Dashboard"
                      : "Track as Active Task"}
                  </button>

                  <p className="plan-action-description">
                    {activeTaskSaved
                      ? "This task is already being tracked. Click to view it on your Dashboard."
                      : "Use this when this is something you are actively working on right now."}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="section-title">Milestones</h2>

              <div className="subjects-grid">
                {breakdown.milestones.map((milestone, index) => (
                  <div className="subject-card" key={index}>
                    <h3>Milestone {index + 1}</h3>
                    <p>{milestone}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="section-title">Suggested Calendar Plan</h2>

              <p>
                IPlan suggested dates and times before the due date. You can
                edit them before adding the sessions to your calendar.
              </p>

              <div className="subjects-grid">
                {breakdown.sessions.map((session, index) => (
                  <div className="breakdown-session-card" key={index}>
                    <p className="session-type-label">Session {index + 1}</p>

                    <h3>{session.title}</h3>

                    {session.milestoneTitle && (
                      <div className="session-milestone-link">
                        <p className="session-milestone-badge">
                          {session.milestoneStartIndex ===
                          session.milestoneEndIndex
                            ? `Supports Milestone ${
                                (session.milestoneStartIndex ?? 0) + 1
                              }`
                            : `Supports Milestones ${
                                (session.milestoneStartIndex ?? 0) + 1
                              }–${(session.milestoneEndIndex ?? 0) + 1}`}
                        </p>

                        {session.milestoneTheme && (
                          <p className="session-milestone-theme">
                            {session.milestoneTheme}
                          </p>
                        )}
                      </div>
                    )}

                    <p>{session.focus}</p>

                    <p className="session-duration">
                      Duration: {session.duration}
                    </p>

                    <details className="session-steps-details">
                      <summary>Exact steps</summary>

                      <ul>
                        {(session.steps || []).map((step, stepIndex) => (
                          <li key={stepIndex}>{step}</li>
                        ))}
                      </ul>
                    </details>

                    <h4>Success condition</h4>
                    <p>{session.successCondition}</p>

                    <h4>Do not worry about</h4>
                    <p>{session.dontWorryAbout}</p>

                    <div className="session-schedule-inputs">
                      <div className="form-group">
                        <label>Suggested date</label>
                        <input
                          type="date"
                          value={sessionDates[index] || ""}
                          onChange={(event) =>
                            setSessionDates({
                              ...sessionDates,
                              [index]: event.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label>Suggested time</label>
                        <input
                          type="time"
                          value={sessionTimes[index] || ""}
                          onChange={(event) =>
                            setSessionTimes({
                              ...sessionTimes,
                              [index]: event.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {breakdown.recoveryPlan && (
                <div className="breakdown-strategy-card">
                  <h2>Recovery Plan</h2>
                  <p>{breakdown.recoveryPlan}</p>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default Breakdown;