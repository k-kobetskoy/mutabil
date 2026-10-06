/**
 * Browser storage that never throws (private mode, quota, blocked site data).
 * Angular/.NET analogy: a tiny repository over localStorage with a safe fallback to memory.
 */
import type { StateStorage } from 'zustand/middleware';

const memory = new Map<string, string>();

export function safeStorage(kind: 'local' | 'session'): StateStorage {
  const get = () => {
    try {
      return kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
    } catch {
      return undefined;
    }
  };
  return {
    getItem: (name) => {
      try {
        return get()?.getItem(name) ?? memory.get(name) ?? null;
      } catch {
        return memory.get(name) ?? null;
      }
    },
    setItem: (name, value) => {
      memory.set(name, value);
      try {
        get()?.setItem(name, value);
      } catch {
        /* keep in memory only */
      }
    },
    removeItem: (name) => {
      memory.delete(name);
      try {
        get()?.removeItem(name);
      } catch {
        /* ignore */
      }
    },
  };
}
