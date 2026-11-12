import type { AppData } from '../data/types';
import { appDataSchema, LIMITS } from '../data/schema';

export interface ExportFile {
  app: 'workout-tracker';
  version: 1;
  exportedAt: string;
  data: AppData;
}

/** Recovery export: a normal importable file plus the untouched stored text. */
export interface RecoveryExportFile extends ExportFile {
  raw: Record<string, string | null>;
}

/**
 * Hard ceiling on what the import screen will read. Anything larger is
 * rejected before it is parsed, so a hostile file cannot exhaust memory by
 * sheer size or by inflating validation errors.
 */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export function buildExport(data: AppData): ExportFile {
  return {
    app: 'workout-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function buildRecoveryExport(
  data: AppData,
  raw: Record<string, string | null>,
): RecoveryExportFile {
  return { ...buildExport(data), raw };
}

export function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    a.remove();
    // Leave time for the browser to consume the URL before releasing it.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

export type ImportResult =
  | { ok: true; data: AppData }
  | { ok: false; error: string };

export function parseImport(text: string): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: 'File is too large to import (5 MB max).' };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Not valid JSON.' };
  }
  if (typeof raw !== 'object' || raw === null || !('data' in raw)) {
    return { ok: false, error: 'Missing "data" — is this a Workout export?' };
  }
  const file = raw as Partial<ExportFile>;
  if (file.app !== 'workout-tracker') {
    return { ok: false, error: 'Not a Workout export file.' };
  }
  if (file.version !== 1) {
    return { ok: false, error: `Unsupported export version ${String(file.version)}.` };
  }

  // Check collection sizes before handing the data to zod: schema item limits
  // are evaluated per element, so an oversized array still costs time/memory.
  const data = (raw as { data: unknown }).data;
  if (data && typeof data === 'object') {
    const sessions = (data as { sessions?: unknown }).sessions;
    if (Array.isArray(sessions) && sessions.length > LIMITS.sessions) {
      return { ok: false, error: `Too many sessions (${sessions.length}); the limit is ${LIMITS.sessions}.` };
    }
    const progression = (data as { progression?: unknown }).progression;
    if (progression && typeof progression === 'object' && !Array.isArray(progression)) {
      const count = Object.keys(progression).length;
      if (count > LIMITS.progressionEntries) {
        return { ok: false, error: `Too many progression entries (${count}); the limit is ${LIMITS.progressionEntries}.` };
      }
    }
    const program = (data as { program?: unknown }).program;
    const days = program && typeof program === 'object' ? (program as { days?: unknown }).days : null;
    if (Array.isArray(days) && days.length > LIMITS.days) {
      return { ok: false, error: `Too many program days (${days.length}); the limit is ${LIMITS.days}.` };
    }
  }

  const parsed = appDataSchema.safeParse((raw as { data: unknown }).data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: `Invalid data at ${first.path.join('.') || 'root'}: ${first.message}`,
    };
  }
  return { ok: true, data: parsed.data };
}
