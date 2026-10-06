/**
 * Address directory key (decisions D7): the same building entrance must map to the same key
 * however the client types it ("Str. Observatorului 12, bl. A, sc. 2" ≈ "strada observatorului 12 A 2").
 */
import type { AddressDetails } from '@/contract/api';

const STREET_PREFIXES = /^(strada|str\.?|bulevardul|bd\.?|b-dul|calea|aleea|al\.?|piata|p-ta|soseaua|sos\.?)\s+/;

export function normalizePart(s: string | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^(bl\.?|bloc|sc\.?|scara|nr\.?)\s*/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeAddressKey(a: AddressDetails): string | null {
  const street = normalizePart((a.street ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(STREET_PREFIXES, ''));
  const number = normalizePart(a.number);
  if (!street || !number) return null;
  return [street, number, normalizePart(a.block), normalizePart(a.stair)].join('|');
}
