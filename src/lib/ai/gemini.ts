const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

async function callGemini(parts: GeminiPart[], responseSchema: object) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not set");

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      },
    }),
  });

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

export async function parseSyllabusPdf(pdfBase64: string): Promise<ParsedSyllabus> {
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
    "You are reading a course syllabus PDF. Extract every topic, unit, assignment, and exam in the order " +
    "a student should study/complete them. For each item give: a short title, a week label if the syllabus " +
    "states one (e.g. 'Week 3'), a due date if stated (ISO 8601 yyyy-mm-dd, omit if unclear), and 1-2 " +
    "sentences of relevant detail pulled from the syllabus text.";

  const text = await callGemini(
    [{ text: prompt }, { inlineData: { mimeType: "application/pdf", data: pdfBase64 } }],
    schema
  );

  return JSON.parse(text) as ParsedSyllabus;
}

export type PlanHeading = { heading: string; weekLabel?: string; dueDate?: string };

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
          },
          required: ["heading"],
        },
      },
    },
    required: ["headings"],
  };

  const prompt =
    "Turn this parsed syllabus data into a clean, ordered list of study plan section headings a student " +
    "can follow week by week. Keep each heading short (under 8 words) and student-facing. Data:\n" +
    JSON.stringify(parsed);

  const text = await callGemini([{ text: prompt }], schema);
  return JSON.parse(text) as { headings: PlanHeading[] };
}
