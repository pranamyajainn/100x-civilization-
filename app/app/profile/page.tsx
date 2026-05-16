'use client';

/**
 * /app/profile — Profile edit page.
 *
 * Allows alumni to update their skill tags, availability, and contact preferences
 * after initial onboarding. Name and cohort are immutable after onboarding.
 *
 * On save: regenerates embedding, updates Firestore user document.
 * "Withdraw consent" option: sets consentGiven: false and hiddenFromFeed: true
 * on the user document, which removes them from match queries.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { getAuthorizedHeaders } from '@/lib/client-session';
import { onAuthStateChanged, User } from 'firebase/auth';
import { SkillTagInput } from '@/components/skill-tag-input';
import { motion } from 'motion/react';
import { ArrowLeft, Loader2 } from 'lucide-react';

const AVAILABILITY_OPTIONS = [
  { value: 'actively-looking', label: 'Actively looking for opportunities' },
  { value: 'open', label: 'Open to the right opportunity' },
  { value: 'not-available', label: 'Not available right now' },
];

interface Profile {
  fullName: string;
  cohort: string;
  currentRole: string;
  skillTags: string[];
  availability: string;
  contactEmail: string;
  contactVisible: boolean;
  notificationsEnabled: boolean;
  consentGiven: boolean;
  embedding: number[];
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<Profile | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [tagError, setTagError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/'); return; }
      setUser(u);
      const snap = await getDoc(doc(db, 'users', u.uid));
      if (snap.exists()) {
        const d = snap.data();
        setForm({
          fullName: d.fullName ?? '',
          cohort: d.cohort ?? '',
          currentRole: d.currentRole ?? '',
          skillTags: d.skillTags ?? [],
          availability: d.availability ?? 'open',
          contactEmail: d.contactEmail ?? u.email ?? '',
          contactVisible: d.contactVisible ?? true,
          notificationsEnabled: d.notificationsEnabled ?? true,
          consentGiven: d.consentGiven ?? true,
          embedding: Array.isArray(d.embedding) ? d.embedding : [],
        });
      }
    });
    return unsub;
  }, [router]);

  const setField = <K extends keyof Profile>(key: K, val: Profile[K]) =>
    setForm((prev) => prev ? { ...prev, [key]: val } : prev);

  const handleSave = async () => {
    if (!user || !form) return;
    if (form.skillTags.length < 5) {
      setTagError('Minimum 5 skill tags required');
      return;
    }
    setTagError('');
    setStatus('loading');
    setErrorMsg('');

    try {
      // Regenerate embedding
      let embedding: number[] = [];
      try {
        const headers = await getAuthorizedHeaders({ 'Content-Type': 'application/json' });
        const embedRes = await fetch('/api/embed', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text: [
              form.fullName,
              form.currentRole ? `currentRole: ${form.currentRole}` : '',
              `cohort ${form.cohort}`,
              `skills: ${form.skillTags.join(', ')}`,
            ]
              .filter(Boolean)
              .join('\n'),
          }),
        });
        if (embedRes.ok) {
          const { embedding: emb } = await embedRes.json();
          embedding = emb;
        }
      } catch { /* non-fatal */ }

      const update: Record<string, any> = {
        skillTags: form.skillTags,
        availability: form.availability,
        contactEmail: form.contactEmail,
        contactVisible: form.contactVisible,
        notificationsEnabled: form.notificationsEnabled,
        updatedAt: serverTimestamp(),
      };
      if (embedding.length > 0) update.embedding = embedding;

      await updateDoc(doc(db, 'users', user.uid), update);
      if (embedding.length > 0) {
        setForm((current) => current ? { ...current, embedding } : current);
      }
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message ?? 'Failed to save. Try again.');
    }
  };

  const handleWithdrawConsent = async () => {
    if (!user || !form) return;
    if (!confirm('Withdrawing consent will hide your profile from new matches. You can re-enable it by contacting the team. Continue?')) return;
    setWithdrawing(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        consentGiven: false,
        hiddenFromFeed: true,
        updatedAt: serverTimestamp(),
      });
      setField('consentGiven', false);
    } catch (err: any) {
      alert('Failed to withdraw consent: ' + (err.message ?? 'Unknown error'));
    } finally {
      setWithdrawing(false);
    }
  };

  const inputCls = "w-full bg-black/40 border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-neon transition-colors text-brand-white placeholder:text-brand-muted/50";

  if (!form) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-neon animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-black">
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-brand-border">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={() => router.push('/app/feed')} className="text-brand-muted hover:text-brand-white transition-colors" aria-label="Back to feed">
            <ArrowLeft size={18} />
          </button>
          <span className="text-[11px] font-mono tracking-[0.2em] text-brand-neon uppercase">Edit Profile</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-3xl font-display font-medium text-brand-white mb-1">{form.fullName}</h1>
          <p className="text-sm text-brand-muted mb-8">{form.cohort} · {form.currentRole}</p>

          {form.embedding.length === 0 ? (
            <div className="p-3 border border-brand-border bg-black/40 text-sm text-brand-muted mb-5">
              Your matching profile is being built. Check back in a few minutes.
            </div>
          ) : null}

          {errorMsg && <div className="p-3 border border-red-500/40 bg-red-500/10 text-red-400 text-sm mb-5">{errorMsg}</div>}
          {status === 'saved' && <div className="p-3 border border-green-500/40 bg-green-500/10 text-green-400 text-sm mb-5">Profile saved.</div>}

          <div className="flex flex-col gap-6">

            {/* Skill tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">Skill Tags * (minimum 5)</label>
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

            {/* Contact visible */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                role="switch"
                aria-checked={form.contactVisible}
                onClick={() => setField('contactVisible', !form.contactVisible)}
                className={`w-10 h-5 rounded-full border transition-colors relative flex-shrink-0 ${form.contactVisible ? 'bg-brand-neon border-brand-neon' : 'bg-transparent border-brand-border'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-black transition-transform ${form.contactVisible ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm text-brand-white/70">Show contact email to matched alumni</span>
            </label>

            {/* Notifications */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                role="switch"
                aria-checked={form.notificationsEnabled}
                onClick={() => setField('notificationsEnabled', !form.notificationsEnabled)}
                className={`w-10 h-5 rounded-full border transition-colors relative flex-shrink-0 ${form.notificationsEnabled ? 'bg-brand-neon border-brand-neon' : 'bg-transparent border-brand-border'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-black transition-transform ${form.notificationsEnabled ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm text-brand-white/70">Receive match notification emails</span>
            </label>

            {/* Save */}
            <button
              id="profile-save-btn"
              onClick={handleSave}
              disabled={status === 'loading'}
              className="mt-2 w-full bg-brand-neon text-brand-black font-bold uppercase tracking-widest py-4 hover:bg-[#FF6A26] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
            </button>

            {/* Withdraw consent */}
            <div className="pt-6 border-t border-brand-border">
              <p className="text-[10px] font-mono uppercase tracking-wider text-brand-muted mb-3">Data & Privacy</p>
              {form.consentGiven ? (
                <button
                  onClick={handleWithdrawConsent}
                  disabled={withdrawing}
                  className="text-sm text-red-400/70 hover:text-red-400 transition-colors font-mono"
                >
                  {withdrawing ? 'Processing…' : 'Withdraw consent and hide profile from matches →'}
                </button>
              ) : (
                <p className="text-sm text-brand-muted font-mono">
                  Consent withdrawn. Your profile is hidden from new matches. Contact the team to re-enable.
                </p>
              )}
            </div>

          </div>
        </motion.div>
      </main>
    </div>
  );
}
