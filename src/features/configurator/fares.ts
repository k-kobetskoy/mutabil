/**
 * Fares = presets over two independent answers (survey method × protection level), plus crates
 * for "complete" (decisions D10, R7). Choosing a fare only sets those answers; each one can still
 * be changed separately, and no fare is pre-selected.
 */
import type { OrderInput } from '@/contract/order';

export type Fare = 'estimate' | 'fixed' | 'complete';
export const FARES: Fare[] = ['estimate', 'fixed', 'complete'];

export function applyFare(o: OrderInput, fare: Fare): OrderInput {
  switch (fare) {
    case 'estimate':
      return { ...o, survey: { method: 'none' }, protection: { level: 'basic' }, packing: o.packing?.containers === 'crates' ? { ...o.packing, containers: 'own' } : o.packing };
    case 'fixed':
      return { ...o, survey: { method: o.packing?.containers === 'crates' ? 'onsite' : 'remote' }, protection: { level: 'basic' } };
    case 'complete':
      return { ...o, survey: { method: 'onsite' }, protection: { ...o.protection, level: 'full' }, packing: { ...o.packing, containers: 'crates' } };
  }
}

export function fareOf(o: OrderInput): Fare | null {
  const m = o.survey?.method;
  const p = o.protection?.level;
  if (!m || !p) return null;
  if (m === 'none' && p === 'basic') return 'estimate';
  if (m === 'onsite' && p === 'full' && o.packing?.containers === 'crates') return 'complete';
  if (m !== 'none' && p === 'basic') return 'fixed';
  return null;
}
