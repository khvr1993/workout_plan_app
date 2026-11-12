export interface StoragePort {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
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

  set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
    this.listeners.get(key)?.forEach((fn) => fn(value));
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

export function unwrap<T>(raw: unknown): { value: T | null; unknownVersion: boolean } {
  if (raw == null) return { value: null, unknownVersion: false };
  if (typeof raw === 'object' && raw !== null && 'v' in raw && 'value' in raw) {
    const env = raw as Envelope<T>;
    if (env.v === ENVELOPE_VERSION) return { value: env.value, unknownVersion: false };
    if (env.v > ENVELOPE_VERSION) return { value: null, unknownVersion: true };
    return { value: env.value, unknownVersion: false }; // older: caller migrates
  }
  // Pre-envelope raw value (legacy)
  return { value: raw as T, unknownVersion: false };
}