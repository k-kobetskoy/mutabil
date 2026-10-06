import { describe, expect, it } from 'vitest';
import { decodeShare, encodeShare } from '@/domain/share';
import { normalizeAddressKey } from '@/domain/address';
import { slotsForWindow } from '@/domain/slots';
import { getConfig } from '@/config';
import type { OrderInput } from '@/contract/order';
import { fullPacking, twoRoomsLiftCrates } from './fixtures';

const maxOrder: OrderInput = {
  ...fullPacking,
  ...twoRoomsLiftCrates,
  inventory: {
    mode: 'list',
    items: Object.fromEntries(
      getConfig()
        .catalog.items.slice(0, 25)
        .map((i) => [i.id, 3]),
    ), // a very large list: 25 kinds
    custom: Array.from({ length: 5 }, (_, i) => ({ label: `item ${i}`, wCm: 100 + i, dCm: 50, hCm: 80, qty: 1 })),
    boxes: 120,
    kallaxInserts: 16,
  },
  special: Array.from({ length: 6 }, () => ({ kind: 'pristine' as const, label: 'secret label', declaredValueLei: 12000 })),
  assembly: { items: { 'wardrobe-3-door': 2, 'bed-double-frame': 2, desk: 1 }, disassembleOnMovingDay: true },
  protection: { level: 'full', declaredValueLei: 90000, deductible: true },
  crew: 4,
};

describe('share link codec', () => {
  it('round-trips an order', () => {
    const r = decodeShare(encodeShare(twoRoomsLiftCrates));
    expect(r).toEqual({ ok: true, order: twoRoomsLiftCrates });
  });
  it('strips free-text labels (may contain personal data)', () => {
    const token = encodeShare(maxOrder);
    const r = decodeShare(token);
    expect(r.ok).toBe(true);
    expect(JSON.stringify(r)).not.toContain('secret label');
  });
  it('a fully filled order fits in ≤ 1000 URL characters', () => {
    expect(encodeShare(maxOrder).length).toBeLessThanOrEqual(1000);
  });
  it('rejects broken, future and invalid tokens without throwing', () => {
    expect(decodeShare('garbage')).toEqual({ ok: false, reason: 'format' });
    expect(decodeShare('9.abc')).toEqual({ ok: false, reason: 'version' });
    expect(decodeShare('1.' + 'N4XyA')).toMatchObject({ ok: false });
  });
});

describe('address key', () => {
  it('normalises spelling variants of the same entrance', () => {
    const a = normalizeAddressKey({ street: 'Str. Observatorului', number: '12', block: 'bl. A', stair: 'sc. 2' });
    const b = normalizeAddressKey({ street: 'strada observatorului', number: '12', block: 'A', stair: '2' });
    expect(a).toBe('observatorului|12|a|2');
    expect(b).toBe(a);
    expect(normalizeAddressKey({ street: 'Calea Mănăștur', number: '5' })).toBe('manastur|5||');
    expect(normalizeAddressKey({ street: '' })).toBeNull();
  });
});

describe('slots', () => {
  it('afternoon start is not offered when the window would end after the working day', () => {
    const cfg = getConfig();
    expect(slotsForWindow(6, cfg).map((s) => s.fits)).toEqual([true, true, true]);
    expect(slotsForWindow(9, cfg).find((s) => s.slot === 'afternoon')!.fits).toBe(false);
    expect(
      slotsForWindow(5, cfg, true)
        .filter((s) => s.fits)
        .map((s) => s.slot),
    ).toEqual(['morning']);
  });
});
