import type { Unit } from '../../data/types';
import type { ExercisePerformance } from '../../lib/stats';
import { formatShort } from '../../lib/date';
import { formatWeight } from '../../lib/units';

export function LastPerformanceLine({
  last,
  unit,
}: {
  last: ExercisePerformance | null;
  unit: Unit;
}) {
  if (!last || last.topWeight == null) return null;
  const reps = last.sets.map((s) => s.reps ?? 0);
  const allSame = reps.length > 0 && reps.every((r) => r === reps[0]);
  const repLabel = allSame ? `${reps.length}×${reps[0]}` : reps.join('/');
  return (
    <p className="text-body-sm text-text-muted tnum">
      Last: {formatWeight(last.topWeight, unit)} · {repLabel} · {formatShort(last.date)}
    </p>
  );
}
