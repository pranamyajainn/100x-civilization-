'use client';

import { Suspense, useState, useEffect } from 'react';
import { motion, useAnimation, useSpring, useTransform } from 'motion/react';
import { collection, doc, runTransaction, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { useModalStore } from '@/lib/store';
import { MagneticButton } from './magnetic-button';
import { LiveCounter } from './live-counter';
import confetti from 'canvas-confetti';

// Short hash for referral code
function shortHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash).toString(36).substring(0, 6).toUpperCase();
}

export function WaitlistForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [position, setPosition] = useState<number | null>(null);
  const [referralBoosts, setReferralBoosts] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [docId, setDocId] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string>('');
  
  const { isOpen } = useModalStore();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    cohort: '',
    role: '',
    referral: '',
    linkedin: ''
  });

  // Check LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('signup_data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data && data.position) {
          setTimeout(() => {
            setPosition(data.position);
            setDocId(data.id);
            setRefCode(data.refCode || shortHash(data.id || 'fallback'));
            setStatus('success');
          }, 0);
        }
      } catch(e) {}
    }
  }, []);

  // Listen to referral boosts if signed up
  useEffect(() => {
    if (status === 'success' && docId) {
       const u = onSnapshot(doc(db, 'waitlist_signups', docId), (snap) => {
          if (snap.exists()) {
             setReferralBoosts(snap.data().referralsCount || 0);
          }
       });
       return () => u();
    }
  }, [status, docId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const counterRef = doc(db, 'metadata', 'signups');
      const signupId = doc(collection(db, 'waitlist_signups')).id;
      const refC = shortHash(signupId);
      
      const newPos = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let count = 0;
        if (counterDoc.exists()) {
          count = counterDoc.data().count || 0;
        }
        
        const nextPos = count + 1;
        
        transaction.set(counterRef, { count: nextPos }, { merge: true });
        
        const signupData: any = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          cohort: formData.cohort,
          role: formData.role,
          createdAt: serverTimestamp(),
          position: nextPos,
          referralCode: refC,
          referralsCount: 0
        };
        
        if (formData.referral.trim()) {
           signupData.referral = formData.referral.trim();
        }
        
        if (formData.linkedin.trim()) {
           signupData.linkedin = formData.linkedin.trim();
        }

        transaction.set(doc(db, 'waitlist_signups', signupId), signupData);
        
        return nextPos;
      });
      
      setPosition(newPos);
      setDocId(signupId);
      setRefCode(refC);
      
      localStorage.setItem('signup_data', JSON.stringify({ id: signupId, position: newPos, refCode: refC }));
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

  const shareText = `Join the 100x Civilization. Use my referral code: ${refCode}`;
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: '100x Civilization',
        text: shareText,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText + ' ' + window.location.href);
      alert('Copied to clipboard!');
    }
  };

  if (status === 'success') {
    return <CelebrationState position={position!} boosts={referralBoosts} refCode={refCode} onShare={handleShare} />;
  }

  // Fade fields sequentially
  const formVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 }
    }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25 } }
  };

  return (
    <motion.form 
      variants={formVariants}
      initial="hidden"
      animate={isOpen ? "show" : "hidden"}
      onSubmit={handleSubmit} 
      className="flex flex-col gap-5 p-4 sm:p-8 w-full max-w-md relative" 
      aria-live="polite"
    >
      <motion.div variants={itemVariants} className="mb-2">
        <h3 className="text-2xl font-display font-medium">Claim your seat</h3>
        <p className="text-[10px] sm:text-xs text-brand-muted mt-1 font-mono uppercase tracking-widest">Cohort verification required.</p>
      </motion.div>

      {status === 'error' && (
        <motion.div variants={itemVariants} className="p-3 border border-red-500/50 bg-red-500/10 text-red-500 text-sm">
          {errorMsg}
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
        <label htmlFor="fullName" className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">Full Name <span className="text-brand-neon">*</span></label>
        <input 
          id="fullName" name="fullName" type="text" required minLength={2} maxLength={80}
          value={formData.fullName} onChange={handleChange}
          className="w-full bg-brand-black/40 border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-neon transition-colors"
        />
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">Email <span className="text-brand-neon">*</span></label>
        <input 
          id="email" name="email" type="email" required pattern="^.+@.+\..+$"
          value={formData.email} onChange={handleChange}
          className="w-full bg-brand-black/40 border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-neon transition-colors"
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cohort" className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">Cohort <span className="text-brand-neon">*</span></label>
          <select 
            id="cohort" name="cohort" required
            value={formData.cohort} onChange={handleChange}
            className="w-full bg-brand-black/40 border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-neon appearance-none transition-colors"
          >
            <option value="" disabled>Select...</option>
            <option value="Cohort 1">Cohort 1</option>
            <option value="Cohort 2">Cohort 2</option>
            <option value="Cohort 3">Cohort 3</option>
            <option value="Cohort 4">Cohort 4</option>
            <option value="Cohort 5">Cohort 5</option>
            <option value="Cohort 6">Cohort 6</option>
            <option value="Cohort 7">Cohort 7</option>
            <option value="None">None</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="role" className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">Role <span className="text-brand-neon">*</span></label>
          <select 
            id="role" name="role" required
            value={formData.role} onChange={handleChange}
            className="w-full bg-brand-black/40 border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-neon appearance-none transition-colors"
          >
            <option value="" disabled>Select...</option>
            <option value="Founder">Founder</option>
            <option value="Engineer">Engineer</option>
            <option value="Designer">Designer</option>
            <option value="PM">PM</option>
            <option value="Marketer">Marketer</option>
            <option value="Student">Student</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
        <label htmlFor="referral" className="text-[10px] font-mono uppercase tracking-wider text-brand-muted opacity-70">Referral Code</label>
        <input 
          id="referral" name="referral" type="text" maxLength={200}
          value={formData.referral} onChange={handleChange} placeholder="Optional"
          className="w-full bg-brand-black/40 border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-neon transition-colors placeholder:text-brand-muted/50"
        />
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
        <label htmlFor="linkedin" className="text-[10px] font-mono uppercase tracking-wider text-brand-muted opacity-70">LinkedIn Profile URL</label>
        <input 
          id="linkedin" name="linkedin" type="url" maxLength={200}
          value={formData.linkedin} onChange={handleChange} placeholder="Optional"
          className="w-full bg-brand-black/40 border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-neon transition-colors placeholder:text-brand-muted/50"
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <button
          type="submit" disabled={status === 'loading'}
          className="mt-4 w-full bg-brand-neon text-brand-black font-bold uppercase tracking-widest py-4 hover:bg-[#FF6A26] transition-all flex items-center justify-center gap-2 group border-none"
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
      </motion.div>

      <motion.div variants={itemVariants}>
        <LiveCounter />
      </motion.div>
    </motion.form>
  );
}

function CelebrationState({ position, boosts, refCode, onShare }: { position: number, boosts: number, refCode: string, onShare: () => void }) {
  const [displayPos, setDisplayPos] = useState<number | string>('...');
  const effectivePos = Math.max(1, position - boosts);

  useEffect(() => {
    let startTime = Date.now();
    const scrambleDur = 800; // 800ms
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed < scrambleDur) {
        setDisplayPos(Math.floor(Math.random() * 9999));
      } else {
        clearInterval(interval);
        setDisplayPos(effectivePos);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FF4D00', '#4F46E5', '#FFFFFF'],
          disableForReducedMotion: true
        });
      }
    }, 50);
    return () => clearInterval(interval);
  }, [effectivePos]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="flex flex-col items-center justify-center text-center p-8 w-full max-w-md relative"
    >
      <div className="w-16 h-16 rounded-full bg-brand-neon/10 flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-brand-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      
      <p className="text-xs text-brand-muted uppercase tracking-widest font-mono mb-2">You are number</p>
      
      <div className="text-6xl md:text-8xl font-display font-medium text-brand-neon mb-2 tabular-nums">
        #{displayPos}
      </div>

      {boosts > 0 && (
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-mono text-brand-neon/80 mb-6 border border-brand-neon/20 px-3 py-1 bg-brand-neon/5 inline-block">
            +{boosts} from referrals
         </motion.div>
      )}

      <p className="text-brand-muted text-lg mb-8 max-w-xs text-balance mt-4">
        Position locked. Move up the list by referring other cohort members.
      </p>

      <div className="w-full p-4 border border-brand-border bg-brand-black/40 mb-6 flex flex-col gap-2">
        <p className="text-[10px] text-brand-muted font-mono uppercase">Your Referral Code</p>
        <div className="flex items-center justify-center gap-3">
          <span className="font-mono text-xl tracking-wider">{refCode}</span>
        </div>
      </div>
      
      <MagneticButton onClick={onShare} className="w-full text-sm hover:!bg-[#FF6A26]">
        Share your seat
      </MagneticButton>
    </motion.div>
  );
}
