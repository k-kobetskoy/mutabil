import { describe, expect, it } from 'vitest';
import { getConfig } from '@/config';
import { fitsInElevator, elevatorClass, rectFits } from '@/domain/elevator';
import { ceilTo, floorTo, leiLine, roundHalfUp } from '@/domain/money';
import { computeVolume } from '@/domain/volume';
import { endTime, guaranteedWindowH } from '@/domain/time';
import { applyRules, parseRules, validateLogic } from '@/domain/rules/engine';
import { firstIncomplete, visibleSteps, nextStep, canOpen } from '@/domain/flow/steps';
import { haversineKm, routeInfo } from '@/domain/route';
import { quickTwoRooms, twoRoomsLiftCrates } from './fixtures';

const cfg = getConfig();
const cls = (id: string) => elevatorClass(cfg.elevators, id)!;

describe('money', () => {
  it('rounds half up with float noise', () => {
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(0.1 + 0.2 + 2.2)).toBe(3); // 2.5000000000000004
    expect(ceilTo(3.0000000001, 0.5)).toBe(3);
    expect(ceilTo(3.01, 0.5)).toBe(3.5);
    expect(floorTo(1249.999999999, 50)).toBe(1250);
    expect(leiLine(12.5, 1)).toBe(1300);
  });
});

describe('elevator fit (R3 §7.4 table)', () => {
  const fridge = { w: 60, d: 65, h: 185 };
  it('fridge upright fits all classes', () => {
    for (const c of ['small', 'medium', 'large']) expect(fitsInElevator(fridge, {}, cls(c), cfg.elevators).fits).toBe(true);
  });
  it('3-seat sofa (depth 95) fails the door of small and medium', () => {
    const sofa = { w: 210, d: 95, h: 85 };
    expect(fitsInElevator(sofa, {}, cls('small'), cfg.elevators)).toEqual({ fits: false, reason: 'door' });
    expect(fitsInElevator(sofa, {}, cls('medium'), cfg.elevators)).toEqual({ fits: false, reason: 'door' });
  });
  it('double mattress only fits the large lift', () => {
    const m = { w: 160, d: 22, h: 200 };
    expect(fitsInElevator(m, { flexible: true }, cls('small'), cfg.elevators).fits).toBe(false);
    expect(fitsInElevator(m, { flexible: true }, cls('medium'), cfg.elevators).fits).toBe(false);
    expect(fitsInElevator(m, { flexible: true }, cls('large'), cfg.elevators).fits).toBe(true);
  });
  it('assembled PAX frame never fits; as panels it fits a small lift', () => {
    const pax = { w: 100, d: 58, h: 236 };
    for (const c of ['small', 'medium', 'large']) expect(fitsInElevator(pax, {}, cls(c), cfg.elevators).fits).toBe(false);
    expect(fitsInElevator({ w: 100, d: 58, h: 201 }, { disassembled: true }, cls('small'), cfg.elevators).fits).toBe(true);
  });
  it('rotated rectangle check', () => {
    expect(rectFits(90, 20, 87, 97)).toBe(true);
    expect(rectFits(160, 22, 87, 97)).toBe(false);
  });
});

describe('volume', () => {
  it('preset mode uses min/typical/max of the preset × loadFactor', () => {
    const v = computeVolume({ v: 1, mode: 'quick', taskType: 'apartment', size: { presetId: 'apartament-2-camere' } }, cfg, 'none');
    expect(v.base).toBeCloseTo(18 * 1.1);
    expect(v.low).toBeCloseTo(14 * 1.1);
    expect(v.high).toBeCloseTo(25 * 1.1);
    expect(v.boxes).toBe(35);
  });
  it('kallax inserts count as small ready boxes', () => {
    const without = computeVolume(
      { ...twoRoomsLiftCrates, inventory: { ...twoRoomsLiftCrates.inventory!, kallaxInserts: 0 } },
      cfg,
      'onsite',
    );
    const withIns = computeVolume(twoRoomsLiftCrates, cfg, 'onsite');
    expect(withIns.base - without.base).toBeCloseTo(8 * 0.04 * 1.1);
  });
  it('list range narrows with a survey', () => {
    const none = computeVolume(twoRoomsLiftCrates, cfg, 'none');
    const onsite = computeVolume(twoRoomsLiftCrates, cfg, 'onsite');
    expect(onsite.high - onsite.low).toBeLessThan(none.high - none.low);
  });
});

