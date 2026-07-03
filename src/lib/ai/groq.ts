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
