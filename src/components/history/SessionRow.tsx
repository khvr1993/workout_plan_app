import { Link } from 'react-router-dom';
import { ChevronRight, Footprints } from 'lucide-react';
import type { Session } from '../../data/types';
import { formatShort, formatDuration } from '../../lib/date';
import { formatVolume } from '../../lib/units';
import { sessionVolume } from '../../lib/volume';
import { Pill } from '../ui/Pill';
import { useUnit } from '../../store/selectors';

export function SessionRow({ session }: { session: Session }) {
  const unit = useUnit();
  const isRecovery = session.type === 'recovery';
  return (
    <Link
      to={`/history/${session.id}`}
      className="flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 hover:border-border-strong transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text">
            {isRecovery ? 'Recovery walk' : (session.dayLabel ?? 'Workout')}
          </span>
          {isRecovery && <Footprints size={13} strokeWidth={1.5} className="text-text-muted" />}
          {session.status === 'abandoned' && <Pill>Abandoned</Pill>}
          {session.status === 'in-progress' && <Pill tone="accent">In progress</Pill>}
        </div>
        <p className="text-body-sm text-text-muted tnum mt-0.5">
          {formatShort(session.date)}
          {session.durationMin != null && ` · ${formatDuration(session.durationMin)}`}
          {!isRecovery && sessionVolume(session) > 0 && ` · ${formatVolume(sessionVolume(session), unit)}`}
        </p>
      </div>
      <ChevronRight size={16} strokeWidth={1.5} className="text-text-muted shrink-0" />
    </Link>
  );
}