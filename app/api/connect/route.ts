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
import firebaseConfig from "@/firebase-applet-config.json";

export const runtime = "nodejs";

const PROJECT = firebaseConfig.projectId;
const DB_ID = firebaseConfig.firestoreDatabaseId;
const API_KEY = firebaseConfig.apiKey;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${DB_ID}/documents`;

/** Helper: Firestore REST PATCH (upsert) */
async function firestorePatch(collection: string, docId: string, fields: Record<string, any>) {
  const url = `${BASE}/${collection}/${docId}?key=${API_KEY}`;
  return fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
}

/** Helper: Firestore REST runQuery (structured query) */
async function firestoreQuery(structuredQuery: object): Promise<any[]> {
  const url = `${BASE}:runQuery?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery }),
  });
  if (!res.ok) return [];
  const rows: any[] = await res.json();
  return rows.filter((r) => r.document);
}

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

/** Check duplicate: same postId + emailDomain in last 24h OR same fingerprint + postId */
async function isDuplicate(postId: string, emailDom: string, fingerprint: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Check 1: same postId + emailDomain within 24h
  const domainMatches = await firestoreQuery({
    from: [{ collectionId: "connections" }],
    where: {
      compositeFilter: {
        op: "AND",
        filters: [
          { fieldFilter: { field: { fieldPath: "postId" }, op: "EQUAL", value: { stringValue: postId } } },
          { fieldFilter: { field: { fieldPath: "emailDomain" }, op: "EQUAL", value: { stringValue: emailDom } } },
          { fieldFilter: { field: { fieldPath: "timestamp" }, op: "GREATER_THAN_OR_EQUAL", value: { timestampValue: cutoff } } },
        ],
      },
    },
    limit: 1,
  });
  if (domainMatches.length > 0) return true;

  // Check 2: same fingerprint + postId (any time)
  const fpMatches = await firestoreQuery({
    from: [{ collectionId: "connections" }],
    where: {
      compositeFilter: {
        op: "AND",
        filters: [
          { fieldFilter: { field: { fieldPath: "postId" }, op: "EQUAL", value: { stringValue: postId } } },
          { fieldFilter: { field: { fieldPath: "deviceFingerprint" }, op: "EQUAL", value: { stringValue: fingerprint } } },
        ],
      },
    },
    limit: 1,
  });
  return fpMatches.length > 0;
}

/** Find the notification document sent to viewerUid for this postId and mark it replied */
async function markNotificationReplied(viewerUid: string, postId: string): Promise<void> {
  try {
    const matches = await firestoreQuery({
      from: [{ collectionId: "notifications" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            { fieldFilter: { field: { fieldPath: "uid" }, op: "EQUAL", value: { stringValue: viewerUid } } },
            { fieldFilter: { field: { fieldPath: "postId" }, op: "EQUAL", value: { stringValue: postId } } },
          ],
        },
      },
      limit: 1,
    });

    if (matches.length > 0) {
      // Extract docId from the resource name: .../notifications/{docId}
      const name: string = matches[0].document.name;
      const docId = name.split("/").pop()!;
      await firestorePatch("notifications", docId, {
        replied: { booleanValue: true },
        repliedAt: { timestampValue: new Date().toISOString() },
      });
    }
  } catch (err) {
    // Non-fatal — don't block the connection response
    console.error("[connect] markNotificationReplied error:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { viewerUid, viewerCohort, posterUid, posterCohort, postId, postType, action } = body;

    if (!viewerUid || !posterUid || !postId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (viewerUid === posterUid) {
      return NextResponse.json({ error: "Cannot connect with yourself" }, { status: 400 });
    }

    // Build fingerprint and extract email domain
    const fingerprint = await buildFingerprint(req);

    // We don't have viewerEmail in the body — derive domain from viewerUid lookup or
    // accept it from the body. For security, accept from body (client sends their own email).
    const viewerEmail: string = body.viewerEmail ?? "";
    const emailDom = emailDomain(viewerEmail);

    // Duplicate check
    const duplicate = await isDuplicate(postId, emailDom, fingerprint);
    if (duplicate) {
      return NextResponse.json({ duplicate: true }, { status: 409 });
    }

    const connectionId = `${viewerUid}_${postId}_${action}`;
    const isCrossCohort = viewerCohort !== posterCohort;
    const timestamp = new Date().toISOString();

    // Write connection document
    const writeRes = await firestorePatch("connections", connectionId, {
      viewerUid: { stringValue: viewerUid },
      viewerCohort: { stringValue: viewerCohort ?? "" },
      posterUid: { stringValue: posterUid },
      posterCohort: { stringValue: posterCohort ?? "" },
      postId: { stringValue: postId },
      postType: { stringValue: postType ?? "" },
      actionType: { stringValue: action },
      isCrossCohort: { booleanValue: isCrossCohort },
      emailDomain: { stringValue: emailDom },
      deviceFingerprint: { stringValue: fingerprint },
      timestamp: { timestampValue: timestamp },
      isSeedData: { booleanValue: false },
    });

    if (!writeRes.ok) {
      const err = await writeRes.text();
      console.error("[connect] Firestore write error:", err);
      return NextResponse.json({ error: "Failed to log connection" }, { status: 502 });
    }

    // Fire-and-forget: mark notification as replied
    markNotificationReplied(viewerUid, postId);

    return NextResponse.json({ connectionId });
  } catch (err) {
    console.error("[connect] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
