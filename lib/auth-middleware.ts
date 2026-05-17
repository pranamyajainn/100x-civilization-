import 'server-only';

import { adminDb, adminAuth } from "@/lib/firebase-admin";

export async function verifyIdToken(
  request: Request
): Promise<{ uid: string; email: string } | null> {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const idToken = authorization.slice("Bearer ".length).trim();
  if (!idToken) {
    return null;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);

    return {
      uid: decoded.uid,
      email: typeof decoded.email === "string" ? decoded.email : "",
    };
  } catch (error) {
    console.error("[auth] verifyIdToken failed:", error);
    return null;
  }
}

export async function isAdminUser(uid: string): Promise<boolean> {
  try {
    const userDoc = await adminDb.collection("users").doc(uid).get();
    return Boolean(userDoc.data()?.isAdmin);
  } catch (err) {
    console.error('[auth] isAdminUser check failed:', err);
    return false;
  }
}
