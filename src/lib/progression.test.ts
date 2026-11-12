import { describe, expect, it } from 'vitest';
import type { ProgressionState, SetEntry } from '../data/types';
import {
  applySuggestion,
  effectiveRestSeconds,
  initialProgression,
  suggestProgression,
} from './progression';
import { findExercise, program } from '../data/program';
import { addDaysLocal, todayLocal } from './date';

const ex = findExercise(program, 'incline-db-press')!.exercise; // 3×10–12, [7.5, 10, 15]

function state(overrides: Partial<ProgressionState> = {}): ProgressionState {
  return { ...initialProgression(ex, 60), ...overrides };
}

function sets(reps: number, weight = 15, n = 3): SetEntry[] {
  return Array.from({ length: n }, () => ({ weight, reps, completed: true }));
}

describe('progression levers', () => {
  it('starts at the lightest load and bottom of the rep range', () => {
    const s = initialProgression(ex, 60);
    expect(s.currentWeight).toBe(7.5);
    expect(s.targetReps).toBe(10);
    expect(s.stage).toBe('reps');
  });

  it('suggests +1 rep when all sets hit the target', () => {
    const s = state({ targetReps: 10 });
    const suggestion = suggestProgression(s, ex, sets(10));
    expect(suggestion?.kind).toBe('reps');
    expect(suggestion?.patch.targetReps).toBe(11);
  });

  it('does not suggest when a set missed the target', () => {
    const s = state({ targetReps: 12 });
    const mixed = [...sets(12, 15, 2), { weight: 15, reps: 9, completed: true }];
    expect(suggestProgression(s, ex, mixed)).toBeNull();
  });

  it('suggests a weight jump at the top of the range when a heavier plate exists', () => {
    const curl = findExercise(program, 'standing-bb-curl')!.exercise; // 12–15 reps
    const press = findExercise(program, 'seated-db-shoulder-press')!.exercise; // 10–12 reps
    const s = state({ currentWeight: 10, targetReps: 12 });
    const suggestion = suggestProgression(s, press, sets(12, 10));
    expect(suggestion?.kind).toBe('weight');
    expect(suggestion?.patch.currentWeight).toBe(15);
    expect(suggestion?.patch.targetReps).toBe(10);
    // no heavier plate → tempo lever instead (curl range is 12–15)
    const s2 = state({ currentWeight: 15, targetReps: 15 });
    expect(suggestProgression(s2, curl, sets(15))?.kind).toBe('tempo');
  });

  it('at max load and max reps suggests a 3s eccentric', () => {
    const s = state({ currentWeight: 15, targetReps: 12 });
    const suggestion = suggestProgression(s, ex, sets(12));
    expect(suggestion?.kind).toBe('tempo');
    expect(suggestion?.patch.stage).toBe('tempo');
    expect(suggestion?.patch.tempoSeconds).toBe(3);
  });

  it('tempo stage escalates 3s → 4s → pause after weeks at stage', () => {
    const recent = state({ stage: 'tempo', tempoSeconds: 3, updatedAt: todayLocal() });
    expect(suggestProgression(recent, ex, sets(12))).toBeNull();

    const aged = state({
      stage: 'tempo',
      tempoSeconds: 3,
      updatedAt: addDaysLocal(todayLocal(), -14),
    });
    expect(suggestProgression(aged, ex, sets(12))?.patch.tempoSeconds).toBe(4);

    const aged4 = { ...aged, tempoSeconds: 4 as const };
    const next = suggestProgression(aged4, ex, sets(12));
    expect(next?.kind).toBe('pause');
    expect(next?.patch.paused).toBe(true);
  });

  it('pause stage compresses rest, never below 45s', () => {
    const s = state({
      stage: 'pause',
      paused: true,
      restSeconds: 60,
      updatedAt: addDaysLocal(todayLocal(), -14),
    });
    const suggestion = suggestProgression(s, ex, sets(12));
    expect(suggestion?.kind).toBe('rest');
    expect(suggestion?.patch.restSeconds).toBe(45);
  });

  it('apply resets weeksAtStage and stamps the date', () => {
    const s = state({ stage: 'tempo', tempoSeconds: 3, weeksAtStage: 4 });
    const suggestion = suggestProgression(
      { ...s, updatedAt: addDaysLocal(todayLocal(), -14) },
      ex,
      sets(12),
    )!;
    const applied = applySuggestion(s, suggestion);
    expect(applied.tempoSeconds).toBe(4);
    expect(applied.weeksAtStage).toBe(0);
    expect(applied.updatedAt).toBe(todayLocal());
  });

  it('never mutates the input state', () => {
    const s = state({ targetReps: 10 });
    const suggestion = suggestProgression(s, ex, sets(10))!;
    applySuggestion(s, suggestion);
    expect(s.targetReps).toBe(10);
  });
});

describe('effective rest', () => {
  it('tightens to an applied rest-compression suggestion', () => {
    expect(effectiveRestSeconds(90, [45])).toBe(45);
  });

  it('never raises rest above the block value', () => {
    expect(effectiveRestSeconds(60, [120])).toBe(60);
    expect(effectiveRestSeconds(60, [])).toBe(60);
  });

  it('uses a fallback when the block has no rest and keeps a floor', () => {
    expect(effectiveRestSeconds(0, [])).toBe(60);
    expect(effectiveRestSeconds(20, [5])).toBe(15);
  });
});