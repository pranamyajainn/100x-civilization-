'use client';

/**
 * PostForm — Modal/slide-over for creating a new opportunity post.
 * Handles all 5 post types with conditional fields per type.
 * All 5 types share one schema with a type enum + conditional required fields.
 * On submit: saves to Firestore, generates embedding via /api/embed,
 * triggers /api/notify for match notifications.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2 } from 'lucide-react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setErrorMsg(err); return; }
    setStatus('loading');
    setErrorMsg('');

    try {
      const postId = doc(collection(db, 'posts')).id;

      // 1. Generate embedding
      let embedding: number[] | null = null;
      try {
        const embedText = `${form.type} ${form.title} ${form.description} ${form.skillTags.join(' ')}`;
        const embedRes = await fetch('/api/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: embedText }),
        });
        if (embedRes.ok) {
          const { embedding: emb } = await embedRes.json();
          embedding = emb;
        }
      } catch { /* non-fatal — fallback to keyword matching */ }

      // 2. Save post to Firestore
      await setDoc(doc(db, 'posts', postId), {
        id: postId,
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
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          postTitle: form.title.trim(),
          postType: form.type,
          postDescription: form.description.trim(),
          postSkillTags: form.skillTags,
          postEmbedding: embedding ?? [],
          posterUid,
          posterName,
          posterCohort,
        }),
      }).catch((e) => console.error('[post] notify dispatch failed:', e));

      setStatus('success');
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
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-black border-l border-brand-border z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-black border-b border-brand-border px-6 py-4 flex items-center justify-between z-10">
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

            <div className="p-6">
              {/* Step 1: Type selector */}
              {step === 'type' && (
                <div className="flex flex-col gap-3">
                  {POST_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => handleSelectType(t.value)}
                      className="text-left p-5 border border-brand-border hover:border-brand-neon/50 hover:bg-brand-neon/5 transition-all group"
                    >
                      <div className="font-display font-medium text-brand-white group-hover:text-brand-neon transition-colors">
                        {t.label}
                      </div>
                      <div className="text-xs text-brand-muted mt-1">{t.description}</div>
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
                    className="text-[11px] font-mono text-brand-muted hover:text-brand-white transition-colors text-left"
                  >
                    ← Change type
                  </button>

                  {errorMsg && (
                    <div className="p-3 border border-red-500/40 bg-red-500/10 text-red-400 text-sm">
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
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div
                      role="switch"
                      aria-checked={form.contactVisible}
                      onClick={() => set('contactVisible', !form.contactVisible)}
                      className={`w-10 h-5 rounded-full border transition-colors relative ${form.contactVisible ? 'bg-brand-neon border-brand-neon' : 'bg-transparent border-brand-border'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-black transition-transform ${form.contactVisible ? 'translate-x-5' : ''}`} />
                    </div>
                    <span className="text-sm text-brand-white/70">
                      Make my contact visible to matched alumni
                    </span>
                  </label>

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={status === 'loading'}
                    className="mt-2 w-full bg-brand-neon text-brand-black font-bold uppercase tracking-widest py-4 hover:bg-[#FF6A26] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {status === 'loading' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Post Opportunity'
                    )}
                  </button>
                </div>
              )}

              {/* Success state */}
              {status === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center py-12 gap-6"
                >
                  <div className="w-16 h-16 rounded-full bg-brand-neon/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-brand-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-medium text-brand-white mb-2">Opportunity posted.</h3>
                    <p className="text-sm text-brand-muted max-w-xs">
                      Matched alumni will receive a notification email within 15 minutes.
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="px-8 py-3 border border-brand-border text-brand-white hover:border-brand-neon/50 transition-colors font-mono text-sm"
                  >
                    Return to Feed
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
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
