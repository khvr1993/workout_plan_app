import { create } from 'zustand';
import { z } from 'zod';
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
import { program as seedProgram } from '../data/program';
import { defaultMeta, defaultSettings } from '../data/defaults';
import { LocalStorageAdapter, STORAGE_KEYS, wrap, type StoragePort } from '../data/storage';
import { loadKey } from '../data/migrations';
import {
  metaSchema,
  programSchema,
  progressionStateSchema,
  sessionSchema,
  settingsSchema,
} from '../data/schema';
import { advanceRotation, lastPerformance } from '../lib/stats';
import { initialProgression } from '../lib/progression';
import { todayLocal } from '../lib/date';
import { fromDisplay, toDisplay } from '../lib/units';

export interface AppState extends AppData {
  safeMode: boolean;
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
  finishSession: (sessionId: string, summary: { rpe?: number; notes?: string }) => void;
  abandonSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  logRecovery: (date: string, notes?: string) => void;

  applyProgression: (exerciseId: string, suggestion: Suggestion) => void;
  setProgression: (exerciseId: string, patch: Partial<ProgressionState>) => void;

  startRest: (seconds: number) => void;
  extendRest: (seconds: number) => void;
  stopRest: () => void;

  importAll: (data: AppData) => void;
  clearAll: () => void;
  markBackup: (exportedAt: string) => void;
  dismissBackupReminder: () => void;
}

function loadInitial(storage: StoragePort): { data: AppData; safeMode: boolean } {
  const programRes = loadKey(storage.get(STORAGE_KEYS.program), programSchema);
  const sessionsRes = loadKey(storage.get(STORAGE_KEYS.sessions), z.array(sessionSchema));
  const settingsRes = loadKey(storage.get(STORAGE_KEYS.settings), settingsSchema);
  const metaRes = loadKey(storage.get(STORAGE_KEYS.meta), metaSchema);
  const progressionRes = loadKey(
    storage.get(STORAGE_KEYS.progression),
    z.record(z.string(), progressionStateSchema),
  );
  const safeMode =
    programRes.readOnly ||
    sessionsRes.readOnly ||
    settingsRes.readOnly ||
    metaRes.readOnly ||
    progressionRes.readOnly;
  return {
    safeMode,
    data: {
      program: programRes.value ?? seedProgram,
      sessions: sessionsRes.value ?? [],
      settings: settingsRes.value ?? defaultSettings,
      meta: metaRes.value ?? defaultMeta(),
      progression: progressionRes.value ?? {},
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
    restSeconds: block.restSeconds,
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
  storageError: null,
  restEndsAt: initialRest.endsAt,
  restTotalSec: initialRest.totalSec,

  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

  setProgram: (program) => set({ program }),
  resetProgram: () => set({ program: seedProgram }),

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
          progression[ex.id] = initialProgression(ex, block.restSeconds);
        }
      }
    }
    set((s) => ({ sessions: [...s.sessions, session], progression }));
    return session;
  },

  updateSet: (sessionId, blockId, exerciseId, setIndex, patch) =>
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
    })),

  finishSession: (sessionId, summary) => {
    const state = get();
    const session = state.sessions.find((s) => s.id === sessionId);
    if (!session || session.status !== 'in-progress') return;
    const finishedAt = new Date();
    const durationMin = Math.max(
      1,
      Math.round((finishedAt.getTime() - new Date(session.startedAt).getTime()) / 60000),
    );
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
    set((s) => ({
      sessions: s.sessions.map((x) =>
        x.id === sessionId
          ? {
              ...x,
              status: 'completed',
              finishedAt: finishedAt.toISOString(),
              durationMin,
              rpe: summary.rpe,
              notes: summary.notes,
            }
          : x,
      ),
      meta,
      progression,
      restEndsAt: null,
    }));
    saveRest(null, 0);
  },

  abandonSession: (sessionId) => {
    set((s) => ({
      sessions: s.sessions.map((x) =>
        x.id === sessionId ? { ...x, status: 'abandoned', finishedAt: new Date().toISOString() } : x,
      ),
      restEndsAt: null,
    }));
    saveRest(null, 0);
  },

  deleteSession: (sessionId) =>
    set((s) => ({ sessions: s.sessions.filter((x) => x.id !== sessionId) })),

  logRecovery: (date, notes) => {
    const now = new Date().toISOString();
    const session: Session = {
      id: newId(),
      type: 'recovery',
      date,
      startedAt: now,
      finishedAt: now,
      status: 'completed',
      blocks: [],
      unit: get().settings.unit,
      durationMin: 35,
      notes,
    };
    set((s) => ({ sessions: [...s.sessions, session] }));
  },

  applyProgression: (exerciseId, suggestion) =>
    set((s) => {
      const prog = s.progression[exerciseId];
      if (!prog) return s;
      return {
        progression: {
          ...s.progression,
          [exerciseId]: {
            ...prog,
            ...suggestion.patch,
            weeksAtStage: 0,
            updatedAt: todayLocal(),
          },
        },
      };
    }),

  setProgression: (exerciseId, patch) =>
    set((s) => {
      const prog = s.progression[exerciseId];
      if (!prog) return s;
      return {
        progression: {
          ...s.progression,
          [exerciseId]: { ...prog, ...patch, updatedAt: todayLocal() },
        },
      };
    }),

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

  importAll: (data) =>
    set({
      program: data.program,
      sessions: data.sessions,
      settings: data.settings,
      meta: data.meta,
      progression: data.progression,
      safeMode: false,
      restEndsAt: null,
    }),

  clearAll: () => {
    for (const key of Object.values(STORAGE_KEYS)) storage.remove(key);
    localStorage.removeItem('wt:rest');
    set({
      program: seedProgram,
      sessions: [],
      settings: defaultSettings,
      meta: defaultMeta(),
      progression: {},
      safeMode: false,
      restEndsAt: null,
    });
  },

  markBackup: (exportedAt) => set((s) => ({ meta: { ...s.meta, lastBackupAt: exportedAt } })),
  dismissBackupReminder: () =>
    set((s) => ({ meta: { ...s.meta, backupReminderDismissedOn: todayLocal() } })),
}));

// Persist slices whenever their reference changes. Optimistic; surface failure.
let prev: AppData = initial.data;
useAppStore.subscribe((state) => {
  if (state.safeMode) return;
  const slices: Array<[keyof AppData, string, unknown]> = [
    ['program', STORAGE_KEYS.program, state.program],
    ['sessions', STORAGE_KEYS.sessions, state.sessions],
    ['settings', STORAGE_KEYS.settings, state.settings],
    ['meta', STORAGE_KEYS.meta, state.meta],
    ['progression', STORAGE_KEYS.progression, state.progression],
  ];
  for (const [key, storageKey, value] of slices) {
    if (value !== prev[key]) {
      try {
        storage.set(storageKey, wrap(value));
        requestPersist();
      } catch {
        useAppStore.setState({
          storageError: 'Could not save — storage is full. Export your data from Settings.',
        });
      }
    }
  }
  prev = {
    program: state.program,
    sessions: state.sessions,
    settings: state.settings,
    meta: state.meta,
    progression: state.progression,
  };
});

export { storage };