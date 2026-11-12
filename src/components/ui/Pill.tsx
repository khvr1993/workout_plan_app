import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'neutral' | 'accent' | 'danger';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-text-secondary border-border',
  accent: 'bg-accent-soft text-accent border-transparent',
  danger: 'bg-danger/10 text-danger border-transparent',
};

export function Pill({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-xs border px-2 py-0.5 text-[11px] font-medium leading-4',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}