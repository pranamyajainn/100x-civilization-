/**
 * POST /api/embed
 *
 * Generates a text embedding using OpenAI text-embedding-3-small.
 * Called server-to-server or from server actions — not from browser directly.
 *
 * Request body: { text: string }
 * Response: { embedding: number[] } or { error: string }
 *
 * DECISION: Using text-embedding-3-small per PRD model requirements.
 * Dimensions: 1536. Cost: $0.00002 per 1K tokens.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.trim().slice(0, 8192), // max safe length
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("[embed] OpenAI error:", err);
      return NextResponse.json(
        { error: "Embedding generation failed", detail: err },
        { status: 502 }
      );
    }

    const data = await res.json();
    const embedding: number[] = data.data?.[0]?.embedding ?? [];

    return NextResponse.json({ embedding });
  } catch (err) {
    console.error("[embed] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
