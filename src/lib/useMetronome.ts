import { useEffect, useRef, useState } from 'react';

let sharedCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new Ctx();
  }
  return sharedCtx;
}

/** Soft woodblock click every `intervalSec` while active. */
export function useMetronome(intervalSec: number) {
  const [active, setActive] = useState(false);
  const timerRef = useRef<number | null>(null);
  const safeIntervalSec =
    Number.isFinite(intervalSec) && intervalSec > 0 ? Math.max(0.2, intervalSec) : 2;

  useEffect(() => {
    if (!active) return;
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    void ctx.resume().catch(() => undefined);

    const tick = () => {
      try {
        if (ctx.state === 'suspended') {
          void ctx.resume().catch(() => undefined);
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } catch {
        // Ignore transient audio context errors so the UI never stalls.
      }
    };
    tick();
    timerRef.current = window.setInterval(tick, safeIntervalSec * 1000);
    return () => {
      if (timerRef.current != null) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [active, safeIntervalSec]);

  return { active, toggle: () => setActive((v) => !v) };
}