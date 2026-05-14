/**
 * POST /api/notify
 *
 * Triggered after a new post is created. Fetches all alumni profiles,
 * ranks them by cosine similarity to the post embedding, and sends
 * smart match notification emails to the top N matches.
 *
 * This route is called server-side from the post creation flow.
 * It reads all users from Firestore (admin SDK not available in edge —
 * uses Firebase client SDK with the service account stored in the app).
 *
 * DECISION: Using Admin SDK via firebase-admin initialisation guarded
 * by a simple lazy-init pattern. If GOOGLE_APPLICATION_CREDENTIALS or
 * FIREBASE_SERVICE_ACCOUNT_JSON is absent, falls back to client SDK with
 * wide read rules (see firestore.rules — server-side reads only).
 *
 * DECISION: To keep this buildable without firebase-admin in package.json,
 * we use the Firestore REST API directly (authenticated via the API key
 * from firebase-applet-config.json, which is already present in the repo).
 * This avoids adding new npm dependencies at build time.
 *
 * Request body:
 * {
 *   postId: string,
 *   postTitle: string,
 *   postType: string,
 *   postDescription: string,
 *   postSkillTags: string[],
 *   postEmbedding: number[],
 *   posterUid: string,
 *   posterName: string,
 *   posterCohort: string,
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { rankMatches, UserProfile } from "@/lib/matching";
import { sendMatchNotification } from "@/lib/email";
import firebaseConfig from "@/firebase-applet-config.json";

export const runtime = "nodejs";
// Allow up to 60s for this route (Vercel Pro / hobby has 10s default)
export const maxDuration = 60;

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;

async function fetchAllUsers(): Promise<UserProfile[]> {
  const apiKey = firebaseConfig.apiKey;
  const url = `${FIRESTORE_BASE}/users?key=${apiKey}&pageSize=500`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error("[notify] Failed to fetch users:", await res.text());
    return [];
  }

  const data = await res.json();
  const docs = data.documents ?? [];

  return docs.map((doc: any) => {
    const f = doc.fields ?? {};
    return {
      uid: f.uid?.stringValue ?? "",
      email: f.email?.stringValue ?? "",
      fullName: f.fullName?.stringValue ?? "",
      cohort: f.cohort?.stringValue ?? "",
      skillTags: (f.skillTags?.arrayValue?.values ?? []).map(
        (v: any) => v.stringValue ?? ""
      ),
      embedding: (f.embedding?.arrayValue?.values ?? []).map(
        (v: any) => v.doubleValue ?? v.integerValue ?? 0
      ),
      notificationsEnabled: f.notificationsEnabled?.booleanValue ?? true,
      // Exclude users who withdrew consent
      hiddenFromFeed: f.hiddenFromFeed?.booleanValue ?? false,
      consentGiven: f.consentGiven?.booleanValue ?? true,
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      postId,
      postTitle,
      postType,
      postDescription,
      postSkillTags,
      postEmbedding,
      posterUid,
      posterName,
      posterCohort,
    } = body;

    if (!postId || !postType || !posterUid) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const users = await fetchAllUsers();
    if (users.length === 0) {
      return NextResponse.json({ matched: 0, sent: 0 });
    }

    const matches = rankMatches(
      {
        title: postTitle,
        type: postType,
        description: postDescription,
        skillTags: postSkillTags ?? [],
        embedding: postEmbedding ?? null,
      },
      users,
      posterUid
    );

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    let sent = 0;

    await Promise.all(
      matches.map(async (match) => {
        const success = await sendMatchNotification({
          to: match.email,
          recipientName: match.fullName,
          posterName,
          posterCohort,
          opportunityType: postType,
          opportunityTitle: postTitle,
          matchedSkills: match.matchedSkills,
          postUrl: `${appUrl}/app/posts/${postId}`,
          unsubscribeUrl: `${appUrl}/api/unsubscribe?uid=${match.uid}`,
        });

        if (success) {
          sent++;
          // Write notification audit record so /api/connect can mark replied=true
          const notifId = `${match.uid}_${postId}`;
          const notifUrl = `${FIRESTORE_BASE}/notifications/${notifId}?key=${firebaseConfig.apiKey}`;
          fetch(notifUrl, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fields: {
                uid: { stringValue: match.uid },
                email: { stringValue: match.email },
                postId: { stringValue: postId },
                postType: { stringValue: postType },
                postTitle: { stringValue: postTitle },
                posterUid: { stringValue: posterUid },
                posterCohort: { stringValue: posterCohort },
                sentAt: { timestampValue: new Date().toISOString() },
                replied: { booleanValue: false },
                isSeedData: { booleanValue: false },
              },
            }),
          }).catch((e) => console.error("[notify] write notification doc error:", e));
        }
      })
    );

    console.log(`[notify] post=${postId} matched=${matches.length} sent=${sent}`);
    return NextResponse.json({ matched: matches.length, sent });
  } catch (err) {
    console.error("[notify] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
