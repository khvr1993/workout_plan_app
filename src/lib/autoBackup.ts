export interface BackupWritable {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

export interface BackupFileHandle {
  readonly name: string;
  createWritable(): Promise<BackupWritable>;
  queryPermission?(descriptor: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission?(descriptor: { mode: 'readwrite' }): Promise<PermissionState>;
}

type SavePicker = (options: {
  suggestedName?: string;
  types?: Array<{ description: string; accept: Record<string, string[]> }>;
}) => Promise<BackupFileHandle>;

export const BACKUP_FILENAME = 'workout-backup.json';

function picker(): SavePicker | null {
  const w = window as Window & { showSaveFilePicker?: SavePicker };
  return typeof w.showSaveFilePicker === 'function' ? w.showSaveFilePicker.bind(w) : null;
}

export function isAutoBackupSupported(): boolean {
  return picker() !== null && typeof indexedDB !== 'undefined';
}

export async function pickBackupFile(): Promise<BackupFileHandle | null> {
  const show = picker();
  if (!show) return null;
  try {
    return await show({
      suggestedName: BACKUP_FILENAME,
      types: [{ description: 'JSON backup', accept: { 'application/json': ['.json'] } }],
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return null;
    throw err;
  }
}

export async function queryWritePermission(handle: BackupFileHandle): Promise<PermissionState> {
  if (!handle.queryPermission) return 'granted';
  return handle.queryPermission({ mode: 'readwrite' });
}

export async function requestWritePermission(handle: BackupFileHandle): Promise<PermissionState> {
  if (!handle.requestPermission) return 'granted';
  return handle.requestPermission({ mode: 'readwrite' });
}

export async function writeBackupFile(handle: BackupFileHandle, payload: unknown): Promise<void> {
  const writable = await handle.createWritable();
  try {
    await writable.write(JSON.stringify(payload, null, 2));
    await writable.close();
  } catch (err) {
    try {
      await writable.close();
    } catch {
      // The stream may already be closed; surface the original failure.
    }
    throw err;
  }
}

const DB_NAME = 'wt-backup';
const DB_VERSION = 1;
const STORE = 'handles';
const HANDLE_KEY = 'backup-file';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open backup storage.'));
    request.onblocked = () => reject(new Error('Backup storage is blocked by another tab.'));
  });
}

export async function saveBackupHandle(handle: BackupFileHandle): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(handle, HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Could not save the backup file handle.'));
      tx.onabort = () => reject(tx.error ?? new Error('Could not save the backup file handle.'));
    });
  } finally {
    db.close();
  }
}

export async function loadBackupHandle(): Promise<BackupFileHandle | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openDb();
  try {
    return await new Promise<BackupFileHandle | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(HANDLE_KEY);
      request.onsuccess = () => resolve((request.result as BackupFileHandle | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error('Could not read the backup file handle.'));
    });
  } finally {
    db.close();
  }
}

export async function clearBackupHandle(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Could not clear the backup file handle.'));
      tx.onabort = () => reject(tx.error ?? new Error('Could not clear the backup file handle.'));
    });
  } finally {
    db.close();
  }
}