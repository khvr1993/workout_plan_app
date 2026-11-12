import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultMeta, defaultSettings } from '../data/defaults';
import { program } from '../data/program';
import { parseImport } from '../lib/export';
import { clearBackupHandle, loadBackupHandle, saveBackupHandle, type BackupFileHandle } from '../lib/autoBackup';
import { useAppStore } from './useAppStore';
import { BACKUP_DEBOUNCE_MS, initAutoBackup, useBackupStore } from './useBackupStore';
import { useToastStore } from '../components/ui/Toast';

const idbState = vi.hoisted(() => ({ stored: null as unknown }));

vi.mock('../lib/autoBackup', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/autoBackup')>();
  return {
    ...actual,
    saveBackupHandle: vi.fn(async (handle: unknown) => {
      idbState.stored = handle;
    }),
    loadBackupHandle: vi.fn(async () => idbState.stored),
    clearBackupHandle: vi.fn(async () => {
      idbState.stored = null;
    }),
  };
});

interface FakeHandle {
  name: string;
  writes: string[];
  permission: PermissionState;
  failNextWrite: Error | null;
  createGate: { promise: Promise<void>; resolve: () => void } | null;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
  queryPermission(): Promise<PermissionState>;
  requestPermission(): Promise<PermissionState>;
}

function makeFakeHandle(permission: PermissionState = 'granted'): FakeHandle {
  const handle: FakeHandle = {
    name: 'workout-backup.json',
    writes: [],
    permission,
    failNextWrite: null,
    createGate: null,
    async createWritable() {
      if (handle.createGate) await handle.createGate.promise;
      if (handle.failNextWrite) {
        const error = handle.failNextWrite;
        handle.failNextWrite = null;
        throw error;
      }
      if (handle.permission !== 'granted') {
        throw new DOMException('Permission denied', 'NotAllowedError');
      }
      let buffer = '';
      return {
        async write(data: string) {
          buffer += data;
        },
        async close() {
          handle.writes.push(buffer);
        },
      };
    },
    async queryPermission() {
      return handle.permission;
    },
    async requestPermission() {
      return handle.permission;
    },
  };
  return handle;
}

function asHandle(fake: FakeHandle): BackupFileHandle {
  return fake as unknown as BackupFileHandle;
}

type PickerWindow = Window & { showSaveFilePicker?: unknown };

function resetAppStore() {
  useAppStore.setState({
    program,
    sessions: [],
    settings: defaultSettings,
    meta: defaultMeta(),
    progression: {},
    safeMode: false,
    storageError: null,
    restEndsAt: null,
    restTotalSec: 0,
  });
}

// Keep setImmediate/queueMicrotask real so IndexedDB-shaped async work settles;
// only clock-driven scheduling (midnight, debounce, toasts) is faked.
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

let teardown: (() => void) | null = null;

async function startEngine() {
  teardown = initAutoBackup();
  await flush();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  vi.setSystemTime(new Date(2026, 0, 15, 12));
  resetAppStore();
  useToastStore.setState({ toasts: [] });
  vi.mocked(saveBackupHandle).mockClear();
  vi.mocked(loadBackupHandle).mockClear();
  vi.mocked(clearBackupHandle).mockClear();
  idbState.stored = null;
  (window as PickerWindow).showSaveFilePicker = vi.fn(async () => {
    throw new DOMException('The user aborted a request.', 'AbortError');
  });
  useBackupStore.setState({ status: 'off', fileName: null, error: null, busy: false });
});

afterEach(async () => {
  teardown?.();
  teardown = null;
  await flush();
  vi.clearAllTimers();
  vi.useRealTimers();
  delete (window as PickerWindow).showSaveFilePicker;
  useToastStore.setState({ toasts: [] });
});

