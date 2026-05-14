/**
 * POST /api/admin/invite
 * GET  /api/admin/invite
 * DELETE /api/admin/invite?token=xxx
 *
 * Admin-only. Requires the requesting user's email to be in ADMIN_EMAILS env var.
 *
 * POST: Creates a new invite token.
 *   Body: { creatorEmail: string, targetEmail?: string }
 *   Response: { token: string, inviteUrl: string }
 *
 * GET: Lists all invites.
 *   Response: { invites: InviteRecord[] }
 *
 * DELETE: Revokes an invite by token.
 *   Response: { revoked: true }
 *
 * DECISION: Admin auth check uses X-Admin-Email header set by the client after
 * Firebase Auth returns the user's email. This is a lightweight admin guard
 * suitable for a small trusted team. For production, use Firebase Admin SDK claims.
 */

import { NextRequest, NextResponse } from "next/server";
import firebaseConfig from "@/firebase-applet-config.json";

export const runtime = "nodejs";

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;

function isAdmin(email: string | null): boolean {
  if (!email) return false;
  const adminList = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
  return adminList.includes(email.toLowerCase());
}

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function POST(req: NextRequest) {
  const adminEmail = req.headers.get("x-admin-email");
  if (!isAdmin(adminEmail)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { targetEmail } = body;

  const token = generateToken();
  // Expires in 48 hours per PRD
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const url = `${FIRESTORE_BASE}/invites/${token}?key=${firebaseConfig.apiKey}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        token: { stringValue: token },
        targetEmail: { stringValue: targetEmail ?? "" },
        createdBy: { stringValue: adminEmail },
        expiresAt: { timestampValue: expiresAt },
        usedAt: { nullValue: null },
        revokedAt: { nullValue: null },
        status: { stringValue: "active" },
      },
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to create invite" }, { status: 502 });
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/invite/${token}`;

  return NextResponse.json({ token, inviteUrl });
}

export async function GET(req: NextRequest) {
  const adminEmail = req.headers.get("x-admin-email");
  if (!isAdmin(adminEmail)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = `${FIRESTORE_BASE}/invites?key=${firebaseConfig.apiKey}&pageSize=200`;
  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch invites" }, { status: 502 });
  }

  const data = await res.json();
  const docs = data.documents ?? [];

  const invites = docs.map((doc: any) => {
    const f = doc.fields ?? {};
    return {
      token: f.token?.stringValue ?? "",
      targetEmail: f.targetEmail?.stringValue ?? "",
      createdBy: f.createdBy?.stringValue ?? "",
      expiresAt: f.expiresAt?.timestampValue ?? "",
      usedAt: f.usedAt?.timestampValue ?? null,
      revokedAt: f.revokedAt?.timestampValue ?? null,
      status: f.status?.stringValue ?? "active",
    };
  });

  return NextResponse.json({ invites });
}

export async function DELETE(req: NextRequest) {
  const adminEmail = req.headers.get("x-admin-email");
  if (!isAdmin(adminEmail)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const url = `${FIRESTORE_BASE}/invites/${token}?key=${firebaseConfig.apiKey}&updateMask.fieldPaths=revokedAt&updateMask.fieldPaths=status`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        revokedAt: { timestampValue: new Date().toISOString() },
        status: { stringValue: "revoked" },
      },
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to revoke invite" }, { status: 502 });
  }

  return NextResponse.json({ revoked: true });
}
