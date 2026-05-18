'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { auth } from '@/lib/firebase';

interface Message {
  role: 'user' | 'civ';
  text: string;
}

const GREETING: Message = {
  role: 'civ',
  text: "Hey, I'm Civ. Tell me what you're looking for and I'll find the right people in the network for you.",
};

const SUGGESTIONS = [
  'Find me a content creator',
  'Who can help with Meta ads?',
  'Find a backend developer',
];

const FALLBACK =
  "I'm having trouble searching right now. Try posting an opportunity and the right people will be notified directly.";

export function CivChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages or loading change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (overrideMessage?: string) => {
    const messageToSend = (overrideMessage ?? input).trim();
    if (!messageToSend || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text: messageToSend }]);
    if (!overrideMessage) setInput('');
    setLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageToSend }),
      });

      const data = await res.json();
      const reply: string = data.reply ?? FALLBACK;
      setMessages((prev) => [...prev, { role: 'civ', text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'civ', text: FALLBACK }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-1">
        <button
          onClick={() => setIsOpen((o) => !o)}
          aria-label="Open Civ directory assistant"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-neon shadow-[0_0_20px_rgba(255,107,53,0.4)] transition-shadow hover:shadow-[0_0_30px_rgba(255,107,53,0.6)]"
        >
          <Sparkles size={22} className="text-brand-black" />
        </button>
        <span className="font-mono text-[10px] tracking-widest text-brand-neon">Civ</span>
      </div>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-24 right-6 z-50 flex h-[480px] w-80 max-w-[calc(100vw-48px)] flex-col border border-white/10 bg-[#0a0a0a] shadow-2xl"
          >
            {/* Header */}
            <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/8 px-4">
              <div>
                <p className="font-mono text-xs tracking-[0.3em] text-brand-neon">◉ CIV</p>
                <p className="font-mono text-[9px] tracking-widest text-brand-muted">
                  100x Network Directory
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center text-brand-muted transition-colors hover:text-brand-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((msg, i) => (
                <div key={i}>
                  <p className="mb-1 font-mono text-[9px] tracking-widest text-brand-muted">
                    {msg.role === 'user' ? 'YOU' : 'CIV'}
                  </p>
                  <div
                    className={
                      msg.role === 'user'
                        ? 'rounded-sm border border-brand-neon/30 bg-brand-neon/15 p-3 text-sm text-brand-white'
                        : 'rounded-sm border border-white/10 bg-white/[0.04] p-3 text-sm text-brand-white'
                    }
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Suggestion buttons — only shown on greeting */}
              {messages.length === 1 && !loading && (
                <div className="flex flex-col gap-2 pb-1">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion);
                        handleSend(suggestion);
                      }}
                      className="border border-white/10 px-3 py-2 text-left text-xs font-mono tracking-wide text-brand-muted transition-all duration-200 hover:border-brand-neon/40 hover:text-brand-white"
                    >
                      {suggestion} →
                    </button>
                  ))}
                </div>
              )}

              {/* Typing indicator */}
              {loading && (
                <div>
                  <p className="mb-1 font-mono text-[9px] tracking-widest text-brand-muted">CIV</p>
                  <div className="flex items-center gap-1 rounded-sm border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex h-4 items-center gap-1">
                      <div
                        className="h-1 w-1 animate-bounce rounded-full bg-brand-neon"
                        style={{ animationDelay: '0ms' }}
                      />
                      <div
                        className="h-1 w-1 animate-bounce rounded-full bg-brand-neon"
                        style={{ animationDelay: '150ms' }}
                      />
                      <div
                        className="h-1 w-1 animate-bounce rounded-full bg-brand-neon"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex flex-shrink-0 items-center gap-2 border-t border-white/8 p-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask me to find someone..."
                disabled={loading}
                className="flex-1 bg-transparent font-mono text-xs text-brand-white placeholder-brand-muted outline-none"
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                aria-label="Send"
                className="text-brand-neon transition-colors hover:text-brand-white disabled:opacity-40"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
