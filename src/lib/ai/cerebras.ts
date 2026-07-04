const CEREBRAS_MODEL = "gpt-oss-120b";

export async function cerebrasChat(options: {
  system: string;
  user: string;
  json?: boolean;
  temperature?: number;
}) {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) throw new Error("CEREBRAS_API_KEY is not set");

  const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: CEREBRAS_MODEL,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
      temperature: options.temperature ?? 0.5,
    }),
  });

  if (!res.ok) {
    throw new Error(`Cerebras request failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Cerebras returned no content");
  return (text as string).trim();
}
