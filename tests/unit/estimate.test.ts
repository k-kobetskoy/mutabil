import { describe, expect, it } from 'vitest';
import { getConfig } from '@/config';
import { estimate } from '@/domain/estimate';
import { Estimate } from '@/contract/estimate';
import type { OrderInput } from '@/contract/order';
import { fullPacking, quickTwoRooms, singleSofa, studioNoLift, twoRoomsLiftCrates } from './fixtures';

const cfg = getConfig();
const line = (e: ReturnType<typeof estimate>, id: string) => e.lines.find((l) => l.id === id);
const lei = (bani: number) => bani / 100;

function invariants(e: ReturnType<typeof estimate>) {
  expect(Estimate.safeParse(e).success).toBe(true);
  expect(e.price.low).toBeLessThanOrEqual(e.price.base);
  expect(e.price.base).toBeLessThanOrEqual(e.price.high);
  expect(e.price.high).toBeLessThanOrEqual(e.price.worst);
  // the total is the sum of lines rounded up to 10 lei
  const sum = e.lines.reduce((s, l) => s + l.amount, 0);
  expect(e.price.base).toBeGreaterThanOrEqual(sum);
  expect(e.price.base - sum).toBeLessThan(1000);
  expect(e.price.base % 1000).toBe(0);
  // every number is explainable
  for (const l of e.lines) expect(l.explain.key).toMatch(/^lines\./);
  // the guaranteed window is a whole number of hours and covers the expected time + buffer
  expect(Number.isInteger(e.time.windowH)).toBe(true);
  expect(e.time.windowH).toBeGreaterThanOrEqual(e.time.expectedH + 0.5 - 1e-9);
  expect(e.time.billedH).toBeGreaterThanOrEqual(2);
  // VAT is included: 21/121 of the total
  expect(e.price.vat).toBe(Math.round((e.price.base * 0.21) / 1.21));
}

describe('typical scenarios (ТЗ)', () => {
  it('studio without elevator', () => {
    const e = estimate(studioNoLift, cfg);
    invariants(e);
    expect(e.volume.source).toBe('preset');
    expect(['van-6', 'van-12']).toContain(e.vehicle.id);
    expect(e.vehicle.trips).toBe(1);
    expect(e.crew.size).toBeGreaterThanOrEqual(2);
    expect(line(e, 'crates')).toBeUndefined();
    expect(line(e, 'protection')).toBeUndefined();
    expect(e.time.windowH).toBeLessThanOrEqual(8);
  });

  it('two rooms with elevator and reusable crates', () => {
    const e = estimate(twoRoomsLiftCrates, cfg);
    invariants(e);
    expect(e.volume.source).toBe('list');
    const crates = line(e, 'crates')!;
    expect(crates.explain.params).toMatchObject({ crates: 35, includedDays: 7, extraDays: 0 });
    expect(lei(crates.amount)).toBe(35 * 12);
    // survey: on-site, paid and credited back
    expect(lei(line(e, 'survey')!.amount)).toBe(150);
    expect(lei(line(e, 'surveyCredit')!.amount)).toBe(-150);
    expect(e.price.afterSurvey).toEqual({ capTolerance: 0.05, method: 'onsite' });
    // timeline: crates arrive before, are picked up 7 days after
    expect(e.timeline.map((t) => t.kind)).toEqual(['cratesDelivery', 'move', 'cratesPickup']);
    expect(e.timeline.find((t) => t.kind === 'cratesPickup')).toMatchObject({ dayOffset: 7, date: '2026-11-12' });
    // the 3-seat sofa cannot pass the 80 cm door of a medium lift
    expect(e.warnings.some((w) => w.key === 'warn.noFitLift.door' && w.params?.item === 'sofa-3-seat')).toBe(true);
    // kallax inserts are ready boxes: no packing labour, no materials for them
    expect(line(e, 'packing')).toBeUndefined();
    expect(line(e, 'assembly')!.details!.length).toBe(2);
  });

  it('a single sofa', () => {
    const e = estimate(singleSofa, cfg);
    invariants(e);
    expect(e.vehicle.id).toBe('van-6');
    expect(e.crew.size).toBe(2);
    expect(e.time.billedH).toBe(2);
    expect(lei(e.price.base)).toBeGreaterThanOrEqual(cfg.pricing.minimumOrderLei);
    expect(lei(e.price.base)).toBeLessThan(800);
  });

  it('move with full packing', () => {
    const e = estimate(fullPacking, cfg);
    invariants(e);
    const packing = line(e, 'packing')!;
    expect(packing.explain.params).toMatchObject({ boxes: e.volume.boxes, rate: 15, who: 'full' });
    const mat = line(e, 'materials')!;
    expect(mat.details!.map((d) => d.key)).toEqual(
      expect.arrayContaining(['materials.cardboard', 'materials.wardrobeBox', 'materials.tv', 'materials.mirror']),
    );
    expect(e.price.afterSurvey).toEqual({ capTolerance: 0.1, method: 'remote' });
    expect(e.timeline.map((t) => t.kind)).toContain('packing');
  });

  it('quick mode: three answers give a range', () => {
    const e = estimate(quickTwoRooms, cfg);
    invariants(e);
    expect(e.price.high).toBeGreaterThan(e.price.low);
    expect(e.volume.source).toBe('preset');
  });
});

