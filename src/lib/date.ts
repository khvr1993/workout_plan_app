import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
} from 'date-fns';

export function todayLocal(d = new Date()): string {
  return format(d, 'yyyy-MM-dd');
}

export function parseLocal(date: string): Date {
  return parseISO(date);
}

export function formatDay(date: string): string {
  return format(parseISO(date), 'EEE, MMM d');
}

export function formatShort(date: string): string {
  return format(parseISO(date), 'MMM d');
}

export function formatFull(date: string): string {
  return format(parseISO(date), 'EEEE, MMMM d, yyyy');
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), 'HH:mm');
}

export function weekWindow(anchor: Date, weekStartsOn: 0 | 1): { start: Date; end: Date } {
  return {
    start: startOfWeek(anchor, { weekStartsOn }),
    end: endOfWeek(anchor, { weekStartsOn }),
  };
}

export function inWeek(date: string, anchor: Date, weekStartsOn: 0 | 1): boolean {
  const { start, end } = weekWindow(anchor, weekStartsOn);
  return isWithinInterval(parseISO(date), { start, end });
}

export function daysBetween(a: string, b: string): number {
  return differenceInCalendarDays(parseISO(b), parseISO(a));
}

export function addDaysLocal(date: string, n: number): string {
  return format(addDays(parseISO(date), n), 'yyyy-MM-dd');
}

export function formatDuration(min: number): string {
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}