import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { abandonedOnboardingEmail } from '@/lib/email';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const twoHoursAgo = Timestamp.fromMillis(Date.now() - 2 * 60 * 60 * 1000);
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';

    const snap = await adminDb
      .collection('incomplete_signups')
      .where('reminderSent', '==', false)
      .where('startedAt', '<', twoHoursAgo)
      .limit(50)
      .get();

    let sent = 0;

    await Promise.all(
      snap.docs.map(async (document) => {
        const data = document.data();
        const name = typeof data.displayName === 'string' && data.displayName ? data.displayName : data.email;
        await abandonedOnboardingEmail(name, data.email, appUrl);
        await adminDb
          .collection('incomplete_signups')
          .doc(document.id)
          .update({
            reminderSent: true,
            reminderSentAt: FieldValue.serverTimestamp(),
          });
        sent++;
      }),
    );

    return NextResponse.json({ sent });
  } catch (error) {
    console.error('[cron/onboarding-reminder] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
