export interface StoragePort {
  get<T>(key: string): T | null;
  /** Unparsed text, so a corrupt value can be told apart from a missing one. */
  readRaw?(key: string): string | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  /** Fires for changes made by *other* tabs only. */
  subscribe(key: string, fn: (value: unknown) => void): () => void;
  usageBytes(): number;
}

export const STORAGE_KEYS = {
  program: 'wt:program',
  sessions: 'wt:sessions',
  settings: 'wt:settings',
  meta: 'wt:meta',
  progression: 'wt:progression',
} as const;

export const ENVELOPE_VERSION = 3;

export interface Envelope<T> {
  v: number;
  value: T;
}

type Listener = (value: unknown) => void;

export class LocalStorageAdapter implements StoragePort {
  private listeners = new Map<string, Set<Listener>>();

  constructor() {
    window.addEventListener('storage', (e) => {
      if (e.key && this.listeners.has(e.key)) {
        let parsed: unknown = null;
        try {
          parsed = e.newValue ? JSON.parse(e.newValue) : null;
        } catch {
          parsed = null;
        }
        this.listeners.get(e.key)?.forEach((fn) => fn(parsed));
      }
    });
  }

  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  readRaw(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    // Deliberately does not notify local listeners: those represent other tabs.
    // Echoing our own writes would make cross-tab syncing re-enter the store.
    localStorage.setItem(key, JSON.stringify(value));
  }

  remove(key: string): void {
    localStorage.removeItem(key);
    this.listeners.get(key)?.forEach((fn) => fn(null));
  }

  subscribe(key: string, fn: Listener): () => void {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(fn);
    return () => this.listeners.get(key)?.delete(fn);
  }

  usageBytes(): number {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('wt:')) {
        total += k.length + (localStorage.getItem(k)?.length ?? 0);
      }
    }
    return total * 2; // UTF-16
  }
}

export function wrap<T>(value: T): Envelope<T> {
  return { v: ENVELOPE_VERSION, value };
}
