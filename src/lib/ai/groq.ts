const GROQ_MODEL = "openai/gpt-oss-20b";

export async function generateHoverDescription(heading: string, context?: string) {
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
      messages: [
        {
          role: "system",
          content:
            "You write brief, concrete 1-2 sentence study plan descriptions. No preamble, no markdown, no quotes.",
        },
        {
          role: "user",
          content: `Study plan topic: "${heading}"${
            context ? `\nSyllabus context: ${context}` : ""
          }\n\nWrite a 1-2 sentence description of what to study or do for this topic.`,
        },
      ],
      temperature: 0.4,
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

export type RelevanceVerdict = "related" | "ambiguous" | "unrelated";

/**
 * Fast text-only judgment call on whether a newly-summarized file belongs
 * in a class, weighed against a summary of what's already in it.
 */
export async function classifyFileRelevance(
  classContext: string,
  newFile: { title: string; summary: string }
): Promise<{ verdict: RelevanceVerdict; reason: string }> {
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
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You judge whether a new document belongs in a student\'s course folder. Respond with strict JSON: {"verdict": "related" | "ambiguous" | "unrelated", "reason": "<one short sentence>"}. ' +
            '"related" = clearly part of the same course/subject. "unrelated" = clearly a different subject entirely (e.g. a generic essay-writing guide dropped into a chemistry class). "ambiguous" = unclear either way.',
        },
        {
          role: "user",
          content: `${classContext}\n\nNew file title: "${newFile.title}"\nNew file summary: ${newFile.summary}`,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq request failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no content");

  const parsed = JSON.parse(text) as { verdict: string; reason: string };
  const verdict: RelevanceVerdict =
    parsed.verdict === "related" || parsed.verdict === "unrelated"
      ? parsed.verdict
      : "ambiguous";

  return { verdict, reason: parsed.reason };
}
