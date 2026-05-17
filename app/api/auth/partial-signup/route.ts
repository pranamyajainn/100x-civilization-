import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyIdToken } from '@/lib/auth-middleware';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const authUser = await verifyIdToken(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { uid, email } = authUser;

  let displayName = email;
  try {
    const userRecord = await adminAuth.getUser(uid);
    displayName = userRecord.displayName ?? email;
  } catch {
    // fall back to email
  }

  try {
    const [userSnap, pendingSnap] = await Promise.all([
      adminDb.collection('users').doc(uid).get(),
      adminDb.collection('pending_users').doc(uid).get(),
    ]);

    if (userSnap.exists && userSnap.data()?.onboardingComplete === true) {
      return NextResponse.json({ success: true });
    }

    if (pendingSnap.exists) {
      return NextResponse.json({ success: true });
    }

    await adminDb.collection('incomplete_signups').doc(uid).set({
      uid,
      email,
      displayName,
      startedAt: FieldValue.serverTimestamp(),
      reminderSent: false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[partial-signup] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
