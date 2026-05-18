import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyIdToken } from '@/lib/auth-middleware';
import { pendingApprovalEmail } from '@/lib/email';
import { adminDb } from '@/lib/firebase-admin';
import { checkRateLimit, getRequestIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const COHORTS = new Set(['1', '2', '3', '4', '5', '6', '7']);
const MAX_FULL_NAME_LENGTH = 100;
const MAX_SKILL_TAGS = 20;

export async function POST(request: NextRequest) {
  const authUser = await verifyIdToken(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getRequestIp(request);
  const limit = checkRateLimit(`onboarding:${ip}`, 3, 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many onboarding attempts. Please wait a minute.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const fullName = normalizeWhitespace(typeof body.fullName === 'string' ? body.fullName : '');
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
    const cohort = typeof body.cohort === 'string' ? body.cohort : '';
    const linkedinUrl = normalizeLinkedInUrl(typeof body.linkedinUrl === 'string' ? body.linkedinUrl : '');
    const rawSkillTags = Array.isArray(body.skillTags) ? (body.skillTags as unknown[]) : [];
    const skillTags = rawSkillTags
      .filter((tag): tag is string => typeof tag === 'string')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const certificateUrl = typeof body.certificateUrl === 'string' ? body.certificateUrl.trim() : '';
    const consentChecked = body.consentChecked === true;

    if (!consentChecked) {
      return NextResponse.json({ error: 'Consent is required.' }, { status: 400 });
    }

    if (!fullName || fullName.length > MAX_FULL_NAME_LENGTH || !isValidFullName(fullName)) {
      return NextResponse.json({ error: 'Full name is invalid.' }, { status: 400 });
    }

    if (!email || email !== (authUser.email ?? '')) {
      return NextResponse.json({ error: 'Email mismatch.' }, { status: 400 });
    }

    if (!/^\d{10,15}$/.test(phone)) {
      return NextResponse.json({ error: 'Phone number is invalid.' }, { status: 400 });
    }

    if (!COHORTS.has(cohort)) {
      return NextResponse.json({ error: 'Cohort is invalid.' }, { status: 400 });
    }

    if (!isValidLinkedInUrl(linkedinUrl)) {
      return NextResponse.json({ error: 'LinkedIn URL is invalid.' }, { status: 400 });
    }

    if (skillTags.length < 3 || skillTags.length > MAX_SKILL_TAGS) {
      return NextResponse.json({ error: 'Skill tags must contain between 3 and 20 items.' }, { status: 400 });
    }

    const pendingUser = {
      uid: authUser.uid,
      email,
      fullName,
      phone,
      cohort,
      linkedinUrl,
      skillTags,
      certificateUrl,
      status: 'pending',
      submittedAt: FieldValue.serverTimestamp(),
      consentGiven: true,
    };

    await Promise.all([
      adminDb.collection('pending_users').doc(authUser.uid).set(pendingUser, { merge: true }),
      adminDb.collection('consent_records').doc(authUser.uid).set(
        {
          uid: authUser.uid,
          email,
          consentGiven: true,
          consentTimestamp: FieldValue.serverTimestamp(),
        },
        { merge: true }
      ),
    ]);

    await adminDb
      .collection('incomplete_signups')
      .doc(authUser.uid)
      .delete()
      .catch(() => {}); // silent — doc may not exist

    const emailSent = await pendingApprovalEmail(fullName, email);
    if (!emailSent) {
      console.error('[onboarding/submit] pending approval email failed for', authUser.uid);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[onboarding/submit] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeLinkedInUrl(value: string): string {
  return normalizeWhitespace(value)
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '');
}

function isValidFullName(value: string): boolean {
  return /^[\p{L}]+(?: [\p{L}]+)+$/u.test(value);
}

function isValidLinkedInUrl(value: string): boolean {
  return /^linkedin\.com\/in\/[A-Za-z0-9\-_%]+(?:\/)?$/.test(value);
}
