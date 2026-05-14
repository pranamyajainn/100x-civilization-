'use client';

/**
 * /app/onboarding — Profile setup for newly authenticated alumni.
 *
 * STEP 1: Profile fields (fullName, cohort, role, skill tags, availability, contact)
 * STEP 2 (cohorts 1-5 only): Certificate upload — alumni verification via Firebase Storage
 * STEP 3: Informed consent checkpoint (must tick checkbox before submitting)
 *
 * On submit (with consent ticked):
 * 1. Generates embedding from skill tags via /api/embed
 * 2. Saves user document to Firestore users collection
 * 3. Writes consent_records document
 * 4. Sets ob_complete=1 cookie
 * 5. Redirects to /app/feed
 *
 * No invite token required — works for both token-gated and direct OAuth auth flows.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { SkillTagInput } from '@/components/skill-tag-input';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, ShieldCheck, Upload, CheckCircle2 } from 'lucide-react';

const COHORTS = ['Cohort 1', 'Cohort 2', 'Cohort 3', 'Cohort 4', 'Cohort 5', 'Cohort 6', 'Cohort 7', 'Cohort 7+'];
const COHORTS_REQUIRING_CERT = ['Cohort 1', 'Cohort 2', 'Cohort 3', 'Cohort 4', 'Cohort 5'];
const ROLES = ['Founder', 'Engineer', 'Product Manager', 'Designer', 'Data Scientist', 'Marketer', 'Sales', 'Investor', 'Other'];
const AVAILABILITY_OPTIONS = [
  { value: 'actively-looking', label: 'Actively looking for opportunities' },
  { value: 'open', label: 'Open to the right opportunity' },
  { value: 'not-available', label: 'Not available right now' },
];
const MAX_CERT_BYTES = 5 * 1024 * 1024; // 5 MB

interface FormState {
  fullName: string;
  cohort: string;
  currentRole: string;
  skillTags: string[];
  availability: string;
  contactEmail: string;
  contactVisible: boolean;
}

type Step = 'profile' | 'verify' | 'consent';

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState<Step>('profile');
  const [form, setForm] = useState<FormState>({
    fullName: '',
    cohort: '',
    currentRole: '',
    skillTags: [],
    availability: 'open',
    contactEmail: '',
    contactVisible: true,
  });
  const [consentChecked, setConsentChecked] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [tagError, setTagError] = useState('');

  // Certificate state
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certError, setCertError] = useState('');
  const [certUploading, setCertUploading] = useState(false);
  const [certUrl, setCertUrl] = useState('');

  const needsCert = COHORTS_REQUIRING_CERT.includes(form.cohort);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setForm((prev) => ({
          ...prev,
          fullName: u.displayName ?? '',
          contactEmail: u.email ?? '',
        }));
      }
    });
    return unsub;
  }, []);

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const validateProfile = (): string | null => {
    if (!form.fullName.trim() || form.fullName.trim().length < 2) return 'Full name is required (min 2 characters)';
    if (!form.cohort) return 'Select your cohort';
    if (!form.currentRole) return 'Select your current role';
    if (form.skillTags.length < 5) {
      setTagError('Add at least 5 skill tags to continue');
      return 'Minimum 5 skill tags required';
    }
    setTagError('');
    return null;
  };

  const handleProfileNext = () => {
    const err = validateProfile();
    if (err) { setErrorMsg(err); return; }
    setErrorMsg('');
    // Route to cert step for early cohorts, else skip to consent
    setStep(needsCert ? 'verify' : 'consent');
  };

  // ─── Certificate upload ───────────────────────────────────────────────────
  const handleCertFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_CERT_BYTES) {
      setCertError('File is too large. Maximum size is 5 MB.');
      return;
    }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setCertError('Only PDF, JPG, or PNG files are accepted.');
      return;
    }
    setCertError('');
    setCertFile(file);
  };

  const handleCertUpload = async () => {
    if (!certFile || !user) return;
    setCertUploading(true);
    setCertError('');
    try {
      const path = `certificates/${user.uid}/${Date.now()}_${certFile.name}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, certFile);
      const url = await getDownloadURL(fileRef);
      setCertUrl(url);
    } catch (err: any) {
      console.error('[onboarding] cert upload error:', err);
      setCertError(err.message ?? 'Upload failed. Please try again.');
    } finally {
      setCertUploading(false);
    }
  };

  const handleVerifyNext = () => {
    if (!certUrl) {
      setCertError('Please upload your certificate to continue.');
      return;
    }
    setCertError('');
    setStep('consent');
  };

  // ─── Final submit ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!consentChecked) return;
    if (!user) { setErrorMsg('Not authenticated. Please refresh and try again.'); return; }

    setStatus('loading');
    setErrorMsg('');

    try {
      // Generate embedding from skill tags
      let embedding: number[] = [];
      try {
        const embedRes = await fetch('/api/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: form.skillTags.join(' ') }),
        });
        if (embedRes.ok) {
          const { embedding: emb } = await embedRes.json();
          embedding = emb;
        }
      } catch { /* non-fatal — fallback matching still works */ }

      const now = serverTimestamp();

      // Determine verification method
      const verificationMethod = needsCert ? 'certificate' : 'invite_token';
      const verificationStatus = needsCert ? 'pending' : 'approved';

      // Write user profile
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email ?? '',
        fullName: form.fullName.trim(),
        cohort: form.cohort,
        currentRole: form.currentRole,
        skillTags: form.skillTags,
        availability: form.availability,
        contactEmail: form.contactEmail.trim(),
        contactVisible: form.contactVisible,
        embedding,
        notificationsEnabled: true,
        onboardingComplete: true,
        consentGiven: true,
        consentVersion: '1.0',
        verificationMethod,
        verificationStatus,
        ...(certUrl ? { certificateUrl: certUrl } : {}),
        createdAt: now,
        updatedAt: now,
      });

      // Write consent record (audit trail)
      await setDoc(doc(db, 'consent_records', user.uid), {
        uid: user.uid,
        email: user.email ?? '',
        consentGiven: true,
        consentTimestamp: now,
        consentVersion: '1.0',
      });

      // Mark onboarding complete
      document.cookie = 'ob_complete=1; path=/; max-age=2592000; SameSite=Lax'; // 30 days
      router.push('/app/feed');
    } catch (err: any) {
      console.error('[onboarding] submit error:', err);
      setStatus('error');
      setErrorMsg(err.message ?? 'Something went wrong. Please try again.');
    }
  };

  const inputCls = "w-full bg-black/40 border border-brand-border px-4 py-3 text-base md:text-sm outline-none focus:border-brand-neon transition-colors text-brand-white placeholder:text-brand-muted/50";
  const selectCls = "w-full bg-black/40 border border-brand-border px-4 py-3 text-base md:text-sm outline-none focus:border-brand-neon transition-colors text-brand-white appearance-none";

  // Step indicator: profile=1, verify=2 (if needed), consent=last
  const totalSteps = needsCert ? 3 : 2;
  const currentStepIdx = step === 'profile' ? 1 : step === 'verify' ? 2 : totalSteps;

  return (
    <main className="min-h-screen bg-brand-black px-6 py-16">
      <div className="max-w-xl mx-auto">

        {/* Brand header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} layout={false}>
          <div className="flex items-center gap-3 mb-8">
            <div className="relative w-3 h-3 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-brand-neon" />
              <div className="w-1 h-1 bg-brand-neon rounded-full" />
            </div>
            <span className="text-[11px] font-mono tracking-[0.2em] text-brand-neon uppercase">100x Civilization</span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-6">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-mono font-bold border transition-colors ${
                  i + 1 < currentStepIdx
                    ? 'bg-brand-neon/30 text-brand-neon border-brand-neon/40'
                    : i + 1 === currentStepIdx
                    ? 'bg-brand-neon text-black border-brand-neon'
                    : 'border-brand-border text-brand-muted'
                }`}>{i + 1}</div>
                {i < totalSteps - 1 && <div className="h-px flex-1 w-8 bg-brand-border" />}
              </div>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ——— STEP 1: Profile fields ——— */}
          {step === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              layout={false}
            >
              <h1 className="text-4xl font-display font-medium text-brand-white mb-2">Set up your profile.</h1>
              <p className="text-brand-muted text-sm mb-8 leading-relaxed">
                This is how other alumni will find you. Your skill tags drive every match.
                Add at least 5 — the more specific, the better the matches.
              </p>

              <div className="flex flex-col gap-6">
                {errorMsg && (
                  <div className="p-3 border border-red-500/40 bg-red-500/10 text-red-400 text-sm">{errorMsg}</div>
                )}

                {/* Full name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">
                    Full Name <span className="text-brand-neon">*</span>
                  </label>
                  <input
                    type="text" minLength={2} maxLength={80}
                    value={form.fullName}
                    onChange={(e) => setField('fullName', e.target.value)}
                    className={inputCls}
                  />
                </div>

                {/* Cohort + Role */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">
                      Cohort <span className="text-brand-neon">*</span>
                    </label>
                    <select value={form.cohort} onChange={(e) => setField('cohort', e.target.value)} className={selectCls}>
                      <option value="" disabled>Select…</option>
                      {COHORTS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">
                      Current Role <span className="text-brand-neon">*</span>
                    </label>
                    <select value={form.currentRole} onChange={(e) => setField('currentRole', e.target.value)} className={selectCls}>
                      <option value="" disabled>Select…</option>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                {/* Skill tags */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">
                    Skill Tags <span className="text-brand-neon">* (minimum 5)</span>
                  </label>
                  <SkillTagInput
                    value={form.skillTags}
                    onChange={(tags) => { setField('skillTags', tags); if (tags.length >= 5) setTagError(''); }}
                    error={tagError}
                  />
                </div>

                {/* Availability */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">Availability</label>
                  <div className="flex flex-col gap-2">
                    {AVAILABILITY_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                        <div
                          role="radio"
                          aria-checked={form.availability === opt.value}
                          onClick={() => setField('availability', opt.value)}
                          className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${form.availability === opt.value ? 'border-brand-neon' : 'border-brand-border'}`}
                        >
                          {form.availability === opt.value && <div className="w-2 h-2 rounded-full bg-brand-neon" />}
                        </div>
                        <span className="text-sm text-brand-white/70">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Contact email */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">Contact Email</label>
                  <input
                    type="email" maxLength={120}
                    value={form.contactEmail}
                    onChange={(e) => setField('contactEmail', e.target.value)}
                    className={inputCls}
                  />
                </div>

                {/* Contact visible toggle */}
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    role="switch"
                    aria-checked={form.contactVisible}
                    onClick={() => setField('contactVisible', !form.contactVisible)}
                    className={`w-10 h-5 rounded-full border transition-colors relative flex-shrink-0 ${form.contactVisible ? 'bg-brand-neon border-brand-neon' : 'bg-transparent border-brand-border'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-black transition-transform ${form.contactVisible ? 'translate-x-5' : ''}`} />
                  </div>
                  <span className="text-sm text-brand-white/70">Allow matched alumni to see my contact email</span>
                </label>

                {/* Next */}
                <button
                  type="button"
                  id="onboarding-next"
                  onClick={handleProfileNext}
                  className="mt-2 w-full bg-brand-neon text-brand-black font-bold uppercase tracking-widest py-4 hover:bg-[#FF6A26] transition-all"
                >
                  Continue →
                </button>
              </div>
            </motion.div>
          )}

          {/* ——— STEP 2: Certificate upload (cohorts 1-5 only) ——— */}
          {step === 'verify' && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              layout={false}
            >
              <div className="flex items-center gap-3 mb-2">
                <Upload className="w-6 h-6 text-brand-neon flex-shrink-0" />
                <h1 className="text-3xl font-display font-medium text-brand-white">Verify your alumni status.</h1>
              </div>
              <p className="text-brand-muted text-sm mb-8 leading-relaxed">
                We verify every member. Upload your 100xEngineers certificate of completion to proceed.
                Accepted formats: PDF, JPG, PNG. Max 5 MB.
              </p>

              {certError && (
                <div className="p-3 border border-red-500/40 bg-red-500/10 text-red-400 text-sm mb-5">{certError}</div>
              )}

              {/* Upload area */}
              {!certUrl ? (
                <div className="flex flex-col gap-4">
                  <label
                    htmlFor="cert-upload"
                    className="flex flex-col items-center justify-center gap-3 border border-dashed border-brand-border hover:border-brand-neon/50 transition-colors p-10 cursor-pointer bg-black/20"
                  >
                    <Upload className="w-8 h-8 text-brand-muted" />
                    <div className="text-center">
                      <p className="text-sm text-brand-white/70 font-medium">
                        {certFile ? certFile.name : 'Click to select file'}
                      </p>
                      <p className="text-[10px] font-mono text-brand-muted mt-1">PDF · JPG · PNG · max 5 MB</p>
                    </div>
                    <input
                      id="cert-upload"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="sr-only"
                      onChange={handleCertFileChange}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleCertUpload}
                    disabled={!certFile || certUploading}
                    className="w-full bg-brand-neon text-brand-black font-bold uppercase tracking-widest py-4 hover:bg-[#FF6A26] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {certUploading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Uploading…</>
                    ) : (
                      'Upload Certificate'
                    )}
                  </button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  layout={false}
                  className="flex items-center gap-3 p-4 border border-brand-neon/30 bg-brand-neon/5 mb-4"
                >
                  <CheckCircle2 className="w-5 h-5 text-brand-neon flex-shrink-0" />
                  <div>
                    <p className="text-sm text-brand-white font-medium">Certificate uploaded.</p>
                    <p className="text-[10px] font-mono text-brand-muted mt-0.5">
                      Our team will review it shortly. You'll have full access in the meantime.
                    </p>
                  </div>
                </motion.div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep('profile')}
                  className="px-6 py-4 border border-brand-border text-brand-muted hover:text-brand-white hover:border-brand-white/30 transition-colors font-mono text-sm"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  id="verify-next"
                  onClick={handleVerifyNext}
                  disabled={!certUrl}
                  className="flex-1 bg-brand-neon text-brand-black font-bold uppercase tracking-widest py-4 hover:bg-[#FF6A26] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue to Review →
                </button>
              </div>

              <p className="text-[10px] font-mono text-brand-muted mt-4 text-center">
                Access is granted immediately on upload. Admin approval is a background process.
              </p>
            </motion.div>
          )}

          {/* ——— STEP 3: Consent ——— */}
          {step === 'consent' && (
            <motion.div
              key="consent"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              layout={false}
            >
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="w-6 h-6 text-brand-neon flex-shrink-0" />
                <h1 className="text-3xl font-display font-medium text-brand-white">Before you enter.</h1>
              </div>

              {errorMsg && (
                <div className="p-3 border border-red-500/40 bg-red-500/10 text-red-400 text-sm mb-5">{errorMsg}</div>
              )}

              {/* Consent card */}
              <div className="p-6 border border-brand-border bg-black/40 mb-6">
                <p className="text-[10px] font-mono uppercase tracking-wider text-brand-muted mb-4">Platform Data Agreement · Version 1.0</p>
                <p className="text-sm text-brand-white/80 leading-relaxed mb-4">
                  By completing your profile, you agree that:
                </p>
                <ul className="space-y-2 text-sm text-brand-white/70 leading-relaxed mb-4">
                  <li className="flex gap-2">
                    <span className="text-brand-neon flex-shrink-0">—</span>
                    <span>Your name, cohort number, current role, and skill tags will be visible to other verified 100x Civilization members</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-brand-neon flex-shrink-0">—</span>
                    <span>When you are matched to an opportunity and choose to reveal your contact info, your email address will be shared with that specific requester only</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-brand-neon flex-shrink-0">—</span>
                    <span>You can withdraw consent at any time from your profile settings, which will hide your profile from new matches</span>
                  </li>
                </ul>
                <p className="text-sm text-brand-white/70">
                  This platform is invite-only and limited to 100xEngineers alumni.
                </p>
              </div>

              {/* Consent checkbox */}
              <label
                id="consent-checkbox-label"
                className="flex items-start gap-3 cursor-pointer select-none mb-8 group"
                onClick={() => setConsentChecked(!consentChecked)}
              >
                <div
                  role="checkbox"
                  aria-checked={consentChecked}
                  className={`w-5 h-5 border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${consentChecked ? 'bg-brand-neon border-brand-neon' : 'border-brand-border group-hover:border-brand-neon/50'}`}
                >
                  {consentChecked && (
                    <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-brand-white/80 leading-relaxed">
                  I have read and understood the above. I consent to my profile being visible to other verified members of this platform.
                </span>
              </label>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(needsCert ? 'verify' : 'profile')}
                  className="px-6 py-4 border border-brand-border text-brand-muted hover:text-brand-white hover:border-brand-white/30 transition-colors font-mono text-sm"
                >
                  ← Back
                </button>

                <button
                  type="button"
                  id="onboarding-submit"
                  disabled={!consentChecked || status === 'loading'}
                  onClick={handleSubmit}
                  className="flex-1 bg-brand-neon text-brand-black font-bold uppercase tracking-widest py-4 hover:bg-[#FF6A26] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Complete Profile'
                  )}
                </button>
              </div>

              <p className="text-[10px] font-mono text-brand-muted mt-4 text-center">
                Consent timestamp is recorded. Version 1.0 · {new Date().toLocaleDateString()}
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}
