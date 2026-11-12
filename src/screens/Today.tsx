import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Flame, Play } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useInProgressSession, useNextDay } from '../store/selectors';
import {
  averageDuration,
  completedStrength,
  daysSinceLast,
  sessionsThisWeek,
  weeklyStreak,
} from '../lib/stats';
import { formatDay, formatDuration, todayLocal } from '../lib/date';
import { PageHeader, Section } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { WeekSlots } from '../components/workout/WeekSlots';
import { StatTile } from '../components/workout/StatTile';
import { SessionRow } from '../components/history/SessionRow';
import { EmptyState } from '../components/ui/EmptyState';

const WEEKDAY_HINT: Record<number, string> = {
  1: 'day-a',
  3: 'day-b',
  5: 'day-c',
};

export function Today() {
  const navigate = useNavigate();
  const sessions = useAppStore((s) => s.sessions);
  const settings = useAppStore((s) => s.settings);
  const safeMode = useAppStore((s) => s.safeMode);
  const program = useAppStore((s) => s.program);
  const next = useNextDay();
  const inProgress = useInProgressSession();

  const thisWeek = sessionsThisWeek(sessions, settings.weekStartsOn);
  const streak = weeklyStreak(sessions, settings.weeklyTarget, settings.weekStartsOn);
  const gap = daysSinceLast(sessions);
  const avg = averageDuration(sessions);
  const done = completedStrength(sessions);
  const recent = [...sessions]
    .filter((s) => s.status !== 'in-progress')
    .sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt))
    .slice(0, 5);

  const hintDayId = WEEKDAY_HINT[new Date().getDay()];
  const hintDay = hintDayId ? program.days.find((d) => d.id === hintDayId) : null;

  return (
    <div>
      <PageHeader title="Today" subtitle={formatDay(todayLocal())} />

      {inProgress && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-border-strong">
          <div>
            <p className="text-label text-accent">Session in progress</p>
            <p className="text-h3 text-text mt-0.5">
              {inProgress.dayLabel} — pick up where you left off
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate(`/session/${inProgress.dayId}`)}>
            <Play size={15} strokeWidth={1.5} />
            Resume
          </Button>
        </Card>
      )}

      <Card className="flex flex-col gap-5">
        <div>
          <p className="text-label text-text-muted">Up next</p>
          <h2 className="text-display text-text mt-1.5">
            {next.label} · {next.title}
          </h2>
          <p className="text-body-sm text-text-secondary mt-1">{next.emphasis}</p>
          <p className="text-body-sm text-text-muted mt-2 tnum">
            {next.warmupMinutes} min warm-up · {next.blocks.length} blocks · ~{next.estimatedMinutes} min
          </p>
          {settings.scheduleMode === 'weekday' && hintDay && hintDay.id !== next.id && (
            <p className="text-body-sm text-text-muted mt-1">
              Weekday hint: {formatDay(todayLocal()).split(',')[0]}s are usually {hintDay.label}.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={safeMode}
            onClick={() => navigate(`/session/${next.id}`)}
          >
            <Play size={15} strokeWidth={1.5} />
            Start workout
          </Button>
          <Link to={`/program/${next.id}`}>
            <Button variant="secondary">View plan</Button>
          </Link>
        </div>
        {gap != null && gap > 4 && (
          <p className="text-body-sm text-text-muted">
            Last trained {gap} days ago — ease back in, the weights will wait.
          </p>
        )}
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-label text-text-muted">This week</span>
          <WeekSlots completed={thisWeek.length} target={settings.weeklyTarget} />
        </div>
        <div className="flex items-center gap-1.5 text-body-sm text-text-secondary">
          <Flame size={14} strokeWidth={1.5} className={streak > 0 ? 'text-accent' : 'text-text-muted'} />
          <span className="tnum">Week streak {streak}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 lg:gap-4">
        <StatTile label="Sessions" value={String(done.length)} />
        <StatTile label="This week" value={`${thisWeek.length}/${settings.weeklyTarget}`} />
        <StatTile label="Avg duration" value={avg != null ? formatDuration(avg) : '—'} />
      </div>

      <Section
        title="Recent"
        actions={
          recent.length > 0 && (
            <Link
              to="/history"
              className="inline-flex items-center gap-1 text-body-sm text-text-muted hover:text-text transition-colors"
            >
              All history
              <ChevronRight size={13} strokeWidth={1.5} />
            </Link>
          )
        }
      >
        {recent.length === 0 ? (
          <Card>
            <EmptyState
              title="No sessions yet"
              body={`Start ${next.label} to begin your history.`}
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}