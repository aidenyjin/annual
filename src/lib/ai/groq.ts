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
