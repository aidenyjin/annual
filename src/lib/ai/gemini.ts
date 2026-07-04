const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_BASE = "https://generativelanguage.googleapis.com";

function apiKey() {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_AI_API_KEY is not set");
  return key;
}

type GeminiPart = { text: string } | { fileData: { mimeType: string; fileUri: string } };

async function generateContentFromParts(parts: GeminiPart[], responseSchema: object) {
  const res = await fetch(
    `${GEMINI_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
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

async function generateContent(prompt: string, responseSchema: object) {
  return generateContentFromParts([{ text: prompt }], responseSchema);
}

/**
 * Fallback for PDFs with no text layer (scanned pages, image-only booklets)
 * where local extraction (lib/pdf.ts) comes back empty. Uploads the file to
 * Gemini's Files API so its vision can read it directly — slower than the
 * text path, so it's only used when the fast path can't work at all.
 */
async function uploadFile(bytes: Buffer, mimeType: string, displayName: string) {
  const startRes = await fetch(`${GEMINI_BASE}/upload/v1beta/files?key=${apiKey()}`, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(bytes.length),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: displayName } }),
  });

  if (!startRes.ok) {
    throw new Error(`Gemini file upload start failed (${startRes.status}): ${await startRes.text()}`);
  }

  const uploadUrl = startRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Gemini did not return an upload URL");

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(bytes.length),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: new Uint8Array(bytes),
  });

  if (!uploadRes.ok) {
    throw new Error(`Gemini file upload failed (${uploadRes.status}): ${await uploadRes.text()}`);
  }

  const { file } = await uploadRes.json();
  return file as { name: string; uri: string; state: string; mimeType: string };
}

async function waitForFileActive(name: string, timeoutMs = 35_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${GEMINI_BASE}/v1beta/${name}?key=${apiKey()}`);
    if (!res.ok) throw new Error(`Gemini file status check failed (${res.status}): ${await res.text()}`);
    const file = await res.json();
    if (file.state === "ACTIVE") return;
    if (file.state === "FAILED") throw new Error("Gemini failed to process the uploaded file");
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Timed out waiting for Gemini to process the uploaded file");
}

export type ParsedTopic = {
  title: string;
  weekLabel?: string;
  dueDate?: string;
  details?: string;
};

export type ParsedSyllabus = { topics: ParsedTopic[] };

const topicsSchema = {
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

const parseInstructions =
  "Extract only the conceptual study topics, lessons, and lectures that a student needs to learn/study " +
  "in the order they are taught — don't skip anything for length. Do NOT extract practical lab experiments, " +
  "homework assignments, projects, or exams as standalone topics or lessons (though you may mention them in the " +
  "details of their corresponding conceptual topic if relevant). For each item give: a short title, a week label if it's " +
  "stated (e.g. 'Week 3'), a due date if stated (ISO 8601 yyyy-mm-dd, omit if unclear), and 2-3 " +
  "sentences of relevant detail (this detail is reused later, so make it useful on its own without " +
  "the rest of the document for context).";

/**
 * The single "reads the whole syllabus" pass. Its output (parsed_data) is
 * saved to the DB so downstream steps (heading generation, hover
 * descriptions) work off this structured data instead of re-reading the PDF.
 * Takes plain extracted text (see lib/pdf.ts) rather than the raw file, so
 * there's no upload/processing round trip before this can run.
 */
export async function parseSyllabusPdf(syllabusText: string): Promise<ParsedSyllabus> {
  const prompt =
    `You are reading the extracted text of a full course syllabus, which may be long. ${parseInstructions}\n\nSyllabus text:\n` +
    syllabusText;

  const text = await generateContent(prompt, topicsSchema);
  return JSON.parse(text) as ParsedSyllabus;
}

/**
 * Fallback for files with no usable text layer (scanned pages, image-only
 * booklets) — reads the PDF directly via Gemini's vision instead of relying
 * on local text extraction.
 */
export async function parseSyllabusFromFile(
  pdfBytes: Buffer,
  displayName: string
): Promise<ParsedSyllabus> {
  const uploaded = await uploadFile(pdfBytes, "application/pdf", displayName);
  await waitForFileActive(uploaded.name);

  const text = await generateContentFromParts(
    [
      { text: `You are reading a course document PDF, which may be long. ${parseInstructions}` },
      { fileData: { mimeType: "application/pdf", fileUri: uploaded.uri } },
    ],
    topicsSchema
  );

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
    "sub-parts of one broader subject (for example, the sub-parts 'Levers', 'Pulleys', and 'Inclined Planes' " +
    "belonging to 'Simple Machines'), group them: create one parent heading for the subject and list the sub-parts " +
    "under its 'subtopics' array instead of as separate top-level headings. Don't force grouping where it " +
    "doesn't naturally fit — most syllabi will have a mix of grouped subjects and standalone topics. Keep " +
    "every heading short (under 8 words) and student-facing (do not append the word 'Unit' to parent headings unless it is explicitly " +
    "named that way in the syllabus). " +
    "Ensure all headings and subtopics represent actual conceptual lessons, lectures, or study topics (such as 'Levers' or 'Pulleys'). " +
    "Do NOT include practical labs/experiments, homework submissions, exams, or projects as standalone lesson headings or subtopics. " +
    "Carry over the relevant 'details' text (or a tightened version of it) for each heading/subtopic so it can be shown later " +
    "without re-reading the syllabus. Data:\n" +
    JSON.stringify(parsed);

  const text = await generateContent(prompt, schema);
  return JSON.parse(text) as { headings: PlanHeading[] };
}
