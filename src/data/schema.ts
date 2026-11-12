import { z } from 'zod';
import { isCalendarDate, isInstant } from '../lib/date';

export const unitSchema = z.enum(['kg', 'lb']);
export const loadTypeSchema = z.enum(['dumbbells', 'barbell', 'single-dumbbell', 'bodyweight']);
export const repUnitSchema = z.enum(['reps', 'perLeg', 'perSide']);

/**
 * Bounds exist for two reasons: they keep a normal app state far below the
 * localStorage quota, and they stop a hostile import file from forcing large
 * allocations inside the validator.
 */
export const LIMITS = {
  sessions: 5_000,
  days: 14,
  blocksPerDay: 20,
  exercisesPerBlock: 2,
  setsPerExercise: 20,
  progressionEntries: 500,
  name: 80,
  label: 40,
  shortText: 120,
  longText: 2_000,
  notes: 2_000,
  id: 100,
  maxWeight: 10_000,
  maxReps: 1_000,
  maxDurationMin: 24 * 60,
  maxTempo: 20,
} as const;

const calendarDate = z
  .string()
  .refine(isCalendarDate, { message: 'Date must be a real calendar date (YYYY-MM-DD).' });

const instant = z.string().refine(isInstant, { message: 'Expected a timestamp.' });

export const repRangeSchema = z.object({
  min: z.number().int().min(1).max(100),
  max: z.number().int().min(1).max(100),
  unit: repUnitSchema,
});

export const exerciseSchema = z.object({
  id: z.string().min(1).max(LIMITS.id),
  name: z.string().min(1).max(LIMITS.name),
  sets: z.number().int().min(1).max(10),
  reps: repRangeSchema,
  tempo: z.string().max(LIMITS.maxTempo).optional(),
  loadType: loadTypeSchema,
  loadOptions: z.array(z.number().positive().max(LIMITS.maxWeight)).max(10),
  equipment: z.string().max(LIMITS.shortText),
  execution: z.string().max(LIMITS.longText),
  cue: z.string().max(LIMITS.longText),
});

export const blockSchema = z.object({
  id: z.string().min(1).max(LIMITS.id),
  label: z.string().max(LIMITS.label),
  superset: z.boolean(),
  restSeconds: z.number().int().min(0).max(600),
  exercises: z.array(exerciseSchema).min(1).max(LIMITS.exercisesPerBlock),
});

export const programDaySchema = z.object({
  id: z.string().min(1).max(LIMITS.id),
  label: z.string().max(LIMITS.label),
  title: z.string().max(LIMITS.name),
  emphasis: z.string().max(LIMITS.shortText),
  focus: z.array(z.string().max(LIMITS.label)).max(20),
  estimatedMinutes: z.number().positive().max(600),
  warmupMinutes: z.number().min(0).max(120),
  blocks: z.array(blockSchema).max(LIMITS.blocksPerDay),
});

export const programSchema = z.object({
  id: z.string().min(1).max(LIMITS.id),
  name: z.string().max(LIMITS.name),
  version: z.number().int().min(1),
  days: z.array(programDaySchema).min(1).max(LIMITS.days),
});

export const setEntrySchema = z.object({
  weight: z.number().min(0).max(LIMITS.maxWeight).nullable(),
  reps: z.number().int().min(0).max(LIMITS.maxReps).nullable(),
  completed: z.boolean(),
  tempo: z.string().max(LIMITS.maxTempo).optional(),
  paused: z.boolean().optional(),
  skipped: z.boolean().optional(),
});

export const exerciseLogSchema = z.object({
  exerciseId: z.string().min(1).max(LIMITS.id),
  exerciseName: z.string().max(LIMITS.name),
  sets: z.array(setEntrySchema).max(LIMITS.setsPerExercise),
});

export const blockLogSchema = z.object({
  blockId: z.string().min(1).max(LIMITS.id),
  restSeconds: z.number().int().min(0).max(600),
  exercises: z.array(exerciseLogSchema).max(4),
});

export const sessionSchema = z.object({
  id: z.string().min(1).max(LIMITS.id),
  type: z.enum(['strength', 'recovery']),
  date: calendarDate,
  startedAt: instant,
  finishedAt: instant.optional(),
  dayId: z.string().max(LIMITS.id).optional(),
  dayLabel: z.string().max(LIMITS.label).optional(),
  status: z.enum(['in-progress', 'completed', 'abandoned']),
  blocks: z.array(blockLogSchema).max(LIMITS.blocksPerDay),
  unit: unitSchema,
  durationMin: z.number().min(0).max(LIMITS.maxDurationMin).optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().max(LIMITS.notes).optional(),
});

export const sessionsSchema = z.array(sessionSchema).max(LIMITS.sessions);

export const progressionStateSchema = z.object({
  exerciseId: z.string().min(1).max(LIMITS.id),
  currentWeight: z.number().min(0).max(LIMITS.maxWeight),
  targetReps: z.number().int().min(1).max(100),
  stage: z.enum(['reps', 'tempo', 'pause', 'rest']),
  tempoSeconds: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  paused: z.boolean(),
  restSeconds: z.number().int().min(0).max(600),
  weeksAtStage: z.number().int().min(0).max(10_000),
  updatedAt: instant,
});

export const progressionRecordSchema = z
  .record(z.string().max(LIMITS.id), progressionStateSchema)
  .refine((record) => Object.keys(record).length <= LIMITS.progressionEntries, {
    message: `At most ${LIMITS.progressionEntries} progression entries.`,
  });

export const settingsSchema = z.object({
  unit: unitSchema,
  theme: z.enum(['system', 'light', 'dark']),
  accent: z.enum(['emerald', 'indigo', 'amber']),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
  weeklyTarget: z.number().int().min(1).max(7),
  scheduleMode: z.enum(['rotation', 'weekday']),
  restTimerDefaultSec: z.number().int().min(5).max(600),
  autoStartRestTimer: z.boolean(),
  haptics: z.boolean(),
  metronome: z.boolean(),
  defaultPaused: z.boolean(),
});

export const metaSchema = z.object({
  schemaVersion: z.literal(1),
  programStartDate: calendarDate,
  nextDayId: z.string().min(1).max(LIMITS.id),
  lastBackupAt: instant.optional(),
  backupReminderDismissedOn: calendarDate.optional(),
});

export const appDataSchema = z.object({
  program: programSchema,
  sessions: sessionsSchema,
  settings: settingsSchema,
  meta: metaSchema,
  progression: progressionRecordSchema,
});

export type AppDataImport = z.infer<typeof appDataSchema>;
