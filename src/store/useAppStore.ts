import { create } from 'zustand';
import type { ZodTypeAny } from 'zod';
import type {
  AppData,
  Meta,
  Program,
  ProgressionState,
  Session,
  SetEntry,
  Settings,
} from '../data/types';
import type { Suggestion } from '../lib/progression';
import { applySuggestion, initialProgression } from '../lib/progression';
import { program as seedProgram } from '../data/program';
import { defaultMeta, defaultSettings } from '../data/defaults';
import { LocalStorageAdapter, STORAGE_KEYS, wrap, type StoragePort } from '../data/storage';
import { loadKeyRaw, loadKeyRawWithRepair, type LoadResult } from '../data/migrations';
import {
  LIMITS,
  metaSchema,
  programSchema,
  progressionRecordSchema,
  sessionSchema,
  sessionsSchema,
  settingsSchema,
} from '../data/schema';
import { repairSlice } from '../data/repair';
import { advanceRotation, lastPerformance } from '../lib/stats';
import { isCalendarDate, todayLocal } from '../lib/date';
import { fromDisplay, toDisplay } from '../lib/units';

export const STORAGE_FULL_MESSAGE =
  'Could not save — storage is full or unavailable. Export your data from Settings.';
const STORAGE_LIMIT_MESSAGE =
  'Could not save — a value is outside the supported limits. Shorten the entry and try again.';
const STORAGE_READ_ONLY_MESSAGE =
  'Could not save — the app is read-only because stored data could not be read.';

export interface AppState extends AppData {
  safeMode: boolean;
  /** Which stored slices could not be read, for the banner copy. */
  storageIssue: string | null;
  /** Non-blocking notice when legacy data had to be repaired on load. */
  storageNotice: string | null;
  storageError: string | null;
  restEndsAt: number | null;
  restTotalSec: number;

  updateSettings: (patch: Partial<Settings>) => void;
  setProgram: (program: Program) => void;
  resetProgram: () => void;

  startSession: (dayId: string) => Session;
  updateSet: (
    sessionId: string,
    blockId: string,
    exerciseId: string,
    setIndex: number,
    patch: Partial<SetEntry>,
  ) => void;
  /** Returns false when nothing could be persisted (read-only or quota). */
  finishSession: (sessionId: string, summary: { rpe?: number; notes?: string }) => boolean;
  abandonSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  logRecovery: (date: string, notes?: string) => Session | null;

  applyProgression: (exerciseId: string, suggestion: Suggestion) => void;
  setProgression: (exerciseId: string, patch: Partial<ProgressionState>) => void;

  startRest: (seconds: number) => void;
  extendRest: (seconds: number) => void;
  stopRest: () => void;

  /** Returns false when the imported data could not be persisted. */
  importAll: (data: AppData) => boolean;
  clearAll: () => void;
  markBackup: (exportedAt: string) => void;
  dismissBackupReminder: () => void;
}

const SLICES: Array<[keyof AppData, string, ZodTypeAny]> = [
  ['program', STORAGE_KEYS.program, programSchema],
  ['sessions', STORAGE_KEYS.sessions, sessionsSchema],
  ['settings', STORAGE_KEYS.settings, settingsSchema],
  ['meta', STORAGE_KEYS.meta, metaSchema],
  ['progression', STORAGE_KEYS.progression, progressionRecordSchema],
];

function readRaw(storage: StoragePort, key: string): string | null {
  if (storage.readRaw) return storage.readRaw(key);
  const value = storage.get(key);
  return value == null ? null : JSON.stringify(value);
}

