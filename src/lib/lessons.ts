/**
 * Lesson generation — PROTOTYPE with placeholder data, no API calls yet.
 *
 * The real pipeline (to swap in later) is:
 *   1. Groq  (gpt-oss-20b)  — plans the lessons: for each lesson, a title and
 *      dot points of what it should examine. Cheap "what to teach" step.
 *   2. Cerebras (gpt-oss-120b), call 1 — writes all the lesson *content* from
 *      that plan in one message.
 *   3. Cerebras (gpt-oss-120b), call 2 — writes all the *quizzes* in one message.
 *
 * Each step below is isolated behind a function so replacing it with a real
 * fetch is a local change. `generateLessonsForTopic` is the single seam the
 * server action calls.
 */

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
};

export type GeneratedLesson = {
  title: string;
  outline: string[];
  content: string;
  quiz: QuizQuestion[];
};

const PLACEHOLDER_NOTE =
  "(Placeholder — real content will be AI-generated. This is here so you can judge the format.)";

// Step 1 — Groq planning (placeholder). Returns the lesson skeleton.
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

// Step 2 — Cerebras content (placeholder). In the real version this is ONE
// call that writes every lesson's content together.
function writeContent(title: string, outline: string[], excerpt: string | null): string {
  const intro = `${PLACEHOLDER_NOTE}\n\nThis lesson, "${title}", walks through the ideas below.`;
  const body = outline
    .map(
      (point, i) =>
        `${i + 1}. ${point}\n\nHere is where a clear, worked explanation of "${point.toLowerCase()}" would go, with an example a student can follow along with.`
    )
    .join("\n\n");
  const grounding = excerpt
    ? `\n\nFrom the syllabus: ${excerpt}`
    : "";
  return `${intro}\n\n${body}${grounding}`;
}

// Step 3 — Cerebras quizzes (placeholder). In the real version this is ONE
// call that writes every lesson's quiz together.
function writeQuiz(heading: string, title: string): QuizQuestion[] {
  return [
    {
      question: `Which best describes the main idea of "${title}"?`,
      options: [
        `A core concept within ${heading}`,
        `An unrelated topic`,
        `A type of assessment`,
        `None of the above`,
      ],
      correctIndex: 0,
    },
    {
      question: `Why is understanding ${heading} useful?`,
      options: [
        `It only matters for exams`,
        `It builds toward later topics and real applications`,
        `It has no practical use`,
        `It replaces the need to study`,
      ],
      correctIndex: 1,
    },
  ];
}

/**
 * The single entry point the server action calls. Composes plan → content →
 * quizzes into the lessons for one topic.
 */
export function generateLessonsForTopic(
  heading: string,
  excerpt: string | null
): GeneratedLesson[] {
  const plan = planLessons(heading); // Groq (placeholder)
  return plan.map((lesson) => ({
    title: lesson.title,
    outline: lesson.outline,
    content: writeContent(lesson.title, lesson.outline, excerpt), // Cerebras call 1 (placeholder)
    quiz: writeQuiz(heading, lesson.title), // Cerebras call 2 (placeholder)
  }));
}
