/**
 * scripts/seed.ts
 *
 * Synthetic data seeder for QA and capstone demo.
 * Run with: npx ts-node scripts/seed.ts
 *
 * Requires: .env.local with OPENAI_API_KEY set
 *
 * Creates:
 * - 10 synthetic user profiles (marked isSeedData: true)
 * - 5 synthetic posts (marked isSeedData: true)
 * - Generates real OpenAI embeddings for each
 * - Prints match table: for each post, top 3 matched users by cosine similarity
 *
 * Uses Firestore REST API directly to avoid firebase-admin dependency.
 * Does NOT touch waitlist_signups or metadata collections.
 */

import { createHash } from "crypto";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("❌  OPENAI_API_KEY not found in .env.local — aborting.");
  process.exit(1);
}

// Load firebase config
const configPath = path.resolve(__dirname, "../firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const { projectId, firestoreDatabaseId: dbId, apiKey } = firebaseConfig;
const BASE = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeedUser {
  uid: string;
  fullName: string;
  cohort: string;
  currentRole: string;
  skillTags: string[];
  email: string;
  availability: string;
}

interface SeedPost {
  id: string;
  type: string;
  title: string;
  description: string;
  skillTags: string[];
  posterUid: string;
  posterName: string;
  posterCohort: string;
}

// ─── Seed Data Definitions ────────────────────────────────────────────────────

const SEED_USERS: SeedUser[] = [
  {
    uid: "seed-user-101",
    fullName: "Test User 101",
    cohort: "Cohort 1",
    currentRole: "Founder",
    skillTags: ["founder", "go-to-market", "pitch-decks", "investor-relations", "startup-ops"],
    email: "testuser101@seed.dev",
    availability: "open",
  },
  {
    uid: "seed-user-102",
    fullName: "Test User 102",
    cohort: "Cohort 2",
    currentRole: "Engineer",
    skillTags: ["backend-development", "python", "fastapi", "postgresql", "system-design", "co-founding"],
    email: "testuser102@seed.dev",
    availability: "actively-looking",
  },
  {
    uid: "seed-user-103",
    fullName: "Test User 103",
    cohort: "Cohort 3",
    currentRole: "Product Manager",
    skillTags: ["product-management", "product-strategy", "b2b-product", "roadmapping", "user-research"],
    email: "testuser103@seed.dev",
    availability: "open",
  },
  {
    uid: "seed-user-104",
    fullName: "Test User 104",
    cohort: "Cohort 4",
    currentRole: "Engineer",
    skillTags: ["machine-learning", "llm-engineering", "python", "rag-systems", "ai-agents", "mlops"],
    email: "testuser104@seed.dev",
    availability: "open",
  },
  {
    uid: "seed-user-105",
    fullName: "Test User 105",
    cohort: "Cohort 3",
    currentRole: "Frontend Developer",
    skillTags: ["frontend-development", "react", "next-js", "typescript", "performance-optimization", "design-systems"],
    email: "testuser105@seed.dev",
    availability: "actively-looking",
  },
  {
    uid: "seed-user-106",
    fullName: "Test User 106",
    cohort: "Cohort 5",
    currentRole: "Growth Marketer",
    skillTags: ["growth-hacking", "meta-ads", "google-ads", "performance-marketing", "seo", "email-marketing"],
    email: "testuser106@seed.dev",
    availability: "open",
  },
  {
    uid: "seed-user-107",
    fullName: "Test User 107",
    cohort: "Cohort 4",
    currentRole: "Founder",
    skillTags: ["founder", "fundraising", "venture-capital", "financial-modeling", "pitch-decks", "b2b-sales"],
    email: "testuser107@seed.dev",
    availability: "not-available",
  },
  {
    uid: "seed-user-108",
    fullName: "Test User 108",
    cohort: "Cohort 5",
    currentRole: "Growth Marketer",
    skillTags: ["meta-ads", "performance-marketing", "copywriting", "social-media", "content-marketing"],
    email: "testuser108@seed.dev",
    availability: "actively-looking",
  },
  {
    uid: "seed-user-109",
    fullName: "Test User 109",
    cohort: "Cohort 5",
    currentRole: "Engineer",
    skillTags: ["data-science", "data-engineering", "python", "analytics", "postgresql", "kafka"],
    email: "testuser109@seed.dev",
    availability: "open",
  },
  {
    uid: "seed-user-110",
    fullName: "Test User 110",
    cohort: "Cohort 6",
    currentRole: "Founder",
    skillTags: ["founder", "venture-capital", "angel-investing", "investor-relations", "startup-finance", "fundraising"],
    email: "testuser110@seed.dev",
    availability: "open",
  },
];

const SEED_POSTS: SeedPost[] = [
  {
    id: "seed-post-1",
    type: "hiring",
    title: "Senior AI Engineer — LLM systems and RAG pipelines",
    description: "We are building an AI-first B2B tool for internal knowledge management. Looking for a senior AI engineer who can own our LLM pipeline, RAG architecture, and production MLOps. Strong Python required. Remote-friendly, Series A funding in place.",
    skillTags: ["machine-learning", "llm-engineering", "rag-systems", "python", "mlops"],
    posterUid: "seed-user-104",
    posterName: "Test User 104",
    posterCohort: "Cohort 4",
  },
  {
    id: "seed-post-2",
    type: "co-founder",
    title: "Technical co-founder for B2B SaaS in HR-tech",
    description: "I am a solo founder with a signed LOI from our first enterprise customer. Looking for a CTO co-founder to own the product and engineering. Ideal candidate: full-stack with strong backend, has built or contributed to B2B SaaS products before.",
    skillTags: ["co-founding", "backend-development", "system-design", "b2b-product", "product-strategy"],
    posterUid: "seed-user-102",
    posterName: "Test User 102",
    posterCohort: "Cohort 2",
  },
  {
    id: "seed-post-3",
    type: "paid-project",
    title: "Meta Ads expert needed for 4-week growth sprint",
    description: "Series A startup in fintech looking for a Meta Ads specialist to run a 4-week paid acquisition sprint. We have existing creative assets. Need someone who can set up campaigns, run A/B tests, and report weekly. Budget: $3K fixed.",
    skillTags: ["meta-ads", "performance-marketing", "growth-hacking", "copywriting"],
    posterUid: "seed-user-108",
    posterName: "Test User 108",
    posterCohort: "Cohort 5",
  },
  {
    id: "seed-post-4",
    type: "pressure-test",
    title: "Looking for feedback on my MVP before YC demo day",
    description: "I am presenting at a YC demo day in 3 weeks. My product is a developer productivity tool — AI-assisted code review. I want 2–3 experienced alumni to break it, poke holes in the pitch, and give blunt feedback. 1-hour session, remote.",
    skillTags: ["founder", "pitch-decks", "developer-tools", "product-management", "go-to-market"],
    posterUid: "seed-user-101",
    posterName: "Test User 101",
    posterCohort: "Cohort 1",
  },
  {
    id: "seed-post-5",
    type: "warm-intro",
    title: "Intro to fintech investors in Southeast Asia",
    description: "We are a Series A-stage fintech company expanding to SEA. Looking for warm introductions to investors with a Southeast Asia thesis — particularly anyone with portfolio companies in Indonesia or Vietnam.",
    skillTags: ["investor-relations", "fundraising", "venture-capital", "angel-investing"],
    posterUid: "seed-user-110",
    posterName: "Test User 110",
    posterCohort: "Cohort 6",
  },
];

// ─── OpenAI Embedding ─────────────────────────────────────────────────────────

async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embedding failed: ${err}`);
  }

  const json = await res.json();
  return json.data[0].embedding as number[];
}

// ─── Firestore REST Helpers ───────────────────────────────────────────────────

function makeStringArrayValue(tags: string[]) {
  return {
    arrayValue: {
      values: tags.map((t) => ({ stringValue: t })),
    },
  };
}

function makeEmbeddingValue(emb: number[]) {
  return {
    arrayValue: {
      values: emb.map((v) => ({ doubleValue: v })),
    },
  };
}

async function firestorePatch(collection: string, docId: string, fields: object) {
  const url = `${BASE}/${collection}/${docId}?key=${apiKey}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Firestore PATCH ${collection}/${docId} failed: ${body}`);
  }
  return res.json();
}

// ─── Cosine Similarity (inline copy — no module import in standalone script) ──

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  100x Civilization — Seed Script");
  console.log("────────────────────────────────────");
  console.log(`Project: ${projectId}`);
  console.log(`Database: ${dbId}\n`);

  // ── Step 1: Generate embeddings for all users ──
  console.log("🔢  Generating embeddings for 10 seed users...");
  const userEmbeddings: Record<string, number[]> = {};

  for (const u of SEED_USERS) {
    const text = u.skillTags.join(" ");
    process.stdout.write(`  [${u.uid}] ${u.fullName}... `);
    try {
      userEmbeddings[u.uid] = await generateEmbedding(text);
      console.log("✓");
    } catch (err: any) {
      console.log(`✗ (${err.message})`);
      userEmbeddings[u.uid] = [];
    }
    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  // ── Step 2: Write user documents ──
  console.log("\n📝  Writing user documents to Firestore...");
  for (const u of SEED_USERS) {
    await firestorePatch("users", u.uid, {
      uid: { stringValue: u.uid },
      email: { stringValue: u.email },
      fullName: { stringValue: u.fullName },
      cohort: { stringValue: u.cohort },
      currentRole: { stringValue: u.currentRole },
      skillTags: makeStringArrayValue(u.skillTags),
      availability: { stringValue: u.availability },
      contactEmail: { stringValue: u.email },
      contactVisible: { booleanValue: true },
      embedding: makeEmbeddingValue(userEmbeddings[u.uid] ?? []),
      notificationsEnabled: { booleanValue: true },
      onboardingComplete: { booleanValue: true },
      consentGiven: { booleanValue: true },
      consentVersion: { stringValue: "1.0" },
      isSeedData: { booleanValue: true },
      createdAt: { timestampValue: new Date().toISOString() },
      updatedAt: { timestampValue: new Date().toISOString() },
    });
    console.log(`  ✓ ${u.uid} (${u.fullName})`);
  }

  // ── Step 3: Generate embeddings for all posts ──
  console.log("\n🔢  Generating embeddings for 5 seed posts...");
  const postEmbeddings: Record<string, number[]> = {};

  for (const p of SEED_POSTS) {
    const text = `${p.type} ${p.title} ${p.description} ${p.skillTags.join(" ")}`;
    process.stdout.write(`  [${p.id}] ${p.title.slice(0, 50)}... `);
    try {
      postEmbeddings[p.id] = await generateEmbedding(text);
      console.log("✓");
    } catch (err: any) {
      console.log(`✗ (${err.message})`);
      postEmbeddings[p.id] = [];
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  // ── Step 4: Write post documents ──
  console.log("\n📝  Writing post documents to Firestore...");
  for (const p of SEED_POSTS) {
    await firestorePatch("posts", p.id, {
      id: { stringValue: p.id },
      type: { stringValue: p.type },
      title: { stringValue: p.title },
      description: { stringValue: p.description },
      skillTags: makeStringArrayValue(p.skillTags),
      posterUid: { stringValue: p.posterUid },
      posterName: { stringValue: p.posterName },
      posterCohort: { stringValue: p.posterCohort },
      embedding: makeEmbeddingValue(postEmbeddings[p.id] ?? []),
      contactEmail: { stringValue: "demo@seed.dev" },
      contactVisible: { booleanValue: true },
      availability: { stringValue: "immediate" },
      status: { stringValue: "open" },
      isSeedData: { booleanValue: true },
      createdAt: { timestampValue: new Date().toISOString() },
    });
    console.log(`  ✓ ${p.id} (${p.type})`);
  }

  // ── Step 5: Match verification table ──
  console.log("\n📊  MATCH VERIFICATION TABLE");
  console.log("═══════════════════════════════════════════════════════════════");

  for (const p of SEED_POSTS) {
    const postEmb = postEmbeddings[p.id];
    console.log(`\n▸ Post: "${p.title}"`);
    console.log(`  Type: ${p.type} | Poster: ${p.posterName} (${p.posterCohort})`);
    console.log(`  Skills: ${p.skillTags.join(", ")}`);

    if (!postEmb || postEmb.length === 0) {
      console.log("  ⚠️  No embedding — skipping match scoring");
      continue;
    }

    const scores = SEED_USERS
      .filter((u) => u.uid !== p.posterUid) // exclude poster
      .map((u) => {
        const score = userEmbeddings[u.uid]?.length
          ? cosineSimilarity(postEmb, userEmbeddings[u.uid])
          : 0;
        return { uid: u.uid, name: u.fullName, cohort: u.cohort, role: u.currentRole, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    console.log("  Top 3 matches:");
    scores.forEach((s, i) => {
      const crossCohort = s.cohort !== p.posterCohort ? " [CROSS-COHORT]" : "";
      console.log(`    ${i + 1}. ${s.name} (${s.cohort}, ${s.role}) — score: ${s.score.toFixed(4)}${crossCohort}`);
    });
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("✅  Seeding complete.");
  console.log("   Run `npx ts-node scripts/seed-cleanup.ts` to remove seed data.");
}

main().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
