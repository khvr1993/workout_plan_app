export type Unit = 'kg' | 'lb';
export type LoadType = 'dumbbells' | 'barbell' | 'single-dumbbell' | 'bodyweight';
export type RepUnit = 'reps' | 'perLeg' | 'perSide';

export interface RepRange {
  min: number;
  max: number;
  unit: RepUnit;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: RepRange;
  tempo?: string;
  loadType: LoadType;
  loadOptions: number[];
  equipment: string;
  execution: string;
  cue: string;
}

export interface Block {
  id: string;
  label: string;
  superset: boolean;
  restSeconds: number;
  exercises: Exercise[];
}

export interface ProgramDay {
  id: string;
  label: string;
  title: string;
  emphasis: string;
  focus: string[];
  estimatedMinutes: number;
  warmupMinutes: number;
  blocks: Block[];
}

export interface Program {
  id: string;
  name: string;
  version: number;
  days: ProgramDay[];
}

export interface SetEntry {
  weight: number | null;
  reps: number | null;
  completed: boolean;
  tempo?: string;
  paused?: boolean;
  skipped?: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  sets: SetEntry[];
}

export interface BlockLog {
  blockId: string;
  restSeconds: number;
  exercises: ExerciseLog[];
}

export interface Session {
  id: string;
  type: 'strength' | 'recovery';
  date: string;
  startedAt: string;
  finishedAt?: string;
  dayId?: string;
  dayLabel?: string;
  status: 'in-progress' | 'completed' | 'abandoned';
  blocks: BlockLog[];
  unit: Unit;
  durationMin?: number;
  rpe?: number;
  notes?: string;
}

export type ProgressionStage = 'reps' | 'tempo' | 'pause' | 'rest';

export interface ProgressionState {
  exerciseId: string;
  currentWeight: number;
  targetReps: number;
  stage: ProgressionStage;
  tempoSeconds: 2 | 3 | 4;
  paused: boolean;
  restSeconds: number;
  weeksAtStage: number;
  updatedAt: string;
}

export interface Settings {
  unit: Unit;
  theme: 'system' | 'light' | 'dark';
  accent: 'emerald' | 'indigo' | 'amber';
  weekStartsOn: 0 | 1;
  weeklyTarget: number;
  scheduleMode: 'rotation' | 'weekday';
  restTimerDefaultSec: number;
  autoStartRestTimer: boolean;
  haptics: boolean;
  metronome: boolean;
  defaultPaused: boolean;
}

export interface Meta {
  schemaVersion: 1;
  programStartDate: string;
  nextDayId: string;
  lastBackupAt?: string;
  backupReminderDismissedOn?: string;
}

export interface WarmupDrill {
  id: string;
  label: string;
  seconds: number;
}

export interface AppData {
  program: Program;
  sessions: Session[];
  settings: Settings;
  meta: Meta;
  progression: Record<string, ProgressionState>;
}