import type { Session, SetEntry, Unit } from '../data/types';
import { fromDisplay } from './units';

/** Volume in kg, regardless of the session's logging unit. */
export function setVolume(set: SetEntry, unit: Unit): number {
  if (!set.completed || set.skipped || set.weight == null || set.reps == null) return 0;
  return fromDisplay(set.weight, unit) * set.reps;
}

export function sessionVolume(session: Session): number {
  let total = 0;
  for (const block of session.blocks) {
    for (const ex of block.exercises) {
      for (const set of ex.sets) total += setVolume(set, session.unit);
    }
  }
  return total;
}

export function completedRounds(session: Session): number {
  let rounds = 0;
  for (const block of session.blocks) {
    const maxSets = Math.max(0, ...block.exercises.map((e) => e.sets.length));
    for (let i = 0; i < maxSets; i++) {
      const all = block.exercises.every((e) => e.sets[i]?.completed && !e.sets[i]?.skipped);
      if (all) rounds++;
    }
  }
  return rounds;
}

export function completedSets(session: Session): number {
  let n = 0;
  for (const block of session.blocks) {
    for (const ex of block.exercises) {
      for (const set of ex.sets) if (set.completed && !set.skipped) n++;
    }
  }
  return n;
}