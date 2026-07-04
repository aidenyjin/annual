/**
 * Lesson generation. Two stages:
 *   - Planning (Groq): titles + dot-point outlines — see planLessonsForTopic
 *     in lib/ai/groq.ts. Runs when the user clicks "Generate lessons".
 *   - Content (Cerebras): turns one lesson's outline into a Duolingo-style
 *     sequence of steps (teaching cards + mixed question types). Runs lazily
 *     when the user opens a lesson.
 *
 * Both fall back to placeholder data if the API call fails, so the feature
 * never hard-breaks while the real models are being dialed in.
 */

import { cerebrasChat } from "@/lib/ai/cerebras";

export type TeachStep = { kind: "teach"; title: string; body: string };
export type McqStep = {
  kind: "mcq";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};
export type MultiStep = {
  kind: "multi";
  question: string;
  options: string[];
  correctIndices: number[];
  explanation: string;
};
export type TrueFalseStep = {
  kind: "truefalse";
  statement: string;
  answer: boolean;
  explanation: string;
};
export type QuestionStep = McqStep | MultiStep | TrueFalseStep;
export type LessonStep = TeachStep | QuestionStep;

export function isQuestion(step: LessonStep): step is QuestionStep {
  return step.kind === "mcq" || step.kind === "multi" || step.kind === "truefalse";
}

// --- Cerebras: turn one lesson's outline into stepped content ---------------

const STEP_SYSTEM =
  "You write one interactive, Duolingo-style lesson as an ordered list of steps. " +
  "Respond with strict JSON: {\"steps\": [ ... ]}. Each step is one of:\n" +
  '- {"kind":"teach","title":"<short>","body":"<1-3 short paragraphs, separated by blank lines>"}\n' +
  '- {"kind":"mcq","question":"...","options":["...", ...],"correctIndex":<int>,"explanation":"..."}\n' +
  '- {"kind":"multi","question":"...","options":["...", ...],"correctIndices":[<int>, ...],"explanation":"..."}\n' +
  '- {"kind":"truefalse","statement":"...","answer":<true|false>,"explanation":"..."}\n' +
  "Interleave teaching cards with questions so the student is checked often. Use a mix of the three " +
  "question types. Aim for 6-10 steps ending on a question. Keep language clear and student-facing.";

export async function generateLessonSteps(
  heading: string,
  title: string,
  outline: string[]
): Promise<LessonStep[]> {
  try {
    const raw = await cerebrasChat({
      json: true,
      system: STEP_SYSTEM,
      user:
        `Course topic: "${heading}"\nLesson: "${title}"\nCover these points in order:\n` +
        outline.map((o) => `- ${o}`).join("\n"),
    });
    const parsed = JSON.parse(raw) as { steps?: unknown[] };
    const steps = sanitizeSteps(parsed.steps ?? []);
    if (steps.length > 0) return steps;
  } catch (err) {
    console.error("Cerebras lesson generation failed; using placeholder", err);
  }
  return placeholderSteps(heading, title, outline);
}

// Defensively coerce model output into our step union, dropping malformed ones.
function sanitizeSteps(raw: unknown[]): LessonStep[] {
  const steps: LessonStep[] = [];
  for (const s of raw) {
    if (!s || typeof s !== "object") continue;
    const step = s as Record<string, unknown>;
    if (step.kind === "teach" && typeof step.title === "string" && typeof step.body === "string") {
      steps.push({ kind: "teach", title: step.title, body: step.body });
    } else if (
      step.kind === "mcq" &&
      typeof step.question === "string" &&
      Array.isArray(step.options) &&
      typeof step.correctIndex === "number"
    ) {
      steps.push({
        kind: "mcq",
        question: step.question,
        options: step.options.map(String),
        correctIndex: step.correctIndex,
        explanation: typeof step.explanation === "string" ? step.explanation : "",
      });
    } else if (
      step.kind === "multi" &&
      typeof step.question === "string" &&
      Array.isArray(step.options) &&
      Array.isArray(step.correctIndices)
    ) {
      steps.push({
        kind: "multi",
        question: step.question,
        options: step.options.map(String),
        correctIndices: step.correctIndices.map(Number),
        explanation: typeof step.explanation === "string" ? step.explanation : "",
      });
    } else if (
      step.kind === "truefalse" &&
      typeof step.statement === "string" &&
      typeof step.answer === "boolean"
    ) {
      steps.push({
        kind: "truefalse",
        statement: step.statement,
        answer: step.answer,
        explanation: typeof step.explanation === "string" ? step.explanation : "",
      });
    }
  }
  return steps;
}

// --- Placeholder fallback ---------------------------------------------------

const PLACEHOLDER_NOTE =
  "(Placeholder — the AI lesson couldn't be generated, so this is stand-in content.)";

function placeholderSteps(heading: string, title: string, outline: string[]): LessonStep[] {
  const steps: LessonStep[] = [
    {
      kind: "teach",
      title,
      body: `${PLACEHOLDER_NOTE}\n\nWelcome to "${title}". We'll go through a few short cards with checks along the way.`,
    },
  ];

  outline.forEach((point, i) => {
    steps.push({
      kind: "teach",
      title: point,
      body: `A clear explanation of "${point.toLowerCase()}" would go here, with an example.`,
    });
    if (i % 2 === 1) {
      steps.push({
        kind: "mcq",
        question: `Which is true about "${point.toLowerCase()}"?`,
        options: [
          `It's a key part of ${heading}`,
          `It's unrelated to ${heading}`,
          `It only appears on the exam`,
        ],
        correctIndex: 0,
        explanation: `It connects directly to ${heading}.`,
      });
    }
  });

  steps.push({
    kind: "truefalse",
    statement: `Understanding ${heading} builds toward later topics.`,
    answer: true,
    explanation: "True — earlier topics support the ones that follow.",
  });
  return steps;
}
