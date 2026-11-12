import { cn } from '../../lib/cn';

export interface SegmentedControlProps<T extends string | number> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-sm border border-border bg-surface-2 p-0.5"
    >
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          aria-pressed={opt.value === value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-xs font-medium transition-colors duration-150 cursor-pointer tnum',
            size === 'md' ? 'h-9 px-3 text-[13px]' : 'h-7 px-2 text-xs',
            opt.value === value
              ? 'bg-surface text-text border border-border-strong'
              : 'text-text-muted hover:text-text-secondary border border-transparent',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}