describe('initAutoBackup', () => {
  it('reports unsupported browsers without scheduling anything', async () => {
    delete (window as PickerWindow).showSaveFilePicker;
    const timersBefore = vi.getTimerCount();
    await startEngine();
    expect(useBackupStore.getState().status).toBe('unsupported');
    expect(vi.getTimerCount()).toBe(timersBefore);
  });

  it('starts off when no backup file was chosen yet', async () => {
    await startEngine();
    expect(useBackupStore.getState().status).toBe('off');
    expect(useBackupStore.getState().fileName).toBeNull();
  });

  it('restores a granted handle and backs up stale data automatically', async () => {
    const handle = makeFakeHandle();
    idbState.stored = asHandle(handle);
    useAppStore.getState().markBackup(new Date(2026, 0, 14, 9).toISOString());

    await startEngine();

    expect(useBackupStore.getState().status).toBe('on');
    expect(useBackupStore.getState().fileName).toBe('workout-backup.json');
    expect(handle.writes).toHaveLength(1);
    const imported = parseImport(handle.writes[0]);
    expect(imported.ok).toBe(true);
    expect(useAppStore.getState().meta.lastBackupAt).toBe(new Date().toISOString());
  });

  it('skips the automatic write when today is already backed up', async () => {
    const handle = makeFakeHandle();
    idbState.stored = asHandle(handle);
    useAppStore.getState().markBackup(new Date(2026, 0, 15, 8).toISOString());

    await startEngine();

    expect(useBackupStore.getState().status).toBe('on');
    expect(handle.writes).toHaveLength(0);
  });

  it('surfaces expired permission on init without writing', async () => {
    const handle = makeFakeHandle('prompt');
    idbState.stored = asHandle(handle);

    await startEngine();

    expect(useBackupStore.getState().status).toBe('needs-permission');
    expect(handle.writes).toHaveLength(0);
    expect(useAppStore.getState().meta.lastBackupAt).toBeUndefined();
  });

  it('never writes while the app is in safe mode', async () => {
    const handle = makeFakeHandle();
    idbState.stored = asHandle(handle);
    useAppStore.setState({ safeMode: true });

    await startEngine();
    await useBackupStore.getState().backupNow();
    await flush();

    expect(handle.writes).toHaveLength(0);
    expect(useAppStore.getState().meta.lastBackupAt).toBeUndefined();
  });

  it('removes listeners and timers on teardown', async () => {
    const handle = makeFakeHandle();
    idbState.stored = asHandle(handle);
    useAppStore.getState().markBackup(new Date().toISOString());
    await startEngine();
    const timers = vi.getTimerCount();

    teardown?.();
    teardown = null;

    expect(vi.getTimerCount()).toBe(timers - 1);
    vi.setSystemTime(new Date(2026, 0, 18, 9));
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(handle.writes).toHaveLength(0);
  });
});

describe('enable / reconnect / disable', () => {
  it('picks one file, persists the handle, writes immediately, and marks the backup', async () => {
    const handle = makeFakeHandle();
    (window as PickerWindow).showSaveFilePicker = vi.fn(async () => asHandle(handle));
    const edited = structuredClone(program);
    edited.name = 'Edited before enabling';
    useAppStore.getState().setProgram(edited);
    await startEngine();

    await useBackupStore.getState().enable();
    await flush();

    expect(saveBackupHandle).toHaveBeenCalledWith(asHandle(handle));
    expect(useBackupStore.getState().status).toBe('on');
    expect(useBackupStore.getState().fileName).toBe('workout-backup.json');
    expect(handle.writes).toHaveLength(1);
    const imported = parseImport(handle.writes[0]);
    if (!imported.ok) throw new Error(imported.error);
    expect(imported.data.program.name).toBe('Edited before enabling');
    expect(imported.data.meta.lastBackupAt).toBe(useAppStore.getState().meta.lastBackupAt);
    expect(useToastStore.getState().toasts.at(-1)?.message).toMatch(/Automatic backup is on/);
  });

  it('stays off when the file picker is cancelled', async () => {
    await startEngine();

    await useBackupStore.getState().enable();
    await flush();

    expect(useBackupStore.getState().status).toBe('off');
    expect(saveBackupHandle).not.toHaveBeenCalled();
    expect(useAppStore.getState().meta.lastBackupAt).toBeUndefined();
  });

  it('reconnects after permission is granted again and writes immediately', async () => {
    const handle = makeFakeHandle('prompt');
    idbState.stored = asHandle(handle);
    await startEngine();
    expect(useBackupStore.getState().status).toBe('needs-permission');

    handle.permission = 'granted';
    await useBackupStore.getState().reconnect();
    await flush();

    expect(useBackupStore.getState().status).toBe('on');
    expect(handle.writes).toHaveLength(1);
    expect(useToastStore.getState().toasts.at(-1)?.message).toMatch(/reconnected/);
  });

  it('stays paused when reconnect permission is refused', async () => {
    const handle = makeFakeHandle('prompt');
    idbState.stored = asHandle(handle);
    await startEngine();

    await useBackupStore.getState().reconnect();
    await flush();

    expect(useBackupStore.getState().status).toBe('needs-permission');
    expect(handle.writes).toHaveLength(0);
    expect(useToastStore.getState().toasts.at(-1)?.tone).toBe('error');
  });

  it('turning off clears the stored handle and stops scheduled writes', async () => {
    const handle = makeFakeHandle();
    idbState.stored = asHandle(handle);
    useAppStore.getState().markBackup(new Date().toISOString());
    await startEngine();

    await useBackupStore.getState().disable();
    await flush();

    expect(idbState.stored).toBeNull();
    expect(useBackupStore.getState().status).toBe('off');
    useAppStore.getState().updateSettings({ weeklyTarget: 5 });
    vi.advanceTimersByTime(BACKUP_DEBOUNCE_MS * 2);
    await flush();
    expect(handle.writes).toHaveLength(0);
  });
});

