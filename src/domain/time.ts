/**
 * Time model (R3 §9, decisions D6). Per address end:
 *   moveManH = (V_lift·F_lift + V_stairs·F_stairs) · F_carry / rate
 *   T_end    = max( (moveManH + bulkyManH) / (n·eff(n)),  lift trips · cycle )
 * Furniture work is done by a master in parallel (D14): the end cannot finish before the master.
 * Guaranteed window = ceil_1h( max(T·exp(z·σ), T + minBuffer, minBillable) ) — P85 of a log-normal.
 */
import type { Endpoint } from '@/contract/order';
import type { Cfg } from '@/config';
import { elevatorClass, fitsInElevator } from './elevator';
import type { VolumeResult } from './volume';
import { ceilTo } from './money';

export type EndRole = 'load' | 'unload';
export type NoFitItem = { itemId: string; reason: 'door' | 'cabin' | 'notAllowed' };

export type EndResult = {
  floors: number;
  hasLift: boolean;
  liftClass?: string;
  fLift: number;
  fStairs: number;
  fCarry: number;
  carryM: number;
  vLift: number;
  vStairs: number;
  bulkyByStairs: number;
  noFit: NoFitItem[];
  moveManH: number;
  bulkyManH: number;
  crewH: number;
  liftH: number;
  hours: number;
};

export function crewEfficiency(cfg: Cfg, n: number): number {
  const table = cfg.time.productivity.crewEfficiency;
  const keys = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  const k = keys.filter((x) => x <= n).pop() ?? keys[0];
  return table[String(k)];
}

/** Volume split between lift and stairs, plus the list of items that do not fit. */
export function liftSplit(
  end: Endpoint,
  vol: VolumeResult,
  cfg: Cfg,
): { vLift: number; vStairs: number; bulky: number; noFit: NoFitItem[]; cls?: string } {
  const floors = end.floor ?? 0;
  const lift = end.elevator && end.elevator !== 'none' && end.elevator !== 'unknown' ? end.elevator : undefined;
  if (floors === 0 || !lift) return { vLift: 0, vStairs: vol.base, bulky: 0, noFit: [] };
  const cls = elevatorClass(cfg.elevators, lift)!;
  const furnitureAllowed = end.furnitureInLift !== 'no';
  const lf = cfg.catalog.loadFactor;

  if (vol.source === 'preset' || (vol.source === 'atSurvey' && vol.items.length === 0)) {
    // no item list: use the share of volume that typically does not fit this class
    const share = furnitureAllowed ? cfg.elevators.presetNoFitShare[cls.id] : cfg.elevators.presetFurnitureShare;
    const vStairs = vol.base * share;
    return { vLift: vol.base - vStairs, vStairs, bulky: Math.round(vStairs), noFit: [], cls: cls.id };
  }

  const noFit: NoFitItem[] = [];
  let stairsRaw = 0;
  let bulky = 0;
  for (const l of vol.items) {
    if (!l.item.dimensionsCm) continue;
    let reason: NoFitItem['reason'] | undefined;
    if (!furnitureAllowed) reason = 'notAllowed';
    else {
      const fit = fitsInElevator(l.item.dimensionsCm, { flexible: l.item.flexible, disassembled: l.disassembled }, cls, cfg.elevators);
      if (!fit.fits) reason = fit.reason;
    }
    if (reason) {
      noFit.push({ itemId: l.item.id, reason });
      stairsRaw += l.item.volumeM3 * l.qty;
      bulky += l.qty;
    }
  }
  for (const c of vol.custom) {
    const fit = furnitureAllowed ? fitsInElevator(c.dims, {}, cls, cfg.elevators) : { fits: false as const, reason: 'cabin' as const };
    if (!fit.fits) {
      stairsRaw += c.volumeM3 / lf;
      bulky += c.qty;
    }
  }
  // the list total may have been scaled (low/high bound): keep the stairs share proportional
  const listTotal = Math.max(vol.unscaledBase, 1e-9);
  const share = Math.min(1, (stairsRaw * lf) / listTotal);
  const vStairs = vol.base * share;
  return { vLift: vol.base - vStairs, vStairs, bulky, noFit, cls: cls.id };
}

export function endTime(end: Endpoint, role: EndRole, vol: VolumeResult, crew: number, extraCarryM: number, cfg: Cfg): EndResult {
  const t = cfg.time;
  const a = t.access;
  const floors = (end.floor ?? 0) + (end.raisedEntrance ? a.raisedEntranceFloors : 0);
  const stairType = end.stairs && end.stairs !== 'unknown' ? end.stairs : 'normal';
  const prog = Math.min(floors, a.progressiveFromFloor) + Math.max(0, floors - a.progressiveFromFloor) * a.progressiveMultiplier;
  const fStairs = 1 + a.floorPenaltyNoLift * a.stairTypeFactor[stairType] * prog;

  const split = liftSplit(end, vol, cfg);
  const cls = split.cls ? elevatorClass(cfg.elevators, split.cls) : undefined;
  const raised = end.raisedEntrance ? a.raisedEntranceFloors : 0;
  const fLift = cls ? cls.timeFactor + a.liftPerFloorPenalty * floors + a.floorPenaltyNoLift * raised : 1;

  const carryChoice = end.carry && end.carry !== 'unknown' ? end.carry : '10to30';
  const parking = end.parking && end.parking !== 'unknown' ? end.parking : 'nearby';
  const carryM = a.carryDistanceM[carryChoice] + t.parking.extraCarryM[parking] + extraCarryM;
  const fCarry = 1 + (a.carryPenaltyPer10m * Math.max(0, carryM - a.freeCarryM)) / 10;

  const rate = role === 'load' ? t.productivity.loadRatePerMover : t.productivity.unloadRatePerMover;
  const moveManH = ((split.vLift * fLift + split.vStairs * fStairs) * fCarry) / rate;
  const bulkyManH = (split.bulky * a.bulkyStairsExtraManMinPerFloor * (end.floor ?? 0)) / 60;
  const crewH = (moveManH + bulkyManH) / (crew * crewEfficiency(cfg, crew));

  let liftH = 0;
  if (cls && split.vLift > 0) {
    const th = cfg.elevators.throughput;
    const trips = Math.ceil(split.vLift / cls.m3PerTrip - 1e-9);
    const cycleSec = cls.cabinLoadSec + (2 * floors * th.floorHeightM) / th.liftSpeedMs + 2 * th.doorCycleSec;
    liftH = (trips * cycleSec) / 3600;
  }

  return {
    floors,
    hasLift: !!cls,
    liftClass: cls?.id,
    fLift,
    fStairs,
    fCarry,
    carryM,
    vLift: split.vLift,
    vStairs: split.vStairs,
    bulkyByStairs: split.bulky,
    noFit: split.noFit,
    moveManH,
    bulkyManH,
    crewH,
    liftH,
    hours: Math.max(crewH, liftH),
  };
}

export function guaranteedWindowH(expectedH: number, sigma: number, cfg: Cfg): number {
  const b = cfg.time.buffer;
  const raw = Math.max(expectedH * Math.exp(b.quantileZ * sigma), expectedH + b.minBufferH, cfg.pricing.billing.minimumBillableH);
  return ceilTo(raw, b.windowRoundingH);
}
