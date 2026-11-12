import { Timer } from 'lucide-react';
import type { Exercise, ProgressionState } from '../../data/types';
import { Pill } from '../ui/Pill';
import { useMetronome } from '../../lib/useMetronome';
import { cn } from '../../lib/cn';

export function tempoString(exercise: Exercise, prog?: ProgressionState): string | null {
  if (prog && (prog.stage === 'tempo' || prog.stage === 'pause' || prog.stage === 'rest')) {
    return `${prog.tempoSeconds}-1-1-0`;
  }
  return exercise.tempo ?? null;
}

export function TempoCue({
  exercise,
  prog,
  metronomeEnabled,
}: {
  exercise: Exercise;
  prog?: ProgressionState;
  metronomeEnabled: boolean;
}) {
  const tempo = tempoString(exercise, prog);
  const eccentric = tempo ? parseInt(tempo.split('-')[0], 10) : 2;
  const { active, toggle } = useMetronome(eccentric);
  if (!tempo) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Pill>
        <Timer size={11} strokeWidth={1.5} />
        Tempo {tempo}
      </Pill>
      {metronomeEnabled && (
        <button
          type="button"
          onClick={toggle}
          aria-pressed={active}
          aria-label="Toggle tempo metronome"
          title="Tempo metronome"
          className={cn(
            'inline-flex h-6 items-center rounded-xs border px-1.5 text-[10px] font-medium transition-colors cursor-pointer',
            active
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-border text-text-muted hover:text-text-secondary',
          )}
        >
          {active ? 'Tick on' : 'Tick'}
        </button>
      )}
    </span>
  );
}