import type {
  AppData,
  Block,
  BlockLog,
  Exercise,
  ExerciseLog,
  Program,
  ProgramDay,
  Session,
  SetEntry,
} from './types';
import {
  LIMITS,
  blockLogSchema,
  blockSchema,
  exerciseLogSchema,
  exerciseSchema,
  programDaySchema,
  programSchema,
  sessionSchema,
  sessionsSchema,
  setEntrySchema,
} from './schema';
import { isCalendarDate, isInstant, todayLocal } from '../lib/date';

/**
 * Repairs values written under older, looser schemas. Stored data is only
 * rejected after this pass fails: tightening a bound must never turn a valid
 * historical session into an unreadable key.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, value));
}

function clampInt(value: unknown, min: number, max: number): number | undefined {
  const n = clampNumber(value, min, max);
  return n == null ? undefined : Math.round(n);
}

function truncate(value: unknown, max: number): string | undefined {
  return typeof value === 'string' ? value.slice(0, max) : undefined;
}

function repairSet(value: unknown): SetEntry | null {
  if (!isRecord(value)) return null;
  const set: Record<string, unknown> = { ...value };
  set.completed = Boolean(set.completed);
  if (set.weight != null) set.weight = clampNumber(set.weight, 0, LIMITS.maxWeight) ?? null;
  if (set.reps != null) set.reps = clampInt(set.reps, 0, LIMITS.maxReps) ?? null;
  if (set.tempo != null) {
    const tempo = truncate(set.tempo, LIMITS.maxTempo);
    if (tempo == null) delete set.tempo;
    else set.tempo = tempo;
  }
  if (set.paused != null && typeof set.paused !== 'boolean') delete set.paused;
  if (set.skipped != null && typeof set.skipped !== 'boolean') delete set.skipped;

  const parsed = setEntrySchema.safeParse(set);
  return parsed.success ? parsed.data : null;
}

function repairExerciseLog(value: unknown): ExerciseLog | null {
  if (!isRecord(value)) return null;
  if (typeof value.exerciseId !== 'string' || value.exerciseId.length === 0) return null;
  const log: Record<string, unknown> = {
    ...value,
    exerciseId: value.exerciseId.slice(0, LIMITS.id),
    exerciseName: truncate(value.exerciseName, LIMITS.name) ?? '',
  };
  if (!Array.isArray(log.sets)) return null;
  log.sets = log.sets
    .slice(0, LIMITS.setsPerExercise)
    .map(repairSet)
    .filter((set): set is SetEntry => set != null);

  const parsed = exerciseLogSchema.safeParse(log);
  return parsed.success ? parsed.data : null;
}

function repairBlockLog(value: unknown): BlockLog | null {
  if (!isRecord(value)) return null;
  if (typeof value.blockId !== 'string' || value.blockId.length === 0) return null;
  const block: Record<string, unknown> = {
    ...value,
    blockId: value.blockId.slice(0, LIMITS.id),
    restSeconds: clampInt(value.restSeconds, 0, 600),
  };
  if (block.restSeconds == null) return null;
  if (!Array.isArray(block.exercises)) return null;
  block.exercises = block.exercises
    .slice(0, 4)
    .map(repairExerciseLog)
    .filter((log): log is ExerciseLog => log != null);

  const parsed = blockLogSchema.safeParse(block);
  return parsed.success ? parsed.data : null;
}

function repairSession(value: unknown): Session | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || value.id.length === 0) return null;

  const session: Record<string, unknown> = { ...value, id: value.id.slice(0, LIMITS.id) };

  let dateValue = truncate(value.date, LIMITS.label) ?? '';
  if (!isCalendarDate(dateValue)) {
    const started = typeof value.startedAt === 'string' ? new Date(value.startedAt) : null;
    const finished = typeof value.finishedAt === 'string' ? new Date(value.finishedAt) : null;
    const source =
      started && !Number.isNaN(started.getTime())
        ? started
        : finished && !Number.isNaN(finished.getTime())
          ? finished
          : null;
    if (!source) return null;
    dateValue = todayLocal(source);
  }
  session.date = dateValue;

  if (typeof value.startedAt !== 'string' || !isInstant(value.startedAt)) {
    session.startedAt = `${dateValue}T00:00:00.000Z`;
  }
  if (
    session.finishedAt != null &&
    (typeof session.finishedAt !== 'string' || !isInstant(session.finishedAt))
  ) {
    delete session.finishedAt;
  }
  const dayId = truncate(session.dayId, LIMITS.id);
  if (dayId == null || dayId.length === 0) delete session.dayId;
  else session.dayId = dayId;
  const dayLabel = truncate(session.dayLabel, LIMITS.label);
  if (dayLabel == null) delete session.dayLabel;
  else session.dayLabel = dayLabel;
  if (session.durationMin != null) {
    const duration = clampInt(session.durationMin, 0, LIMITS.maxDurationMin);
    if (duration == null) delete session.durationMin;
    else session.durationMin = duration;
  }
  if (session.rpe != null) {
    const rpe = clampInt(session.rpe, 1, 10);
    if (rpe == null) delete session.rpe;
    else session.rpe = rpe;
  }
  const notes = truncate(session.notes, LIMITS.notes);
  if (notes == null) delete session.notes;
  else session.notes = notes;
  if (!Array.isArray(session.blocks)) return null;
  session.blocks = session.blocks
    .slice(0, LIMITS.blocksPerDay)
    .map(repairBlockLog)
    .filter((block): block is BlockLog => block != null);

  const parsed = sessionSchema.safeParse(session);
  return parsed.success ? parsed.data : null;
}

export function repairSessions(value: unknown): Session[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length === 0) return [];
  const repaired = value
    .slice(0, LIMITS.sessions)
    .map(repairSession)
    .filter((session): session is Session => session != null);
  if (repaired.length === 0) return null;
  const parsed = sessionsSchema.safeParse(repaired);
  return parsed.success ? parsed.data : null;
}

function repairProgramExercise(value: unknown): Exercise | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || value.id.length === 0) return null;
  if (typeof value.name !== 'string' || value.name.length === 0) return null;

  const exercise: Record<string, unknown> = {
    ...value,
    id: value.id.slice(0, LIMITS.id),
    name: value.name.slice(0, LIMITS.name),
    equipment: truncate(value.equipment, LIMITS.shortText) ?? '',
    execution: truncate(value.execution, LIMITS.longText) ?? '',
    cue: truncate(value.cue, LIMITS.longText) ?? '',
  };
  const tempo = truncate(exercise.tempo, LIMITS.maxTempo);
  if (tempo == null) delete exercise.tempo;
  else exercise.tempo = tempo;

  const sets = clampInt(exercise.sets, 1, 10);
  if (sets != null) exercise.sets = sets;

  if (isRecord(exercise.reps)) {
    const reps = { ...exercise.reps };
    const min = clampInt(reps.min, 1, 100);
    const max = clampInt(reps.max, 1, 100);
    if (min != null) reps.min = min;
    if (max != null) reps.max = max;
    exercise.reps = reps;
  }

  exercise.loadOptions = Array.isArray(exercise.loadOptions)
    ? exercise.loadOptions
        .map((weight) => clampNumber(weight, 0, LIMITS.maxWeight))
        .filter((weight): weight is number => weight != null && weight > 0)
        .slice(0, 10)
    : [];

  const parsed = exerciseSchema.safeParse(exercise);
  return parsed.success ? parsed.data : null;
}

function repairProgramBlock(value: unknown): Block | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || value.id.length === 0) return null;

  const block: Record<string, unknown> = {
    ...value,
    id: value.id.slice(0, LIMITS.id),
    label: truncate(value.label, LIMITS.label) ?? '',
    superset: typeof value.superset === 'boolean' ? value.superset : false,
  };
  const rest = clampInt(value.restSeconds, 0, 600);
  if (rest != null) block.restSeconds = rest;

  if (!Array.isArray(value.exercises)) return null;
  block.exercises = value.exercises
    .slice(0, LIMITS.exercisesPerBlock)
    .map(repairProgramExercise)
    .filter((exercise): exercise is Exercise => exercise != null);

  const parsed = blockSchema.safeParse(block);
  return parsed.success ? parsed.data : null;
}

function repairProgramDay(value: unknown): ProgramDay | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || value.id.length === 0) return null;

  const day: Record<string, unknown> = {
    ...value,
    id: value.id.slice(0, LIMITS.id),
    label: truncate(value.label, LIMITS.label) ?? '',
    title: truncate(value.title, LIMITS.name) ?? '',
    emphasis: truncate(value.emphasis, LIMITS.shortText) ?? '',
    focus: Array.isArray(value.focus)
      ? value.focus
          .filter((item): item is string => typeof item === 'string')
          .slice(0, 20)
          .map((item) => item.slice(0, LIMITS.label))
      : [],
  };
  const estimated = clampNumber(value.estimatedMinutes, 0.1, 600);
  if (estimated != null) day.estimatedMinutes = estimated;
  const warmup = clampNumber(value.warmupMinutes, 0, 120);
  if (warmup != null) day.warmupMinutes = warmup;

  day.blocks = Array.isArray(value.blocks)
    ? value.blocks
        .slice(0, LIMITS.blocksPerDay)
        .map(repairProgramBlock)
        .filter((block): block is Block => block != null)
    : [];

  const parsed = programDaySchema.safeParse(day);
  return parsed.success ? parsed.data : null;
}

export function repairProgram(value: unknown): Program | null {
  if (!isRecord(value)) return null;
  const program: Record<string, unknown> = {
    ...value,
    id:
      typeof value.id === 'string' && value.id.length > 0
        ? value.id.slice(0, LIMITS.id)
        : value.id,
    name: truncate(value.name, LIMITS.name) ?? value.name,
  };
  if (!Array.isArray(value.days) || value.days.length === 0) return null;
  const days = value.days
    .slice(0, LIMITS.days)
    .map(repairProgramDay)
    .filter((day): day is ProgramDay => day != null);
  if (days.length === 0) return null;
  program.days = days;

  const parsed = programSchema.safeParse(program);
  return parsed.success ? parsed.data : null;
}

/** Returns a schema-valid replacement, or null when the value cannot be salvaged. */
export function repairSlice(slice: keyof AppData, value: unknown): unknown | null {
  switch (slice) {
    case 'sessions':
      return repairSessions(value);
    case 'program':
      return repairProgram(value);
    default:
      return null;
  }
}