function loadInitial(storage: StoragePort): {
  data: AppData;
  safeMode: boolean;
  storageIssue: string | null;
  storageNotice: string | null;
} {
  const results = SLICES.map(([slice, key, schema]) => {
    const res: LoadResult<unknown> = loadKeyRawWithRepair(
      readRaw(storage, key),
      schema,
      (value) => repairSlice(slice, value),
    );
    return { slice, key, res };
  });
  const failed = results.filter(({ res }) => res.readOnly);
  const repaired = results.filter(({ res }) => res.repaired);
  const valueOf = (slice: keyof AppData) => results.find((r) => r.slice === slice)?.res.value;
  const sessions = valueOf('sessions') as Session[] | undefined;
  return {
    safeMode: failed.length > 0,
    storageIssue: failed.length
      ? failed.map(({ key, res }) => `${key.replace('wt:', '')} (${res.reason ?? 'unreadable'})`).join(', ')
      : null,
    storageNotice: repaired.length
      ? `Some stored data was repaired or skipped to fit the current limits (${repaired
          .map(({ key }) => key.replace('wt:', ''))
          .join(', ')}).`
      : null,
    data: {
      program: (valueOf('program') as Program | undefined) ?? seedProgram,
      sessions: sessions ?? [],
      settings: (valueOf('settings') as Settings | undefined) ?? defaultSettings,
      meta: (valueOf('meta') as Meta | undefined) ?? defaultMeta(),
      progression: (valueOf('progression') as Record<string, ProgressionState> | undefined) ?? {},
    },
  };
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildSession(
  dayId: string,
  state: Pick<AppState, 'program' | 'sessions' | 'settings' | 'progression'>,
): Session | null {
  const day = state.program.days.find((d) => d.id === dayId);
  if (!day) return null;
  const unit = state.settings.unit;
  const now = new Date();
  const blocks = day.blocks.map((block) => ({
    blockId: block.id,
    restSeconds: block.restSeconds || state.settings.restTimerDefaultSec,
    exercises: block.exercises.map((ex) => {
      const last = lastPerformance(state.sessions, ex.id);
      const prog = state.progression[ex.id];
      const fallbackWeight = prog?.currentWeight ?? ex.loadOptions[0] ?? null;
      const targetReps = prog?.targetReps ?? ex.reps.min;
      const sets: SetEntry[] = Array.from({ length: ex.sets }, (_, i) => {
        const lastSet = last?.sets[i];
        const weightKg = lastSet?.weight ?? fallbackWeight;
        return {
          weight: weightKg == null ? null : Math.round(toDisplay(weightKg, unit) * 10) / 10,
          reps: lastSet?.reps ?? Math.min(targetReps, ex.reps.max),
          completed: false,
          paused: state.settings.defaultPaused || (prog?.paused ?? false),
          ...(ex.tempo ? { tempo: ex.tempo } : {}),
        };
      });
      return { exerciseId: ex.id, exerciseName: ex.name, sets };
    }),
  }));
  return {
    id: newId(),
    type: 'strength',
    date: todayLocal(now),
    startedAt: now.toISOString(),
    dayId: day.id,
    dayLabel: day.label,
    status: 'in-progress',
    blocks,
    unit,
  };
}

function loadRest(): { endsAt: number | null; totalSec: number } {
  try {
    const raw = localStorage.getItem('wt:rest');
    if (!raw) return { endsAt: null, totalSec: 0 };
    const parsed = JSON.parse(raw) as { endsAt: number; totalSec: number };
    if (typeof parsed.endsAt === 'number' && parsed.endsAt > Date.now()) {
      return { endsAt: parsed.endsAt, totalSec: parsed.totalSec ?? 60 };
    }
    return { endsAt: null, totalSec: 0 };
  } catch {
    return { endsAt: null, totalSec: 0 };
  }
}

function saveRest(endsAt: number | null, totalSec: number) {
  try {
    if (endsAt == null) localStorage.removeItem('wt:rest');
    else localStorage.setItem('wt:rest', JSON.stringify({ endsAt, totalSec }));
  } catch {
    // non-critical
  }
}

const storage: StoragePort = new LocalStorageAdapter();
const initial = loadInitial(storage);
const initialRest = loadRest();

let persistRequested = false;
function requestPersist() {
  if (persistRequested) return;
  persistRequested = true;
  navigator.storage?.persist?.().catch(() => undefined);
}

export const useAppStore = create<AppState>((set, get) => ({
  ...initial.data,
  safeMode: initial.safeMode,
  storageIssue: initial.storageIssue,
  storageNotice: initial.storageNotice,
  storageError: null,
  restEndsAt: initialRest.endsAt,
  restTotalSec: initialRest.totalSec,

  updateSettings: (patch) => {
    if (get().safeMode) return;
    set((s) => ({ settings: { ...s.settings, ...patch } }));
  },

  setProgram: (program) => {
    if (get().safeMode) return;
    set({ program });
  },
  resetProgram: () => {
    if (get().safeMode) return;
    set({ program: seedProgram });
  },

  startSession: (dayId) => {
    const state = get();
    const existing = state.sessions.find((s) => s.status === 'in-progress' && s.dayId === dayId);
    if (existing) return existing;
    const session = buildSession(dayId, state);
    if (!session) throw new Error(`Unknown day ${dayId}`);
    const progression = { ...state.progression };
    const day = state.program.days.find((d) => d.id === dayId)!;
    for (const block of day.blocks) {
      for (const ex of block.exercises) {
        if (!progression[ex.id]) {
          progression[ex.id] = initialProgression(
            ex,
            block.restSeconds || state.settings.restTimerDefaultSec,
          );
        }
      }
    }
    set((s) => ({ sessions: [...s.sessions, session], progression }));
    return session;
  },

  updateSet: (sessionId, blockId, exerciseId, setIndex, rawPatch) => {
    if (get().safeMode) return;
    const patch = { ...rawPatch };
    if ('weight' in patch) {
      patch.weight =
        patch.weight == null
          ? null
          : Number.isFinite(patch.weight)
            ? Math.min(LIMITS.maxWeight, Math.max(0, patch.weight))
            : null;
    }
    if ('reps' in patch) {
      patch.reps =
        patch.reps == null
          ? null
          : Number.isFinite(patch.reps)
            ? Math.min(LIMITS.maxReps, Math.max(0, Math.round(patch.reps)))
            : null;
    }
    if (typeof patch.tempo === 'string') patch.tempo = patch.tempo.slice(0, LIMITS.maxTempo);
    if ('completed' in patch) patch.completed = Boolean(patch.completed);
    if ('skipped' in patch) patch.skipped = Boolean(patch.skipped);
    if ('paused' in patch) patch.paused = Boolean(patch.paused);
    set((s) => ({
      sessions: s.sessions.map((session) =>
        session.id !== sessionId
          ? session
          : {
              ...session,
              blocks: session.blocks.map((block) =>
                block.blockId !== blockId
                  ? block
                  : {
                      ...block,
                      exercises: block.exercises.map((ex) =>
                        ex.exerciseId !== exerciseId
                          ? ex
                          : {
                              ...ex,
                              sets: ex.sets.map((entry, i) =>
                                i === setIndex ? { ...entry, ...patch } : entry,
                              ),
                            },
                      ),
                    },
              ),
            },
      ),
    }));
  },

  finishSession: (sessionId, summary) => {
    const state = get();
    const session = state.sessions.find((s) => s.id === sessionId);
    if (!session || session.status !== 'in-progress' || state.safeMode) return false;
    const startedAt = new Date(session.startedAt).getTime();
    const finishedAt = new Date();
    const durationMin = Number.isFinite(startedAt)
      ? Math.min(
          LIMITS.maxDurationMin,
          Math.max(1, Math.round((finishedAt.getTime() - startedAt) / 60000)),
        )
      : 1;
    const rpe =
      typeof summary.rpe === 'number' && Number.isFinite(summary.rpe)
        ? Math.min(10, Math.max(1, Math.round(summary.rpe)))
        : undefined;
    const notes = summary.notes ? summary.notes.slice(0, LIMITS.notes) : undefined;
    const progression = { ...state.progression };
    if (session.type === 'strength') {
      for (const block of session.blocks) {
        for (const exLog of block.exercises) {
          const done = exLog.sets.filter((x) => x.completed && !x.skipped && x.weight != null);
          const prog = progression[exLog.exerciseId];
          if (prog && done.length > 0) {
            const top = Math.max(...done.map((x) => x.weight ?? 0));
            progression[exLog.exerciseId] = {
              ...prog,
              currentWeight: fromDisplay(top, session.unit),
            };
          }
        }
      }
    }
    const meta: Meta =
      session.type === 'strength' && session.dayId
        ? { ...state.meta, nextDayId: advanceRotation(state.program, session.dayId) }
        : state.meta;
    const before = {
      sessions: state.sessions,
      meta: state.meta,
      progression: state.progression,
    };
    set((s) => ({
      sessions: s.sessions.map((x) =>
        x.id === sessionId
          ? {
              ...x,
              status: 'completed',
              finishedAt: finishedAt.toISOString(),
              durationMin,
              rpe,
              notes,
            }
          : x,
      ),
      meta,
      progression,
      restEndsAt: null,
    }));
    saveRest(null, 0);
    // Only report success once the write actually landed; otherwise put the
    // workout back in progress so the user can retry instead of losing it.
    if (!flushWrite()) {
      const failure = get().storageError;
      set(before);
      if (failure) reportWrite(failure);
      return false;
    }
    return true;
  },

  abandonSession: (sessionId) => {
    if (get().safeMode) return;
    set((s) => ({
      sessions: s.sessions.map((x) =>
        x.id === sessionId ? { ...x, status: 'abandoned', finishedAt: new Date().toISOString() } : x,
      ),
      restEndsAt: null,
    }));
    saveRest(null, 0);
  },

  deleteSession: (sessionId) => {
    if (get().safeMode) return;
    set((s) => {
      const target = s.sessions.find((x) => x.id === sessionId);
      let meta = s.meta;
      // Deleting the session that advanced the rotation should put that day
      // back at the front, otherwise the user can never be prompted for it.
      if (
        target?.status === 'completed' &&
        target.type === 'strength' &&
        target.dayId &&
        s.meta.nextDayId === advanceRotation(s.program, target.dayId)
      ) {
        meta = { ...s.meta, nextDayId: target.dayId };
      }
      return { sessions: s.sessions.filter((x) => x.id !== sessionId), meta };
    });
  },

  logRecovery: (date, notes) => {
    if (get().safeMode) return null;
    const today = todayLocal();
    const safeDate = isCalendarDate(date) && date <= today ? date : today;
    const now = new Date().toISOString();
    const session: Session = {
      id: newId(),
      type: 'recovery',
      date: safeDate,
      startedAt: now,
      finishedAt: now,
      status: 'completed',
      blocks: [],
      unit: get().settings.unit,
      durationMin: 35,
      notes: notes ? notes.slice(0, LIMITS.notes) : undefined,
    };
    set((s) => ({ sessions: [...s.sessions, session] }));
    if (!flushWrite()) {
      const failure = get().storageError;
      // Do not leave the walk visible in memory when it was never stored.
      set((s) => ({ sessions: s.sessions.filter((x) => x.id !== session.id) }));
      if (failure) reportWrite(failure);
      return null;
    }
    return session;
  },

  applyProgression: (exerciseId, suggestion) => {
    if (get().safeMode) return;
    set((s) => {
      const prog = s.progression[exerciseId];
      if (!prog) return s;
      return {
        progression: {
          ...s.progression,
          [exerciseId]: applySuggestion(prog, suggestion),
        },
      };
    });
  },

  setProgression: (exerciseId, patch) => {
    if (get().safeMode) return;
    set((s) => {
      const prog = s.progression[exerciseId];
      if (!prog) return s;
      return {
        progression: {
          ...s.progression,
          [exerciseId]: { ...prog, ...patch, updatedAt: todayLocal() },
        },
      };
    });
  },

  startRest: (seconds) => {
    const endsAt = Date.now() + seconds * 1000;
    set({ restEndsAt: endsAt, restTotalSec: seconds });
    saveRest(endsAt, seconds);
  },
  extendRest: (seconds) => {
    const { restEndsAt, restTotalSec } = get();
    if (restEndsAt == null) return;
    const endsAt = restEndsAt + seconds * 1000;
    set({ restEndsAt: endsAt, restTotalSec: restTotalSec + seconds });
    saveRest(endsAt, restTotalSec + seconds);
  },
  stopRest: () => {
    set({ restEndsAt: null });
    saveRest(null, 0);
  },

  importAll: (data) => {
    const state = get();
    const before = {
      ...pickSlices(state),
      safeMode: state.safeMode,
      storageIssue: state.storageIssue,
      storageNotice: state.storageNotice,
    };
    saveRest(null, 0);
    attempted = null;
    set({
      program: data.program,
      sessions: data.sessions,
      settings: data.settings,
      meta: data.meta,
      progression: data.progression,
      safeMode: false,
      storageIssue: null,
      storageNotice: null,
      storageError: null,
      restEndsAt: null,
      restTotalSec: 0,
    });
    if (!flushWrite()) {
      const failure = get().storageError;
      set(before);
      if (failure) reportWrite(failure);
      return false;
    }
    return true;
  },

  clearAll: () => {
    for (const key of Object.values(STORAGE_KEYS)) storage.remove(key);
    try {
      localStorage.removeItem('wt:rest');
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key?.startsWith('wt:')) sessionStorage.removeItem(key);
      }
    } catch {
      // non-critical
    }
    const data: AppData = {
      program: seedProgram,
      sessions: [],
      settings: defaultSettings,
      meta: defaultMeta(),
      progression: {},
    };
    persisted = pickSlices(data);
    attempted = pickSlices(data);
    set({
      ...data,
      safeMode: false,
      storageIssue: null,
      storageNotice: null,
      storageError: null,
      restEndsAt: null,
      restTotalSec: 0,
    });
  },

  markBackup: (exportedAt) => set((s) => ({ meta: { ...s.meta, lastBackupAt: exportedAt } })),
  dismissBackupReminder: () =>
    set((s) => ({ meta: { ...s.meta, backupReminderDismissedOn: todayLocal() } })),
}));

