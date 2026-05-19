'use client';

/**
 * PostForm — Modal/slide-over for creating a new opportunity post.
 * Handles all 5 post types with conditional fields per type.
 * All 5 types share one schema with a type enum + conditional required fields.
 * On submit: saves to Firestore, generates embedding via /api/embed,
 * triggers /api/notify for match notifications.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2 } from 'lucide-react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuthorizedHeaders } from '@/lib/client-session';
import { SkillTagInput } from './skill-tag-input';
import { PostType } from './post-card';

interface PostFormProps {
  isOpen: boolean;
  onClose: () => void;
  posterUid: string;
  posterName: string;
  posterCohort: string;
  posterEmail: string;
}

const POST_TYPES: { value: PostType; label: string; description: string }[] = [
  { value: 'hiring', label: 'Hiring', description: 'Full-time or contract role' },
  { value: 'co-founder', label: 'Co-Founder Search', description: 'Equity-based partnership' },
  { value: 'paid-project', label: 'Paid Project', description: 'Paid freelance engagement' },
  { value: 'pressure-test', label: 'Pressure Test', description: 'Feedback on an MVP or pitch' },
  { value: 'warm-intro', label: 'Warm Intro', description: 'Introduction to a person or company' },
];

interface FormState {
  type: PostType | '';
  title: string;
  description: string;
  skillTags: string[];
  // Conditional fields
  compensation?: string;    // hiring + paid-project
  commitment?: string;      // hiring + co-founder
  equity?: string;          // co-founder
  targetIntro?: string;     // warm-intro
  contactEmail: string;
  contactVisible: boolean;
  availability: string;
}

const INITIAL_STATE: FormState = {
  type: '',
  title: '',
  description: '',
  skillTags: [],
  compensation: '',
  commitment: '',
  equity: '',
  targetIntro: '',
  contactEmail: '',
  contactVisible: true,
  availability: 'immediate',
};

export function PostForm({ isOpen, onClose, posterUid, posterName, posterCohort, posterEmail }: PostFormProps) {
  const [form, setForm] = useState<FormState>({ ...INITIAL_STATE, contactEmail: posterEmail });
  const [step, setStep] = useState<'type' | 'details'>('type');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    // Block wheel events at the document level so macOS trackpad momentum
    // scroll cannot reach the background feed. Events originating inside
    // the scrollable content div escape this via stopPropagation before
    // reaching the document, so modal content still scrolls normally.
    const blockWheel = (e: WheelEvent) => e.preventDefault();
    document.addEventListener('wheel', blockWheel, { passive: false });
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('wheel', blockWheel);
    };
  }, []);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSelectType = (t: PostType) => {
    set('type', t);
    setStep('details');
  };

  const validate = (): string | null => {
    if (!form.type) return 'Select an opportunity type';
    if (!form.title.trim()) return 'Title is required';
    if (!form.description.trim()) return 'Description is required';
    if (form.skillTags.length < 1) return 'Add at least one skill tag';
    if (form.type === 'warm-intro' && !form.targetIntro?.trim()) return 'Intro target is required';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setErrorMsg(err); return; }
    setStatus('loading');
    setErrorMsg('');
    setWarningMsg('');

    try {
      const postId = doc(collection(db, 'posts')).id;
      const warnings: string[] = [];

      // 1. Generate embedding
      let embedding: number[] | null = null;
      try {
        const embedText = `${form.type} ${form.title} ${form.description} ${form.skillTags.join(' ')}`;
        const headers = await getAuthorizedHeaders({ 'Content-Type': 'application/json' });
        const embedRes = await fetch('/api/embed', {
          method: 'POST',
          headers,
          body: JSON.stringify({ text: embedText }),
        });
        if (embedRes.ok) {
          const { embedding: emb } = await embedRes.json();
          embedding = emb;
        } else {
          const payload = await embedRes.json().catch(() => null);
          warnings.push(payload?.error ?? 'Semantic matching could not be prepared for this post.');
        }
      } catch {
        warnings.push('Semantic matching could not be prepared for this post.');
      }

      // 2. Save post to Firestore
      await setDoc(doc(db, 'posts', postId), {
        id: postId,
        authorUid: posterUid,
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        skillTags: form.skillTags,
        compensation: form.compensation?.trim() ?? '',
        commitment: form.commitment?.trim() ?? '',
        equity: form.equity?.trim() ?? '',
        targetIntro: form.targetIntro?.trim() ?? '',
        contactEmail: form.contactEmail.trim(),
        contactVisible: form.contactVisible,
        availability: form.availability,
        posterUid,
        posterName,
        posterCohort,
        embedding: embedding ?? [],
        status: 'open',
        createdAt: serverTimestamp(),
      });

      // 3. Trigger notification dispatch (fire-and-forget — doesn't block UX)
      const notifyHeaders = await getAuthorizedHeaders({ 'Content-Type': 'application/json' });
      const notifyRes = await fetch('/api/notify', {
        method: 'POST',
        headers: notifyHeaders,
        body: JSON.stringify({ postId }),
      });
      if (!notifyRes.ok) {
        const payload = await notifyRes.json().catch(() => null);
        warnings.push(payload?.error ?? 'Match notifications could not be sent right now.');
      } else {
        const payload = await notifyRes.json().catch(() => null);
        if (Array.isArray(payload?.warnings) && payload.warnings.length > 0) {
          warnings.push(...payload.warnings);
        }
      }

      setStatus('success');
      setWarningMsg(warnings.join(' '));
    } catch (err: any) {
      console.error('[post] submit error:', err);
      setStatus('error');
      setErrorMsg(err.message ?? 'Something went wrong. Please try again.');
    }
  };

  const handleClose = () => {
    setForm({ ...INITIAL_STATE, contactEmail: posterEmail });
    setStep('type');
    setStatus('idle');
    setErrorMsg('');
    setWarningMsg('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        >
          {/* Modal panel */}
          <div
            className="w-full max-w-2xl bg-black border border-brand-border flex flex-col h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 sticky top-0 z-10 flex items-center justify-between border-b border-brand-border bg-black px-6 py-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-brand-muted">
                  {step === 'type' ? 'New Opportunity' : `${POST_TYPES.find(t => t.value === form.type)?.label ?? ''}`}
                </p>
                <h2 className="text-lg font-display font-medium text-brand-white">
                  {step === 'type' ? 'What are you looking for?' : 'Fill in the details'}
                </h2>
              </div>
              <button onClick={handleClose} className="p-2 text-brand-muted hover:text-brand-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 p-6" onWheel={(e) => e.stopPropagation()}>
              {/* Step 1: Type selector */}
              {step === 'type' && (
                <div className="flex flex-col gap-3">
                  {POST_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => handleSelectType(t.value)}
                      className="group border border-brand-border p-5 min-h-[44px] text-left transition-all hover:border-brand-neon/50 hover:bg-brand-neon/5"
                    >
                      <div className="font-display font-medium text-brand-white transition-colors group-hover:text-brand-neon">
                        {t.label}
                      </div>
                      <div className="mt-1 text-xs text-brand-muted">{t.description}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 2: Details form */}
              {step === 'details' && status !== 'success' && (
                <div className="flex flex-col gap-5">
                  {/* Back */}
                  <button
                    onClick={() => setStep('type')}
                    className="text-left text-[11px] font-mono text-brand-muted transition-colors hover:text-brand-white"
                  >
                    ← Change type
                  </button>

                  {errorMsg && (
                    <div className="border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
                      {errorMsg}
                    </div>
                  )}

                  {/* Title */}
                  <Field label="Title *">
                    <input
                      type="text" required maxLength={120}
                      value={form.title}
                      onChange={(e) => set('title', e.target.value)}
                      placeholder={titlePlaceholder(form.type as PostType)}
                      className={inputCls}
                    />
                  </Field>

                  {/* Description */}
                  <Field label="Description *">
                    <textarea
                      required maxLength={1500} rows={4}
                      value={form.description}
                      onChange={(e) => set('description', e.target.value)}
                      placeholder="Be specific — what do you need, what's the context, what does success look like?"
                      className={`${inputCls} resize-none`}
                    />
                  </Field>

                  {/* Conditional: Compensation */}
                  {(form.type === 'hiring' || form.type === 'paid-project') && (
                    <Field label="Compensation / Budget">
                      <input
                        type="text" maxLength={100}
                        value={form.compensation}
                        onChange={(e) => set('compensation', e.target.value)}
                        placeholder={form.type === 'hiring' ? 'e.g. ₹30-40L CTC' : 'e.g. $2K fixed, 4-week project'}
                        className={inputCls}
                      />
                    </Field>
                  )}

                  {/* Conditional: Commitment */}
                  {(form.type === 'hiring' || form.type === 'co-founder') && (
                    <Field label="Commitment Expected">
                      <input
                        type="text" maxLength={100}
                        value={form.commitment}
                        onChange={(e) => set('commitment', e.target.value)}
                        placeholder={form.type === 'hiring' ? 'Full-time / Part-time / Contract' : 'Full-time co-founder, 40h/week'}
                        className={inputCls}
                      />
                    </Field>
                  )}

                  {/* Conditional: Equity */}
                  {form.type === 'co-founder' && (
                    <Field label="Equity Structure">
                      <input
                        type="text" maxLength={100}
                        value={form.equity}
                        onChange={(e) => set('equity', e.target.value)}
                        placeholder="e.g. 30% equity, 2-year cliff, 4-year vest"
                        className={inputCls}
                      />
                    </Field>
                  )}

                  {/* Conditional: Target intro */}
                  {form.type === 'warm-intro' && (
                    <Field label="Who / What you need an intro to *">
                      <input
                        type="text" maxLength={200}
                        value={form.targetIntro}
                        onChange={(e) => set('targetIntro', e.target.value)}
                        placeholder="e.g. Sequoia India or a Series-A SaaS growth lead"
                        className={inputCls}
                      />
                    </Field>
                  )}

                  {/* Skill tags */}
                  <Field label="Relevant Skills">
                    <SkillTagInput
                      value={form.skillTags}
                      onChange={(tags) => set('skillTags', tags)}
                    />
                  </Field>

                  {/* Contact email */}
                  <Field label="Contact Email (shown to matched alumni)">
                    <input
                      type="email" maxLength={120}
                      value={form.contactEmail}
                      onChange={(e) => set('contactEmail', e.target.value)}
                      className={inputCls}
                    />
                  </Field>

                  {/* Contact visible toggle */}
                  <label className="flex cursor-pointer select-none items-center gap-3">
                    <div
                      role="switch"
                      aria-checked={form.contactVisible}
                      onClick={() => set('contactVisible', !form.contactVisible)}
                      className={`relative h-5 w-10 rounded-full border transition-colors ${form.contactVisible ? 'border-brand-neon bg-brand-neon' : 'border-brand-border bg-transparent'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-black transition-transform ${form.contactVisible ? 'translate-x-5' : ''}`} />
                    </div>
                    <span className="text-sm text-brand-white/70">
                      Make my contact visible to matched alumni
                    </span>
                  </label>

                </div>
              )}

              {/* Success state */}
              {status === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-6 py-12 text-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-neon/10">
                    <svg className="h-8 w-8 text-brand-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-display font-medium text-brand-white">Opportunity posted.</h3>
                    <p className="max-w-xs text-sm text-brand-muted">
                      Matched alumni will receive a notification email within 15 minutes.
                    </p>
                    {warningMsg ? (
                      <p className="mt-4 max-w-sm border border-amber-500/40 bg-amber-500/10 p-3 text-left text-sm text-amber-300">
                        {warningMsg}
                      </p>
                    ) : null}
                  </div>
                  <button
                    onClick={handleClose}
                    className="border border-brand-border px-8 py-3 font-mono text-sm text-brand-white transition-colors hover:border-brand-neon/50"
                  >
                    Return to Feed
                  </button>
                </motion.div>
              )}
            </div>

            {/* Submit — outside scrollable div, always anchored to bottom of modal */}
            {step === 'details' && status !== 'success' && (
              <div className="flex-shrink-0 p-4 border-t border-brand-border bg-black">
                <button
                  onClick={handleSubmit}
                  disabled={status === 'loading'}
                  className="flex w-full min-h-[44px] items-center justify-center gap-2 bg-brand-neon py-4 font-bold uppercase tracking-widest text-brand-black transition-all hover:bg-[#FF6A26] disabled:opacity-60"
                >
                  {status === 'loading' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Post Opportunity'
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-brand-black/40 border border-brand-border px-4 py-3 text-base md:text-sm outline-none focus:border-brand-neon transition-colors placeholder:text-brand-muted/50 text-brand-white";

function titlePlaceholder(type: PostType): string {
  const map: Record<PostType, string> = {
    'hiring': 'e.g. Senior AI Engineer, Series A startup',
    'co-founder': 'e.g. CTO co-founder for B2B SaaS in fintech',
    'paid-project': 'e.g. Meta Ads expert for 4-week growth sprint',
    'pressure-test': 'e.g. Feedback on my MVP before YC demo day',
    'warm-intro': 'e.g. Intro to growth investors in Southeast Asia',
  };
  return map[type] ?? 'Brief, specific title';
}
