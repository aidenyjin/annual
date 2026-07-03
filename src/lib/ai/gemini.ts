const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_BASE = "https://generativelanguage.googleapis.com";

function apiKey() {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_AI_API_KEY is not set");
  return key;
}

async function generateContent(prompt: string, responseSchema: object) {
  const res = await fetch(
    `${GEMINI_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini request failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return text as string;
}

export type ParsedTopic = {
  title: string;
  weekLabel?: string;
  dueDate?: string;
  details?: string;
};

export type ParsedSyllabus = { topics: ParsedTopic[] };

/**
 * The single "reads the whole syllabus" pass. Its output (parsed_data) is
 * saved to the DB so downstream steps (heading generation, hover
 * descriptions) work off this structured data instead of re-reading the PDF.
 * Takes plain extracted text (see lib/pdf.ts) rather than the raw file, so
 * there's no upload/processing round trip before this can run.
 */
export async function parseSyllabusPdf(syllabusText: string): Promise<ParsedSyllabus> {
  const schema = {
    type: "object",
    properties: {
      topics: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            weekLabel: { type: "string" },
            dueDate: { type: "string" },
            details: { type: "string" },
          },
          required: ["title"],
        },
      },
    },
    required: ["topics"],
  };

  const prompt =
    "You are reading the extracted text of a full course syllabus, which may be long. Extract every " +
    "topic, unit, assignment, and exam in the order a student should study/complete them — don't skip " +
    "anything for length. For each item give: a short title, a week label if the syllabus states one " +
    "(e.g. 'Week 3'), a due date if stated (ISO 8601 yyyy-mm-dd, omit if unclear), and 2-3 sentences " +
    "of relevant detail pulled from the syllabus text (this detail is reused later, so make it useful " +
    "on its own without the rest of the syllabus for context).\n\nSyllabus text:\n" +
    syllabusText;

  const text = await generateContent(prompt, schema);
  return JSON.parse(text) as ParsedSyllabus;
}

export type PlanSubtopic = {
  heading: string;
  weekLabel?: string;
  dueDate?: string;
  details?: string;
};

export type PlanHeading = PlanSubtopic & {
  subtopics?: PlanSubtopic[];
};

const subtopicSchema = {
  type: "object",
  properties: {
    heading: { type: "string" },
    weekLabel: { type: "string" },
    dueDate: { type: "string" },
    details: { type: "string" },
  },
  required: ["heading"],
};

export async function generateHeadings(parsed: ParsedSyllabus): Promise<{ headings: PlanHeading[] }> {
  const schema = {
    type: "object",
    properties: {
      headings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            heading: { type: "string" },
            weekLabel: { type: "string" },
            dueDate: { type: "string" },
            details: { type: "string" },
            subtopics: { type: "array", items: subtopicSchema },
          },
          required: ["heading"],
        },
      },
    },
    required: ["headings"],
  };

  const prompt =
    "Turn this parsed syllabus data into a clean, ordered study plan a student can follow week by week. " +
    "Most items should be standalone top-level headings. But when several consecutive topics are clearly " +
    "sub-parts of one broader unit (e.g. 'Levers', 'Pulleys', and 'Inclined Planes' all belonging to a " +
    "'Simple Machines' unit), group them: create one parent heading for the unit and list the sub-parts " +
    "under its 'subtopics' array instead of as separate top-level headings. Don't force grouping where it " +
    "doesn't naturally fit — most syllabi will have a mix of grouped units and standalone topics. Keep " +
    "every heading short (under 8 words) and student-facing. Carry over the relevant 'details' text (or a " +
    "tightened version of it) for each heading/subtopic so it can be shown later without re-reading the " +
    "syllabus. Data:\n" +
    JSON.stringify(parsed);

  const text = await generateContent(prompt, schema);
  return JSON.parse(text) as { headings: PlanHeading[] };
}
