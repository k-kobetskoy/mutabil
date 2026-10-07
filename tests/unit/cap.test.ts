import { describe, expect, it } from 'vitest';
import { getConfig } from '@/config';
import { guaranteedMax } from '@/domain/cap';
import { estimate } from '@/domain/estimate';
import type { OrderInput } from '@/contract/order';
import { studioNoLift, twoRoomsLiftCrates } from './fixtures';

const cfg = getConfig();
const max = (o: OrderInput) => guaranteedMax(estimate(o, cfg), o, cfg);
// crates force a visit (rule), so survey variations use the client's own boxes
const own: OrderInput = { ...twoRoomsLiftCrates, packing: { ...twoRoomsLiftCrates.packing, containers: 'own' } };

describe('guaranteed maximum (D38)', () => {
  it('is the base plus the cap of the chosen survey, rounded up to the total step', () => {
    const est = estimate(twoRoomsLiftCrates, cfg); // items listed, onsite survey
    const cap = est.price.afterSurvey!.capTolerance;
    const m = max(twoRoomsLiftCrates)!;
    const step = cfg.pricing.rounding.totalLei * 100;
    expect(m % step).toBe(0);
    expect(m).toBeGreaterThanOrEqual(est.price.base * (1 + cap));
    expect(m - est.price.base * (1 + cap)).toBeLessThan(step);
  });

  it('a photo survey allows a higher maximum than a visit', () => {
    expect(max({ ...own, survey: { method: 'remote' } })!).toBeGreaterThan(max({ ...own, survey: { method: 'onsite' } })!);
  });

  it('does not exist without a survey', () => {
    expect(max({ ...own, survey: { method: 'none' } })).toBeNull();
  });

  it('does not exist when things are counted by rooms: the survey finds the volume', () => {
    expect(studioNoLift.inventory?.mode).toBe('preset');
    expect(max({ ...studioNoLift, survey: { method: 'onsite' } })).toBeNull();
  });
});
