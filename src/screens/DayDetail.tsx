import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Info,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { Block, Exercise, ProgramDay } from '../data/types';
import { program as seedProgram, allExercises } from '../data/program';
import { PageHeader } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Pill } from '../components/ui/Pill';
import { Stepper } from '../components/ui/Stepper';
import { Sheet } from '../components/ui/Sheet';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { ExerciseInfoContent, repRangeLabel } from '../components/workout/ExerciseInfo';
import { ExerciseDemo } from '../components/workout/ExerciseDemo';
import { ExerciseForm, loadTypeLabel } from '../components/workout/ExerciseForm';
import { DEMOS } from '../data/demos';
import { cn } from '../lib/cn';
import { toast } from '../components/ui/Toast';

export function DayDetail() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const program = useAppStore((s) => s.program);
  const setProgram = useAppStore((s) => s.setProgram);
  const resetProgram = useAppStore((s) => s.resetProgram);
  const unit = useAppStore((s) => s.settings.unit);
  const safeMode = useAppStore((s) => s.safeMode);
  const inProgress = useAppStore(
    (s) => s.sessions.find((x) => x.status === 'in-progress' && Boolean(x.dayId)) ?? null,
  );

  const [editing, setEditing] = useState(false);
  const [infoEx, setInfoEx] = useState<Exercise | null>(null);
  const [addTarget, setAddTarget] = useState<Block | null>(null);
  const [newBlockOpen, setNewBlockOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ block: Block; exercise: Exercise } | null>(null);

  const day = program.days.find((d) => d.id === dayId);

  const updateDay = (next: ProgramDay) => {
    setProgram({
      ...program,
      days: program.days.map((d) => (d.id === next.id ? next : d)),
    });
  };

  if (!day) {
    return (
      <EmptyState
        title="Day not found"
        body="This day doesn't exist in the current program."
        action={
          <Link to="/program">
            <Button variant="secondary">Back to program</Button>
          </Link>
        }
      />
    );
  }

  const exerciseCount = day.blocks.reduce((n, b) => n + b.exercises.length, 0);
  // Only one workout may be in progress; send the user back to it instead of
  // silently starting a second one.
  const resumeDayId = inProgress && inProgress.dayId && inProgress.dayId !== day.id ? inProgress.dayId : null;

  const patchBlock = (blockId: string, patch: Partial<Block>) => {
    updateDay({
      ...day,
      blocks: day.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
    });
  };

  const patchExercise = (blockId: string, exerciseId: string, patch: Partial<Exercise>) => {
    updateDay({
      ...day,
      blocks: day.blocks.map((b) =>
        b.id !== blockId
          ? b
          : {
              ...b,
              exercises: b.exercises.map((e) => (e.id === exerciseId ? { ...e, ...patch } : e)),
            },
      ),
    });
  };

  const moveExercise = (blockId: string, index: number, dir: -1 | 1) => {
    const block = day.blocks.find((b) => b.id === blockId);
    if (!block) return;
    const next = [...block.exercises];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    patchBlock(blockId, { exercises: next });
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= day.blocks.length) return;
    const next = [...day.blocks];
    [next[index], next[j]] = [next[j], next[index]];
    updateDay({ ...day, blocks: next });
  };

  const removeExercise = (blockId: string, exerciseId: string) => {
    const block = day.blocks.find((b) => b.id === blockId);
    if (!block) return;
    const remaining = block.exercises.filter((e) => e.id !== exerciseId);
    if (remaining.length === 0) {
      updateDay({ ...day, blocks: day.blocks.filter((b) => b.id !== blockId) });
    } else {
      patchBlock(blockId, { exercises: remaining, superset: remaining.length > 1 });
    }
  };

  const addExercise = (blockId: string, exercise: Exercise) => {
    const block = day.blocks.find((b) => b.id === blockId);
    if (!block || block.exercises.length >= 2) return;
    const exercises = [...block.exercises, exercise];
    patchBlock(blockId, { exercises, superset: exercises.length > 1 });
    setAddTarget(null);
  };

  const nextBlockNumber =
    day.blocks.reduce((max, b) => {
      const n = parseInt(b.label.replace(/\D+/g, ''), 10);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0) + 1;

  const createBlock = (exercise: Exercise) => {
    const block: Block = {
      id: `block-${Date.now().toString(36)}`,
      label: `Block ${nextBlockNumber}`,
      superset: false,
      restSeconds: 60,
      exercises: [exercise],
    };
    updateDay({ ...day, blocks: [...day.blocks, block] });
    setNewBlockOpen(false);
    toast(`${block.label} created with ${exercise.name}`, 'success');
  };

  return (
    <div>
      <div className="mb-4">
        <Link
          to="/program"
          className="inline-flex items-center gap-1.5 text-body-sm text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Program
        </Link>
      </div>
      <PageHeader
        title={`${day.label} · ${day.title}`}
        subtitle={`${day.emphasis} · ${day.blocks.length} blocks · ${exerciseCount} exercises · ~${day.estimatedMinutes} min`}
        actions={
          <>
            {!safeMode && (
              <Button
                variant={editing ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setEditing((v) => !v)}
              >
                {editing ? <X size={14} strokeWidth={1.5} /> : <Pencil size={14} strokeWidth={1.5} />}
                {editing ? 'Done' : 'Edit'}
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              disabled={safeMode}
              onClick={() => navigate(`/session/${resumeDayId ?? day.id}`)}
            >
              {resumeDayId ? 'Resume workout' : 'Start'}
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-4">
        {day.blocks.map((block, blockIndex) => (
          <Card key={block.id}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-h3 text-text">{block.label}</h2>
                {block.superset && <Pill tone="accent">Superset</Pill>}
                <Pill>Rest {block.restSeconds}s</Pill>
              </div>
              {editing && (
                <div className="flex items-center gap-1">
                  <IconButton
                    label="Move block up"
                    size="sm"
                    disabled={blockIndex === 0}
                    onClick={() => moveBlock(blockIndex, -1)}
                  >
                    <ArrowUp size={15} strokeWidth={1.5} />
                  </IconButton>
                  <IconButton
                    label="Move block down"
                    size="sm"
                    disabled={blockIndex === day.blocks.length - 1}
                    onClick={() => moveBlock(blockIndex, 1)}
                  >
                    <ArrowDown size={15} strokeWidth={1.5} />
                  </IconButton>
                </div>
              )}
            </div>

            {editing && (
              <div className="mb-4 flex items-center gap-3">
                <span className="text-body-sm text-text-muted">Rest</span>
                <Stepper
                  value={block.restSeconds}
                  min={0}
                  max={300}
                  ariaLabel={`Rest seconds for ${block.label}`}
                  onChange={(v) => patchBlock(block.id, { restSeconds: v })}
                />
                <span className="text-body-sm text-text-muted">seconds</span>
              </div>
            )}

            <div className="flex flex-col">
              {block.exercises.map((ex, exIndex) => (
                <div
                  key={ex.id}
                  className={cn(
                    'py-4 first:pt-0 last:pb-0',
                    exIndex > 0 && 'border-t border-border',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {block.superset && (
                          <span className="text-label text-text-muted tnum">
                            {block.label.replace('Block ', '')}
                            {exIndex === 0 ? 'A' : 'B'}
                          </span>
                        )}
                        <h3 className="text-h3 text-text">{ex.name}</h3>
                      </div>
                      <p className="text-body-sm text-text-secondary mt-0.5 tnum">
                        {repRangeLabel(ex)}
                        {ex.tempo ? ` · tempo ${ex.tempo}` : ''}
                      </p>
                      <p className="text-body-sm text-text-muted mt-0.5">{ex.equipment}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {editing ? (
                        <>
                          <IconButton
                            label={`Move ${ex.name} up`}
                            size="sm"
                            disabled={exIndex === 0}
                            onClick={() => moveExercise(block.id, exIndex, -1)}
                          >
                            <ArrowUp size={15} strokeWidth={1.5} />
                          </IconButton>
                          <IconButton
                            label={`Move ${ex.name} down`}
                            size="sm"
                            disabled={exIndex === block.exercises.length - 1}
                            onClick={() => moveExercise(block.id, exIndex, 1)}
                          >
                            <ArrowDown size={15} strokeWidth={1.5} />
                          </IconButton>
                          <IconButton
                            label={`Remove ${ex.name}`}
                            size="sm"
                            onClick={() => setRemoveTarget({ block, exercise: ex })}
                          >
                            <Trash2 size={15} strokeWidth={1.5} className="text-danger" />
                          </IconButton>
                        </>
                      ) : (
                        <IconButton label={`About ${ex.name}`} size="sm" onClick={() => setInfoEx(ex)}>
                          <Info size={16} strokeWidth={1.5} />
                        </IconButton>
                      )}
                    </div>
                  </div>

                  {editing && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
                      <label className="flex items-center gap-2 text-body-sm text-text-muted">
                        Sets
                        <Stepper
                          value={ex.sets}
                          min={1}
                          max={10}
                          ariaLabel={`Sets for ${ex.name}`}
                          onChange={(v) => patchExercise(block.id, ex.id, { sets: v })}
                        />
                      </label>
                      <label className="flex items-center gap-2 text-body-sm text-text-muted">
                        Reps min
                        <Stepper
                          value={ex.reps.min}
                          min={1}
                          max={ex.reps.max}
                          ariaLabel={`Minimum reps for ${ex.name}`}
                          onChange={(v) =>
                            patchExercise(block.id, ex.id, { reps: { ...ex.reps, min: v } })
                          }
                        />
                      </label>
                      <label className="flex items-center gap-2 text-body-sm text-text-muted">
                        max
                        <Stepper
                          value={ex.reps.max}
                          min={ex.reps.min}
                          max={50}
                          ariaLabel={`Maximum reps for ${ex.name}`}
                          onChange={(v) =>
                            patchExercise(block.id, ex.id, { reps: { ...ex.reps, max: v } })
                          }
                        />
                      </label>
                    </div>
                  )}

                  {!editing && <CueLine exercise={ex} />}
                </div>
              ))}
            </div>

            {editing && block.exercises.length < 2 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={() => setAddTarget(block)}
              >
                <Plus size={14} strokeWidth={1.5} />
                Add exercise
              </Button>
            )}
          </Card>
        ))}

        {editing && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setNewBlockOpen(true)}
          >
            <Plus size={14} strokeWidth={1.5} />
            New block
          </Button>
        )}
      </div>

      {!safeMode && (
        <div className="mt-8">
          <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
            <RotateCcw size={14} strokeWidth={1.5} />
            Reset to original program
          </Button>
        </div>
      )}

      <Sheet open={infoEx != null} onClose={() => setInfoEx(null)} title={infoEx?.name ?? ''}>
        {infoEx && <ExerciseInfoContent exercise={infoEx} unit={unit} />}
      </Sheet>

      <AddExerciseSheet
        block={addTarget}
        day={day}
        onClose={() => setAddTarget(null)}
        onAdd={addExercise}
      />

      <Sheet open={newBlockOpen} onClose={() => setNewBlockOpen(false)} title="New block">
        <p className="text-body-sm text-text-muted mb-4">
          A block starts with one exercise and 60s rest. Add a second exercise afterwards to make it
          a superset.
        </p>
        <ExerciseForm
          submitLabel="Create block"
          onSubmit={createBlock}
          onCancel={() => setNewBlockOpen(false)}
        />
      </Sheet>

      <ConfirmDialog
        open={removeTarget != null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) removeExercise(removeTarget.block.id, removeTarget.exercise.id);
        }}
        title={`Remove ${removeTarget?.exercise.name ?? 'exercise'}?`}
        body="It is removed from this day only. Past sessions keep their records."
        confirmLabel="Remove"
        danger
      />

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetProgram();
          setEditing(false);
          toast('Program reset to the original plan', 'success');
        }}
        title="Reset program?"
        body="All day edits return to the original 3-day plan. Logged sessions are never changed."
        confirmLabel="Reset program"
        danger
      />
    </div>
  );
}