describe('automatic write scheduling', () => {
  it('debounces rapid data changes into one overwrite and ignores meta-only changes', async () => {
    const handle = makeFakeHandle();
    idbState.stored = asHandle(handle);
    useAppStore.getState().markBackup(new Date().toISOString());
    await startEngine();

    useAppStore.getState().updateSettings({ weeklyTarget: 4 });
    useAppStore.getState().updateSettings({ haptics: false });
    vi.advanceTimersByTime(BACKUP_DEBOUNCE_MS - 1);
    await flush();
    expect(handle.writes).toHaveLength(0);

    vi.advanceTimersByTime(1);
    await flush();
    expect(handle.writes).toHaveLength(1);

    useAppStore.getState().markBackup(new Date().toISOString());
    vi.advanceTimersByTime(BACKUP_DEBOUNCE_MS * 2);
    await flush();
    expect(handle.writes).toHaveLength(1);
  });

  it('writes again at local midnight', async () => {
    const handle = makeFakeHandle();
    idbState.stored = asHandle(handle);
    useAppStore.getState().markBackup(new Date().toISOString());
    await startEngine();

    vi.advanceTimersByTime(new Date(2026, 0, 16).getTime() - Date.now());
    await flush();

    expect(handle.writes).toHaveLength(1);
    expect(useAppStore.getState().meta.lastBackupAt).toBe(new Date().toISOString());
  });

  it('writes on focus after the local day changed', async () => {
    const handle = makeFakeHandle();
    idbState.stored = asHandle(handle);
    useAppStore.getState().markBackup(new Date().toISOString());
    await startEngine();

    vi.setSystemTime(new Date(2026, 0, 17, 8));
    window.dispatchEvent(new Event('focus'));
    await flush();

    expect(handle.writes).toHaveLength(1);
  });

  it('pauses when focus reveals revoked permission', async () => {
    const handle = makeFakeHandle();
    idbState.stored = asHandle(handle);
    useAppStore.getState().markBackup(new Date().toISOString());
    await startEngine();

    handle.permission = 'prompt';
    window.dispatchEvent(new Event('focus'));
    await flush();

    expect(useBackupStore.getState().status).toBe('needs-permission');
    expect(handle.writes).toHaveLength(0);
  });

  it('coalesces overlapping writes instead of dropping the second', async () => {
    const handle = makeFakeHandle();
    idbState.stored = asHandle(handle);
    useAppStore.getState().markBackup(new Date().toISOString());
    await startEngine();
    let resolveGate!: () => void;
    handle.createGate = {
      promise: new Promise<void>((resolve) => {
        resolveGate = resolve;
      }),
      resolve: () => resolveGate(),
    };

    const first = useBackupStore.getState().backupNow();
    const second = useBackupStore.getState().backupNow();
    await flush();
    expect(handle.writes).toHaveLength(0);
    expect(useBackupStore.getState().busy).toBe(true);

    handle.createGate.resolve();
    await first;
    await second;
    await flush();

    expect(handle.writes).toHaveLength(2);
    expect(useBackupStore.getState().busy).toBe(false);
  });
});

describe('write failures', () => {
  async function startOn() {
    const handle = makeFakeHandle();
    idbState.stored = asHandle(handle);
    useAppStore.getState().markBackup(new Date().toISOString());
    await startEngine();
    return handle;
  }

  it('pauses with needs-permission on NotAllowedError and keeps the old timestamp', async () => {
    const handle = await startOn();
    const before = useAppStore.getState().meta.lastBackupAt;
    handle.failNextWrite = new DOMException('denied', 'NotAllowedError');

    await useBackupStore.getState().backupNow();
    await flush();

    expect(useBackupStore.getState().status).toBe('needs-permission');
    expect(useAppStore.getState().meta.lastBackupAt).toBe(before);
    expect(useBackupStore.getState().busy).toBe(false);
  });

  it('surfaces a choose-again error when the file disappeared', async () => {
    const handle = await startOn();
    handle.failNextWrite = new DOMException('gone', 'NotFoundError');

    await useBackupStore.getState().backupNow();
    await flush();

    expect(useBackupStore.getState().status).toBe('error');
    expect(useBackupStore.getState().error).toMatch(/could not be found/);
  });

  it('surfaces generic write failures without marking a backup', async () => {
    const handle = await startOn();
    const before = useAppStore.getState().meta.lastBackupAt;
    handle.failNextWrite = new Error('disk full');

    await useBackupStore.getState().backupNow();
    await flush();

    expect(useBackupStore.getState().status).toBe('error');
    expect(useBackupStore.getState().error).toMatch(/Could not write/);
    expect(useAppStore.getState().meta.lastBackupAt).toBe(before);
  });

  it('backs up on demand and confirms with a toast', async () => {
    const handle = await startOn();

    await useBackupStore.getState().backupNow();
    await flush();

    expect(handle.writes).toHaveLength(1);
    expect(useToastStore.getState().toasts.at(-1)?.message).toBe('Backup saved.');
  });
});