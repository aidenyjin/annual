const GROQ_MODEL = "openai/gpt-oss-20b";

async function chatCompletion(options: {
  system: string;
  user: string;
  json?: boolean;
  temperature?: number;
}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
      temperature: options.temperature ?? 0.4,
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq request failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no content");
  return (text as string).trim();
}

export async function generateHoverDescription(heading: string, context?: string) {
  const text = await chatCompletion({
    system:
      "You write brief, concrete 1-2 sentence study plan descriptions. No preamble, no markdown, no quotes.",
    user: `Study plan topic: "${heading}"${
      context ? `\nSyllabus context: ${context}` : ""
    }\n\nWrite a 1-2 sentence description of what to study or do for this topic.`,
  });
  return text;
}

export type QuickSummary = { title: string; summary: string };

/**
 * A cheap skim (not a full parse) used to decide whether a newly-added file
 * belongs in a class before committing to the expensive full parse. Runs on
 * locally-extracted text (see lib/pdf.ts), so it costs nothing on the
 * Gemini side at all.
 */
export async function quickSummarizeText(text: string): Promise<QuickSummary> {
  const excerpt = text.slice(0, 6000);
  const raw = await chatCompletion({
    json: true,
    temperature: 0.2,
    system:
      'Skim this document excerpt just enough to identify what it is — do not do a full read. Respond with strict JSON: {"title": "<a few words>", "summary": "<one sentence on its general subject/purpose>"}.',
    user: excerpt || "(no extractable text found in this file)",
  });
  return JSON.parse(raw) as QuickSummary;
}

export type RelevanceVerdict = "related" | "ambiguous" | "unrelated";

/**
 * Fast text-only judgment call on whether a newly-summarized file belongs
 * in a class, weighed against a summary of what's already in it.
 */
export async function classifyFileRelevance(
  classContext: string,
  newFile: QuickSummary
): Promise<{ verdict: RelevanceVerdict; reason: string }> {
  const raw = await chatCompletion({
    json: true,
    temperature: 0.2,
    system:
      'You judge whether a new document belongs in a student\'s course folder. Respond with strict JSON: {"verdict": "related" | "ambiguous" | "unrelated", "reason": "<one short sentence>"}. ' +
      '"related" = clearly part of the same course/subject. "unrelated" = clearly a different subject entirely (e.g. a generic essay-writing guide dropped into a chemistry class). "ambiguous" = unclear either way.',
    user: `${classContext}\n\nNew file title: "${newFile.title}"\nNew file summary: ${newFile.summary}`,
  });

  const parsed = JSON.parse(raw) as { verdict: string; reason: string };
  const verdict: RelevanceVerdict =
    parsed.verdict === "related" || parsed.verdict === "unrelated"
      ? parsed.verdict
      : "ambiguous";

  return { verdict, reason: parsed.reason };
}
