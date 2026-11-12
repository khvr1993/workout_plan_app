import { useEffect, useState } from 'react';
import { Check, ChevronDown, Timer } from 'lucide-react';
import { warmup } from '../../data/program';
import { Card } from '../ui/Card';
import { formatClock } from '../../lib/date';
import { cn } from '../../lib/cn';

interface WarmupState {
  done: string[];
  endsAt: number | null;
  collapsed: boolean;
}

function loadState(sessionId: string): WarmupState {
  try {
    const raw = sessionStorage.getItem(`wt:warmup:${sessionId}`);
    if (raw) return JSON.parse(raw) as WarmupState;
  } catch {
    // ignore
  }
  return { done: [], endsAt: null, collapsed: false };
}

export function WarmupChecklist({ sessionId, minutes }: { sessionId: string; minutes: number }) {
  const [state, setState] = useState<WarmupState>(() => loadState(sessionId));
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    try {
      sessionStorage.setItem(`wt:warmup:${sessionId}`, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state, sessionId]);

  const running = state.endsAt != null && state.endsAt > now;
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [running]);

  const remaining = state.endsAt != null ? Math.max(0, (state.endsAt - now) / 1000) : minutes * 60;
  const allDone = state.done.length === warmup.length;

  const toggleDrill = (id: string) => {
    setState((s) => ({
      ...s,
      done: s.done.includes(id) ? s.done.filter((x) => x !== id) : [...s.done, id],
    }));
  };

  if (state.collapsed) {
    return (
      <button
        type="button"
        onClick={() => setState((s) => ({ ...s, collapsed: false }))}
        className="flex w-full items-center justify-between rounded-md border border-border bg-surface px-5 py-3 text-body-sm text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        aria-expanded={false}
      >
        <span className="inline-flex items-center gap-2">
          <Check size={14} strokeWidth={1.5} className="text-accent" />
          Warm-up done
        </span>
        <ChevronDown size={14} strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Timer size={15} strokeWidth={1.5} className="text-text-muted" />
          <h2 className="text-h3 text-text">Warm-up</h2>
          <span className="text-body-sm text-text-muted tnum">{minutes}:00</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-h2 text-text tnum" aria-live="off">
            {formatClock(remaining)}
          </span>
          <button
            type="button"
            onClick={() =>
              setState((s) => ({
                ...s,
                endsAt: running ? null : Date.now() + remaining * 1000,
              }))
            }
            className="h-9 rounded-sm border border-border bg-surface-2 px-3 text-[13px] font-medium text-text hover:border-border-strong cursor-pointer"
          >
            {running ? 'Pause' : state.endsAt != null ? 'Resume' : 'Start'}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {warmup.map((drill) => {
          const done = state.done.includes(drill.id);
          return (
            <button
              key={drill.id}
              type="button"
              aria-pressed={done}
              onClick={() => toggleDrill(drill.id)}
              className={cn(
                'flex items-center gap-2.5 rounded-sm border px-3 h-11 text-left text-[13px] transition-colors cursor-pointer',
                done
                  ? 'border-transparent bg-accent-soft text-text'
                  : 'border-border bg-surface-2 text-text-secondary hover:border-border-strong',
              )}
            >
              <span
                className={cn(
                  'flex h-4.5 w-4.5 items-center justify-center rounded-xs border shrink-0',
                  done ? 'bg-accent border-transparent' : 'border-border-strong',
                )}
              >
                {done && <Check size={12} strokeWidth={2.5} className="text-accent-fg" />}
              </span>
              <span className="flex-1">{drill.label}</span>
              <span className="text-text-muted tnum text-xs">{drill.seconds}s</span>
            </button>
          );
        })}
      </div>
      {allDone && (
        <button
          type="button"
          onClick={() => setState((s) => ({ ...s, collapsed: true, endsAt: null }))}
          className="mt-3 h-9 w-full rounded-sm bg-accent text-[13px] font-medium text-accent-fg hover:bg-accent-hover cursor-pointer"
        >
          Warm-up complete — start Block 1
        </button>
      )}
    </Card>
  );
}