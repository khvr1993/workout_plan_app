import { create } from 'zustand';
import { useAppStore } from './useAppStore';
import { useInstallStore } from '../pwa/install';
import { buildExport, type ExportFile } from '../lib/export';
import { todayLocal } from '../lib/date';
import {
  clearBackupHandle,
  isAutoBackupSupported,
  loadBackupHandle,
  pickBackupFile,
  queryWritePermission,
  requestWritePermission,
  saveBackupHandle,
  writeBackupFile,
  type BackupFileHandle,
} from '../lib/autoBackup';
import { toast } from '../components/ui/Toast';

export type BackupStatus = 'unsupported' | 'off' | 'on' | 'needs-permission' | 'error';

export const BACKUP_DEBOUNCE_MS = 10_000;

interface BackupState {
  status: BackupStatus;
  fileName: string | null;
  error: string | null;
  busy: boolean;
  enable: () => Promise<void>;
  reconnect: () => Promise<void>;
  disable: () => Promise<void>;
  backupNow: () => Promise<void>;
}

export const useBackupStore = create<BackupState>((set, get) => ({
  status: isAutoBackupSupported() ? 'off' : 'unsupported',
  fileName: null,
  error: null,
  busy: false,

  enable: async () => {
    if (!isAutoBackupSupported()) return;
    try {
      const picked = await pickBackupFile();
      if (!picked) return;
      handle = picked;
      await saveBackupHandle(picked);
      set({ fileName: picked.name, status: 'on', error: null });
      await writeNow();
      if (get().status === 'on') {
        toast(`Automatic backup is on. ${picked.name} is overwritten daily.`, 'success');
      }
    } catch {
      set({ status: 'error', error: 'Could not set up the backup file.', busy: false });
      toast('Could not set up automatic backup.', 'error');
    }
  },

  reconnect: async () => {
    const h = handle ?? (await loadBackupHandle().catch(() => null));
    if (!h) return;
    handle = h;
    const permission = await requestWritePermission(h);
    if (permission === 'granted') {
      set({ fileName: h.name, status: 'on', error: null });
      await writeNow();
      if (get().status === 'on') toast('Automatic backup reconnected.', 'success');
    } else {
      set({ status: 'needs-permission' });
      toast('Write permission was not granted.', 'error');
    }
  },

  disable: async () => {
    window.clearTimeout(debounceTimer);
    handle = null;
    await clearBackupHandle().catch(() => undefined);
    set({
      status: isAutoBackupSupported() ? 'off' : 'unsupported',
      fileName: null,
      error: null,
      busy: false,
    });
    toast('Automatic backup turned off.');
  },

  backupNow: async () => {
    await writeNow();
    if (get().status === 'on') toast('Backup saved.', 'success');
  },
}));

let handle: BackupFileHandle | null = null;
let generation = 0;
let writing = false;
let pendingWrite = false;
let debounceTimer: number | undefined;
let midnightTimer: number | undefined;

function buildSnapshot(): ExportFile {
  const s = useAppStore.getState();
  const exportedAt = new Date().toISOString();
  const payload = buildExport({
    program: s.program,
    sessions: s.sessions,
    settings: s.settings,
    meta: { ...s.meta, lastBackupAt: exportedAt },
    progression: s.progression,
  });
  payload.exportedAt = exportedAt;
  return payload;
}

function backedUpToday(): boolean {
  const last = useAppStore.getState().meta.lastBackupAt;
  if (!last) return false;
  const d = new Date(last);
  return !Number.isNaN(d.getTime()) && todayLocal(d) === todayLocal();
}

