import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Trophy } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { allExercises } from '../data/program';
import { exerciseHistory, isPrSession, lastPerformance, personalBest } from '../lib/stats';
import { formatWeight } from '../lib/units';
import { PageHeader } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Pill } from '../components/ui/Pill';
import { EmptyState } from '../components/ui/EmptyState';

export default function Progress() {
  const sessions = useAppStore((s) => s.sessions);
  const program = useAppStore((s) => s.program);
  const unit = useAppStore((s) => s.settings.unit);

  const rows = useMemo(() => {
    const exercises = allExercises(program);
    return exercises
      .map((ex) => {
        const history = exerciseHistory(sessions, ex.id);
        const last = lastPerformance(sessions, ex.id);
        const best = personalBest(sessions, ex.id);
        const isPr = last != null && isPrSession(sessions, ex.id, last.sessionId) && history.length > 1;
        return { ex, count: history.length, last, best, isPr };
      })
      .sort((a, b) => b.count - a.count || a.ex.name.localeCompare(b.ex.name));
  }, [sessions, program]);

  const anyLogged = rows.some((r) => r.count > 0);

  return (
    <div>
      <PageHeader title="Progress" subtitle="Personal records and trends per lift" />
      {!anyLogged ? (
        <Card>
          <EmptyState
            title="No data yet"
            body="Log a few workouts and your PRs, trends, and progression suggestions appear here."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map(({ ex, count, last, best, isPr }) => (
            <Link
              key={ex.id}
              to={`/progress/${ex.id}`}
              className="flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 hover:border-border-strong transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-text">{ex.name}</span>
                  {isPr && (
                    <Pill tone="accent">
                      <Trophy size={10} strokeWidth={1.5} />
                      PR
                    </Pill>
                  )}
                </div>
                <p className="text-body-sm text-text-muted tnum mt-0.5">
                  {count === 0
                    ? 'Not logged yet'
                    : `${count} session${count === 1 ? '' : 's'} · last ${formatWeight(last?.topWeight ?? null, unit)}`}
                  {best && ` · best ${formatWeight(best.weight, unit)} × ${best.reps}`}
                </p>
              </div>
              <ChevronRight size={16} strokeWidth={1.5} className="text-text-muted shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}