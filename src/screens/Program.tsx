import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Clock3, Layers, RotateCcw } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageHeader } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Pill } from '../components/ui/Pill';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useState } from 'react';
import { toast } from '../components/ui/Toast';

export function Program() {
  const program = useAppStore((s) => s.program);
  const resetProgram = useAppStore((s) => s.resetProgram);
  const safeMode = useAppStore((s) => s.safeMode);
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div>
      <PageHeader
        title="Program"
        subtitle={program.name}
        actions={
          !safeMode && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={14} strokeWidth={1.5} />
              Reset
            </Button>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {program.days.map((day) => {
          const exerciseCount = day.blocks.reduce((n, b) => n + b.exercises.length, 0);
          return (
            <Card key={day.id} className="flex flex-col gap-4">
              <div>
                <p className="text-label text-text-muted">{day.label}</p>
                <h2 className="text-h2 text-text mt-1">{day.title}</h2>
                <p className="text-body-sm text-text-secondary mt-0.5">{day.emphasis}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {day.focus.map((f) => (
                  <Pill key={f}>{f}</Pill>
                ))}
              </div>
              <div className="flex items-center gap-4 text-body-sm text-text-muted tnum">
                <span className="inline-flex items-center gap-1.5">
                  <Layers size={14} strokeWidth={1.5} />
                  {day.blocks.length} blocks
                </span>
                <span className="tnum">{exerciseCount} exercises</span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 size={14} strokeWidth={1.5} />~{day.estimatedMinutes} min
                </span>
              </div>
              <div className="mt-auto flex gap-2 pt-1">
                <Button
                  variant="primary"
                  className="flex-1"
                  disabled={safeMode}
                  onClick={() => navigate(`/session/${day.id}`)}
                >
                  Start
                </Button>
                <Link to={`/program/${day.id}`} className="flex-1">
                  <Button variant="secondary" className="w-full">
                    View plan
                    <ChevronRight size={15} strokeWidth={1.5} />
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      <p className="mt-6 text-body-sm text-text-muted max-w-160">
        Trained in flexible rotation — 1 → 2 → 3 → 1, whenever you train. Rest at least 48 hours
        between lifting days. Saturday is an optional 30–40 min Zone 2 walk.
      </p>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetProgram();
          toast('Program reset to the original plan', 'success');
        }}
        title="Reset program?"
        body="All day edits (sets, reps, rest, added exercises) return to the original 3-day plan. Logged sessions are never changed."
        confirmLabel="Reset program"
        danger
      />
    </div>
  );
}