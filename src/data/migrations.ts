import { z } from 'zod';
import { ENVELOPE_VERSION, unwrap, type Envelope } from './storage';
import { LOAD_OPTIONS } from './program';

// Migration chain: index = source version, value = transform to version + 1.
// v1 → v2: rename day display names (Day A/B/C → Day 1/2/3); ids stay stable.
// v2 → v3: every loaded exercise offers the same three selectable loads.

const DAY_RENAMES: Record<string, { label: string; title: string }> = {
  'day-a': { label: 'Day 1', title: 'Full Body 1' },
  'day-b': { label: 'Day 2', title: 'Full Body 2' },
  'day-c': { label: 'Day 3', title: 'Full Body 3' },
};

const SESSION_LABEL_RENAMES: Record<string, string> = {
  'Day A': 'Day 1',
  'Day B': 'Day 2',
  'Day C': 'Day 3',
};

function renameDays(value: unknown): unknown {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Array.isArray((value as { days?: unknown }).days)
  ) {
    const program = value as { days: Array<Record<string, unknown>> };
    return {
      ...program,
      days: program.days.map((day) => {
        const rename = typeof day.id === 'string' ? DAY_RENAMES[day.id] : undefined;
        return rename ? { ...day, label: rename.label, title: rename.title } : day;
      }),
    };
  }
  if (Array.isArray(value)) {
    return value.map((session) => {
      if (
        session &&
        typeof session === 'object' &&
        typeof (session as { dayLabel?: unknown }).dayLabel === 'string'
      ) {
        const label = (session as { dayLabel: string }).dayLabel;
        const renamed = SESSION_LABEL_RENAMES[label];
        return renamed ? { ...session, dayLabel: renamed } : session;
      }
      return session;
    });
  }
  return value;
}

function normalizeLoadOptions(value: unknown): unknown {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Array.isArray((value as { days?: unknown }).days)
  ) {
    const program = value as {
      days: Array<{ blocks?: Array<{ exercises?: Array<Record<string, unknown>> }> }>;
    };
    return {
      ...program,
      days: program.days.map((day) => ({
        ...day,
        blocks: (day.blocks ?? []).map((block) => ({
          ...block,
          exercises: (block.exercises ?? []).map((ex) =>
            ex.loadType === 'bodyweight'
              ? { ...ex, loadOptions: [] }
              : { ...ex, loadOptions: [...LOAD_OPTIONS] },
          ),
        })),
      })),
    };
  }
  return value;
}

const migrations: Array<(value: unknown) => unknown> = [renameDays, normalizeLoadOptions];

export interface LoadResult<T> {
  value: T | null;
  /** Data exists but cannot be read safely (newer version or corrupt). */
  readOnly: boolean;
}

export function loadKey<T>(raw: unknown, schema: z.ZodType<T>): LoadResult<T> {
  if (raw == null) return { value: null, readOnly: false };

  let current: unknown = raw;
  if (typeof raw === 'object' && raw !== null && 'v' in raw && 'value' in raw) {
    const env = raw as Envelope<unknown>;
    if (env.v > ENVELOPE_VERSION) return { value: null, readOnly: true };
    let v = env.v;
    current = env.value;
    while (v < ENVELOPE_VERSION) {
      const migrate = migrations[v - 1];
      if (!migrate) return { value: null, readOnly: true };
      current = migrate(current);
      v++;
    }
  }

  const parsed = schema.safeParse(current);
  if (!parsed.success) return { value: null, readOnly: true };
  return { value: parsed.data, readOnly: false };
}

export { unwrap };