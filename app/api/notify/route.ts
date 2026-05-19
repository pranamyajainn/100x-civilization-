import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { rankMatches, UserProfile } from "@/lib/matching";
import { sendMatchNotification } from "@/lib/email";
import { verifyIdToken } from "@/lib/auth-middleware";
import { generateEmbedding } from "@/lib/embeddings";
import { adminDb } from "@/lib/firebase-admin";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

async function fetchAllUsers(): Promise<UserProfile[]> {
  // TODO v2: replace with pgvector ANN query
  // Current: O(n) full scan, acceptable to ~500 users
  const snapshot = await adminDb.collection("users").limit(500).get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      if (data.status !== "approved") {
        return null;
      }

      return {
        uid: data.uid ?? doc.id,
        email: data.email ?? "",
        fullName: data.fullName ?? "",
        cohort: data.cohort ?? "",
        skillTags: Array.isArray(data.skillTags) ? data.skillTags : [],
        embedding: Array.isArray(data.embedding) ? data.embedding : [],
        notificationsEnabled: data.notificationsEnabled ?? true,
        hiddenFromFeed: data.hiddenFromFeed ?? false,
      } as UserProfile;
    })
    .filter((user): user is UserProfile => user !== null);
}

export async function POST(req: NextRequest) {
  const authUser = await verifyIdToken(req);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getRequestIp(req);
  const limit = checkRateLimit(`notify:${ip}`, 5, 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many notification requests. Please wait a minute." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const postId = typeof body.postId === "string" ? body.postId : "";

    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    const postDoc = await adminDb.collection("posts").doc(postId).get();
    if (!postDoc.exists) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const post = postDoc.data() ?? {};
    const authorUid = post.authorUid ?? post.posterUid;

    if (authorUid !== authUser.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await fetchAllUsers();
    if (users.length === 0) {
      return NextResponse.json({ matched: 0, sent: 0 });
    }

    const warnings: string[] = [];
    const postEmbeddingSource = buildPostEmbeddingSource(post);
    let postEmbedding: number[] | null = Array.isArray(post.embedding) && post.embedding.length > 0
      ? post.embedding
      : null;

    if (!postEmbedding && postEmbeddingSource.trim().length > 0) {
      try {
        postEmbedding = await generateEmbedding(postEmbeddingSource);
      } catch (error) {
        console.error("[notify] post embedding generation failed:", error);
        warnings.push("Match notifications were sent without a semantic embedding.");
      }
    }

    const matches = rankMatches(
      {
        title: post.title ?? "",
        type: post.type ?? "",
        description: post.description ?? "",
        skillTags: Array.isArray(post.skillTags) ? post.skillTags : [],
        embedding: postEmbedding ?? null,
      },
      users,
      authUser.uid
    );

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    let sent = 0;

    for (const match of matches) {
      const success = await sendMatchNotification({
        to: match.email,
        recipientName: match.fullName,
        posterName: post.posterName ?? "",
        posterCohort: post.posterCohort ?? "",
        opportunityType: post.type ?? "",
        opportunityTitle: post.title ?? "",
        matchedSkills: match.matchedSkills,
        postUrl: `${appUrl}/app/posts/${postId}`,
        settingsUrl: `${appUrl}/app/profile`,
      });

      if (success) {
        sent++;
        const notifId = `${match.uid}_${postId}`;
        await adminDb.collection("notifications").doc(notifId).set({
          uid: match.uid,
          email: match.email,
          postId,
          postType: post.type ?? "",
          postTitle: post.title ?? "",
          posterUid: authUser.uid,
          posterCohort: post.posterCohort ?? "",
          sentAt: FieldValue.serverTimestamp(),
          replied: false,
          isSeedData: false,
        });
      }

      await new Promise(res => setTimeout(res, 600));
    }

    if (matches.length > 0 && sent < matches.length) {
      warnings.push("Some match notification emails could not be delivered.");
    }

    console.log(`[notify] post=${postId} matched=${matches.length} sent=${sent}`);
    return NextResponse.json({ matched: matches.length, sent, warnings });
  } catch (err) {
    console.error("[notify] Error:", err);
    if (err instanceof Error && err.message.includes("OPENAI_API_KEY not configured")) {
      return NextResponse.json({ error: "Embeddings are not configured on the server." }, { status: 503 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function buildPostEmbeddingSource(post: Record<string, unknown>): string {
  const type = typeof post.type === "string" ? post.type : "";
  const title = typeof post.title === "string" ? post.title : "";
  const description = typeof post.description === "string" ? post.description : "";
  const skillTags = Array.isArray(post.skillTags)
    ? post.skillTags.filter((tag): tag is string => typeof tag === "string")
    : [];

  return [type, title, description, skillTags.join(" ")].filter((part) => part.trim().length > 0).join(" ");
}
