import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from './useAppStore';
import { program } from '../data/program';
import { defaultMeta, defaultSettings } from '../data/defaults';
import { ENVELOPE_VERSION } from '../data/storage';
import { todayLocal } from '../lib/date';

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
}

beforeEach(resetStore);

describe('session lifecycle', () => {
  it('startSession creates an in-progress draft with prefilled sets', () => {
    const s = useAppStore.getState().startSession('day-a');
    expect(s.status).toBe('in-progress');
    expect(s.dayId).toBe('day-a');
    expect(s.blocks).toHaveLength(3);
    const first = s.blocks[0].exercises[0];
    expect(first.exerciseId).toBe('bulgarian-split-squat');
    expect(first.sets).toHaveLength(3);
    expect(first.sets[0].weight).toBe(7.5); // lightest option
    expect(first.sets[0].completed).toBe(false);
  });

  it('startSession is idempotent — a refresh resumes the same draft', () => {
    const a = useAppStore.getState().startSession('day-a');
    const b = useAppStore.getState().startSession('day-a');
    expect(a.id).toBe(b.id);
    expect(useAppStore.getState().sessions).toHaveLength(1);
  });

  it('prefills from the last performance', () => {
    const s1 = useAppStore.getState().startSession('day-a');
    useAppStore.getState().updateSet(s1.id, 'a-b1', 'bulgarian-split-squat', 0, {
      weight: 15,
      reps: 12,
      completed: true,
    });
    useAppStore.getState().finishSession(s1.id, {});
    const s2 = useAppStore.getState().startSession('day-a');
    const entry = s2.blocks[0].exercises[0].sets[0];
    expect(entry.weight).toBe(15);
    expect(entry.reps).toBe(12);
    expect(entry.completed).toBe(false);
  });

  it('finish advances the rotation exactly once', () => {
    const s = useAppStore.getState().startSession('day-a');
    useAppStore.getState().finishSession(s.id, { rpe: 8, notes: 'good' });
    expect(useAppStore.getState().meta.nextDayId).toBe('day-b');
    const after = useAppStore.getState().sessions.find((x) => x.id === s.id)!;
    expect(after.status).toBe('completed');
    expect(after.rpe).toBe(8);
    expect(after.durationMin).toBeGreaterThanOrEqual(1);
    // second finish is a no-op
    useAppStore.getState().finishSession(s.id, {});
    expect(useAppStore.getState().meta.nextDayId).toBe('day-b');
  });

  it('abandoned drafts do not advance the rotation', () => {
    const s = useAppStore.getState().startSession('day-a');
    useAppStore.getState().abandonSession(s.id);
    expect(useAppStore.getState().meta.nextDayId).toBe('day-a');
    expect(useAppStore.getState().sessions[0].status).toBe('abandoned');
  });

  it('recovery walks never advance the rotation', () => {
    useAppStore.getState().logRecovery(todayLocal(), 'easy 35 min');
    expect(useAppStore.getState().meta.nextDayId).toBe('day-a');
    const walk = useAppStore.getState().sessions[0];
    expect(walk.type).toBe('recovery');
    expect(walk.status).toBe('completed');
  });

  it('updateSet patches only the target entry', () => {
    const s = useAppStore.getState().startSession('day-b');
    useAppStore.getState().updateSet(s.id, 'b-b1', 'tempo-db-rdl', 1, { reps: 14, paused: true });
    const log = useAppStore.getState().sessions[0].blocks[0].exercises[0];
    expect(log.sets[1].reps).toBe(14);
    expect(log.sets[1].paused).toBe(true);
    expect(log.sets[0].reps).not.toBe(14);
    expect(log.sets).toHaveLength(4);
  });

  it('finish updates progression currentWeight from the top logged set', () => {
    const s = useAppStore.getState().startSession('day-a');
    useAppStore.getState().updateSet(s.id, 'a-b1', 'bulgarian-split-squat', 0, {
      weight: 15,
      reps: 12,
      completed: true,
    });
    useAppStore.getState().finishSession(s.id, {});
    expect(useAppStore.getState().progression['bulgarian-split-squat'].currentWeight).toBe(15);
  });

  it('stores session weights in the active display unit and keeps them', () => {
    useAppStore.getState().updateSettings({ unit: 'lb' });
    const s = useAppStore.getState().startSession('day-a');
    expect(s.unit).toBe('lb');
    // 7.5 kg ≈ 16.5 lb
    expect(s.blocks[0].exercises[0].sets[0].weight).toBeCloseTo(16.5, 0);
    useAppStore.getState().updateSettings({ unit: 'kg' });
    const stored = useAppStore.getState().sessions.find((x) => x.id === s.id)!;
    expect(stored.unit).toBe('lb');
    expect(stored.blocks[0].exercises[0].sets[0].weight).toBeCloseTo(16.5, 0);
  });
});

describe('rest timer', () => {
  it('stores an end timestamp and extends it', () => {
    useAppStore.getState().startRest(60);
    const ends = useAppStore.getState().restEndsAt!;
    expect(ends).toBeGreaterThan(Date.now() + 55_000);
    useAppStore.getState().extendRest(15);
    expect(useAppStore.getState().restEndsAt).toBe(ends + 15_000);
    useAppStore.getState().stopRest();
    expect(useAppStore.getState().restEndsAt).toBeNull();
  });
});

describe('data management', () => {
  it('clearAll returns to a fresh state', () => {
    useAppStore.getState().startSession('day-a');
    useAppStore.getState().updateSettings({ unit: 'lb' });
    useAppStore.getState().clearAll();
    const state = useAppStore.getState();
    expect(state.sessions).toHaveLength(0);
    expect(state.settings.unit).toBe('kg');
    expect(state.meta.nextDayId).toBe('day-a');
  });

  it('importAll replaces every slice', () => {
    useAppStore.getState().startSession('day-a');
    useAppStore.getState().importAll({
      program,
      sessions: [],
      settings: { ...defaultSettings, unit: 'lb', accent: 'indigo' },
      meta: { ...defaultMeta(), nextDayId: 'day-c' },
      progression: {},
    });
    const state = useAppStore.getState();
    expect(state.sessions).toHaveLength(0);
    expect(state.settings.accent).toBe('indigo');
    expect(state.meta.nextDayId).toBe('day-c');
  });

  it('persists sessions to localStorage under wt:sessions', () => {
    useAppStore.getState().startSession('day-a');
    const raw = localStorage.getItem('wt:sessions');
    expect(raw).toBeTruthy();
    const env = JSON.parse(raw!);
    expect(env.v).toBe(ENVELOPE_VERSION);
    expect(env.value).toHaveLength(1);
  });
});