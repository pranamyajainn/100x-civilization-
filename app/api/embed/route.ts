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
import { verifyIdToken } from "@/lib/auth-middleware";
import { generateEmbedding } from "@/lib/embeddings";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const authUser = await verifyIdToken(req);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getRequestIp(req);
  const limit = checkRateLimit(`embed:${ip}`, 10, 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many embedding requests. Please wait a minute." }, { status: 429 });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const embedding = await generateEmbedding(text);
    return NextResponse.json({ embedding });
  } catch (err) {
    console.error("[embed] Unexpected error:", err);
    if (err instanceof Error && err.message.includes("OPENAI_API_KEY not configured")) {
      return NextResponse.json({ error: "Embeddings are not configured on the server." }, { status: 503 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
