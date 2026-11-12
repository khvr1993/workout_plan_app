import { describe, expect, it } from 'vitest';
import type { Session } from '../data/types';
import {
  advanceRotation,
  averageDuration,
  daysSinceLast,
  e1rm,
  lastPerformance,
  nextDay,
  personalBest,
  sessionsThisWeek,
  weeklyStreak,
} from './stats';
import { program } from '../data/program';
import { defaultMeta } from '../data/defaults';
import { todayLocal, addDaysLocal } from './date';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: `s-${Math.random().toString(36).slice(2, 8)}`,
    type: 'strength',
    date: todayLocal(),
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    dayId: 'day-a',
    dayLabel: 'Day 1',
    status: 'completed',
    blocks: [],
    unit: 'kg',
    durationMin: 22,
    ...overrides,
  };
}

function sessionWithSets(
  date: string,
  exerciseId: string,
  sets: Array<{ weight: number; reps: number }>,
  unit: Session['unit'] = 'kg',
): Session {
  return makeSession({
    date,
    unit,
    blocks: [
      {
        blockId: 'a-b1',
        restSeconds: 60,
        exercises: [
          {
            exerciseId,
            exerciseName: 'Test lift',
            sets: sets.map((s) => ({ ...s, completed: true })),
          },
        ],
      },
    ],
  });
}

describe('rotation', () => {
  it('advances 1 → 2 → 3 → 1', () => {
    expect(advanceRotation(program, 'day-a')).toBe('day-b');
    expect(advanceRotation(program, 'day-b')).toBe('day-c');
    expect(advanceRotation(program, 'day-c')).toBe('day-a');
  });

  it('nextDay falls back to the first day for unknown ids', () => {
    const meta = { ...defaultMeta(), nextDayId: 'nope' };
    expect(nextDay(meta, program).id).toBe('day-a');
  });
});

describe('weekly stats', () => {
  it('counts only completed strength sessions this week', () => {
    const sessions = [
      makeSession({ date: todayLocal() }),
      makeSession({ date: todayLocal(), type: 'recovery', dayId: undefined }),
      makeSession({ date: todayLocal(), status: 'abandoned' }),
      makeSession({ date: addDaysLocal(todayLocal(), -30) }),
    ];
    expect(sessionsThisWeek(sessions, 1)).toHaveLength(1);
  });

  it('streak counts consecutive weeks hitting the target', () => {
    const thisWeek = todayLocal();
    const sessions = [
      makeSession({ date: thisWeek }),
      makeSession({ date: thisWeek }),
      makeSession({ date: thisWeek }),
      makeSession({ date: addDaysLocal(thisWeek, -7) }),
      makeSession({ date: addDaysLocal(thisWeek, -7) }),
      makeSession({ date: addDaysLocal(thisWeek, -7) }),
    ];
    expect(weeklyStreak(sessions, 3, 1)).toBe(2);
  });

  it('streak is zero when nothing was ever logged', () => {
    expect(weeklyStreak([], 3, 1)).toBe(0);
  });

  it('daysSinceLast uses the most recent completed strength session', () => {
    const sessions = [
      makeSession({ date: addDaysLocal(todayLocal(), -6) }),
      makeSession({ date: addDaysLocal(todayLocal(), -2), type: 'recovery', dayId: undefined }),
    ];
    expect(daysSinceLast(sessions)).toBe(6);
    expect(daysSinceLast([])).toBeNull();
  });

  it('averageDuration ignores sessions without a duration', () => {
    const sessions = [
      makeSession({ durationMin: 20 }),
      makeSession({ durationMin: 30 }),
      makeSession({ durationMin: undefined }),
    ];
    expect(averageDuration(sessions)).toBe(25);
  });
});

describe('performance history', () => {
  it('lastPerformance returns the newest session with completed sets', () => {
    const older = sessionWithSets(addDaysLocal(todayLocal(), -7), 'incline-db-press', [
      { weight: 10, reps: 10 },
    ]);
    const newer = sessionWithSets(todayLocal(), 'incline-db-press', [
      { weight: 15, reps: 12 },
      { weight: 15, reps: 11 },
    ]);
    const last = lastPerformance([older, newer], 'incline-db-press');
    expect(last?.sessionId).toBe(newer.id);
    expect(last?.topWeight).toBe(15);
    expect(last?.sets).toHaveLength(2);
  });

  it('normalizes lb sessions to kg', () => {
    const s = sessionWithSets(todayLocal(), 'incline-db-press', [{ weight: 33.1, reps: 12 }], 'lb');
    const last = lastPerformance([s], 'incline-db-press');
    expect(last?.topWeight).toBeCloseTo(15.01, 1);
  });

  it('skips abandoned sessions', () => {
    const abandoned = sessionWithSets(todayLocal(), 'incline-db-press', [{ weight: 15, reps: 12 }]);
    abandoned.status = 'abandoned';
    expect(lastPerformance([abandoned], 'incline-db-press')).toBeNull();
  });

  it('personalBest picks the highest Epley e1rm', () => {
    const s1 = sessionWithSets(addDaysLocal(todayLocal(), -14), 'x', [{ weight: 15, reps: 10 }]);
    const s2 = sessionWithSets(addDaysLocal(todayLocal(), -7), 'x', [{ weight: 10, reps: 20 }]);
    const best = personalBest([s1, s2], 'x');
    // 15×10 → 20.0 ; 10×20 → 16.7
    expect(best?.weight).toBe(15);
    expect(best?.reps).toBe(10);
  });

  it('e1rm uses the Epley formula', () => {
    expect(e1rm(15, 10)).toBeCloseTo(20);
    expect(e1rm(10, 0)).toBe(10);
  });
});