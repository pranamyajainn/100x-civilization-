'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Upload } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, storage } from '@/lib/firebase';
import { getAuthorizedHeaders } from '@/lib/client-session';
import { SkillTagInput } from '@/components/skill-tag-input';

const COHORT_OPTIONS = ['1', '2', '3', '4', '5', '6', '7'];
const MAX_CERT_BYTES = 5 * 1024 * 1024;

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  cohort: string;
  currentRole: string;
  linkedinUrl: string;
  skillTags: string[];
}

const INITIAL_FORM: FormState = {
  fullName: '',
  email: '',
  phone: '',
  cohort: '',
  currentRole: '',
  linkedinUrl: '',
  skillTags: [],
};

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [consentChecked, setConsentChecked] = useState(false);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [tagError, setTagError] = useState('');
  const [certError, setCertError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setAuthReady(true);

      if (!currentUser) {
        router.push('/');
        return;
      }

      setUser(currentUser);
      setForm({
        fullName: resolveDisplayName(currentUser.displayName, currentUser.email),
        email: currentUser.email ?? '',
        phone: '',
        cohort: '',
        currentRole: '',
        linkedinUrl: '',
        skillTags: [],
      });
    });

    return unsubscribe;
  }, [router]);

  const handleFieldChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const validate = (): string | null => {
    const fullName = normalizeWhitespace(form.fullName);
    const phoneDigits = form.phone.replace(/\D/g, '');
    const linkedinUrl = normalizeLinkedInUrl(form.linkedinUrl);

    if (!isValidFullName(fullName)) return 'Full name must be at least 2 words and use letters and spaces only.';
    if (!form.email.trim()) return 'Email is required.';
    if (phoneDigits.length < 7) return 'WhatsApp / Phone Number must contain at least 7 digits.';
    if (!form.cohort) return 'Please choose your cohort.';
    const currentRole = form.currentRole.trim();
    if (currentRole.length < 2) return 'Current role / profession must be at least 2 characters.';
    if (currentRole.length > 100) return 'Current role / profession must be 100 characters or fewer.';
    if (!isValidLinkedInUrl(form.linkedinUrl)) return 'Please enter a valid LinkedIn profile URL';
    if (form.skillTags.length < 3) {
      setTagError('Add at least 3 skill tags.');
      return 'Add at least 3 skill tags.';
    }
    setTagError('');
    if (!consentChecked) return 'Consent is required to submit.';
    if (certificateFile && !isValidCertificateFile(certificateFile)) return 'Certificate must be a PDF, JPG, or PNG under 5 MB.';
    return null;
  };

  const uploadCertificate = async (uid: string, file: File): Promise<string> => {
    const fileRef = storageRef(storage, `certificates/${uid}/cert`);
    await uploadBytes(fileRef, file, { contentType: file.type });
    return getDownloadURL(fileRef);
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    if (!user) {
      setErrorMsg('Not authenticated. Please refresh and try again.');
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    setTagError('');
    setCertError('');

    try {
      const normalizedPhone = form.phone;
      const normalizedLinkedInUrl = normalizeLinkedInUrl(form.linkedinUrl);

      const certificateUrl = certificateFile
        ? await uploadCertificate(user.uid, certificateFile)
        : '';

      const headers = await getAuthorizedHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fullName: normalizeWhitespace(form.fullName),
          email: form.email.trim(),
          phone: normalizedPhone,
          cohort: form.cohort,
          currentRole: form.currentRole.trim(),
          linkedinUrl: normalizedLinkedInUrl,
          skillTags: form.skillTags,
          certificateUrl,
          consentChecked: true,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Submission failed.');
      }

      router.replace('/app/pending');
    } catch (error: any) {
      console.error('[onboarding] submit error:', error);
      setStatus('error');
      setErrorMsg(error?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const handleCertificateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setCertificateFile(null);
      setCertError('');
      return;
    }

    if (!isValidCertificateFile(file)) {
      setCertificateFile(null);
      setCertError('Certificate must be a PDF, JPG, or PNG under 5 MB.');
      return;
    }

    setCertificateFile(file);
    setCertError('');
  };

  if (!authReady || !user) {
    return (
      <main className="min-h-screen bg-brand-black flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-neon" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-black px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div className="mb-8 flex items-center gap-3">
            <div className="relative flex h-3 w-3 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-brand-neon" />
              <div className="h-1 w-1 rounded-full bg-brand-neon" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-brand-neon">100x Civilization</span>
          </div>

          <h1 className="mb-3 text-4xl font-display font-medium text-brand-white">Set up your profile.</h1>
          <p className="mb-8 text-sm leading-relaxed text-brand-muted">
            Complete the form below to request approval.
          </p>

          <div className="border border-brand-border bg-black/40 p-6 md:p-8">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">Full Name *</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(event) => handleFieldChange('fullName', event.target.value)}
                  placeholder="Enter your full name"
                  className={inputClassName}
                  maxLength={80}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  readOnly
                  className={`${inputClassName} cursor-not-allowed bg-white/5 text-brand-muted`}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">WhatsApp / Phone Number *</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(event) => {
                      const cleaned = event.target.value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
                      handleFieldChange('phone', cleaned);
                    }}
                    placeholder="+91 98765 43210"
                    className={inputClassName}
                    maxLength={16}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">Cohort *</label>
                  <select
                    value={form.cohort}
                    onChange={(event) => handleFieldChange('cohort', event.target.value)}
                    className={selectClassName}
                  >
                    <option value="" disabled>
                      Select cohort
                    </option>
                    {COHORT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">What do you do? (Current Role / Profession) *</label>
                <input
                  type="text"
                  value={form.currentRole}
                  onChange={(event) => handleFieldChange('currentRole', event.target.value)}
                  placeholder="e.g. Founder, AI Engineer, Product Manager, Growth Marketer"
                  className={inputClassName}
                  maxLength={100}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">LinkedIn Profile URL *</label>
                <input
                  type="text"
                  value={form.linkedinUrl}
                  onChange={(event) => handleFieldChange('linkedinUrl', event.target.value)}
                  placeholder="linkedin.com/in/your-handle"
                  className={inputClassName}
                  maxLength={200}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                {errorMsg ? (
                  <div className="mb-1 border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
                    {errorMsg}
                  </div>
                ) : null}
                <label className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">YOUR EXPERTISE (MINIMUM 3)</label>
                <p className="text-xs font-mono text-brand-muted tracking-wider mb-2">
                  Add your domain first — marketing, fintech, D2C, edtech — then your technical skills
                </p>
                <SkillTagInput
                  value={form.skillTags}
                  onChange={(tags) => {
                    handleFieldChange('skillTags', tags);
                    if (tags.length >= 3) setTagError('');
                  }}
                  error={tagError}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">
                  Graduation Certificate (optional but speeds up approval)
                </label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-brand-border bg-black/20 p-8 transition-colors hover:border-brand-neon/50">
                  <Upload className="h-8 w-8 text-brand-muted" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-brand-white/75">
                      {certificateFile ? certificateFile.name : 'Click to upload'}
                    </p>
                    <p className="mt-1 text-[10px] font-mono text-brand-muted">PDF · JPG · PNG · max 5 MB</p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={handleCertificateChange}
                    className="sr-only"
                  />
                </label>
                {certError ? <p className="text-xs font-mono text-red-400">{certError}</p> : null}
              </div>

              <label className="flex cursor-pointer items-start gap-3 select-none">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(event) => setConsentChecked(event.target.checked)}
                  className="mt-1 accent-[#FF4D00]"
                />
                <span className="text-sm leading-relaxed text-brand-white/80">
                  I understand that my profile will be reviewed before activation and I consent to storing this information for approval and matching.
                </span>
              </label>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!consentChecked || status === 'loading'}
                className="mt-2 flex w-full min-h-[44px] items-center justify-center gap-2 bg-brand-neon py-4 font-bold uppercase tracking-widest text-brand-black transition-all hover:bg-[#FF6A26] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {status === 'loading' ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function resolveDisplayName(displayName: string | null | undefined, email: string | null | undefined): string {
  const name = normalizeWhitespace(displayName ?? '');
  const emailPrefix = (email ?? '').split('@')[0]?.replace(/[._-]+/g, ' ').trim() ?? '';

  if (!name) return '';
  if (name.split(' ').length < 2) return '';
  if (name.split(' ').some((part) => part.length <= 1)) return '';

  const normalizedName = simplifyNameForComparison(name);
  const normalizedPrefix = simplifyNameForComparison(emailPrefix);

  if (normalizedPrefix && normalizedName === normalizedPrefix) return '';
  if (!/^[\p{L}]+(?: [\p{L}]+)+$/u.test(name)) return '';

  return name;
}

function isValidFullName(value: string): boolean {
  if (!value) return false;
  if (!/^[\p{L}]+(?: [\p{L}]+)+$/u.test(value)) return false;
  return value.split(' ').length >= 2;
}

function normalizeLinkedInUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '');
}

function isValidLinkedInUrl(value: string): boolean {
  return value.trim().toLowerCase().includes('linkedin.com/in/');
}

function isValidCertificateFile(file: File): boolean {
  return file.size <= MAX_CERT_BYTES && ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type);
}

function simplifyNameForComparison(value: string): string {
  return value.toLowerCase().replace(/[^a-z]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const inputClassName =
  'w-full border border-brand-border bg-black/40 px-4 py-3 text-base text-brand-white outline-none transition-colors placeholder:text-brand-muted/50 focus:border-brand-neon md:text-sm';

const selectClassName =
  'w-full appearance-none border border-brand-border bg-black/40 px-4 py-3 text-base text-brand-white outline-none transition-colors focus:border-brand-neon md:text-sm';
