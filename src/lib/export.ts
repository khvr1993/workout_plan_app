import type { AppData } from '../data/types';
import { appDataSchema } from '../data/schema';

export interface ExportFile {
  app: 'workout-tracker';
  version: 1;
  exportedAt: string;
  data: AppData;
}

export function buildExport(data: AppData): ExportFile {
  return {
    app: 'workout-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
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
  const parsed = appDataSchema.safeParse(file.data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: `Invalid data at ${first.path.join('.') || 'root'}: ${first.message}`,
    };
  }
  return { ok: true, data: parsed.data };
}