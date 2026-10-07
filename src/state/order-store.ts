'use client';
/**
 * The order draft (decisions D19). One store for the whole configurator, living above the step
 * routes so going back and forth never loses answers; persisted to localStorage (no personal data)
 * with a TTL. Angular analogy: an @Injectable({providedIn:'root'}) service holding signals.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { OrderInput } from '@/contract/order';
import { setPath } from '@/domain/path';
import { safeStorage } from './storage';

export const DRAFT_KEY = 'mutabil:draft';
const TTL_MS = 14 * 24 * 3600 * 1000;

export const emptyOrder = (mode: OrderInput['mode'] = 'detailed'): OrderInput => ({ v: 1, mode });

type OrderState = {
  order: OrderInput;
  savedAt: number;
  hydrated: boolean;
  /** set one answer by dotted path; `undefined` removes the answer */
  update: (path: string, value: unknown) => void;
  patch: (fn: (o: OrderInput) => OrderInput) => void;
  replace: (order: OrderInput) => void;
  setMode: (mode: OrderInput['mode']) => void;
  reset: (mode?: OrderInput['mode']) => void;
};

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      order: emptyOrder(),
      savedAt: 0,
      hydrated: false,
      update: (path, value) => set((s) => ({ order: setPath(s.order, path, value), savedAt: Date.now() })),
      patch: (fn) => set((s) => ({ order: fn(s.order), savedAt: Date.now() })),
      replace: (order) => set({ order, savedAt: Date.now() }),
      setMode: (mode) => set((s) => ({ order: { ...s.order, mode }, savedAt: Date.now() })),
      reset: (mode = 'detailed') => set({ order: emptyOrder(mode), savedAt: Date.now() }),
    }),
    {
      name: DRAFT_KEY,
      version: 1,
      storage: createJSONStorage(() => safeStorage('local')),
      skipHydration: true,
      partialize: (s) => ({ order: s.order, savedAt: s.savedAt }),
      merge: (persisted, current) => {
        const p = persisted as Partial<OrderState> | undefined;
        if (!p?.order || !p.savedAt || Date.now() - p.savedAt > TTL_MS) return { ...current, hydrated: true };
        // Full protection is out of the MVP (decisions D36): older drafts fall back to liability by law
        const order = p.order.protection?.level === 'full' ? { ...p.order, protection: { level: 'basic' as const } } : p.order;
        return { ...current, order, savedAt: p.savedAt, hydrated: true };
      },
      onRehydrateStorage: () => (state) => {
        if (state && !state.hydrated) useOrderStore.setState({ hydrated: true });
      },
    },
  ),
);

/** True when the draft has answers worth offering "continue where you left off". */
export function hasProgress(o: OrderInput): boolean {
  return Object.keys(o).filter((k) => k !== 'v' && k !== 'mode').length > 0;
}
