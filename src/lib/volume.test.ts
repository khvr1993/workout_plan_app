import { describe, expect, it } from 'vitest';
import type { Session } from '../data/types';
import { completedRounds, completedSets, sessionVolume } from './volume';

function session(unit: Session['unit'] = 'kg'): Session {
  return {
    id: 's1',
    type: 'strength',
    date: '2026-11-10',
    startedAt: '2026-11-10T08:00:00.000Z',
    status: 'completed',
    dayId: 'day-a',
    dayLabel: 'Day 1',
    unit,
    blocks: [
      {
        blockId: 'a-b2',
        restSeconds: 60,
        exercises: [
          {
            exerciseId: 'incline-db-press',
            exerciseName: 'Incline Dumbbell Press',
            sets: [
              { weight: 15, reps: 12, completed: true },
              { weight: 15, reps: 11, completed: true },
              { weight: 15, reps: 10, completed: false },
            ],
          },
          {
            exerciseId: 'chest-supported-db-row',
            exerciseName: 'Chest-Supported Dumbbell Row',
            sets: [
              { weight: 15, reps: 12, completed: true },
              { weight: 15, reps: 12, completed: true, skipped: true },
              { weight: 15, reps: 12, completed: true },
            ],
          },
        ],
      },
    ],
  };
}

describe('volume', () => {
  it('excludes incomplete and skipped sets', () => {
    // press: 15×12 + 15×11 = 345 ; row: 15×12 + 15×12 = 360 (middle skipped)
    expect(sessionVolume(session())).toBe(705);
  });

  it('normalizes lb sessions to kg', () => {
    const s = session('lb');
    const kg = sessionVolume(session('kg'));
    expect(sessionVolume(s)).toBeCloseTo(kg * 0.45359237, 5);
  });

  it('counts a round only when every exercise completed it', () => {
    // R1: both done. R2: row skipped. R3: press incomplete.
    expect(completedRounds(session())).toBe(1);
    expect(completedSets(session())).toBe(4);
  });
});