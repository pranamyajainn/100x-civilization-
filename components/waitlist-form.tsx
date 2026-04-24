'use client';

import { Suspense, useState } from 'react';
import { motion } from 'motion/react';
import { collection, addDoc, serverTimestamp, getFirestore } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

export function WaitlistForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [position, setPosition] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    cohort: '',
    role: '',
    referral: ''
  });

  const generatePosition = (email: string) => {
    // Deterministic pseudo-position based on email to stay strictly front-end
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Scale into a plausible starting number (e.g., 2,000 to 15,000)
    return Math.abs(hash % 13000) + 2450; 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      await addDoc(collection(db, 'waitlist_signups'), {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        cohort: formData.cohort,
        role: formData.role,
        referral: formData.referral.trim() || null,
        createdAt: serverTimestamp(),
      });
      
      setPosition(generatePosition(formData.email));
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'An error occurred. Please try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (status === 'success') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8 bg-brand-white/5 backdrop-blur-2xl border border-brand-border rounded-sm shadow-2xl"
      >
        <div className="w-16 h-16 rounded-full bg-brand-neon/10 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-brand-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-display text-2xl md:text-3xl font-bold text-brand-white mb-2">Request Received</h3>
        <p className="text-brand-muted text-sm md:text-base mb-8 max-w-sm">
          You are on the waitlist. We process verifications in batches to maintain exclusivity.
        </p>
        
        <div className="bg-brand-black border border-brand-border p-6 w-full max-w-xs shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-brand-neon/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <p className="text-xs text-brand-muted uppercase tracking-widest font-mono mb-1">Your Position</p>
          <p className="text-4xl font-display font-medium text-brand-neon">
            #{position?.toLocaleString()}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-8 bg-brand-white/5 backdrop-blur-2xl border border-brand-border rounded-sm shadow-2xl relative" aria-live="polite">
      {status === 'error' && (
        <div className="p-3 border border-red-500/50 bg-red-500/10 text-red-500 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="fullName" className="text-xs font-mono uppercase tracking-wider text-brand-muted">Full Name <span className="text-brand-neon">*</span></label>
        <input 
          id="fullName" name="fullName" type="text" required minLength={2} maxLength={80}
          value={formData.fullName} onChange={handleChange}
          className="w-full bg-brand-black/40 border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-neon transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-xs font-mono uppercase tracking-wider text-brand-muted">Work Email <span className="text-brand-neon">*</span></label>
        <input 
          id="email" name="email" type="email" required pattern="^.+@.+\..+$"
          value={formData.email} onChange={handleChange}
          className="w-full bg-brand-black/40 border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-neon transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cohort" className="text-xs font-mono uppercase tracking-wider text-brand-muted">100x Cohort <span className="text-brand-neon">*</span></label>
          <select 
            id="cohort" name="cohort" required
            value={formData.cohort} onChange={handleChange}
            className="w-full bg-brand-black/40 border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-neon appearance-none transition-colors"
          >
            <option value="" disabled>Select cohort...</option>
            <option value="Cohort 1">Cohort 1</option>
            <option value="Cohort 2">Cohort 2</option>
            <option value="Cohort 3">Cohort 3</option>
            <option value="Cohort 4">Cohort 4</option>
            <option value="Cohort 5">Cohort 5</option>
            <option value="Cohort 6">Cohort 6</option>
            <option value="Cohort 7">Cohort 7</option>
            <option value="Not yet in a cohort">Not yet in a cohort</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="role" className="text-xs font-mono uppercase tracking-wider text-brand-muted">Core Role <span className="text-brand-neon">*</span></label>
          <select 
            id="role" name="role" required
            value={formData.role} onChange={handleChange}
            className="w-full bg-brand-black/40 border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-neon appearance-none transition-colors"
          >
            <option value="" disabled>Select role...</option>
            <option value="Founder">Founder</option>
            <option value="Engineer">Engineer</option>
            <option value="Designer">Designer</option>
            <option value="PM">PM</option>
            <option value="Marketer">Marketer</option>
            <option value="Operator">Operator</option>
            <option value="Investor">Investor</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="referral" className="text-xs font-mono uppercase tracking-wider text-brand-muted opacity-70">Referral Code (Optional)</label>
        <input 
          id="referral" name="referral" type="text" maxLength={200}
          value={formData.referral} onChange={handleChange} placeholder="Who referred you? Leave blank if none."
          className="w-full bg-brand-black/40 border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-neon transition-colors placeholder:text-brand-muted/50"
        />
      </div>

      <button 
        type="submit" 
        disabled={status === 'loading'}
        className="mt-4 w-full bg-brand-neon text-brand-black font-bold uppercase tracking-widest py-4 hover:bg-[#FF6A26] transition-all flex items-center justify-center gap-2 group"
      >
        {status === 'loading' ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            Request Access
            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </>
        )}
      </button>

      <div className="mt-4 flex items-center justify-center space-x-2">
        <div className="h-[1px] w-4 bg-brand-white/20"></div>
        <span className="text-[10px] text-brand-muted uppercase tracking-tighter">4,290 waiting list</span>
        <div className="h-[1px] w-4 bg-brand-white/20"></div>
      </div>
    </form>
  );
}