describe('business rules (ТЗ «Обязательные бизнес-правила»)', () => {
  it('reusable crates → only on-site survey (forced, explained)', () => {
    const e = estimate({ ...twoRoomsLiftCrates, survey: { method: 'remote' } }, cfg);
    expect(e.price.afterSurvey?.method).toBe('onsite');
    expect(e.hints.map((h) => h.key)).toContain('rules.cratesOnsiteOnly');
    expect(e.warnings.some((w) => w.key === 'warn.forcedOption' && w.params?.to === 'onsite')).toBe(true);
  });

  it('without survey the price is always a range', () => {
    const e = estimate(studioNoLift, cfg);
    expect(e.price.kind).toBe('range');
    expect(e.price.afterSurvey).toBeUndefined();
    expect(e.price.high).toBeGreaterThan(e.price.low);
    expect(e.hints.map((h) => h.key)).toContain('rules.noSurveyRangeOnly');
  });

  it('crate rental: 7 days included, then a daily fee per crate', () => {
    const base = line(estimate(twoRoomsLiftCrates, cfg), 'crates')!;
    const longer = line(estimate({ ...twoRoomsLiftCrates, packing: { ...twoRoomsLiftCrates.packing, crateDays: 10 } }, cfg), 'crates')!;
    expect(lei(longer.amount - base.amount)).toBe(35 * 3 * 1);
    expect(longer.explain.params).toMatchObject({ extraDays: 3, extraRate: 1 });
  });

  it('minimum crates apply', () => {
    const e = estimate({ ...twoRoomsLiftCrates, inventory: { ...twoRoomsLiftCrates.inventory!, boxes: 5 } }, cfg);
    expect(line(e, 'crates')!.explain.params).toMatchObject({ crates: 20 });
  });

  it('special items with full protection → separate line; with basic → inside materials', () => {
    const full = estimate(fullPacking, cfg);
    expect(line(full, 'special')).toBeDefined();
    expect(line(full, 'materials')!.details!.some((d) => d.key === 'materials.special')).toBe(false);
    const basic = estimate({ ...fullPacking, protection: { level: 'basic' } }, cfg);
    expect(line(basic, 'special')).toBeUndefined();
    expect(line(basic, 'protection')).toBeUndefined();
    expect(line(basic, 'materials')!.details!.some((d) => d.key === 'materials.special')).toBe(true);
  });

  it('elevator "unknown" → conservative small lift, a clarify task, a wider window; recalculated after clarification', () => {
    const unknown = estimate(quickTwoRooms, cfg);
    const a = unknown.assumptions.find((x) => x.path === 'from.elevator');
    expect(a?.value).toBe('small');
    expect(unknown.tasks).toContainEqual({ code: 'CLARIFY_ELEVATOR', params: { end: 'from' } });
    const sc = unknown.scenarios.find((s) => s.path === 'from.elevator')!;
    expect(sc.options.map((o) => o.value)).toEqual(['none', 'small', 'medium', 'large']);
    expect(sc.options.find((o) => o.value === 'small')!.delta).toBe(0);

    const known: OrderInput = { ...quickTwoRooms, from: { ...quickTwoRooms.from, elevator: 'small' } };
    const clarified = estimate(known, cfg);
    expect(clarified.tasks.some((t) => t.code === 'CLARIFY_ELEVATOR')).toBe(false);
    expect(clarified.price.base).toBe(unknown.price.base); // same conservative assumption → same price
    expect(clarified.time.windowH).toBeLessThanOrEqual(unknown.time.windowH);
    const large = estimate({ ...quickTwoRooms, from: { ...quickTwoRooms.from, elevator: 'large' } }, cfg);
    expect(large.price.base).toBeLessThanOrEqual(unknown.price.base);
  });

  it('an item that does not fit the elevator is carried by the stairs and the client is warned', () => {
    const order: OrderInput = { ...singleSofa, from: { ...singleSofa.from, floor: 5, elevator: 'small', furnitureInLift: 'yes' } };
    const e = estimate(order, cfg);
    expect(e.warnings).toContainEqual({ key: 'warn.noFitLift.door', params: { item: 'sofa-3-seat', end: 'from', lift: 'small' } });
    const fits: OrderInput = { ...order, inventory: { mode: 'list', items: { 'fridge-standard': 1 } } };
    expect(estimate(fits, cfg).warnings.some((w) => w.key.startsWith('warn.noFitLift'))).toBe(false);
  });

  it('building forbids furniture in the lift → everything bulky by the stairs', () => {
    const allowed = estimate(twoRoomsLiftCrates, cfg);
    const forbidden = estimate({ ...twoRoomsLiftCrates, from: { ...twoRoomsLiftCrates.from, furnitureInLift: 'no' } }, cfg);
    expect(forbidden.warnings.filter((w) => w.key === 'warn.noFitLift.notAllowed').length).toBeGreaterThan(3);
    expect(forbidden.price.base).toBeGreaterThanOrEqual(allowed.price.base);
  });

  it('weekend surcharge is a separate line', () => {
    const e = estimate({ ...studioNoLift, schedule: { date: '2026-11-07', slot: 'morning' } }, cfg); // Saturday
    const w = line(e, 'weekend')!;
    const t = line(e, 'transport')!.amount + line(e, 'crew')!.amount;
    expect(Math.abs(w.amount - t * 0.15)).toBeLessThanOrEqual(100);
  });

  it('historic centre (zona 0): heavy vehicles park away, the client sees why', () => {
    const big: OrderInput = { ...fullPacking, from: { ...fullPacking.from, zoneId: 'centru' } };
    const e = estimate(big, cfg);
    if (cfg.vehicles.vehicles.find((v) => v.id === e.vehicle.id)!.grossWeightT > 3.5) {
      expect(e.vehicle.parkedAway).toContain('from');
      expect(e.warnings.some((w) => w.key === 'warn.parkedAway')).toBe(true);
    } else {
      expect(e.vehicle.parkedAway).toEqual([]);
    }
  });

  it('uncertain centre zone creates a task to confirm it', () => {
    const e = estimate({ ...studioNoLift, from: { ...studioNoLift.from, zoneId: 'centru-unknown' } }, cfg);
    expect(e.tasks).toContainEqual({ code: 'CONFIRM_ZONE', params: { end: 'from' } });
  });

  it('"estimate at survey" does not allow "no survey"', () => {
    const e = estimate({ ...studioNoLift, inventory: { mode: 'atSurvey' } }, cfg);
    expect(e.price.afterSurvey?.method).toBe('onsite');
    expect(e.tasks.map((t) => t.code)).toContain('SURVEY_INVENTORY');
  });

  it('overtime price per hour is known up front', () => {
    const e = estimate(studioNoLift, cfg);
    const v = cfg.vehicles.vehicles.find((x) => x.id === e.vehicle.id)!;
    expect(lei(e.overtime.perHour)).toBe(v.hourlyLei * e.vehicle.count + e.crew.size * cfg.pricing.crew.moverHourlyLei);
    expect(e.overtime.stepMin).toBe(30);
  });

  it('full-day booking: 8 h with discount', () => {
    const e = estimate({ ...studioNoLift, schedule: { ...studioNoLift.schedule, fullDay: true } }, cfg);
    expect(line(e, 'transport')!.explain.params).toMatchObject({ hours: 8 });
    expect(line(e, 'fullDayDiscount')!.amount).toBeLessThan(0);
  });

  it('client may pick a larger crew; alternatives are listed', () => {
    const auto = estimate(twoRoomsLiftCrates, cfg);
    expect(auto.crew.alternatives.length).toBeGreaterThanOrEqual(2);
    const four = estimate({ ...twoRoomsLiftCrates, crew: 4 }, cfg);
    expect(four.crew.size).toBe(4);
    expect(four.crew.explain.key).toBe('crew.chosenByClient');
  });

  it('heavy items require more movers (piano → 3)', () => {
    const e = estimate({ ...singleSofa, inventory: { mode: 'list', items: { 'piano-upright': 1 } } }, cfg);
    expect(e.crew.size).toBeGreaterThanOrEqual(3);
    expect(e.hints.map((h) => h.key)).toContain('rules.pianoSurveyRecommended');
  });
});

describe('determinism', () => {
  it('same input → same estimate', () => {
    expect(estimate(twoRoomsLiftCrates, cfg)).toEqual(estimate(twoRoomsLiftCrates, cfg));
  });
});
