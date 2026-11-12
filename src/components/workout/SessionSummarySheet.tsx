import { useState } from 'react';
import type { Session } from '../../data/types';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { completedRounds, sessionVolume } from '../../lib/volume';
import { formatDuration } from '../../lib/date';
import { formatVolume } from '../../lib/units';
import { cn } from '../../lib/cn';
import { LIMITS } from '../../data/schema';

export interface SessionSummarySheetProps {
  open: boolean;
  session: Session;
  elapsedMin: number;
  onClose: () => void;
  onSave: (summary: { rpe?: number; notes?: string }) => void;
}

export function SessionSummarySheet({
  open,
  session,
  elapsedMin,
  onClose,
  onSave,
}: SessionSummarySheetProps) {
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const rounds = completedRounds(session);
  const volume = sessionVolume(session);

  return (
    <Sheet open={open} onClose={onClose} title="Finish workout">
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-sm border border-border bg-surface-2 p-3 text-center">
          <p className="text-h2 text-text tnum">{formatDuration(elapsedMin)}</p>
          <p className="text-label text-text-muted mt-0.5">Duration</p>
        </div>
        <div className="rounded-sm border border-border bg-surface-2 p-3 text-center">
          <p className="text-h2 text-text tnum">{rounds}</p>
          <p className="text-label text-text-muted mt-0.5">Rounds</p>
        </div>
        <div className="rounded-sm border border-border bg-surface-2 p-3 text-center">
          <p className="text-h2 text-text tnum">{formatVolume(volume, session.unit)}</p>
          <p className="text-label text-text-muted mt-0.5">Volume</p>
        </div>
      </div>

      <p className="text-label text-text-muted mb-2">How hard was it? (RPE)</p>
      <div className="grid grid-cols-10 gap-1 mb-5" role="group" aria-label="Rate of perceived exertion">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={rpe === n}
            onClick={() => setRpe(n)}
            className={cn(
              'h-10 rounded-sm border text-[13px] font-medium tnum transition-colors cursor-pointer',
              rpe === n
                ? 'bg-accent border-transparent text-accent-fg'
                : 'border-border bg-surface-2 text-text-secondary hover:border-border-strong',
            )}
          >
            {n}
          </button>
        ))}
      </div>

      <label className="block mb-5">
        <span className="text-label text-text-muted">Notes</span>
        <textarea
          value={notes}
          maxLength={LIMITS.notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Felt strong, left shoulder tight…"
          className="mt-2 w-full rounded-sm border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-muted resize-none"
        />
      </label>

      <Button
        variant="primary"
        className="w-full"
        onClick={() => onSave({ rpe: rpe ?? undefined, notes: notes.trim() || undefined })}
      >
        Save workout
      </Button>
    </Sheet>
  );
}