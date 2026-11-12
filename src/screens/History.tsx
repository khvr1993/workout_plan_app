import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Footprints } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAppStore } from '../store/useAppStore';
import { PageHeader, Section } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { MonthCalendar } from '../components/history/MonthCalendar';
import { SessionRow } from '../components/history/SessionRow';
import { Sheet } from '../components/ui/Sheet';
import { toast } from '../components/ui/Toast';
import { todayLocal } from '../lib/date';

export default function History() {
  const sessions = useAppStore((s) => s.sessions);
  const weekStartsOn = useAppStore((s) => s.settings.weekStartsOn);
  const logRecovery = useAppStore((s) => s.logRecovery);
  const safeMode = useAppStore((s) => s.safeMode);
  const navigate = useNavigate();
  const [walkOpen, setWalkOpen] = useState(false);
  const [walkDate, setWalkDate] = useState(todayLocal());
  const [walkNotes, setWalkNotes] = useState('');

  const visible = useMemo(
    () =>
      [...sessions]
        .filter((s) => s.status !== 'in-progress')
        .sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt)),
    [sessions],
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof visible>();
    for (const s of visible) {
      const key = format(parseISO(s.date), 'MMMM yyyy');
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [visible]);

  return (
    <div>
      <PageHeader
        title="History"
        subtitle={`${visible.filter((s) => s.status === 'completed').length} completed sessions`}
        actions={
          !safeMode && (
            <Button variant="secondary" size="sm" onClick={() => setWalkOpen(true)}>
              <Footprints size={14} strokeWidth={1.5} />
              Log walk
            </Button>
          )
        }
      />

      <Card>
        <MonthCalendar
          sessions={sessions}
          weekStartsOn={weekStartsOn}
          onSelectDay={(_date, daySessions) => {
            const target = daySessions.find((s) => s.status === 'completed') ?? daySessions[0];
            if (target) navigate(`/history/${target.id}`);
          }}
        />
      </Card>

      {groups.length === 0 ? (
        <Section>
          <Card>
            <EmptyState
              title="No sessions yet"
              body="Start Day 1 to begin your history. Every logged round shows up here."
            />
          </Card>
        </Section>
      ) : (
        groups.map(([month, list]) => (
          <Section key={month} title={month}>
            <div className="flex flex-col gap-2">
              {list.map((s) => (
                <SessionRow key={s.id} session={s} />
              ))}
            </div>
          </Section>
        ))
      )}

      <Sheet open={walkOpen} onClose={() => setWalkOpen(false)} title="Log recovery walk">
        <p className="text-body-sm text-text-secondary mb-4">
          30–40 min at Zone 2 — conversational pace. Recovery never advances the rotation.
        </p>
        <label className="block mb-4">
          <span className="text-label text-text-muted">Date</span>
          <input
            type="date"
            value={walkDate}
            max={todayLocal()}
            onChange={(e) => setWalkDate(e.target.value)}
            className="mt-2 h-11 w-full rounded-sm border border-border bg-surface-2 px-3 text-sm text-text tnum"
          />
        </label>
        <label className="block mb-5">
          <span className="text-label text-text-muted">Notes (optional)</span>
          <input
            value={walkNotes}
            onChange={(e) => setWalkNotes(e.target.value)}
            placeholder="Route, pace, how it felt"
            className="mt-2 h-11 w-full rounded-sm border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-text-muted"
          />
        </label>
        <Button
          variant="primary"
          className="w-full"
          onClick={() => {
            logRecovery(walkDate, walkNotes.trim() || undefined);
            setWalkOpen(false);
            setWalkNotes('');
            toast('Recovery walk logged', 'success');
          }}
        >
          Save walk
        </Button>
      </Sheet>
    </div>
  );
}