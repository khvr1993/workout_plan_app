import { Minus, Plus } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface StepperProps {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  ariaLabel: string;
}

export function Stepper({ value, onChange, min = 0, max = 99, ariaLabel }: StepperProps) {
  const current = value ?? min;
  return (
    <div className="inline-flex items-center rounded-sm border border-border bg-surface-2">
      <button
        type="button"
        aria-label={`Decrease ${ariaLabel}`}
        disabled={current <= min}
        onClick={() => onChange(Math.max(min, current - 1))}
        className="flex h-11 w-9 items-center justify-center text-text-secondary hover:text-text cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
      >
        <Minus size={15} strokeWidth={1.5} />
      </button>
      <span
        aria-live="polite"
        aria-label={ariaLabel}
        className={cn('w-8 text-center text-sm font-medium tnum', value == null && 'text-text-muted')}
      >
        {value ?? '—'}
      </span>
      <button
        type="button"
        aria-label={`Increase ${ariaLabel}`}
        disabled={current >= max}
        onClick={() => onChange(Math.min(max, current + 1))}
        className="flex h-11 w-9 items-center justify-center text-text-secondary hover:text-text cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
      >
        <Plus size={15} strokeWidth={1.5} />
      </button>
    </div>
  );
}