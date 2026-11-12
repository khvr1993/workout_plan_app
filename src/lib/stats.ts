import type { Meta, Program, Session, SetEntry } from '../data/types';
import { daysBetween, inWeek, todayLocal, weekWindow } from './date';
import { fromDisplay } from './units';
import { addDays } from 'date-fns';

export function nextDay(meta: Meta, program: Program) {
  return program.days.find((d) => d.id === meta.nextDayId) ?? program.days[0];
}

export function advanceRotation(program: Program, dayId: string): string {
  const idx = program.days.findIndex((d) => d.id === dayId);
  if (idx === -1) return program.days[0].id;
  return program.days[(idx + 1) % program.days.length].id;
}

export function completedStrength(sessions: Session[]): Session[] {
  return sessions
    .filter((s) => s.type === 'strength' && s.status === 'completed')
    .sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt));
}

export function sessionsThisWeek(sessions: Session[], weekStartsOn: 0 | 1, anchor = new Date()): Session[] {
  return sessions.filter(
    (s) => s.type === 'strength' && s.status === 'completed' && inWeek(s.date, anchor, weekStartsOn),
  );
}

export function weeklyStreak(sessions: Session[], weeklyTarget: number, weekStartsOn: 0 | 1): number {
  const done = completedStrength(sessions);
  if (done.length === 0) return 0;
  let streak = 0;
  let anchor = new Date();
  // The current week only counts once it hits the target; otherwise start from last week.
  if (sessionsThisWeek(done, weekStartsOn, anchor).length < weeklyTarget) {
    anchor = addDays(anchor, -7);
  }
  for (;;) {
    const count = sessionsThisWeek(done, weekStartsOn, anchor).length;
    if (count >= weeklyTarget) {
      streak++;
      anchor = addDays(anchor, -7);
    } else break;
  }
  return streak;
}

export function daysSinceLast(sessions: Session[]): number | null {
  const done = completedStrength(sessions);
  if (done.length === 0) return null;
  return daysBetween(done[0].date, todayLocal());
}

export interface ExercisePerformance {
  date: string;
  sessionId: string;
  /** Normalized to kg. */
  sets: Array<{ weight: number | null; reps: number | null }>;
  /** Raw entries as logged (in the session's unit), for progression evaluation. */
  raw: SetEntry[];
  bestSet: { weight: number; reps: number } | null;
  topWeight: number | null;
}

export function sessionSetsKg(session: Session, exerciseId: string): SetEntry[] | null {
  for (const block of session.blocks) {
    for (const ex of block.exercises) {
      if (ex.exerciseId === exerciseId) return ex.sets;
    }
  }
  return null;
}

export function normalizeSet(set: SetEntry, unit: Session['unit']) {
  return {
    weight: set.weight == null ? null : fromDisplay(set.weight, unit),
    reps: set.reps,
  };
}

export function lastPerformance(sessions: Session[], exerciseId: string): ExercisePerformance | null {
  const sorted = [...sessions].sort(
    (a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt),
  );
  for (const s of sorted) {
    if (s.status === 'abandoned') continue;
    const sets = sessionSetsKg(s, exerciseId);
    if (!sets) continue;
    const done = sets.filter((x) => x.completed && !x.skipped);
    if (done.length === 0) continue;
    const normalized = done.map((x) => normalizeSet(x, s.unit));
    let bestSet: ExercisePerformance['bestSet'] = null;
    let topWeight: number | null = null;
    for (const n of normalized) {
      if (n.weight == null || n.reps == null) continue;
      if (topWeight == null || n.weight > topWeight) topWeight = n.weight;
      if (!bestSet || e1rm(n.weight, n.reps) > e1rm(bestSet.weight, bestSet.reps)) {
        bestSet = { weight: n.weight, reps: n.reps };
      }
    }
    return { date: s.date, sessionId: s.id, sets: normalized, raw: done, bestSet, topWeight };
  }
  return null;
}

export function exerciseHistory(sessions: Session[], exerciseId: string): ExercisePerformance[] {
  const out: ExercisePerformance[] = [];
  const sorted = [...sessions].sort(
    (a, b) => a.date.localeCompare(b.date) || a.startedAt.localeCompare(b.startedAt),
  );
  for (const s of sorted) {
    if (s.status !== 'completed') continue;
    const sets = sessionSetsKg(s, exerciseId);
    if (!sets) continue;
    const done = sets.filter((x) => x.completed && !x.skipped).map((x) => normalizeSet(x, s.unit));
    if (done.length === 0) continue;
    let bestSet: ExercisePerformance['bestSet'] = null;
    let topWeight: number | null = null;
    for (const n of done) {
      if (n.weight == null || n.reps == null) continue;
      if (topWeight == null || n.weight > topWeight) topWeight = n.weight;
      if (!bestSet || e1rm(n.weight, n.reps) > e1rm(bestSet.weight, bestSet.reps)) {
        bestSet = { weight: n.weight, reps: n.reps };
      }
    }
    out.push({ date: s.date, sessionId: s.id, sets: done, raw: sets.filter((x) => x.completed && !x.skipped), bestSet, topWeight });
  }
  return out;
}

/** Epley estimated 1RM. */
export function e1rm(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

export interface PersonalBest {
  weight: number;
  reps: number;
  date: string;
  e1rm: number;
}

export function personalBest(sessions: Session[], exerciseId: string): PersonalBest | null {
  const history = exerciseHistory(sessions, exerciseId);
  let best: PersonalBest | null = null;
  for (const perf of history) {
    if (!perf.bestSet) continue;
    const score = e1rm(perf.bestSet.weight, perf.bestSet.reps);
    if (!best || score > best.e1rm) {
      best = { ...perf.bestSet, date: perf.date, e1rm: score };
    }
  }
  return best;
}

export function isPrSession(sessions: Session[], exerciseId: string, sessionId: string): boolean {
  const best = personalBest(sessions, exerciseId);
  return best != null && best.date === sessions.find((s) => s.id === sessionId)?.date;
}

export function averageDuration(sessions: Session[]): number | null {
  const done = completedStrength(sessions).filter((s) => s.durationMin != null);
  if (done.length === 0) return null;
  return done.reduce((sum, s) => sum + (s.durationMin ?? 0), 0) / done.length;
}

export { weekWindow };