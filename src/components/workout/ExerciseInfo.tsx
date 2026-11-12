import type { Exercise } from '../../data/types';
import { Pill } from '../ui/Pill';
import { formatWeight } from '../../lib/units';
import type { Unit } from '../../data/types';
import { DEMOS } from '../../data/demos';
import { ExerciseDemo } from './ExerciseDemo';

export function repRangeLabel(ex: Exercise): string {
  const { min, max, unit } = ex.reps;
  const range = min === max ? `${min}` : `${min}–${max}`;
  const suffix = unit === 'perLeg' ? ' / leg' : unit === 'perSide' ? ' / side' : '';
  return `${ex.sets} × ${range}${suffix}`;
}

export function ExerciseInfoContent({ exercise, unit }: { exercise: Exercise; unit: Unit }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        <Pill>{repRangeLabel(exercise)}</Pill>
        {exercise.tempo && <Pill>Tempo {exercise.tempo}</Pill>}
        <Pill>{exercise.equipment}</Pill>
      </div>
      {DEMOS[exercise.id] && <ExerciseDemo exerciseId={exercise.id} name={exercise.name} />}
      <div>
        <p className="text-label text-text-muted mb-1">Execution</p>
        <p className="text-body-sm text-text-secondary">{exercise.execution}</p>
      </div>
      <div className="rounded-sm border border-border bg-surface-2 p-3">
        <p className="text-label text-accent mb-1">Coach cue</p>
        <p className="text-body-sm text-text">{exercise.cue}</p>
      </div>
      <div>
        <p className="text-label text-text-muted mb-1.5">Available load</p>
        <div className="flex flex-wrap gap-1.5">
          {exercise.loadOptions.length === 0 ? (
            <Pill>Bodyweight</Pill>
          ) : (
            exercise.loadOptions.map((w) => <Pill key={w}>{formatWeight(w, unit)}</Pill>)
          )}
        </div>
      </div>
    </div>
  );
}