import { useEffect, useState } from 'react';
import { Download, FolderDown, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useBackupStore } from '../../store/useBackupStore';
import { buildExport, downloadJson } from '../../lib/export';
import { daysBetween, isCalendarDate, todayLocal } from '../../lib/date';
import { useInstallStore } from '../../pwa/install';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';

export const REMIND_AFTER_DAYS = 3;

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

function backupStale(lastBackupAt: string | undefined, today: string): boolean {
  if (!lastBackupAt) return true;
  const d = new Date(lastBackupAt);
  if (Number.isNaN(d.getTime())) return true;
  return daysBetween(todayLocal(d), today) >= REMIND_AFTER_DAYS;
}

export function BackupReminder() {
  const safeMode = useAppStore((s) => s.safeMode);
  const lastBackupAt = useAppStore((s) => s.meta.lastBackupAt);
  const dismissedOn = useAppStore((s) => s.meta.backupReminderDismissedOn);
  const dismiss = useAppStore((s) => s.dismissBackupReminder);
  const installed = useInstallStore((s) => s.installed);
  const status = useBackupStore((s) => s.status);
  const fileName = useBackupStore((s) => s.fileName);
  const error = useBackupStore((s) => s.error);
  const busy = useBackupStore((s) => s.busy);
  const enable = useBackupStore((s) => s.enable);
  const reconnect = useBackupStore((s) => s.reconnect);
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

  if (safeMode) return null;
  if (installed && status === 'on') return null;
  // An unreadable dismissal date must not suppress the reminder.
  const dismissedRecently =
    dismissedOn != null &&
    isCalendarDate(dismissedOn) &&
    daysBetween(dismissedOn, today) < REMIND_AFTER_DAYS;
  if (dismissedRecently || !backupStale(lastBackupAt, today)) return null;

  const title =
    installed && status === 'needs-permission'
      ? 'Automatic backup is paused'
      : installed && status === 'error'
        ? 'Automatic backup needs attention'
        : 'Keep a backup outside this app';
  const body =
    installed && status === 'needs-permission'
      ? `Write access to ${fileName ?? 'your backup file'} expired. Reconnect once; if the browser offers "Allow on every visit", choose it so it does not expire again.`
      : installed && status === 'error'
        ? `${error ?? 'The last automatic backup failed.'} Fix it in Settings → Data, or export a copy now.`
        : installed && status === 'off'
          ? 'Turn on automatic backup to overwrite one file daily while the app is open, or save a JSON copy now. Restore anytime in Settings → Import.'
          : 'Save a JSON copy to Files or Downloads. If the app is removed, restore it in Settings → Import.';

  return (
    <section aria-label="Backup reminder" className="mb-6 rounded-md border border-border bg-surface p-4">
      <p className="text-sm font-medium text-text">{title}</p>
      <p className="mt-1 text-body-sm text-text-muted">{body}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {installed && status === 'off' && (
          <Button variant="primary" size="sm" onClick={() => void enable()} disabled={busy}>
            <FolderDown size={14} strokeWidth={1.5} />
            Enable auto-backup
          </Button>
        )}
        {installed && status === 'needs-permission' && (
          <Button variant="primary" size="sm" onClick={() => void reconnect()} disabled={busy}>
            <RefreshCw size={14} strokeWidth={1.5} />
            Reconnect
          </Button>
        )}
        <BackupExportButton />
        <Button variant="ghost" size="sm" onClick={dismiss}>
          Remind me in 3 days
        </Button>
      </div>
    </section>
  );
}