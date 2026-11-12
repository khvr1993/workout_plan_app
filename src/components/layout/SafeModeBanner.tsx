import { AlertTriangle } from 'lucide-react';
import { useAppStore, storage } from '../../store/useAppStore';
import { STORAGE_KEYS } from '../../data/storage';
import { downloadJson } from '../../lib/export';

export function SafeModeBanner() {
  const markBackup = useAppStore((s) => s.markBackup);
  const exportRaw = () => {
    const raw: Record<string, unknown> = {};
    for (const key of Object.values(STORAGE_KEYS)) {
      raw[key] = storage.get(key);
    }
    downloadJson('workout-raw-backup.json', raw);
    markBackup(new Date().toISOString());
  };
  return (
    <div role="alert" className="border-b border-border bg-surface px-5 py-3">
      <div className="mx-auto max-w-270 flex flex-wrap items-center gap-3">
        <AlertTriangle size={16} strokeWidth={1.5} className="text-danger shrink-0" />
        <p className="text-[13px] text-text-secondary flex-1 min-w-50">
          Stored data was written by a newer version or is corrupt. The app is read-only to protect
          it. Export a raw backup, then clear data in Settings to start fresh.
        </p>
        <button
          type="button"
          onClick={exportRaw}
          className="h-9 rounded-sm border border-border bg-surface-2 px-3 text-[13px] font-medium text-text hover:border-border-strong cursor-pointer"
        >
          Export raw backup
        </button>
      </div>
    </div>
  );
}