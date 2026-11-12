import {
  addDays,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
} from 'date-fns';

/** Placeholder for a date string that cannot be formatted. */
const INVALID = '—';

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True only for a real calendar day in ISO form. The regex alone would accept
 * "2026-99-99", which `parseISO` turns into an Invalid Date — every formatter
 * below would then throw while rendering.
 */
export function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  // Rejects normalized overflow such as 2026-02-31 → 2026-03-03.
  return parsed.toISOString().slice(0, 10) === value;
}

/** True for anything `Date.parse` understands (ISO instants, RFC 2822, …). */
export function isInstant(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function safeDate(value: string): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export function todayLocal(d = new Date()): string {
  return format(d, 'yyyy-MM-dd');
}

export function parseLocal(date: string): Date {
  return parseISO(date);
}

export function formatDay(date: string): string {
  const d = safeDate(date);
  return d ? format(d, 'EEE, MMM d') : INVALID;
}

export function formatShort(date: string): string {
  const d = safeDate(date);
  return d ? format(d, 'MMM d') : INVALID;
}

export function formatFull(date: string): string {
  const d = safeDate(date);
  return d ? format(d, 'EEEE, MMMM d, yyyy') : INVALID;
}

export function formatMonth(date: string): string {
  const d = safeDate(date);
  return d ? format(d, 'MMMM yyyy') : 'Undated';
}

export function formatTime(iso: string): string {
  const d = safeDate(iso);
  return d ? format(d, 'HH:mm') : INVALID;
}

export function weekWindow(anchor: Date, weekStartsOn: 0 | 1): { start: Date; end: Date } {
  return {
    start: startOfWeek(anchor, { weekStartsOn }),
    end: endOfWeek(anchor, { weekStartsOn }),
  };
}

export function inWeek(date: string, anchor: Date, weekStartsOn: 0 | 1): boolean {
  const d = safeDate(date);
  if (!d) return false;
  const { start, end } = weekWindow(anchor, weekStartsOn);
  return isWithinInterval(d, { start, end });
}

export function daysBetween(a: string, b: string): number {
  const from = safeDate(a);
  const to = safeDate(b);
  if (!from || !to) return 0;
  return differenceInCalendarDays(to, from);
}

export function addDaysLocal(date: string, n: number): string {
  const d = safeDate(date);
  if (!d) return date;
  return format(addDays(d, n), 'yyyy-MM-dd');
}

export function formatDuration(min: number): string {
  if (!Number.isFinite(min)) return INVALID;
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
