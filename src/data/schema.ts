import { z } from 'zod';

export const unitSchema = z.enum(['kg', 'lb']);
export const loadTypeSchema = z.enum(['dumbbells', 'barbell', 'single-dumbbell', 'bodyweight']);
export const repUnitSchema = z.enum(['reps', 'perLeg', 'perSide']);

export const repRangeSchema = z.object({
  min: z.number().int().min(1).max(100),
  max: z.number().int().min(1).max(100),
  unit: repUnitSchema,
});

export const exerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sets: z.number().int().min(1).max(10),
  reps: repRangeSchema,
  tempo: z.string().optional(),
  loadType: loadTypeSchema,
  loadOptions: z.array(z.number().positive()),
  equipment: z.string(),
  execution: z.string(),
  cue: z.string(),
});

export const blockSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  superset: z.boolean(),
  restSeconds: z.number().int().min(0).max(600),
  exercises: z.array(exerciseSchema).min(1).max(2),
});

export const programDaySchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  title: z.string(),
  emphasis: z.string(),
  focus: z.array(z.string()),
  estimatedMinutes: z.number().positive(),
  warmupMinutes: z.number().min(0),
  blocks: z.array(blockSchema),
});

export const programSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  version: z.number().int().min(1),
  days: z.array(programDaySchema).min(1),
});

export const setEntrySchema = z.object({
  weight: z.number().min(0).nullable(),
  reps: z.number().int().min(0).nullable(),
  completed: z.boolean(),
  tempo: z.string().optional(),
  paused: z.boolean().optional(),
  skipped: z.boolean().optional(),
});

export const exerciseLogSchema = z.object({
  exerciseId: z.string().min(1),
  exerciseName: z.string(),
  sets: z.array(setEntrySchema),
});

export const blockLogSchema = z.object({
  blockId: z.string().min(1),
  restSeconds: z.number().int().min(0),
  exercises: z.array(exerciseLogSchema),
});

export const sessionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['strength', 'recovery']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startedAt: z.string().min(1),
  finishedAt: z.string().optional(),
  dayId: z.string().optional(),
  dayLabel: z.string().optional(),
  status: z.enum(['in-progress', 'completed', 'abandoned']),
  blocks: z.array(blockLogSchema),
  unit: unitSchema,
  durationMin: z.number().min(0).optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

export const progressionStateSchema = z.object({
  exerciseId: z.string().min(1),
  currentWeight: z.number().min(0),
  targetReps: z.number().int().min(1),
  stage: z.enum(['reps', 'tempo', 'pause', 'rest']),
  tempoSeconds: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  paused: z.boolean(),
  restSeconds: z.number().int().min(0),
  weeksAtStage: z.number().int().min(0),
  updatedAt: z.string(),
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
  programStartDate: z.string(),
  nextDayId: z.string(),
  lastBackupAt: z.string().optional(),
  backupReminderDismissedOn: z.string().optional(),
});

export const appDataSchema = z.object({
  program: programSchema,
  sessions: z.array(sessionSchema),
  settings: settingsSchema,
  meta: metaSchema,
  progression: z.record(z.string(), progressionStateSchema),
});

export type AppDataImport = z.infer<typeof appDataSchema>;