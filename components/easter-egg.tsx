'use client';
import { useEffect, useState } from 'react';

export function EasterEggSound() {
  const [isPlaying, setIsPlaying] = useState(false);
  
  useEffect(() => {
    let clickCount = 0;
    let clickTimer: NodeJS.Timeout;
    
    // Create audio source
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    let osc: OscillatorNode | null = null;
    let gainNode: GainNode | null = null;

    const toggleSound = () => {
      const playing = !isPlaying;
      setIsPlaying(playing);

      if (playing) {
        if (audioContext.state === 'suspended') audioContext.resume();
        osc = audioContext.createOscillator();
        gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(55, audioContext.currentTime); // Drone at A1
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, audioContext.currentTime);
        filter.Q.value = 5;

        // LFO for filter sweep
        const lfo = audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.1, audioContext.currentTime);
        const lfoGain = audioContext.createGain();
        lfoGain.gain.value = 50;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 2); // fade in

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        osc.start();
      } else {
        if (gainNode) {
          gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1);
          setTimeout(() => {
            osc?.stop();
            osc?.disconnect();
            gainNode?.disconnect();
          }, 1000);
        }
      }
    };

    const handleClick = () => {
      clickCount++;
      clearTimeout(clickTimer);
      
      if (clickCount >= 5) {
        toggleSound();
        clickCount = 0;
      } else {
        clickTimer = setTimeout(() => {
          clickCount = 0;
        }, 500); // 500ms max between clicks
      }
    };

    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('click', handleClick);
      if (osc) {
        osc.stop();
        osc.disconnect();
      }
    };
  }, [isPlaying]);

  return isPlaying ? (
    <div className="fixed bottom-4 right-4 z-[99]" style={{ mixBlendMode: 'difference' }}>
      <p className="text-[10px] font-mono uppercase tracking-widest text-brand-neon animate-pulse flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-brand-neon block"></span> Sound On
      </p>
    </div>
  ) : null;
}
