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

export type LessonPlan = { title: string; outline: string[] };

/**
 * Groq plans the lessons for a topic — cheap "what to teach" step. Returns
 * each lesson's title and dot-point outline (what it will examine). Cerebras
 * later turns each into full stepped content.
 */
export async function planLessonsForTopic(
  heading: string,
  excerpt: string | null
): Promise<LessonPlan[]> {
  const raw = await chatCompletion({
    json: true,
    temperature: 0.4,
    system:
      "You plan a short sequence of lessons for one study topic. Respond with strict JSON: " +
      '{"lessons": [{"title": "<short lesson title>", "outline": ["<dot point>", ...]}, ...]}. ' +
      "Give 2-4 lessons that build in order, each with 3-4 concise outline points describing the " +
      "concepts that lesson will teach. Focus on what a student needs to learn — not labs, homework, " +
      "or assignments.",
    user: `Topic: "${heading}"${excerpt ? `\nContext: ${excerpt}` : ""}`,
  });

  const parsed = JSON.parse(raw) as { lessons?: LessonPlan[] };
  return (parsed.lessons ?? []).filter((l) => l.title && Array.isArray(l.outline));
}
