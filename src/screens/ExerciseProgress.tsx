import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { findExercise } from '../data/program';
import { exerciseHistory, lastPerformance, personalBest } from '../lib/stats';
import { setVolume } from '../lib/volume';
import { stageLabel } from '../lib/progression';
import { formatShort, formatFull } from '../lib/date';
import { formatWeight, toDisplay } from '../lib/units';
import { PageHeader, Section } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Pill } from '../components/ui/Pill';
import { EmptyState } from '../components/ui/EmptyState';
import { TrendChart } from '../components/charts/TrendChart';
import { VolumeBars } from '../components/charts/VolumeBars';
import { ProgressionBanner } from '../components/workout/ProgressionBanner';
import { ExerciseDemo } from '../components/workout/ExerciseDemo';
import { DEMOS } from '../data/demos';
import { daysBetween, todayLocal } from '../lib/date';

export default function ExerciseProgress() {
  const { exerciseId } = useParams();
  const program = useAppStore((s) => s.program);
  const sessions = useAppStore((s) => s.sessions);
  const progression = useAppStore((s) => s.progression);
  const unit = useAppStore((s) => s.settings.unit);

  const found = exerciseId ? findExercise(program, exerciseId) : null;
  const history = useMemo(
    () => (exerciseId ? exerciseHistory(sessions, exerciseId) : []),
    [sessions, exerciseId],
  );

  if (!found || !exerciseId) {
    return (
      <EmptyState
        title="Exercise not found"
        action={
          <Link to="/progress">
            <Button variant="secondary">Back to progress</Button>
          </Link>
        }
      />
    );
  }

  const { exercise, day } = found;
  const prog = progression[exerciseId];
  const best = personalBest(sessions, exerciseId);
  const last = lastPerformance(sessions, exerciseId);

  const trendPoints = history
    .filter((h) => h.bestSet != null)
    .map((h) => ({
      label: formatShort(h.date),
      value: Math.round(toDisplay(h.bestSet!.weight, unit) * 10) / 10,
    }));

  // Volume is computed in kg; convert before labelling the chart with the
  // user's display unit so the bars and their axis agree.
  const volumeBars = history.map((h) => {
    const kg = h.raw.reduce(
      (sum, s) => sum + setVolume(s, sessions.find((x) => x.id === h.sessionId)?.unit ?? unit),
      0,
    );
    return { label: formatShort(h.date), value: Math.round(toDisplay(kg, unit) * 10) / 10 };
  });

  const weeksAtStage = prog ? Math.max(0, Math.floor(daysBetween(prog.updatedAt, todayLocal()) / 7)) : 0;

  return (
    <div>
      <div className="mb-4">
        <Link
          to="/progress"
          className="inline-flex items-center gap-1.5 text-body-sm text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Progress
        </Link>
      </div>
      <PageHeader title={exercise.name} subtitle={`${day.label} · ${exercise.equipment}`} />

      {DEMOS[exerciseId] && (
        <Section title="Form guide">
          <Card className="max-w-md">
            <ExerciseDemo exerciseId={exerciseId} name={exercise.name} />
          </Card>
        </Section>
      )}

      {history.length === 0 ? (
        <Card>
          <EmptyState
            title="Not logged yet"
            body={`This lift appears in ${day.label}. Log it once to start the trend.`}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            <Card className="!p-4 lg:!p-5">
              <div className="flex items-center gap-1.5 text-label text-text-muted">
                <Trophy size={12} strokeWidth={1.5} className="text-accent" />
                Best set
              </div>
              <p className="text-h1 text-text tnum mt-1">
                {best ? `${formatWeight(best.weight, unit)} × ${best.reps}` : '—'}
              </p>
              {best && <p className="text-body-sm text-text-muted mt-0.5">{formatShort(best.date)}</p>}
            </Card>
            <Card className="!p-4 lg:!p-5">
              <p className="text-label text-text-muted">Estimated 1RM</p>
              <p className="text-h1 text-text tnum mt-1">
                {best ? formatWeight(Math.round(best.e1rm * 10) / 10, unit) : '—'}
              </p>
              <p className="text-body-sm text-text-muted mt-0.5">Epley formula</p>
            </Card>
          </div>

          <Section title="Best-set weight">
            <Card>
              <TrendChart points={trendPoints} unit={unit} />
            </Card>
          </Section>

          <Section title="Session volume">
            <Card>
              <VolumeBars bars={volumeBars} unit={unit} />
            </Card>
          </Section>
        </>
      )}

      {prog && (
        <Section title="Progression">
          <Card>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Pill tone="accent">{stageLabel(prog.stage)}</Pill>
              <Pill>{weeksAtStage} wk since last change</Pill>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-body-sm tnum">
              <div>
                <p className="text-label text-text-muted">Weight</p>
                <p className="text-text mt-0.5">{formatWeight(prog.currentWeight, unit)}</p>
              </div>
              <div>
                <p className="text-label text-text-muted">Target reps</p>
                <p className="text-text mt-0.5">{prog.targetReps}</p>
              </div>
              <div>
                <p className="text-label text-text-muted">Eccentric</p>
                <p className="text-text mt-0.5">{prog.tempoSeconds}s</p>
              </div>
              <div>
                <p className="text-label text-text-muted">Rest</p>
                <p className="text-text mt-0.5">{prog.restSeconds}s</p>
              </div>
            </div>
            <ProgressionBanner exercise={exercise} prog={prog} lastSets={last?.raw ?? null} />
            <p className="mt-3 text-body-sm text-text-muted">
              Levers in order: reps → load → slow eccentric → bottom pause → rest compression.
              Suggestions never apply themselves.
            </p>
          </Card>
        </Section>
      )}

      {history.length > 0 && (
        <Section title="Log">
          <div className="flex flex-col gap-2">
            {[...history].reverse().map((h) => (
              <Link
                key={h.sessionId}
                to={`/history/${h.sessionId}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3 hover:border-border-strong transition-colors"
              >
                <span className="text-body-sm text-text-secondary">{formatFull(h.date)}</span>
                <span className="text-body-sm text-text tnum">
                  {h.sets.map((s) => `${formatWeight(s.weight, unit)}×${s.reps}`).join('  ')}
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}