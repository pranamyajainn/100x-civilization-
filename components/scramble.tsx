'use client';
import { useState, useEffect } from 'react';

const CHARS = '!<>-_\\\\/[]{}—=+*^?#________';

export function ScrambleText({ text, duration = 800 }: { text: string, duration?: number }) {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    let frame: number;
    const start = Date.now();
    let isRunning = true;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 1) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
          if (text[i] === ' ') {
            result += ' ';
            continue;
          }
          if (progress * text.length > i) {
            result += text[i];
          } else {
            result += CHARS[Math.floor(Math.random() * CHARS.length)];
          }
        }
        setDisplayText(result);
        if (isRunning) frame = requestAnimationFrame(animate);
      } else {
        setDisplayText(text);
      }
    };

    if (isRunning) frame = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      cancelAnimationFrame(frame);
    };
  }, [text, duration]);

  return <span>{displayText}</span>;
}
