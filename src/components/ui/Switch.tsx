import { cn } from '../../lib/cn';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-150 cursor-pointer',
        'disabled:opacity-50 disabled:pointer-events-none',
        checked ? 'bg-accent border-transparent' : 'bg-surface-2 border-border-strong',
      )}
    >
      <span
        className={cn(
          'absolute top-1/2 -translate-y-1/2 h-4.5 w-4.5 rounded-full transition-all duration-150',
          checked ? 'left-[calc(100%-1.25rem)] bg-accent-fg' : 'left-0.5 bg-text-muted',
        )}
      />
    </button>
  );
}