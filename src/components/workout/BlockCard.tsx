import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import type { Block, BlockLog, Exercise, ProgressionState, Session, SetEntry, Unit } from '../../data/types';
import { Card } from '../ui/Card';
import { Pill } from '../ui/Pill';
import { IconButton } from '../ui/IconButton';
import { Sheet } from '../ui/Sheet';
import { RoundRow } from './RoundRow';
import { LastPerformanceLine } from './LastPerformanceLine';
import { TempoCue } from './TempoCue';
import { ProgressionBanner } from './ProgressionBanner';
import { ExerciseInfoContent, repRangeLabel } from './ExerciseInfo';
import { lastPerformance, type ExercisePerformance } from '../../lib/stats';
import { cn } from '../../lib/cn';

export interface BlockCardProps {
  block: Block;
  blockLog: BlockLog;
  /** The session being logged — never treated as "last time". */
  sessionId: string;
  /** Effective rest after any rest-compression progression. */
  restSeconds: number;
  sessions: Session[];
  progression: Record<string, ProgressionState>;
  unit: Unit;
  metronome: boolean;
  onPatchSet: (exerciseId: string, setIndex: number, patch: Partial<SetEntry>) => void;
  onToggleSet: (exerciseId: string, setIndex: number) => void;
}

export function BlockCard({
  block,
  blockLog,
  sessionId,
  restSeconds,
  sessions,
  progression,
  unit,
  metronome,
  onPatchSet,
  onToggleSet,
}: BlockCardProps) {
  const [infoEx, setInfoEx] = useState<Exercise | null>(null);

  const lastByExercise = useMemo(() => {
    const map: Record<string, ExercisePerformance | null> = {};
    for (const ex of block.exercises) {
      map[ex.id] = lastPerformance(sessions, ex.id, sessionId);
    }
    return map;
  }, [block.exercises, sessions, sessionId]);

  return (
    <Card>
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <h2 className="text-h3 text-text">{block.label}</h2>
        {block.superset && <Pill tone="accent">Superset</Pill>}
        <Pill>Rest {restSeconds}s</Pill>
      </div>

      {block.exercises.map((ex, exIndex) => {
        const exLog = blockLog.exercises.find((e) => e.exerciseId === ex.id);
        if (!exLog) return null;
        const prog = progression[ex.id];
        const last = lastByExercise[ex.id] ?? null;
        const slotLabel = block.superset
          ? `${block.label.replace('Block ', '')}${exIndex === 0 ? 'A' : 'B'}`
          : null;
        return (
          <div
            key={ex.id}
            className={cn('pt-4 mt-4', exIndex > 0 && 'border-t border-border')}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {slotLabel && <span className="text-label text-text-muted tnum">{slotLabel}</span>}
                  <h3 className="text-h3 text-text">{ex.name}</h3>
                  <span className="text-body-sm text-text-muted tnum">{repRangeLabel(ex)}</span>
                </div>
                <div className="mt-1 flex flex-col gap-1">
                  <LastPerformanceLine last={last} unit={unit} />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <TempoCue exercise={ex} prog={prog} metronomeEnabled={metronome} />
                    {prog?.paused && <Pill>1s pause</Pill>}
                  </div>
                </div>
              </div>
              <IconButton label={`About ${ex.name}`} size="sm" onClick={() => setInfoEx(ex)}>
                <Info size={16} strokeWidth={1.5} />
              </IconButton>
            </div>

            <ProgressionBanner exercise={ex} prog={prog} lastSets={last?.raw ?? null} />

            <div className="mt-2 flex flex-col gap-1">
              {exLog.sets.map((entry, i) => (
                <RoundRow
                  key={i}
                  exercise={ex}
                  entry={entry}
                  roundIndex={i}
                  unit={unit}
                  targetReps={prog?.targetReps ?? ex.reps.min}
                  onPatch={(patch) => onPatchSet(ex.id, i, patch)}
                  onToggleComplete={() => onToggleSet(ex.id, i)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <Sheet open={infoEx != null} onClose={() => setInfoEx(null)} title={infoEx?.name ?? ''}>
        {infoEx && <ExerciseInfoContent exercise={infoEx} unit={unit} />}
      </Sheet>
    </Card>
  );
}
