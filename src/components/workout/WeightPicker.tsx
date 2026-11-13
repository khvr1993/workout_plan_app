import { useEffect, useRef, useState } from 'react';
import type { Unit } from '../../data/types';
import { formatWeightNumber, toDisplay } from '../../lib/units';
import { cn } from '../../lib/cn';

export interface WeightPickerProps {
  /** Real equipment denominations in kg. */
  options: number[];
  /** Current value in the session's unit. */
  value: number | null;
  unit: Unit;
  onChange: (valueInUnit: number) => void;
  label: string;
}

export function WeightPicker({ options, value, unit, onChange, label }: WeightPickerProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const pressTimer = useRef<number | null>(null);
  const pressFired = useRef(false);

  const isSelected = (kg: number) => {
    if (value == null) return false;
    return Math.abs(toDisplay(kg, unit) - value) < 0.05;
  };

  const isCustomValue =
    value != null && !options.some((kg) => Math.abs(toDisplay(kg, unit) - value) < 0.05);

  const openCustom = () => {
    setCustomText(value != null ? String(value) : '');
    setCustomOpen(true);
  };

  const commitCustom = () => {
    const parsed = Number(customText.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed >= 0) {
      onChange(Math.round(parsed * 10) / 10);
    }
    setCustomOpen(false);
  };

  const startPress = () => {
    pressFired.current = false;
    pressTimer.current = window.setTimeout(() => {
      pressFired.current = true;
      openCustom();
    }, 500);
  };
  const cancelPress = () => {
    if (pressTimer.current != null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };
  useEffect(() => cancelPress, []);

  if (options.length === 0) {
    return <span className="text-body-sm text-text-muted">Bodyweight</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label={`Weight for ${label}`}>
      {options.map((kg) => (
        <button
          key={kg}
          type="button"
          aria-pressed={isSelected(kg)}
          onClick={() => {
            if (pressFired.current) {
              pressFired.current = false;
              return;
            }
            onChange(Math.round(toDisplay(kg, unit) * 10) / 10);
          }}
          onPointerDown={startPress}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          onContextMenu={(e) => e.preventDefault()}
          className={cn(
            'h-11 min-w-11 px-2 rounded-sm border text-[13px] font-medium tnum transition-colors duration-150 cursor-pointer select-none',
            isSelected(kg)
              ? 'bg-accent-soft border-accent text-accent'
              : 'bg-surface-2 border-border text-text-secondary hover:border-border-strong hover:text-text',
          )}
        >
          {formatWeightNumber(kg, unit)}
        </button>
      ))}
      {isCustomValue && (
        <span className="h-11 inline-flex items-center rounded-sm border border-accent bg-accent-soft px-2 text-[13px] font-medium text-accent tnum">
          {value}
        </span>
      )}
      {customOpen ? (
        <span className="inline-flex items-center gap-1">
          <input
            autoFocus
            inputMode="decimal"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitCustom();
              if (e.key === 'Escape') setCustomOpen(false);
            }}
            onBlur={commitCustom}
            aria-label={`Custom weight in ${unit}`}
            className="h-11 w-20 rounded-sm border border-border-strong bg-surface-2 px-2 text-[13px] tnum text-text"
            placeholder={unit}
          />
        </span>
      ) : (
        <button
          type="button"
          onClick={openCustom}
          className="h-11 px-2 rounded-sm text-[11px] font-medium text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
          aria-label={`Custom weight for ${label}`}
        >
          Custom
        </button>
      )}
    </div>
  );
}