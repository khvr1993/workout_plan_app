import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
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
import { toast } from '../components/ui/Toast';
import { vibrate } from '../lib/haptics';
import { formatClock } from '../lib/date';

export function Session() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const day = useAppStore((s) => s.program.days.find((d) => d.id === dayId));
  const session = useAppStore((s) =>
    s.sessions.find((x) => x.status === 'in-progress' && x.dayId === dayId),
  );
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
    if (day && !session && !finishing.current && !safeMode) {
      startSession(day.id);
    }
  }, [day, session, startSession, safeMode]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  if (!day) return <Navigate to="/program" replace />;
  if (!session) {
    return (
      <div className="mx-auto max-w-270 px-5 lg:px-12 py-10 flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const elapsedSec = Math.max(0, (now - new Date(session.startedAt).getTime()) / 1000);
  const elapsedMin = Math.max(1, Math.round(elapsedSec / 60));

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

    // A round is done when every exercise in the block has this set completed.
    const roundDone = blockLog.exercises.every((e) => {
      const s = e.exerciseId === exerciseId ? { ...entry, completed: true } : e.sets[setIndex];
      return s?.completed && !s?.skipped;
    });
    const isLastRound = setIndex >= blockLog.exercises[0].sets.length - 1;
    if (roundDone && !isLastRound && settings.autoStartRestTimer) {
      startRest(blockLog.restSeconds);
    }
  };

  const handleFinish = (summary: { rpe?: number; notes?: string }) => {
    finishing.current = true;
    finishSession(session.id, summary);
    setFinishOpen(false);
    toast('Workout saved', 'success');
    navigate(`/history/${session.id}`, { replace: true });
  };

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-surface safe-top">
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