export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.trim().slice(0, 8192),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Embedding generation failed: ${detail}`);
  }

  const data = await response.json();
  return data.data?.[0]?.embedding ?? [];
}
