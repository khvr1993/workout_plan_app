import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { buildExport, downloadJson } from '../../lib/export';
import { todayLocal } from '../../lib/date';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';

export function BackupExportButton({ label = 'Export backup' }: { label?: string }) {
  const handleExport = () => {
    const state = useAppStore.getState();
    const exportedAt = new Date().toISOString();
    try {
      const backup = buildExport({
        program: state.program,
        sessions: state.sessions,
        settings: state.settings,
        meta: { ...state.meta, lastBackupAt: exportedAt },
        progression: state.progression,
      });
      downloadJson(`workout-export-${todayLocal(new Date(exportedAt))}.json`, backup);
    } catch {
      toast('Could not start the export. Please try again.', 'error');
      return;
    }
    state.markBackup(exportedAt);
    toast('Export requested. Keep the JSON file in Files or Downloads; saving is not confirmed.');
  };

  return (
    <Button variant="secondary" size="sm" onClick={handleExport}>
      <Download size={14} strokeWidth={1.5} />
      {label}
    </Button>
  );
}

export function BackupReminder() {
  const safeMode = useAppStore((s) => s.safeMode);
  const lastBackupAt = useAppStore((s) => s.meta.lastBackupAt);
  const dismissedOn = useAppStore((s) => s.meta.backupReminderDismissedOn);
  const dismiss = useAppStore((s) => s.dismissBackupReminder);
  const [today, setToday] = useState(() => todayLocal());

  useEffect(() => {
    let timer: number;
    const refreshDay = () => {
      window.clearTimeout(timer);
      const now = new Date();
      setToday(todayLocal(now));
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      timer = window.setTimeout(refreshDay, midnight.getTime() - now.getTime());
    };
    refreshDay();
    window.addEventListener('focus', refreshDay);
    document.addEventListener('visibilitychange', refreshDay);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refreshDay);
      document.removeEventListener('visibilitychange', refreshDay);
    };
  }, []);

  const lastBackup = lastBackupAt ? new Date(lastBackupAt) : null;
  const exportedToday = lastBackup && !Number.isNaN(lastBackup.getTime()) && todayLocal(lastBackup) === today;
  if (safeMode || exportedToday || dismissedOn === today) return null;

  return (
    <section aria-label="Daily backup" className="mb-6 rounded-md border border-border bg-surface p-4">
      <p className="text-sm font-medium text-text">Keep a backup outside this app</p>
      <p className="mt-1 text-body-sm text-text-muted">
        Save a JSON copy to Files or Downloads. If the app is removed, restore it in Settings → Import.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <BackupExportButton />
        <Button variant="ghost" size="sm" onClick={dismiss}>
          Remind me tomorrow
        </Button>
      </div>
    </section>
  );
}
