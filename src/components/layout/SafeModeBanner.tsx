import { AlertTriangle } from 'lucide-react';
import { useAppStore, storage } from '../../store/useAppStore';
import { STORAGE_KEYS } from '../../data/storage';
import { buildRecoveryExport, downloadJson } from '../../lib/export';

/**
 * Safe-mode recovery export. Unlike a bare dump of stored envelopes, this is a
 * real export file the app's own Import screen accepts; the untouched text of
 * every key (including ones that fail validation) rides along under `raw`.
 */
export function SafeModeBanner() {
  const markBackup = useAppStore((s) => s.markBackup);
  const storageIssue = useAppStore((s) => s.storageIssue);

  const exportRecovery = () => {
    const state = useAppStore.getState();
    const raw: Record<string, string | null> = {};
    for (const key of Object.values(STORAGE_KEYS)) {
      raw[key] = storage.readRaw ? storage.readRaw(key) : null;
    }
    downloadJson(
      'workout-recovery-backup.json',
      buildRecoveryExport(
        {
          program: state.program,
          sessions: state.sessions,
          settings: state.settings,
          meta: state.meta,
          progression: state.progression,
        },
        raw,
      ),
    );
    markBackup(new Date().toISOString());
  };

  return (
    <div role="alert" className="border-b border-border bg-surface px-5 py-3">
      <div className="mx-auto max-w-270 flex flex-wrap items-center gap-3">
        <AlertTriangle size={16} strokeWidth={1.5} className="text-danger shrink-0" />
        <p className="text-[13px] text-text-secondary flex-1 min-w-50">
          Stored data could not be read, so the app is read-only to protect it.
          {storageIssue && <span className="text-text-muted"> Unreadable: {storageIssue}.</span>}{' '}
          Export the recovery backup (it keeps the original text), then clear data in Settings to
          start fresh.
        </p>
        <button
          type="button"
          onClick={exportRecovery}
          className="h-9 rounded-sm border border-border bg-surface-2 px-3 text-[13px] font-medium text-text hover:border-border-strong cursor-pointer"
        >
          Export recovery backup
        </button>
      </div>
    </div>
  );
}

/** Both storage banners, shared by the app shell and the workout screen. */
export function StorageBanners() {
  const safeMode = useAppStore((s) => s.safeMode);
  const storageNotice = useAppStore((s) => s.storageNotice);
  const storageError = useAppStore((s) => s.storageError);
  return (
    <>
      {safeMode && <SafeModeBanner />}
      {storageNotice && (
        <div
          role="status"
          className="border-b border-border bg-surface px-5 py-2 text-[13px] text-text-secondary"
        >
          {storageNotice}
        </div>
      )}
      {storageError && (
        <div role="alert" className="border-b border-border bg-surface px-5 py-2 text-[13px] text-danger">
          {storageError}
        </div>
      )}
    </>
  );
}