function pickSlices(data: AppData): AppData {
  return {
    program: data.program,
    sessions: data.sessions,
    settings: data.settings,
    meta: data.meta,
    progression: data.progression,
  };
}

function slicesChanged(a: AppData, b: AppData): boolean {
  return (
    a.program !== b.program ||
    a.sessions !== b.sessions ||
    a.settings !== b.settings ||
    a.meta !== b.meta ||
    a.progression !== b.progression
  );
}

let persisted = pickSlices(initial.data);
let attempted: AppData | null = null;
let writing = false;

function changedSessions(previous: Session[], next: Session[]): Session[] {
  const previousById = new Map(previous.map((session) => [session.id, session]));
  return next.filter((session) => previousById.get(session.id) !== session);
}

/**
 * Sessions change on every set tap, so validate only the records whose object
 * identity changed (the store always replaces rather than mutates). The other
 * slices are small and get a full parse.
 */
function validateSlice(
  key: keyof AppData,
  value: AppData[keyof AppData],
  schema: (typeof SLICES)[number][2],
): boolean {
  if (key === 'sessions') {
    const sessions = value as Session[];
    if (sessions.length > LIMITS.sessions) return false;
    return changedSessions(persisted.sessions, sessions).every(
      (session) => sessionSchema.safeParse(session).success,
    );
  }
  return schema.safeParse(value).success;
}