async function writeNow(): Promise<void> {
  const h = handle;
  if (!h || useAppStore.getState().safeMode) return;
  if (writing) {
    pendingWrite = true;
    return;
  }
  writing = true;
  const gen = generation;
  useBackupStore.setState({ busy: true });
  try {
    const payload = buildSnapshot();
    await writeBackupFile(h, payload);
    if (gen !== generation) return;
    useAppStore.getState().markBackup(payload.exportedAt);
    useBackupStore.setState({ status: 'on', error: null, busy: false, fileName: h.name });
  } catch (err) {
    if (gen !== generation) return;
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      useBackupStore.setState({ status: 'needs-permission', error: null, busy: false });
    } else if (name === 'NotFoundError') {
      useBackupStore.setState({
        status: 'error',
        error: 'The backup file could not be found. Choose it again.',
        busy: false,
      });
    } else {
      useBackupStore.setState({
        status: 'error',
        error: 'Could not write the backup file. Check that the disk is available.',
        busy: false,
      });
    }
  } finally {
    writing = false;
    if (pendingWrite && gen === generation) {
      pendingWrite = false;
      if (useBackupStore.getState().status === 'on') void writeNow();
    }
  }
}

function maybeDailyBackup(): void {
  if (useBackupStore.getState().status !== 'on') return;
  if (!backedUpToday()) void writeNow();
}

function scheduleMidnight(): void {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  midnightTimer = window.setTimeout(() => {
    maybeDailyBackup();
    scheduleMidnight();
  }, next.getTime() - now.getTime());
}

function dataSlices(state: ReturnType<typeof useAppStore.getState>): unknown[] {
  return [state.program, state.sessions, state.settings, state.progression];
}

export function initAutoBackup(): () => void {
  const gen = ++generation;
  let cancelled = false;

  if (!useInstallStore.getState().installed) {
    useBackupStore.setState({ status: 'off', fileName: null, error: null, busy: false });
    return () => {
      cancelled = true;
    };
  }

  if (!isAutoBackupSupported()) {
    useBackupStore.setState({ status: 'unsupported', fileName: null, error: null, busy: false });
    return () => {
      cancelled = true;
    };
  }

  void (async () => {
    let stored: BackupFileHandle | null = null;
    try {
      stored = await loadBackupHandle();
    } catch {
      stored = null;
    }
    if (cancelled || gen !== generation) return;
    if (!stored) {
      useBackupStore.setState({ status: 'off', fileName: null, error: null });
      return;
    }
    handle = stored;
    const permission = await queryWritePermission(stored);
    if (cancelled || gen !== generation) return;
    useBackupStore.setState({ fileName: stored.name });
    if (permission === 'granted') {
      useBackupStore.setState({ status: 'on', error: null });
      maybeDailyBackup();
    } else {
      useBackupStore.setState({ status: 'needs-permission' });
    }
  })();

  const onResume = () => {
    const h = handle;
    if (!h) return;
    void (async () => {
      const permission = await queryWritePermission(h);
      if (cancelled || gen !== generation) return;
      const status = useBackupStore.getState().status;
      if (permission === 'granted') {
        if (status === 'needs-permission') {
          useBackupStore.setState({ status: 'on', error: null });
        }
        maybeDailyBackup();
      } else if (status === 'on') {
        useBackupStore.setState({ status: 'needs-permission' });
      }
    })();
  };
  window.addEventListener('focus', onResume);
  document.addEventListener('visibilitychange', onResume);
  scheduleMidnight();

  let prev = dataSlices(useAppStore.getState());
  const unsubscribe = useAppStore.subscribe((state) => {
    const next = dataSlices(state);
    const changed = next.some((value, i) => value !== prev[i]);
    prev = next;
    if (!changed || useBackupStore.getState().status !== 'on') return;
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => void writeNow(), BACKUP_DEBOUNCE_MS);
  });

  return () => {
    cancelled = true;
    generation++;
    window.removeEventListener('focus', onResume);
    document.removeEventListener('visibilitychange', onResume);
    window.clearTimeout(midnightTimer);
    window.clearTimeout(debounceTimer);
    unsubscribe();
    handle = null;
    writing = false;
    pendingWrite = false;
  };
}