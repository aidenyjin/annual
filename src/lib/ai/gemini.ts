const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_BASE = "https://generativelanguage.googleapis.com";

function apiKey() {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_AI_API_KEY is not set");
  return key;
}

/**
 * Large PDFs (textbooks, full-semester syllabi) can exceed the ~20MB inline
 * request limit and bloat ~33% when base64-encoded, so we upload via the
 * Files API and reference the file by URI instead of inlining the bytes.
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

async function waitForFileActive(name: string, timeoutMs = 60_000) {
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

type GeminiPart =
  | { text: string }
  | { fileData: { mimeType: string; fileUri: string } };

async function generateContent(parts: GeminiPart[], responseSchema: object) {
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
 */
export async function parseSyllabusPdf(
  pdfBytes: Buffer,
  displayName: string
): Promise<ParsedSyllabus> {
  const uploaded = await uploadFile(pdfBytes, "application/pdf", displayName);
  await waitForFileActive(uploaded.name);

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
    "You are reading a full course syllabus PDF, which may be long. Extract every topic, unit, " +
    "assignment, and exam in the order a student should study/complete them — don't skip anything " +
    "for length. For each item give: a short title, a week label if the syllabus states one " +
    "(e.g. 'Week 3'), a due date if stated (ISO 8601 yyyy-mm-dd, omit if unclear), and 2-3 sentences " +
    "of relevant detail pulled from the syllabus text (this detail is reused later, so make it useful " +
    "on its own without the rest of the syllabus for context).";

  const text = await generateContent(
    [{ text: prompt }, { fileData: { mimeType: "application/pdf", fileUri: uploaded.uri } }],
    schema
  );

  return JSON.parse(text) as ParsedSyllabus;
}

export type PlanHeading = {
  heading: string;
  weekLabel?: string;
  dueDate?: string;
  details?: string;
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
          },
          required: ["heading"],
        },
      },
    },
    required: ["headings"],
  };

  const prompt =
    "Turn this parsed syllabus data into a clean, ordered list of study plan section headings a student " +
    "can follow week by week. Keep each heading short (under 8 words) and student-facing. Carry over the " +
    "relevant 'details' text (or a tightened version of it) for each heading so it can be shown later " +
    "without re-reading the syllabus. Data:\n" +
    JSON.stringify(parsed);

  const text = await generateContent([{ text: prompt }], schema);
  return JSON.parse(text) as { headings: PlanHeading[] };
}

export type QuickSummary = { title: string; summary: string };

/**
 * A cheap skim (not a full parse) used to decide whether a newly-added file
 * belongs in a class before committing to the expensive full parse.
 */
export async function quickSummarizeFile(
  pdfBytes: Buffer,
  displayName: string
): Promise<QuickSummary> {
  const uploaded = await uploadFile(pdfBytes, "application/pdf", displayName);
  await waitForFileActive(uploaded.name);

  const schema = {
    type: "object",
    properties: {
      title: { type: "string" },
      summary: { type: "string" },
    },
    required: ["title", "summary"],
  };

  const prompt =
    "Skim this PDF just enough to identify what it is — do not do a full read. Return a short title " +
    "(a few words) and one sentence describing its general subject or purpose.";

  const text = await generateContent(
    [{ text: prompt }, { fileData: { mimeType: "application/pdf", fileUri: uploaded.uri } }],
    schema
  );

  return JSON.parse(text) as QuickSummary;
}
