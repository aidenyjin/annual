/**
 * Lesson generation — PROTOTYPE with placeholder data, no API calls yet.
 *
 * The real pipeline (to swap in later) is:
 *   1. Groq  (gpt-oss-20b)  — plans the lessons: for each lesson, a title and
 *      dot points of what it should examine. Cheap "what to teach" step.
 *   2. Cerebras (gpt-oss-120b), call 1 — writes each lesson as a sequence of
 *      Duolingo-style STEPS (teaching cards) from that plan, in one message.
 *   3. Cerebras (gpt-oss-120b), call 2 — writes the question steps, in one message.
 *
 * Each step below is isolated behind a function so replacing it with a real
 * fetch is a local change. `generateLessonsForTopic` is the single seam the
 * server action calls.
 */

export type TeachStep = { kind: "teach"; title: string; body: string };
export type QuestionStep = {
  kind: "question";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};
export type LessonStep = TeachStep | QuestionStep;

export type GeneratedLesson = {
  title: string;
  outline: string[];
  steps: LessonStep[];
};

const PLACEHOLDER_NOTE =
  "(Placeholder — real teaching text will be AI-generated. This is here so you can judge the flow.)";

// Step 1 — Groq planning (placeholder). Returns each lesson's title + outline.
function planLessons(heading: string): { title: string; outline: string[] }[] {
  return [
    {
      title: `Introduction to ${heading}`,
      outline: [
        `What ${heading} is, in plain terms`,
        `Why it matters and where it shows up`,
        `The key vocabulary you'll need`,
      ],
    },
    {
      title: `How ${heading} works`,
      outline: [
        `The core principle behind ${heading}`,
        `A step-by-step walkthrough`,
        `A fully worked example`,
      ],
    },
    {
      title: `Applying ${heading}`,
      outline: [
        `Common real-world applications`,
        `A practice problem to try`,
        `Mistakes students often make`,
      ],
    },
  ];
}

function teachStep(title: string, point: string): TeachStep {
  return {
    kind: "teach",
    title: point,
    body: `Here is where a clear, worked explanation of "${point.toLowerCase()}" would go — a couple of short paragraphs a student can follow, with an example. It's part of the lesson "${title}".`,
  };
}

function questionStep(heading: string, point: string): QuestionStep {
  return {
    kind: "question",
    question: `Quick check: which statement about "${point.toLowerCase()}" is correct?`,
    options: [
      `It's a key part of understanding ${heading}`,
      `It has nothing to do with ${heading}`,
      `It only appears on the exam`,
      `It can be safely ignored`,
    ],
    correctIndex: 0,
    explanation: `Correct — this connects directly to ${heading}.`,
  };
}

// Steps 2 & 3 — Cerebras (placeholder). Interleaves teaching cards and
// questions into the Duolingo-style flow for one lesson.
function buildSteps(
  heading: string,
  title: string,
  outline: string[],
  excerpt: string | null
): LessonStep[] {
  const grounding = excerpt ? `\n\nFrom the syllabus: ${excerpt}` : "";
  const steps: LessonStep[] = [
    {
      kind: "teach",
      title,
      body: `${PLACEHOLDER_NOTE}\n\nWelcome to "${title}". We'll go through a few short cards, with quick checks along the way.${grounding}`,
    },
  ];

  outline.forEach((point, i) => {
    steps.push(teachStep(title, point));
    // Drop a quick check in after every couple of teaching cards.
    if (i % 2 === 1) steps.push(questionStep(heading, point));
  });

  // Always finish on a question so every lesson ends with a check.
  steps.push(questionStep(heading, outline[outline.length - 1] ?? title));
  return steps;
}

/**
 * The single entry point the server action calls. Composes plan → steps into
 * the lessons for one topic.
 */
export function generateLessonsForTopic(
  heading: string,
  excerpt: string | null
): GeneratedLesson[] {
  const plan = planLessons(heading); // Groq (placeholder)
  return plan.map((lesson) => ({
    title: lesson.title,
    outline: lesson.outline,
    steps: buildSteps(heading, lesson.title, lesson.outline, excerpt), // Cerebras (placeholder)
  }));
}
