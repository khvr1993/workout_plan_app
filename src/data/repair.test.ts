import { describe, expect, it } from 'vitest';
import type { Program } from './types';
import { repairSlice } from './repair';
import { loadKeyRawWithRepair } from './migrations';
import { LIMITS, programSchema, sessionsSchema } from './schema';
import { program } from './program';
import { wrap } from './storage';
import { isCalendarDate } from '../lib/date';

const baseSession = {
  id: 'session-1',
  type: 'strength',
  date: '2026-11-10',
  startedAt: '2026-11-10T12:00:00.000Z',
  status: 'completed',
  blocks: [],
  unit: 'kg',
};

const legacySession = {
  ...baseSession,
  id: 'i'.repeat(LIMITS.id + 20),
  date: '',
  durationMin: LIMITS.maxDurationMin + 600,
  rpe: 11,
  notes: 'n'.repeat(LIMITS.notes + 100),
  blocks: [
    {
      blockId: 'b'.repeat(LIMITS.id + 20),
      restSeconds: 900,
      exercises: [
        {
          exerciseId: 'e'.repeat(LIMITS.id + 20),
          exerciseName: 'x'.repeat(LIMITS.name + 20),
          sets: [{ weight: LIMITS.maxWeight + 5_000, reps: LIMITS.maxReps + 500, completed: true }],
        },
      ],
    },
  ],
};

describe('legacy data repair', () => {
  it('repairs bounds that older schemas allowed', () => {
    const repaired = repairSlice('sessions', [legacySession]) as Array<{
      id: string;
      date: string;
      durationMin: number;
      rpe: number;
      notes: string;
      blocks: Array<{
        blockId: string;
        restSeconds: number;
        exercises: Array<{ exerciseId: string; exerciseName: string; sets: Array<{ weight: number; reps: number }> }>;
      }>;
    }>;

    expect(repaired).not.toBeNull();
    expect(sessionsSchema.safeParse(repaired).success).toBe(true);
    expect(repaired[0]).toMatchObject({
      durationMin: LIMITS.maxDurationMin,
      rpe: 10,
      blocks: [
        {
          restSeconds: 600,
          exercises: [
            {
              sets: [{ weight: LIMITS.maxWeight, reps: LIMITS.maxReps }],
            },
          ],
        },
      ],
    });
    expect(isCalendarDate(repaired[0].date)).toBe(true);
    expect(repaired[0].id).toHaveLength(LIMITS.id);
    expect(repaired[0].notes).toHaveLength(LIMITS.notes);
    expect(repaired[0].blocks[0].blockId).toHaveLength(LIMITS.id);
    expect(repaired[0].blocks[0].exercises[0].exerciseId).toHaveLength(LIMITS.id);
    expect(repaired[0].blocks[0].exercises[0].exerciseName).toHaveLength(LIMITS.name);
  });

  it('keeps valid records and drops only the unsalvageable ones', () => {
    const repaired = repairSlice('sessions', [baseSession, {}, null]) as unknown[];
    expect(repaired).toHaveLength(1);
    expect(sessionsSchema.safeParse(repaired).success).toBe(true);
  });

  it('does not turn an entirely broken slice into an empty valid one', () => {
    expect(repairSlice('sessions', [{}, null])).toBeNull();
    expect(repairSlice('sessions', 'not-an-array')).toBeNull();
  });

  it('repairs over-long program strings and load options', () => {
    const legacyProgram = JSON.parse(JSON.stringify(program)) as Program;
    const exercise = legacyProgram.days[0].blocks[0].exercises[0];
    exercise.id = 'i'.repeat(LIMITS.id + 20);
    exercise.name = 'n'.repeat(LIMITS.name + 20);
    exercise.execution = 'e'.repeat(LIMITS.longText + 100);
    exercise.cue = 'c'.repeat(LIMITS.longText + 100);
    exercise.equipment = 'q'.repeat(LIMITS.shortText + 100);
    exercise.loadOptions = Array.from({ length: 12 }, (_, i) => i + 1);

    const repaired = repairSlice('program', legacyProgram) as Program;
    expect(repaired).not.toBeNull();
    expect(programSchema.safeParse(repaired).success).toBe(true);

    const fixed = repaired.days[0].blocks[0].exercises[0];
    expect(fixed.id).toHaveLength(LIMITS.id);
    expect(fixed.name).toHaveLength(LIMITS.name);
    expect(fixed.execution).toHaveLength(LIMITS.longText);
    expect(fixed.cue).toHaveLength(LIMITS.longText);
    expect(fixed.equipment).toHaveLength(LIMITS.shortText);
    expect(fixed.loadOptions).toHaveLength(10);
  });

  it('rejects a program that cannot be salvaged', () => {
    expect(repairSlice('program', { days: [] })).toBeNull();
    expect(repairSlice('program', {})).toBeNull();
  });

  it('repairs through the real loader without entering read-only mode', () => {
    const raw = JSON.stringify(wrap([legacySession]));
    const result = loadKeyRawWithRepair(raw, sessionsSchema, (value) =>
      repairSlice('sessions', value),
    );

    expect(result.readOnly).toBe(false);
    expect(result.repaired).toBe(true);
    expect(result.value).toHaveLength(1);
    expect(sessionsSchema.safeParse(result.value).success).toBe(true);
  });

  it('never repairs corrupt or newer stored data', () => {
    const corrupt = loadKeyRawWithRepair('{not json', sessionsSchema, (value) =>
      repairSlice('sessions', value),
    );
    expect(corrupt.readOnly).toBe(true);
    expect(corrupt.reason).toBe('corrupt');

    const newer = loadKeyRawWithRepair(
      JSON.stringify({ v: 99, value: [legacySession] }),
      sessionsSchema,
      (value) => repairSlice('sessions', value),
    );
    expect(newer.readOnly).toBe(true);
    expect(newer.reason).toBe('newer');
  });
});
