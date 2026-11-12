import { useState } from 'react';
import { TrendingUp, X } from 'lucide-react';
import type { Exercise, ProgressionState, SetEntry } from '../../data/types';
import { suggestProgression } from '../../lib/progression';
import { useAppStore } from '../../store/useAppStore';
import { toast } from '../ui/Toast';

export function ProgressionBanner({
  exercise,
  prog,
  lastSets,
}: {
  exercise: Exercise;
  prog?: ProgressionState;
  lastSets: SetEntry[] | null;
}) {
  const applyProgression = useAppStore((s) => s.applyProgression);
  const [dismissed, setDismissed] = useState(false);
  if (!prog || dismissed) return null;
  const suggestion = suggestProgression(prog, exercise, lastSets);
  if (!suggestion) return null;

  return (
    <div className="mt-2 flex items-start gap-2.5 rounded-sm border border-border bg-surface-2 p-3">
      <TrendingUp size={15} strokeWidth={1.5} className="text-accent shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-body-sm text-text">{suggestion.message}</p>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              applyProgression(exercise.id, suggestion);
              toast('Progression updated', 'success');
            }}
            className="h-8 rounded-sm bg-accent px-2.5 text-xs font-medium text-accent-fg hover:bg-accent-hover cursor-pointer"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="h-8 rounded-sm px-2.5 text-xs font-medium text-text-muted hover:text-text-secondary cursor-pointer"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        type="button"
        aria-label="Dismiss suggestion"
        onClick={() => setDismissed(true)}
        className="text-text-muted hover:text-text cursor-pointer shrink-0"
      >
        <X size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}