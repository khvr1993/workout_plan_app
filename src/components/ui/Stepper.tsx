import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface StepperProps {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  editable?: boolean;
  ariaLabel: string;
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  editable = false,
  ariaLabel,
}: StepperProps) {
  const current = value ?? min;
  const [draft, setDraft] = useState(value == null ? '' : String(value));

  useEffect(() => {
    setDraft(value == null ? '' : String(value));
  }, [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));

  const base = () => {
    if (!editable) return current;
    const parsed = Number.parseInt(draft, 10);
    return Number.isFinite(parsed) ? clamp(parsed) : current;
  };

  const commit = () => {
    const parsed = Number.parseInt(draft, 10);
    if (!Number.isFinite(parsed)) {
      setDraft(value == null ? '' : String(value));
      return;
    }
    const next = clamp(parsed);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <div className="inline-flex items-center rounded-sm border border-border bg-surface-2 focus-within:border-border-strong">
      <button
        type="button"
        aria-label={`Decrease ${ariaLabel}`}
        disabled={current <= min}
        onClick={() => onChange(clamp(base() - step))}
        className="flex h-11 w-9 items-center justify-center text-text-secondary hover:text-text cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
      >
        <Minus size={15} strokeWidth={1.5} />
      </button>
      {editable ? (
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          aria-label={ariaLabel}
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              setDraft(value == null ? '' : String(value));
              e.currentTarget.blur();
            }
          }}
          className="h-11 w-12 bg-transparent text-center text-sm font-medium text-text tnum outline-none"
        />
      ) : (
        <span
          aria-live="polite"
          aria-label={ariaLabel}
          className={cn('w-8 text-center text-sm font-medium tnum', value == null && 'text-text-muted')}
        >
          {value ?? '—'}
        </span>
      )}
      <button
        type="button"
        aria-label={`Increase ${ariaLabel}`}
        disabled={current >= max}
        onClick={() => onChange(clamp(base() + step))}
        className="flex h-11 w-9 items-center justify-center text-text-secondary hover:text-text cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
      >
        <Plus size={15} strokeWidth={1.5} />
      </button>
    </div>
  );
}
