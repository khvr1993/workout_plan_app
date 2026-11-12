import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Footprints, Repeat, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageHeader } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Pill } from '../components/ui/Pill';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatTile } from '../components/workout/StatTile';
import { completedRounds, sessionVolume } from '../lib/volume';
import { formatDuration, formatFull } from '../lib/date';
import { formatStored, formatVolume } from '../lib/units';
import { toast } from '../components/ui/Toast';

export default function SessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const session = useAppStore((s) => s.sessions.find((x) => x.id === sessionId));
  const program = useAppStore((s) => s.program);
  const deleteSession = useAppStore((s) => s.deleteSession);
  const safeMode = useAppStore((s) => s.safeMode);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!session) {
    return (
      <EmptyState
        title="Session not found"
        action={
          <Link to="/history">
            <Button variant="secondary">Back to history</Button>
          </Link>
        }
      />
    );
  }

  const isRecovery = session.type === 'recovery';
  const dayExists = session.dayId != null && program.days.some((d) => d.id === session.dayId);
  const volume = sessionVolume(session);

  return (
    <div>
      <div className="mb-4">
        <Link
          to="/history"
          className="inline-flex items-center gap-1.5 text-body-sm text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          History
        </Link>
      </div>
      <PageHeader
        title={isRecovery ? 'Recovery walk' : (session.dayLabel ?? 'Workout')}
        subtitle={formatFull(session.date)}
        actions={
          <div className="flex items-center gap-2">
            {session.status === 'abandoned' && <Pill>Abandoned</Pill>}
            {session.status === 'in-progress' && <Pill tone="accent">In progress</Pill>}
            {!safeMode && (
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={14} strokeWidth={1.5} />
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatTile
          label="Duration"
          value={session.durationMin != null ? formatDuration(session.durationMin) : '—'}
        />
        {!isRecovery && <StatTile label="Volume" value={formatVolume(volume, session.unit)} />}
        {!isRecovery && <StatTile label="Rounds" value={String(completedRounds(session))} />}
        <StatTile label="RPE" value={session.rpe != null ? `${session.rpe}/10` : '—'} />
      </div>

      {session.notes && (
        <Card className="mt-4">
          <p className="text-label text-text-muted mb-1">Notes</p>
          <p className="text-body-sm text-text">{session.notes}</p>
        </Card>
      )}

      {isRecovery ? (
        <Card className="mt-4 flex items-center gap-3">
          <Footprints size={18} strokeWidth={1.5} className="text-text-muted" />
          <p className="text-body-sm text-text-secondary">
            Zone 2 walk — easy pace, nasal breathing if you can hold it.
          </p>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {session.blocks.map((block, bi) => (
            <Card key={block.blockId}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-h3 text-text">Block {bi + 1}</h2>
                {block.exercises.length > 1 && <Pill tone="accent">Superset</Pill>}
                <Pill>Rest {block.restSeconds}s</Pill>
              </div>
              <div className="flex flex-col gap-4">
                {block.exercises.map((ex) => (
                  <div key={ex.exerciseId}>
                    <h3 className="text-sm font-medium text-text mb-1.5">{ex.exerciseName}</h3>
                    <div className="flex flex-col gap-1">
                      {ex.sets.map((set, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 text-body-sm tnum"
                        >
                          <span className="text-label text-text-muted w-7">R{i + 1}</span>
                          {set.skipped ? (
                            <span className="text-text-muted">Skipped</span>
                          ) : set.completed ? (
                            <span className="text-text">
                              {formatStored(set.weight, session.unit)} × {set.reps ?? '—'}
                            </span>
                          ) : (
                            <span className="text-text-muted">Not logged</span>
                          )}
                          <span className="flex gap-1">
                            {set.tempo && set.completed && !set.skipped && (
                              <Pill>{set.tempo}</Pill>
                            )}
                            {set.paused && set.completed && !set.skipped && <Pill>pause</Pill>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isRecovery && dayExists && !safeMode && session.status !== 'in-progress' && (
        <div className="mt-6">
          <Button variant="primary" onClick={() => navigate(`/session/${session.dayId}`)}>
            <Repeat size={15} strokeWidth={1.5} />
            Repeat this workout
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteSession(session.id);
          toast('Session deleted');
          navigate('/history', { replace: true });
        }}
        title="Delete this session?"
        body="This permanently removes the session and its logged sets from history and statistics."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}