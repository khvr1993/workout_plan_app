import { describe, expect, it } from 'vitest';
import { parseImport, buildExport, buildRecoveryExport, MAX_IMPORT_BYTES } from '../lib/export';
import { loadKeyRaw } from './migrations';
import { LIMITS, sessionSchema, sessionsSchema } from './schema';
import { defaultMeta, defaultSettings } from './defaults';
import { program } from './program';
import { formatFull, formatMonth, formatShort, isCalendarDate } from '../lib/date';
import type { AppData } from './types';

const data: AppData = {
  program,
  sessions: [],
  settings: defaultSettings,
  meta: defaultMeta(),
  progression: {},
};

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: 's1',
    type: 'strength',
    date: '2026-11-10',
    startedAt: '2026-11-10T08:00:00.000Z',
    status: 'completed',
    blocks: [],
    unit: 'kg',
    ...overrides,
  };
}

describe('date validation', () => {
  it('accepts real calendar days', () => {
    expect(isCalendarDate('2026-02-28')).toBe(true);
    expect(isCalendarDate('2024-02-29')).toBe(true);
  });

  it('rejects shapes that are not real days', () => {
    for (const value of ['', '2026-99-99', '2026-13-01', '2026-02-31', '2023-02-29', 'x']) {
      expect(isCalendarDate(value)).toBe(false);
    }
  });

  it('schema rejects a non-calendar date', () => {
    expect(sessionSchema.safeParse(session({ date: '2026-99-99' })).success).toBe(false);
    expect(sessionSchema.safeParse(session({ date: '' })).success).toBe(false);
    expect(sessionSchema.safeParse(session({ startedAt: 'not-a-date' })).success).toBe(false);
    expect(sessionSchema.safeParse(session()).success).toBe(true);
  });

  it('formatters never throw on unformattable input', () => {
    for (const value of ['', 'x', '2026-99-99']) {
      expect(formatShort(value)).toBe('—');
      expect(formatFull(value)).toBe('—');
    }
    expect(formatMonth('')).toBe('Undated');
  });
});

describe('import hardening', () => {
  it('rejects a crafted calendar date instead of bricking History', () => {
    const bad = buildExport({ ...data, sessions: [session({ date: '2026-99-99' })] as never });
    const result = parseImport(JSON.stringify(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('sessions.0.date');
  });

  it('rejects a file over the size cap before parsing', () => {
    const result = parseImport('x'.repeat(MAX_IMPORT_BYTES + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('too large');
  });

  it('rejects an oversized sessions array without validating each entry', () => {
    const huge = {
      ...buildExport(data),
      data: { ...data, sessions: Array.from({ length: LIMITS.sessions + 1 }, () => ({})) },
    };
    const result = parseImport(JSON.stringify(huge));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Too many sessions');
  });

  it('accepts the recovery export the safe-mode banner produces', () => {
    const recovery = buildRecoveryExport(data, { 'wt:sessions': '{"v":3,"value":"oops"}' });
    const result = parseImport(JSON.stringify(recovery));
    expect(result.ok).toBe(true);
  });

  it('caps stored session arrays at the schema level', () => {
    const tooMany = Array.from({ length: LIMITS.sessions + 1 }, () => session());
    expect(sessionsSchema.safeParse(tooMany).success).toBe(false);
  });
});

describe('corrupt storage detection', () => {
  it('distinguishes unparseable text from a missing key', () => {
    expect(loadKeyRaw(null, sessionsSchema).readOnly).toBe(false);
    const corrupt = loadKeyRaw('{not json', sessionsSchema);
    expect(corrupt.readOnly).toBe(true);
    expect(corrupt.reason).toBe('corrupt');
    expect(corrupt.value).toBeNull();
  });

  it('reports invalid but parseable data separately', () => {
    const res = loadKeyRaw('{"v":3,"value":[{"id":"x"}]}', sessionsSchema);
    expect(res.readOnly).toBe(true);
    expect(res.reason).toBe('invalid');
  });
});