describe('time', () => {
  const vol = computeVolume({ v: 1, mode: 'quick', taskType: 'apartment', size: { presetId: 'apartament-2-camere' } }, cfg, 'none');
  it('each floor without a lift adds time', () => {
    const t = (floor: number) => endTime({ floor, elevator: 'none', carry: 'lt10', parking: 'atEntrance' }, 'load', vol, 3, 0, cfg).hours;
    expect(t(4)).toBeGreaterThan(t(2));
    expect(t(2)).toBeGreaterThan(t(0));
  });
  it('a large lift beats the stairs on a high floor', () => {
    const stairs = endTime({ floor: 8, elevator: 'none' }, 'load', vol, 3, 0, cfg).hours;
    const lift = endTime({ floor: 8, elevator: 'large', furnitureInLift: 'yes' }, 'load', vol, 3, 0, cfg).hours;
    expect(lift).toBeLessThan(stairs);
  });
  it('more movers → faster, with diminishing returns', () => {
    const t = (n: number) => endTime({ floor: 2, elevator: 'none' }, 'load', vol, n, 0, cfg).hours;
    expect(t(3)).toBeLessThan(t(2));
    expect(t(2) / t(3)).toBeLessThan(1.5);
  });
  it('guaranteed window: P85, at least +0.5 h, whole hours', () => {
    expect(guaranteedWindowH(4, 0.25, cfg)).toBe(6); // 4 × 1.296 = 5.18 → 6
    expect(guaranteedWindowH(1, 0.25, cfg)).toBe(2);
  });
});

describe('route', () => {
  it('distance between zones uses centroids × detour', () => {
    const r = routeInfo({ v: 1, mode: 'detailed', from: { zoneId: 'manastur' }, to: { zoneId: 'floresti' } }, cfg);
    expect(r.km).toBeGreaterThan(4);
    expect(r.fromClass).toBe('suburb');
    expect(haversineKm({ lat: 46.77, lng: 23.59 }, { lat: 46.77, lng: 23.59 })).toBe(0);
  });
  it('quick mode uses the route class', () => {
    expect(routeInfo({ v: 1, mode: 'quick', route: 'intercity' }, cfg).intercity).toBe(true);
  });
});

describe('rules engine', () => {
  it('rejects operators outside the shared TS/Go subset', () => {
    expect(() => validateLogic({ map: [[], {}] })).toThrow(/not allowed/);
    expect(() => parseRules({ version: 'x', rules: [{ id: 'r', when: { substr: ['a', 1] }, then: [] }] })).toThrow();
  });
  it('unknown elevator at floor 0 needs no assumption', () => {
    const r = applyRules({ v: 1, mode: 'quick', from: { floor: 0, elevator: 'unknown' }, to: { floor: 0 } }, cfg.rules);
    expect(r.assumptions.some((a) => a.path.endsWith('elevator'))).toBe(false);
  });
  it('unanswered floor is assumed with options (live price before step 2)', () => {
    const r = applyRules({ v: 1, mode: 'quick', taskType: 'apartment' }, cfg.rules);
    expect(r.assumptions.find((a) => a.path === 'from.floor')?.options).toEqual([0, 2, 4, 8]);
  });
  it('restrictOptions forces the allowed value and records it', () => {
    const r = applyRules({ v: 1, mode: 'detailed', packing: { containers: 'crates' }, survey: { method: 'none' } }, cfg.rules);
    expect(r.order.survey?.method).toBe('onsite');
    expect(r.restrictions).toContainEqual({ path: 'survey.method', allow: ['onsite'], ruleId: 'crates-onsite-survey' });
  });
});

describe('wizard flow', () => {
  it('quick mode = 3 steps, detailed = 6 steps', () => {
    expect(visibleSteps({}, 'quick', cfg.steps).map((s) => s.id)).toEqual(['what', 'access', 'route']);
    expect(visibleSteps({}, 'detailed', cfg.steps).map((s) => s.id)).toEqual(['what', 'access', 'items', 'services', 'protection', 'when']);
  });
  it('first incomplete step and gating', () => {
    expect(firstIncomplete({}, 'quick', cfg.steps)?.id).toBe('what');
    expect(firstIncomplete(quickTwoRooms, 'quick', cfg.steps)).toBeNull();
    expect(canOpen('route', { taskType: 'apartment' }, 'quick', cfg.steps)).toBe(false);
    expect(nextStep('what', {}, 'detailed', cfg.steps)?.id).toBe('access');
  });
});

import { validateStep } from '@/domain/flow/validate';
describe('step validation', () => {
  const step = (id: string) => getConfig().steps.steps.find((s) => s.id === id)!;
  it('asks for the floor and, above the ground floor, for the lift', () => {
    const e = validateStep({ v: 1, mode: 'detailed', from: { zoneId: 'iris', floor: 3 }, to: { zoneId: 'iris' } }, step('access'), 'detailed', '2026-10-06');
    expect(e).toEqual({ 'to.floor': 'validation.floor.required', 'from.elevator': 'validation.elevator.required' });
  });
  it('a date in the past is refused', () => {
    expect(validateStep({ v: 1, mode: 'detailed', schedule: { date: '2026-10-01' } }, step('when'), 'detailed', '2026-10-06')).toEqual({ 'schedule.date': 'validation.date.past' });
  });
});
