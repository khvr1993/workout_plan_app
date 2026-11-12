import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from './useAppStore';
import { program } from '../data/program';
import { defaultMeta, defaultSettings } from '../data/defaults';
import { STORAGE_KEYS } from '../data/storage';
import { LIMITS, sessionsSchema } from '../data/schema';
import { isCalendarDate, todayLocal } from '../lib/date';

function resetStore() {
  useAppStore.setState({
    program,
    sessions: [],
    settings: defaultSettings,
    meta: defaultMeta(),
    progression: {},
    safeMode: false,
    storageIssue: null,
    storageNotice: null,
    storageError: null,
    restEndsAt: null,
    restTotalSec: 0,
  });
  localStorage.clear();
}

function storedSessions() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions) ?? 'null')?.value;
}

function firstSetOf(sessionId: string) {
  const session = useAppStore.getState().sessions.find((s) => s.id === sessionId)!;
  const block = session.blocks[0];
  return { blockId: block.blockId, exerciseId: block.exercises[0].exerciseId };
}

beforeEach(resetStore);

describe('read-only mode', () => {
  it('does not record sets and cannot finish a workout', () => {
    const session = useAppStore.getState().startSession('day-a');
    const { blockId, exerciseId } = firstSetOf(session.id);
    useAppStore.setState({ safeMode: true });

    useAppStore.getState().updateSet(session.id, blockId, exerciseId, 0, { completed: true });
    expect(
      useAppStore.getState().sessions[0].blocks[0].exercises[0].sets[0].completed,
    ).toBe(false);

    expect(useAppStore.getState().finishSession(session.id, {})).toBe(false);
    expect(useAppStore.getState().sessions[0].status).toBe('in-progress');
  });

  it('refuses to log a recovery walk', () => {
    useAppStore.setState({ safeMode: true });
    expect(useAppStore.getState().logRecovery(todayLocal())).toBeNull();
    expect(useAppStore.getState().sessions).toHaveLength(0);
  });
});

describe('truthful persistence', () => {
  it('reports success only after the session is written', () => {
    const session = useAppStore.getState().startSession('day-a');
    expect(useAppStore.getState().finishSession(session.id, { rpe: 8 })).toBe(true);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions) ?? 'null');
    const saved = stored.value.find((s: { id: string }) => s.id === session.id);
    expect(saved.status).toBe('completed');
    expect(useAppStore.getState().storageError).toBeNull();
  });

  it('reports failure instead of claiming success when storage rejects the write', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    try {
      const session = useAppStore.getState().startSession('day-a');
      expect(useAppStore.getState().finishSession(session.id, {})).toBe(false);
      expect(useAppStore.getState().sessions[0].status).toBe('in-progress');

      expect(useAppStore.getState().logRecovery(todayLocal())).toBeNull();
      expect(useAppStore.getState().sessions.some((s) => s.type === 'recovery')).toBe(false);
      expect(useAppStore.getState().storageError).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });

  it('stores recovery walks with a valid calendar date', () => {
    const walk = useAppStore.getState().logRecovery('2026-99-99', 'bad input');
    expect(walk).not.toBeNull();
    expect(isCalendarDate(walk!.date)).toBe(true);
    expect(walk!.date).toBe(todayLocal());
  });
});

describe('schema-safe writes', () => {
  it('truncates notes instead of poisoning the sessions slice', () => {
    const walk = useAppStore.getState().logRecovery(
      todayLocal(),
      'x'.repeat(LIMITS.notes + 50),
    );
    expect(walk).not.toBeNull();
    expect(walk!.notes).toHaveLength(LIMITS.notes);
    expect(sessionsSchema.safeParse(storedSessions()).success).toBe(true);
  });

  it('clamps a session left open past the duration limit', () => {
    const session = useAppStore.getState().startSession('day-a');
    const oldStartedAt = new Date(
      Date.now() - (LIMITS.maxDurationMin + 60) * 60_000,
    ).toISOString();
    useAppStore.setState({
      sessions: useAppStore
        .getState()
        .sessions.map((s) => (s.id === session.id ? { ...s, startedAt: oldStartedAt } : s)),
    });

    expect(useAppStore.getState().finishSession(session.id, {})).toBe(true);
    const done = useAppStore.getState().sessions.find((s) => s.id === session.id)!;
    expect(done.durationMin).toBe(LIMITS.maxDurationMin);
    expect(sessionsSchema.safeParse(storedSessions()).success).toBe(true);
  });

  it('clamps out-of-range set values before writing', () => {
    const session = useAppStore.getState().startSession('day-a');
    const { blockId, exerciseId } = firstSetOf(session.id);
    useAppStore.getState().updateSet(session.id, blockId, exerciseId, 0, {
      weight: LIMITS.maxWeight + 5_000,
      reps: LIMITS.maxReps + 500,
      completed: true,
    });

    const entry = useAppStore.getState().sessions[0].blocks[0].exercises[0].sets[0];
    expect(entry.weight).toBe(LIMITS.maxWeight);
    expect(entry.reps).toBe(LIMITS.maxReps);
    expect(sessionsSchema.safeParse(storedSessions()).success).toBe(true);
  });

  it('refuses to persist a session that bypasses the clamps', () => {
    const session = useAppStore.getState().startSession('day-a');
    useAppStore.setState({
      sessions: [{ ...session, notes: 'x'.repeat(LIMITS.notes + 1) }],
    });

    expect(useAppStore.getState().storageError).toBeTruthy();
    expect(storedSessions()[0].notes).toBeUndefined();
  });

  it('reports an import that could not be written', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    try {
      const saved = useAppStore.getState().importAll({
        program,
        sessions: [],
        settings: defaultSettings,
        meta: defaultMeta(),
        progression: {},
      });
      expect(saved).toBe(false);
      expect(useAppStore.getState().storageError).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });
});

describe('rotation', () => {
  it('rolls the rotation back when the advancing session is deleted', () => {
    const session = useAppStore.getState().startSession('day-a');
    useAppStore.getState().finishSession(session.id, {});
    expect(useAppStore.getState().meta.nextDayId).toBe('day-b');

    useAppStore.getState().deleteSession(session.id);
    expect(useAppStore.getState().meta.nextDayId).toBe('day-a');
  });

  it('keeps the rotation when an unrelated session is deleted', () => {
    const session = useAppStore.getState().startSession('day-a');
    useAppStore.getState().finishSession(session.id, {});
    const walk = useAppStore.getState().logRecovery(todayLocal())!;
    useAppStore.getState().deleteSession(walk.id);
    expect(useAppStore.getState().meta.nextDayId).toBe('day-b');
  });
});
