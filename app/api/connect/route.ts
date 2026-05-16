/**
 * POST /api/connect
 *
 * Logs a connection event when alumni A views a post by alumni B and either:
 * - Reveals the poster's contact info ("reveal"), OR
 * - Sends an in-platform message ("message")
 *
 * PRD: "user A from cohort X contacted user B from cohort Y via platform"
 * A view alone does NOT count (PRD Assumption #8).
 *
 * DUPLICATE DETECTION (Section C):
 * Before writing, checks Firestore for existing connections where EITHER:
 *   1. Same postId + same emailDomain within the last 24 hours, OR
 *   2. Same deviceFingerprint + same postId (ever)
 * If either matches → HTTP 409 { duplicate: true }.
 *
 * FINGERPRINTING:
 * deviceFingerprint = SHA-256(User-Agent + ":" + x-forwarded-for)
 * Only the hash is stored, never the raw values.
 *
 * REPLY TRACKING (Section E):
 * After writing the connection, updates the matching notification document
 * (where uid==viewerUid AND postId==postId) to set replied: true.
 *
 * Request body:
 * {
 *   viewerUid: string,
 *   viewerCohort: string,
 *   posterUid: string,
 *   posterCohort: string,
 *   postId: string,
 *   postType: string,
 *   action: "reveal" | "message",
 * }
 *
 * Response: { connectionId } | { duplicate: true } | { error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { verifyIdToken } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/** Build SHA-256 device fingerprint from User-Agent + IP */
async function buildFingerprint(req: NextRequest): Promise<string> {
  const ua = req.headers.get("user-agent") ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const raw = `${ua}:${ip}`;
  return createHash("sha256").update(raw).digest("hex");
}

/** Extract email domain (everything after @) */
function emailDomain(email: string): string {
  const parts = email.split("@");
  return parts.length === 2 ? parts[1].toLowerCase() : "";
}

async function isDuplicate(postId: string, emailDom: string, fingerprint: string): Promise<boolean> {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const snapshot = await adminDb
    .collection("connections")
    .where("postId", "==", postId)
    .get();

  for (const doc of snapshot.docs) {
    const connection = doc.data();
    const timestampValue = connection.timestamp;
    const timestamp =
      timestampValue instanceof Timestamp
        ? timestampValue.toMillis()
        : new Date(timestampValue ?? 0).getTime();

    if (connection.deviceFingerprint === fingerprint) {
      return true;
    }

    if (
      emailDom &&
      connection.emailDomain === emailDom &&
      Number.isFinite(timestamp) &&
      timestamp >= cutoff
    ) {
      return true;
    }
  }

  return false;
}

async function markNotificationReplied(viewerUid: string, postId: string): Promise<void> {
  try {
    await adminDb.collection("notifications").doc(`${viewerUid}_${postId}`).set(
      {
        replied: true,
        repliedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error("[connect] markNotificationReplied error:", err);
  }
}

export async function POST(req: NextRequest) {
  const authUser = await verifyIdToken(req);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const postId = typeof body.postId === "string" ? body.postId : "";
    const action = body.action === "message" ? "message" : "reveal";

    if (!postId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [viewerDoc, postDoc] = await Promise.all([
      adminDb.collection("users").doc(authUser.uid).get(),
      adminDb.collection("posts").doc(postId).get(),
    ]);

    if (!viewerDoc.exists) {
      return NextResponse.json({ error: "Viewer not found" }, { status: 404 });
    }

    if (!postDoc.exists) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const viewer = viewerDoc.data() ?? {};
    const post = postDoc.data() ?? {};
    const posterUid = post.authorUid ?? post.posterUid;

    if (!posterUid) {
      return NextResponse.json({ error: "Post owner missing" }, { status: 400 });
    }

    if (authUser.uid === posterUid) {
      return NextResponse.json({ error: "Cannot connect with yourself" }, { status: 400 });
    }

    const fingerprint = await buildFingerprint(req);
    const emailDom = emailDomain(authUser.email);

    const duplicate = await isDuplicate(postId, emailDom, fingerprint);
    if (duplicate) {
      return NextResponse.json({ duplicate: true }, { status: 409 });
    }

    const connectionId = `${authUser.uid}_${postId}_${action}`;
    const viewerCohort = viewer.cohort ?? "";
    const posterCohort = post.posterCohort ?? "";

    await adminDb.collection("connections").doc(connectionId).set({
      viewerUid: authUser.uid,
      viewerCohort,
      posterUid,
      posterCohort,
      postId,
      postType: post.type ?? "",
      actionType: action,
      isCrossCohort: viewerCohort !== posterCohort,
      emailDomain: emailDom,
      deviceFingerprint: fingerprint,
      timestamp: FieldValue.serverTimestamp(),
      isSeedData: false,
    });

    markNotificationReplied(authUser.uid, postId);

    return NextResponse.json({ connectionId });
  } catch (err) {
    console.error("[connect] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
