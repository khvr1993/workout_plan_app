import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, SkipForward } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ProgressRing } from '../ui/ProgressRing';
import { formatClock } from '../../lib/date';
import { vibrate } from '../../lib/haptics';
import { toast } from '../ui/Toast';

export function RestTimerSheet() {
  const restEndsAt = useAppStore((s) => s.restEndsAt);
  const restTotalSec = useAppStore((s) => s.restTotalSec);
  const extendRest = useAppStore((s) => s.extendRest);
  const stopRest = useAppStore((s) => s.stopRest);
  const haptics = useAppStore((s) => s.settings.haptics);
  const [now, setNow] = useState(Date.now());

  const active = restEndsAt != null;
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(t);
  }, [active]);

  const remaining = restEndsAt != null ? Math.max(0, (restEndsAt - now) / 1000) : 0;

  useEffect(() => {
    if (active && remaining <= 0) {
      vibrate(haptics, [60, 40, 60]);
      stopRest();
      toast('Rest done — next round', 'success');
    }
  }, [active, remaining, haptics, stopRest]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, transform: 'translateY(24px)' }}
          animate={{ opacity: 1, transform: 'translateY(0)' }}
          exit={{ opacity: 0, transform: 'translateY(24px)' }}
          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          className="fixed bottom-0 inset-x-0 z-40 flex justify-center px-4 pb-4 pointer-events-none"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          role="timer"
          aria-label={`Rest timer, ${Math.ceil(remaining)} seconds remaining`}
        >
          <div
            className="pointer-events-auto flex items-center gap-5 rounded-md border border-border bg-surface p-4 pr-5"
            style={{ boxShadow: 'var(--overlay-shadow)' }}
          >
            <ProgressRing progress={restTotalSec > 0 ? remaining / restTotalSec : 0} size={96} stroke={5}>
              <span className="text-h2 text-text tnum">{formatClock(remaining)}</span>
              <span className="text-[10px] text-text-muted uppercase tracking-wider">rest</span>
            </ProgressRing>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => extendRest(15)}
                className="inline-flex h-11 items-center gap-1.5 rounded-sm border border-border bg-surface-2 px-3 text-[13px] font-medium text-text hover:border-border-strong cursor-pointer"
              >
                <Plus size={14} strokeWidth={1.5} />
                15s
              </button>
              <button
                type="button"
                onClick={stopRest}
                className="inline-flex h-11 items-center gap-1.5 rounded-sm bg-accent px-3 text-[13px] font-medium text-accent-fg hover:bg-accent-hover cursor-pointer"
              >
                <SkipForward size={14} strokeWidth={1.5} />
                Skip rest
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}