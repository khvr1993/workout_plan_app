import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Session } from '../../data/types';
import { parseLocal, todayLocal } from '../../lib/date';
import { IconButton } from '../ui/IconButton';
import { cn } from '../../lib/cn';

export function MonthCalendar({
  sessions,
  weekStartsOn,
  onSelectDay,
}: {
  sessions: Session[];
  weekStartsOn: 0 | 1;
  onSelectDay?: (date: string, sessions: Session[]) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const byDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      if (s.status === 'abandoned') continue;
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [sessions]);

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const leadingBlanks = (getDay(days[0]) - weekStartsOn + 7) % 7;
  const today = parseLocal(todayLocal());
  const weekdayLabels = weekStartsOn === 1 ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-h3 text-text">{format(month, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-1">
          <IconButton label="Previous month" size="sm" onClick={() => setMonth((m) => subMonths(m, 1))}>
            <ChevronLeft size={16} strokeWidth={1.5} />
          </IconButton>
          <IconButton label="Next month" size="sm" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight size={16} strokeWidth={1.5} />
          </IconButton>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((d, i) => (
          <span key={i} className="flex h-8 items-center justify-center text-[11px] font-medium text-text-muted">
            {d}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const daySessions = byDate.get(key) ?? [];
          const strength = daySessions.some((s) => s.type === 'strength' && s.status === 'completed');
          const recovery = daySessions.some((s) => s.type === 'recovery');
          const isToday = isSameDay(day, today);
          const inMonth = isSameMonth(day, month);
          return (
            <button
              key={key}
              type="button"
              disabled={daySessions.length === 0}
              onClick={() => onSelectDay?.(key, daySessions)}
              aria-label={`${format(day, 'MMMM d')}${daySessions.length ? `, ${daySessions.length} session${daySessions.length > 1 ? 's' : ''}` : ''}`}
              className={cn(
                'flex h-10 flex-col items-center justify-center rounded-sm text-[13px] tnum transition-colors',
                inMonth ? 'text-text-secondary' : 'text-text-muted',
                isToday && 'ring-1 ring-border-strong',
                daySessions.length > 0 && 'cursor-pointer hover:bg-surface-2',
                daySessions.length === 0 && 'cursor-default',
              )}
            >
              {format(day, 'd')}
              <span className="flex h-2 items-center gap-0.5 mt-0.5">
                {strength && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                {recovery && <span className="h-1.5 w-1.5 rounded-full border border-text-muted" />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Workout
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full border border-text-muted" /> Recovery walk
        </span>
      </div>
    </div>
  );
}