/** Writes only the slices whose reference changed. Returns the failure, if any. */
function persistSlices(data: AppData): string | null {
  if (useAppStore.getState().safeMode) return STORAGE_READ_ONLY_MESSAGE;
  let failure: string | null = null;
  for (const [key, storageKey, schema] of SLICES) {
    const value = data[key];
    if (value === persisted[key]) continue;
    if (!validateSlice(key, value, schema)) {
      // Refuse the write rather than poisoning a key the loader would reject.
      failure ??= STORAGE_LIMIT_MESSAGE;
      continue;
    }
    try {
      storage.set(storageKey, wrap(value));
      (persisted as unknown as Record<string, unknown>)[key] = value;
      requestPersist();
    } catch {
      // Leave `persisted` stale so the next change retries this slice.
      failure ??= STORAGE_FULL_MESSAGE;
    }
  }
  return failure;
}

function reportWrite(failure: string | null) {
  if (useAppStore.getState().storageError === failure) return;
  writing = true;
  useAppStore.setState({ storageError: failure });
  writing = false;
}

/**
 * Retries any unwritten slice and reports the result. Used where the caller
 * must not claim success without a real write (finishing a workout).
 */
export function flushWrite(): boolean {
  const failure = persistSlices(pickSlices(useAppStore.getState()));
  reportWrite(failure);
  return failure == null;
}

useAppStore.subscribe((state) => {
  if (writing || state.safeMode) return;
  const data = pickSlices(state);
  if (attempted && !slicesChanged(attempted, data)) return;
  attempted = data;
  reportWrite(persistSlices(data));
});

// Another tab changed a key: adopt it instead of silently clobbering it later.
for (const [slice, key, schema] of SLICES) {
  storage.subscribe(key, () => {
    const state = useAppStore.getState();
    if (state.safeMode) return;
    const res = loadKeyRaw(readRaw(storage, key), schema);
    if (res.value == null) return;
    (persisted as unknown as Record<string, unknown>)[slice] = res.value;
    attempted = null;
    useAppStore.setState({ [slice]: res.value } as unknown as Partial<AppState>);
  });
}

export { storage };
