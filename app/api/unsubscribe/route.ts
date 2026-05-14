/**
 * GET /api/unsubscribe?uid=xxx
 *
 * One-click unsubscribe link included in all notification emails.
 * Required by PRD compliance section (email notifications must include one-click unsubscribe).
 * Sets notificationsEnabled=false on the user's Firestore document.
 */

import { NextRequest, NextResponse } from "next/server";
import firebaseConfig from "@/firebase-applet-config.json";

export const runtime = "nodejs";

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid");

  if (!uid) {
    return new NextResponse("Missing uid", { status: 400 });
  }

  const url = `${FIRESTORE_BASE}/users/${uid}?key=${firebaseConfig.apiKey}&updateMask.fieldPaths=notificationsEnabled`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        notificationsEnabled: { booleanValue: false },
      },
    }),
  });

  if (!res.ok) {
    return new NextResponse("Failed to update preferences", { status: 502 });
  }

  // Return a plain HTML confirmation page — no redirect to app needed
  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#000;color:#fff">
      <h2>You have been unsubscribed.</h2>
      <p>You will no longer receive match notifications from 100x Civilization.</p>
      <p style="margin-top:32px"><a href="${process.env.APP_URL ?? "/"}" style="color:#FF4D00">Return to platform</a></p>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