function CueLine({ exercise }: { exercise: Exercise }) {
  const [open, setOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const hasDemo = DEMOS[exercise.id] != null;
  return (
    <div className="mt-2">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 text-body-sm text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        >
          <ChevronDown
            size={13}
            strokeWidth={1.5}
            className={cn('transition-transform duration-150', open && 'rotate-180')}
          />
          Coach cue
        </button>
        {hasDemo && (
          <button
            type="button"
            onClick={() => setDemoOpen((v) => !v)}
            aria-expanded={demoOpen}
            className="inline-flex items-center gap-1 text-body-sm text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
          >
            <Play size={13} strokeWidth={1.5} />
            Form demo
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 rounded-sm border border-border bg-surface-2 p-3">
          <p className="text-body-sm text-text-secondary">{exercise.execution}</p>
          <p className="text-body-sm text-text mt-1.5">{exercise.cue}</p>
        </div>
      )}
      {demoOpen && hasDemo && (
        <div className="mt-3 max-w-sm">
          <ExerciseDemo exerciseId={exercise.id} name={exercise.name} />
        </div>
      )}
    </div>
  );
}

function AddExerciseSheet({
  block,
  day,
  onClose,
  onAdd,
}: {
  block: Block | null;
  day: ProgramDay;
  onClose: () => void;
  onAdd: (blockId: string, exercise: Exercise) => void;
}) {
  const [mode, setMode] = useState<'pick' | 'create'>('pick');
  useEffect(() => {
    setMode('pick');
  }, [block?.id]);

  const catalog = useMemo(() => {
    const inDay = new Set(day.blocks.flatMap((b) => b.exercises.map((e) => e.id)));
    return allExercises(seedProgram).filter((e) => !inDay.has(e.id));
  }, [day]);

  return (
    <Sheet
      open={block != null}
      onClose={onClose}
      title={mode === 'create' ? 'New exercise' : `Add to ${block?.label ?? ''}`}
    >
      {mode === 'pick' ? (
        <>
          <div className="flex flex-col gap-1 max-h-80 overflow-y-auto -mx-1 px-1">
            {catalog.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => block && onAdd(block.id, ex)}
                className="flex items-center justify-between gap-3 rounded-sm px-3 py-2.5 text-left hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm text-text truncate">{ex.name}</p>
                  <p className="text-body-sm text-text-muted tnum">
                    {repRangeLabel(ex)} · {loadTypeLabel(ex.loadType).toLowerCase()}
                  </p>
                </div>
                <Plus size={15} strokeWidth={1.5} className="text-text-muted shrink-0" />
              </button>
            ))}
            {catalog.length === 0 && (
              <p className="text-body-sm text-text-muted px-3 py-2">
                Every library exercise is already in this day.
              </p>
            )}
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <Button variant="secondary" className="w-full" onClick={() => setMode('create')}>
              <Plus size={15} strokeWidth={1.5} />
              Create custom exercise
            </Button>
            <p className="mt-2 text-body-sm text-text-muted">
              Full control over sets, reps, tempo, load, equipment and coaching notes.
            </p>
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setMode('pick')}
            className="inline-flex items-center gap-1.5 text-body-sm text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} strokeWidth={1.5} />
            Back to list
          </button>
          <div className="mt-4">
            <ExerciseForm
              onSubmit={(exercise) => {
                if (!block) return;
                onAdd(block.id, exercise);
                toast(`Added ${exercise.name} to ${block.label}`, 'success');
              }}
              onCancel={() => setMode('pick')}
            />
          </div>
        </>
      )}
    </Sheet>
  );
}