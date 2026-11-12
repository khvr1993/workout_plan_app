import { Download, FolderDown, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useBackupStore, type BackupStatus } from '../../store/useBackupStore';
import { formatShort, formatTime } from '../../lib/date';
import { useInstallStore } from '../../pwa/install';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/cn';

const STATUS_LABEL: Record<BackupStatus, string> = {
  on: 'On',
  off: 'Off',
  'needs-permission': 'Paused',
  error: 'Error',
  unsupported: 'Not supported',
};

export function AutoBackupSettings() {
  const installed = useInstallStore((s) => s.installed);
  const status = useBackupStore((s) => s.status);
  const fileName = useBackupStore((s) => s.fileName);
  const error = useBackupStore((s) => s.error);
  const busy = useBackupStore((s) => s.busy);
  const enable = useBackupStore((s) => s.enable);
  const reconnect = useBackupStore((s) => s.reconnect);
  const disable = useBackupStore((s) => s.disable);
  const backupNow = useBackupStore((s) => s.backupNow);
  const lastBackupAt = useAppStore((s) => s.meta.lastBackupAt);

  // File access is only worth offering in the installed app: browser tabs
  // cannot keep the write permission between visits.
  if (!installed) return null;

  const hint =
    status === 'unsupported'
      ? 'This browser cannot overwrite a file automatically. Use Export below.'
      : status === 'off'
        ? 'Pick one file. While the app is open, it is overwritten every day and after your changes.'
        : status === 'needs-permission'
          ? `Write access to ${fileName ?? 'the backup file'} expired. Reconnect once; if the browser offers "Allow on every visit", choose it.`
          : status === 'error'
            ? (error ?? 'The last automatic backup failed.')
            : busy
              ? `Backing up to ${fileName ?? 'the backup file'}…`
              : `${fileName ?? 'Backup file'} · ${
                  lastBackupAt
                    ? `Last backup ${formatShort(lastBackupAt)}, ${formatTime(lastBackupAt)}`
                    : 'first backup pending'
                }`;

  return (
    <Card className="!py-1">
      <div className="py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm text-text">
              Automatic backup
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium',
                  status === 'on'
                    ? 'text-accent'
                    : status === 'error' || status === 'needs-permission'
                      ? 'text-danger'
                      : 'text-text-muted',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    status === 'on'
                      ? 'bg-accent'
                      : status === 'error' || status === 'needs-permission'
                        ? 'bg-danger'
                        : 'bg-text-muted',
                  )}
                />
                {STATUS_LABEL[status]}
              </span>
            </p>
            <p className="mt-0.5 text-body-sm text-text-muted">{hint}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {status === 'off' && (
              <Button variant="primary" size="sm" onClick={() => void enable()} disabled={busy}>
                <FolderDown size={14} strokeWidth={1.5} />
                Enable
              </Button>
            )}
            {status === 'needs-permission' && (
              <Button variant="primary" size="sm" onClick={() => void reconnect()} disabled={busy}>
                <RefreshCw size={14} strokeWidth={1.5} />
                Reconnect
              </Button>
            )}
            {status === 'error' && (
              <Button variant="primary" size="sm" onClick={() => void enable()} disabled={busy}>
                <FolderDown size={14} strokeWidth={1.5} />
                Choose file again
              </Button>
            )}
          </div>
        </div>
        {status === 'on' && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => void backupNow()} disabled={busy}>
              <Download size={14} strokeWidth={1.5} />
              Back up now
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void enable()} disabled={busy}>
              Change file
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void disable()} disabled={busy}>
              Turn off
            </Button>
          </div>
        )}
        {(status === 'needs-permission' || status === 'error') && (
          <div className="mt-3">
            <Button variant="ghost" size="sm" onClick={() => void disable()} disabled={busy}>
              Turn off
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}