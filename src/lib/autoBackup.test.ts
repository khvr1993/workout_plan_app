import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BACKUP_FILENAME,
  clearBackupHandle,
  isAutoBackupSupported,
  loadBackupHandle,
  pickBackupFile,
  queryWritePermission,
  requestWritePermission,
  saveBackupHandle,
  writeBackupFile,
  type BackupFileHandle,
} from './autoBackup';

type PickerWindow = Window & { showSaveFilePicker?: unknown };

function setPicker(value: unknown) {
  (window as PickerWindow).showSaveFilePicker = value;
}

function deleteDb(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase('wt-backup');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  await deleteDb();
});

afterEach(async () => {
  delete (window as PickerWindow).showSaveFilePicker;
  await deleteDb();
});

describe('support detection and file picking', () => {
  it('is unsupported without a save picker and supported with one', () => {
    expect(isAutoBackupSupported()).toBe(false);
    setPicker(vi.fn());
    expect(isAutoBackupSupported()).toBe(true);
  });

  it('suggests the single backup filename and returns the chosen handle', async () => {
    const handle = { name: BACKUP_FILENAME } as BackupFileHandle;
    const picker = vi.fn(async () => handle);
    setPicker(picker);

    await expect(pickBackupFile()).resolves.toBe(handle);
    expect(picker).toHaveBeenCalledWith(
      expect.objectContaining({ suggestedName: BACKUP_FILENAME }),
    );
  });

  it('returns null when the user cancels the picker', async () => {
    setPicker(vi.fn(async () => {
      throw new DOMException('The user aborted a request.', 'AbortError');
    }));
    await expect(pickBackupFile()).resolves.toBeNull();
  });

  it('propagates non-cancel picker failures', async () => {
    setPicker(vi.fn(async () => {
      throw new DOMException('Blocked', 'SecurityError');
    }));
    await expect(pickBackupFile()).rejects.toThrow('Blocked');
  });

  it('returns null when no picker exists', async () => {
    await expect(pickBackupFile()).resolves.toBeNull();
  });
});

describe('handle persistence in IndexedDB', () => {
  it('roundtrips a stored handle', async () => {
    const handle = { name: BACKUP_FILENAME } as BackupFileHandle;
    await saveBackupHandle(handle);
    await expect(loadBackupHandle()).resolves.toEqual({ name: BACKUP_FILENAME });
  });

  it('returns null when nothing is stored', async () => {
    await expect(loadBackupHandle()).resolves.toBeNull();
  });

  it('keeps exactly one handle, overwriting the previous choice', async () => {
    await saveBackupHandle({ name: 'first.json' } as BackupFileHandle);
    await saveBackupHandle({ name: 'second.json' } as BackupFileHandle);
    await expect(loadBackupHandle()).resolves.toEqual({ name: 'second.json' });
  });

  it('clears the stored handle', async () => {
    await saveBackupHandle({ name: BACKUP_FILENAME } as BackupFileHandle);
    await clearBackupHandle();
    await expect(loadBackupHandle()).resolves.toBeNull();
  });
});

describe('writeBackupFile', () => {
  function makeHandle() {
    const written: string[] = [];
    let closed = 0;
    const writable = {
      write: vi.fn(async (data: string) => {
        written.push(data);
      }),
      close: vi.fn(async () => {
        closed++;
      }),
    };
    const handle = {
      name: BACKUP_FILENAME,
      createWritable: vi.fn(async () => writable),
    } as unknown as BackupFileHandle;
    return { handle, writable, written, closed: () => closed };
  }

  it('writes pretty-printed JSON and closes the stream', async () => {
    const { handle, written, closed } = makeHandle();
    const payload = { app: 'workout-tracker', data: { sessions: [] } };

    await writeBackupFile(handle, payload);

    expect(written).toEqual([JSON.stringify(payload, null, 2)]);
    expect(closed()).toBe(1);
  });

  it('attempts to close and rethrows when the write fails', async () => {
    const { handle, writable } = makeHandle();
    writable.write.mockRejectedValueOnce(new Error('disk full'));

    await expect(writeBackupFile(handle, {})).rejects.toThrow('disk full');
    expect(writable.close).toHaveBeenCalledTimes(1);
  });

  it('propagates a close failure', async () => {
    const { handle, writable } = makeHandle();
    writable.close.mockRejectedValueOnce(new DOMException('Gone', 'NotFoundError'));

    await expect(writeBackupFile(handle, {})).rejects.toThrow('Gone');
  });
});

describe('permission helpers', () => {
  it('assumes granted when the handle exposes no permission API', async () => {
    const handle = { name: BACKUP_FILENAME } as BackupFileHandle;
    await expect(queryWritePermission(handle)).resolves.toBe('granted');
    await expect(requestWritePermission(handle)).resolves.toBe('granted');
  });

  it('delegates readwrite queries and requests to the handle', async () => {
    const queryPermission = vi.fn(async () => 'prompt' as PermissionState);
    const requestPermission = vi.fn(async () => 'granted' as PermissionState);
    const handle = { name: BACKUP_FILENAME, queryPermission, requestPermission } as unknown as BackupFileHandle;

    await expect(queryWritePermission(handle)).resolves.toBe('prompt');
    expect(queryPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
    await expect(requestWritePermission(handle)).resolves.toBe('granted');
    expect(requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
  });
});