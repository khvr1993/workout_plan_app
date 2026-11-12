import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { BlockCard } from '../components/workout/BlockCard';
import { WarmupChecklist } from '../components/workout/WarmupChecklist';
import { RestTimerSheet } from '../components/workout/RestTimerSheet';
import { SessionSummarySheet } from '../components/workout/SessionSummarySheet';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Skeleton } from '../components/ui/Skeleton';
import { Card } from '../components/ui/Card';
import { toast } from '../components/ui/Toast';
import { StorageBanners } from '../components/layout/SafeModeBanner';
import { vibrate } from '../lib/haptics';
import { formatClock } from '../lib/date';
import { effectiveRestSeconds } from '../lib/progression';
import { useInProgressSession } from '../store/selectors';
import { LIMITS } from '../data/schema';

export function Session() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const day = useAppStore((s) => s.program.days.find((d) => d.id === dayId));
  const session = useAppStore((s) =>
    s.sessions.find((x) => x.status === 'in-progress' && x.dayId === dayId),
  );
  // One canonical draft owns the workout screen. Two legacy drafts must not
  // redirect to each other forever.
  const activeSession = useInProgressSession();
  const otherDayId =
    activeSession?.dayId && activeSession.dayId !== dayId ? activeSession.dayId : null;
  const sessions = useAppStore((s) => s.sessions);
  const progression = useAppStore((s) => s.progression);
  const settings = useAppStore((s) => s.settings);
  const safeMode = useAppStore((s) => s.safeMode);
  const startSession = useAppStore((s) => s.startSession);
  const updateSet = useAppStore((s) => s.updateSet);
  const finishSession = useAppStore((s) => s.finishSession);
  const abandonSession = useAppStore((s) => s.abandonSession);
  const startRest = useAppStore((s) => s.startRest);

  const [confirmClose, setConfirmClose] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const finishing = useRef(false);

  useEffect(() => {
    if (day && !session && !otherDayId && !finishing.current && !safeMode) {
      startSession(day.id);
    }
  }, [day, session, otherDayId, startSession, safeMode]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  if (!day) return <Navigate to="/program" replace />;

  // Only one workout can be in progress; the canonical draft owns the screen.
  if (otherDayId) return <Navigate to={`/session/${otherDayId}`} replace />;

  if (safeMode) {
    return (
      <div className="min-h-dvh bg-bg">
        <StorageBanners />
        <main className="mx-auto max-w-270 px-5 py-10">
          <Card>
            <h1 className="text-h3 text-text">Workouts are paused</h1>
            <p className="mt-2 text-body-sm text-text-secondary">
              Stored data could not be read, so nothing you log here would be saved. Export the
              recovery backup, then clear data in Settings to start again.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/settings">
                <Button variant="secondary">Open Settings</Button>
              </Link>
              <Link to="/">
                <Button variant="ghost">Back to Today</Button>
              </Link>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-270 px-5 lg:px-12 py-10 flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const startedAt = new Date(session.startedAt).getTime();
  const elapsedSec = Number.isFinite(startedAt)
    ? Math.max(0, (now - startedAt) / 1000)
    : 0;
  const elapsedMin = Math.min(
    LIMITS.maxDurationMin,
    Math.max(1, Math.round(elapsedSec / 60)),
  );

  const restForBlock = (blockLog: { restSeconds: number; exercises: Array<{ exerciseId: string }> }) =>
    effectiveRestSeconds(
      blockLog.restSeconds || settings.restTimerDefaultSec,
      blockLog.exercises.map((e) => progression[e.exerciseId]?.restSeconds ?? 0),
    );

  const patchSet = (blockId: string, exerciseId: string, setIndex: number, patch: object) => {
    updateSet(session.id, blockId, exerciseId, setIndex, patch);
  };

  const toggleSet = (blockId: string, exerciseId: string, setIndex: number) => {
    const blockLog = session.blocks.find((b) => b.blockId === blockId);
    const exLog = blockLog?.exercises.find((e) => e.exerciseId === exerciseId);
    const entry = exLog?.sets[setIndex];
    if (!blockLog || !entry) return;

    const completing = !entry.completed;
    updateSet(session.id, blockId, exerciseId, setIndex, {
      completed: completing,
      skipped: false,
    });
    if (!completing) return;

    vibrate(settings.haptics, 10);

    // A round is done when every exercise has this set completed. Exercises
    // with fewer sets simply don't participate in the later rounds.
    const roundDone = blockLog.exercises.every((e) => {
      const s = e.exerciseId === exerciseId ? { ...entry, completed: true } : e.sets[setIndex];
      return !s || (s.completed && !s.skipped);
    });
    const maxSets = Math.max(...blockLog.exercises.map((e) => e.sets.length));
    const isLastRound = setIndex >= maxSets - 1;
    if (roundDone && !isLastRound && settings.autoStartRestTimer) {
      startRest(restForBlock(blockLog));
    }
  };

  const handleFinish = (summary: { rpe?: number; notes?: string }) => {
    if (finishing.current) return;
    finishing.current = true;
    const saved = finishSession(session.id, summary);
    setFinishOpen(false);
    if (!saved) {
      finishing.current = false;
      toast(
        useAppStore.getState().storageError ??
          'Could not save this workout — export your data from Settings.',
        'error',
      );
      return;
    }
    toast('Workout saved', 'success');
    navigate(`/history/${session.id}`, { replace: true });
  };

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-surface safe-top">
        <StorageBanners />
        <div className="mx-auto max-w-270 flex items-center gap-3 px-5 lg:px-12 h-14">
          <IconButton label="Close workout" onClick={() => setConfirmClose(true)}>
            <X size={18} strokeWidth={1.5} />
          </IconButton>
          <div className="flex-1 min-w-0">
            <span className="text-h3 text-text">{day.label}</span>
            <span className="text-body-sm text-text-muted ml-2 tnum" aria-label="Elapsed time">
              {formatClock(elapsedSec)}
            </span>
          </div>
          <Button variant="primary" size="sm" onClick={() => setFinishOpen(true)}>
            Finish
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-270 px-5 lg:px-12 py-6 pb-40 flex flex-col gap-4">
        <WarmupChecklist sessionId={session.id} minutes={day.warmupMinutes} />
        {day.blocks.map((block) => {
          const blockLog = session.blocks.find((b) => b.blockId === block.id);
          if (!blockLog) return null;
          return (
            <BlockCard
              key={block.id}
              block={block}
              blockLog={blockLog}
              sessionId={session.id}
              restSeconds={restForBlock(blockLog)}
              sessions={sessions}
              progression={progression}
              unit={session.unit}
              metronome={settings.metronome}
              onPatchSet={(exerciseId, i, patch) => patchSet(block.id, exerciseId, i, patch)}
              onToggleSet={(exerciseId, i) => toggleSet(block.id, exerciseId, i)}
            />
          );
        })}
      </main>

      <RestTimerSheet />

      <SessionSummarySheet
        open={finishOpen}
        session={session}
        elapsedMin={elapsedMin}
        onClose={() => setFinishOpen(false)}
        onSave={handleFinish}
      />

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => {
          abandonSession(session.id);
          navigate('/', { replace: true });
        }}
        title="Discard this workout?"
        body="Logged sets are kept in history as an abandoned session, but the rotation will not advance. You can also cancel and keep going."
        confirmLabel="Discard"
        danger
      />
    </div>
  );
}
