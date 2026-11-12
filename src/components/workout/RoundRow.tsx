import { useRef } from 'react';
import { Check, Pause } from 'lucide-react';
import type { Exercise, SetEntry, Unit } from '../../data/types';
import { WeightPicker } from './WeightPicker';
import { Stepper } from '../ui/Stepper';
import { cn } from '../../lib/cn';

export interface RoundRowProps {
  exercise: Exercise;
  entry: SetEntry;
  roundIndex: number;
  unit: Unit;
  targetReps: number;
  onPatch: (patch: Partial<SetEntry>) => void;
  onToggleComplete: () => void;
}

export function RoundRow({
  exercise,
  entry,
  roundIndex,
  unit,
  targetReps,
  onPatch,
  onToggleComplete,
}: RoundRowProps) {
  const skipTimer = useRef<number | null>(null);
  const skipFired = useRef(false);

  const startSkipPress = () => {
    skipFired.current = false;
    skipTimer.current = window.setTimeout(() => {
      skipFired.current = true;
      onPatch({ skipped: !entry.skipped, completed: false });
    }, 500);
  };
  const cancelSkipPress = () => {
    if (skipTimer.current != null) {
      window.clearTimeout(skipTimer.current);
      skipTimer.current = null;
    }
  };
  const handleCheckClick = () => {
    if (skipFired.current) {
      skipFired.current = false;
      return;
    }
    onToggleComplete();
  };

  const repSuffix =
    exercise.reps.unit === 'perLeg' ? ' / leg' : exercise.reps.unit === 'perSide' ? ' / side' : '';

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-sm px-2 py-2 -mx-2',
        entry.completed && !entry.skipped && 'bg-surface-2',
        entry.skipped && 'opacity-60',
      )}
    >
      <span className="text-label text-text-muted w-7 shrink-0 tnum">R{roundIndex + 1}</span>

      <div className="flex-1 min-w-32">
        <WeightPicker
          options={exercise.loadOptions}
          value={entry.weight}
          unit={unit}
          label={`${exercise.name} round ${roundIndex + 1}`}
          onChange={(weight) => onPatch({ weight })}
        />
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <Stepper
          value={entry.reps}
          min={0}
          max={99}
          ariaLabel={`Reps${repSuffix} for ${exercise.name} round ${roundIndex + 1}`}
          onChange={(reps) => onPatch({ reps })}
        />
        <button
          type="button"
          onClick={() => onPatch({ reps: targetReps })}
          title={`Jump to target ${targetReps}${repSuffix}`}
          className="h-11 rounded-sm border border-border px-2 text-[11px] font-medium text-text-muted hover:text-text hover:border-border-strong transition-colors cursor-pointer tnum"
        >
          {targetReps}
        </button>
        <button
          type="button"
          aria-pressed={entry.paused ?? false}
          aria-label={`Paused rep for ${exercise.name} round ${roundIndex + 1}`}
          title="1s pause at the bottom"
          onClick={() => onPatch({ paused: !entry.paused })}
          className={cn(
            'flex h-11 w-9 items-center justify-center rounded-sm border transition-colors cursor-pointer',
            entry.paused
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-border text-text-muted hover:text-text-secondary hover:border-border-strong',
          )}
        >
          <Pause size={14} strokeWidth={1.5} />
        </button>
        {entry.skipped ? (
          <button
            type="button"
            onClick={() => onPatch({ skipped: false })}
            className="flex h-11 items-center justify-center rounded-sm border border-border px-2 text-[11px] font-medium text-text-muted hover:text-text cursor-pointer"
            title="Tap to undo skip"
          >
            Skipped
          </button>
        ) : (
          <button
            type="button"
            aria-pressed={entry.completed}
            aria-label={`Complete ${exercise.name} round ${roundIndex + 1}`}
            title="Complete set (long-press to skip)"
            onClick={handleCheckClick}
            onPointerDown={startSkipPress}
            onPointerUp={cancelSkipPress}
            onPointerLeave={cancelSkipPress}
            onContextMenu={(e) => e.preventDefault()}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-sm border transition-colors duration-150 cursor-pointer select-none',
              entry.completed
                ? 'bg-accent border-transparent text-accent-fg'
                : 'border-border-strong text-text-muted hover:text-text hover:bg-surface-2',
            )}
          >
            <Check size={18} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}