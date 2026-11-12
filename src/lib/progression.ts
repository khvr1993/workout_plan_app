import type { Exercise, ProgressionState, SetEntry } from '../data/types';
import { daysBetween, todayLocal } from './date';

export function initialProgression(exercise: Exercise, restSeconds: number): ProgressionState {
  const tempoSeconds = exercise.tempo ? (parseInt(exercise.tempo.split('-')[0], 10) as 2 | 3 | 4) : 2;
  return {
    exerciseId: exercise.id,
    currentWeight: exercise.loadOptions[0] ?? 0,
    targetReps: exercise.reps.min,
    stage: 'reps',
    tempoSeconds: Number.isFinite(tempoSeconds) ? tempoSeconds : 2,
    paused: false,
    restSeconds,
    weeksAtStage: 0,
    updatedAt: todayLocal(),
  };
}

export type SuggestionKind = 'reps' | 'weight' | 'tempo' | 'pause' | 'rest' | 'maintain';

export interface Suggestion {
  kind: SuggestionKind;
  message: string;
  patch: Partial<ProgressionState>;
}

const WEEKS_BEFORE_NEXT_LEVER = 2;

/**
 * The four levers (§0.6): reps → load → tempo → pause → rest.
 * Suggests only; applying is an explicit user action.
 */
export function suggestProgression(
  state: ProgressionState,
  exercise: Exercise,
  lastSets: SetEntry[] | null,
): Suggestion | null {
  const weeks = Math.max(0, Math.floor(daysBetween(state.updatedAt, todayLocal()) / 7));
  const hitTarget =
    lastSets != null &&
    lastSets.filter((s) => s.completed && !s.skipped).length >= exercise.sets &&
    lastSets.every((s) => !s.completed || s.skipped || (s.reps ?? 0) >= state.targetReps);

  if (state.stage === 'reps') {
    if (hitTarget && state.targetReps < exercise.reps.max) {
      const next = state.targetReps + 1;
      return {
        kind: 'reps',
        message: `All sets at ${state.targetReps} reps — push for ${next} next session.`,
        patch: { targetReps: next },
      };
    }
    if (hitTarget && state.targetReps >= exercise.reps.max) {
      const heavier = exercise.loadOptions.filter((w) => w > state.currentWeight).sort((a, b) => a - b)[0];
      if (heavier != null) {
        return {
          kind: 'weight',
          message: `Top of the rep range at ${state.currentWeight} kg — jump to ${heavier} kg and rebuild from ${exercise.reps.min} reps.`,
          patch: { currentWeight: heavier, targetReps: exercise.reps.min },
        };
      }
      return {
        kind: 'tempo',
        message: `${weeks} week${weeks === 1 ? '' : 's'} at ${exercise.sets}×${state.targetReps} @ ${state.currentWeight} kg — move to a 3s eccentric?`,
        patch: { stage: 'tempo', tempoSeconds: 3 },
      };
    }
    return null;
  }

  if (state.stage === 'tempo') {
    if (state.tempoSeconds === 3 && weeks >= WEEKS_BEFORE_NEXT_LEVER) {
      return {
        kind: 'tempo',
        message: `${weeks} weeks at 3s down — slow the eccentric to 4s.`,
        patch: { tempoSeconds: 4 },
      };
    }
    if (state.tempoSeconds === 4 && weeks >= WEEKS_BEFORE_NEXT_LEVER) {
      return {
        kind: 'pause',
        message: 'Eccentrics are slow and honest — add a strict 1s pause at the stretched position.',
        patch: { stage: 'pause', paused: true },
      };
    }
    return null;
  }

  if (state.stage === 'pause') {
    if (weeks >= WEEKS_BEFORE_NEXT_LEVER && state.restSeconds > 45) {
      return {
        kind: 'rest',
        message: `${weeks} weeks of paused reps — compress rest from ${state.restSeconds}s to ${Math.max(45, state.restSeconds - 15)}s.`,
        patch: { stage: 'rest', restSeconds: Math.max(45, state.restSeconds - 15) },
      };
    }
    return null;
  }

  return null;
}

export function applySuggestion(state: ProgressionState, suggestion: Suggestion): ProgressionState {
  return {
    ...state,
    ...suggestion.patch,
    weeksAtStage: 0,
    updatedAt: todayLocal(),
  };
}

export function stageLabel(stage: ProgressionState['stage']): string {
  switch (stage) {
    case 'reps':
      return 'Rep progression';
    case 'tempo':
      return 'Slow eccentric';
    case 'pause':
      return 'Bottom pause';
    case 'rest':
      return 'Rest compression';
  }
}