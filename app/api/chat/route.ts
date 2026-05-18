import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { generateEmbedding } from "@/lib/embeddings";
import { cosineSimilarity } from "@/lib/matching";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are Civ, the intelligent directory assistant for 100x Civilization — a private network of 100xEngineers alumni. You help members find the right people inside the network.

When someone asks for help finding a person, search only from the member profiles provided to you as context. Never make up people or skills.

Be direct, warm, and specific. Name the people. Explain why they match. Keep responses under 150 words. Do not use bullet points — write in natural flowing sentences.

If no one in the context matches well, say so honestly and suggest they post an opportunity instead so matched members get notified.

Sign off every response as — Civ`;

const FALLBACK_REPLY =
  "I'm having trouble searching right now. Try posting an opportunity and the right people will be notified directly.";

interface MemberDoc {
  uid: string;
  fullName: string;
  email: string;
  skillTags: string[];
  linkedinUrl: string;
  cohort: string;
  currentRole: string;
  embedding: number[];
}

export async function POST(req: NextRequest) {
  const authUser = await verifyIdToken(req);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let message: string;
  try {
    const body = await req.json();
    message = typeof body.message === "string" ? body.message.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!message || message.length > 500) {
    return NextResponse.json(
      { error: "Message must be 1–500 characters" },
      { status: 400 }
    );
  }

  try {
    // Fetch approved members
    const snapshot = await adminDb
      .collection("users")
      .where("status", "==", "approved")
      .where("onboardingComplete", "==", true)
      .limit(200)
      .get();

    const members: MemberDoc[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        fullName: typeof data.fullName === "string" ? data.fullName : "",
        email: typeof data.email === "string" ? data.email : "",
        skillTags: Array.isArray(data.skillTags) ? data.skillTags : [],
        linkedinUrl: typeof data.linkedinUrl === "string" ? data.linkedinUrl : "",
        cohort: typeof data.cohort === "string" ? data.cohort : "",
        currentRole: typeof data.currentRole === "string" ? data.currentRole : "",
        embedding: Array.isArray(data.embedding) ? data.embedding : [],
      };
    });

    // Generate embedding for the query
    let queryEmbedding: number[] = [];
    try {
      queryEmbedding = await generateEmbedding(message);
    } catch {
      // non-fatal — fall back to keyword matching
    }

    const messageLower = message.toLowerCase();

    // Score each member
    const scored = members.map((member) => {
      let score: number;
      if (queryEmbedding.length > 0 && member.embedding.length > 0) {
        score = cosineSimilarity(queryEmbedding, member.embedding);
      } else {
        // Keyword overlap fallback
        const matchCount = member.skillTags.filter((tag) =>
          messageLower.includes(tag.toLowerCase())
        ).length;
        score = matchCount > 0 ? matchCount / member.skillTags.length : 0;
      }
      return { member, score };
    });

    const top5 = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => s.member);

    // Build context string
    const context = top5
      .map((m, i) => {
        const lines = [
          `Member ${i + 1}: ${m.fullName}, Cohort ${m.cohort}`,
          `Role: ${m.currentRole || "not specified"}`,
          `Skills: ${m.skillTags.join(", ") || "not specified"}`,
          `LinkedIn: ${m.linkedinUrl || "not provided"}`,
        ];
        return lines.join("\n");
      })
      .join("\n\n");

    // Call Groq
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ reply: FALLBACK_REPLY });
    }

    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 300,
          temperature: 0.7,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Member profiles in the network:\n\n${context}\n\nQuestion from a member: ${message}`,
            },
          ],
        }),
      }
    );

    if (!groqRes.ok) {
      console.error("[chat] Groq error:", await groqRes.text());
      return NextResponse.json({ reply: FALLBACK_REPLY });
    }

    const groqData = await groqRes.json();
    const reply: string =
      groqData.choices?.[0]?.message?.content?.trim() ?? FALLBACK_REPLY;

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[chat] error:", err);
    return NextResponse.json({ reply: FALLBACK_REPLY });
  }
}
