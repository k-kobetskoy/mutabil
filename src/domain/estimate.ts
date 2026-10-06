/**
 * Estimate orchestrator (decisions D4–D16):
 *   rules → effective order → volume → search over (vehicle × count × crew) → cheapest feasible
 *   → price lines → scenarios for every assumed answer → range (low/high) → Estimate.
 * Pure: depends only on the input and the config passed in.
 */
import type { Estimate, Explain, Scenario } from '@/contract/estimate';
import type { OrderInput } from '@/contract/order';
import type { Cfg } from '@/config';
import type { Vehicle } from '@/config/schema';
import { applyRules, type RulesResult } from './rules/engine';
import { setPath } from './path';
import { computeVolume, scaleVolume, type SurveyMethod, type VolumeResult } from './volume';
import { endTime, guaranteedWindowH, type EndResult } from './time';
import { findZone, routeInfo, type RouteInfo } from './route';
import { priceLines, type PricingResult } from './pricing';
import { ceilTo, floorTo, toBani } from './money';

type End = 'from' | 'to';

export type Candidate = {
  vehicle: Vehicle;
  count: number;
  trips: number;
  parkedAway: End[];
  crew: number;
  origin: EndResult;
  dest: EndResult;
  masterOriginH: number;
  masterDestH: number;
  driveH: number;
  extraTripsH: number;
  fixedH: number;
  expectedH: number;
  crewH: number;
  billedH: number;
  windowH: number;
  pricing: PricingResult;
  fillPct: number;
  limitedBy: 'volume' | 'weight';
};

type EvalContext = { survey: SurveyMethod; sigma: number; route: RouteInfo; forcedCrew?: number };

export function surveyMethod(order: OrderInput): SurveyMethod {
  return order.survey?.method ?? 'none';
}

function accessFor(cfg: Cfg, zoneId: string | undefined) {
  const zone = findZone(cfg, zoneId);
  return zone?.access ? cfg.zones.accessRules[zone.access] : undefined;
}

function minCrew(vol: VolumeResult, cfg: Cfg): number {
  const fromItems = vol.items.map((l) => l.item.minMovers ?? 0);
  return Math.max(cfg.pricing.crew.minMovers, ...fromItems);
}

function furnitureMinutes(order: OrderInput, cfg: Cfg, kind: 'disassemblyMin' | 'assemblyMin'): number {
  let min = 0;
  for (const [id, qty] of Object.entries(order.assembly?.items ?? {})) {
    const item = cfg.catalog.items.find((i) => i.id === id);
    if (item) min += item[kind] * qty;
  }
  return min;
}

/** Independent uncertainties combine as root-sum-square: σ² = σ0² + Σ adder². */
export function sigmaFor(rules: RulesResult, vol: VolumeResult, cfg: Cfg): number {
  const b = cfg.time.buffer;
  let s2 = b.sigmaLn ** 2;
  for (const a of rules.assumptions) if (a.sigma) s2 += (b.sigmaAdders[a.sigma] ?? 0) ** 2;
  if (vol.source !== 'list') s2 += (b.sigmaAdders.inventoryByPreset ?? 0) ** 2;
  return Math.sqrt(s2);
}

function candidate(
  order: OrderInput,
  vol: VolumeResult,
  vehicle: Vehicle,
  count: number,
  crew: number,
  ctx: EvalContext,
  cfg: Cfg,
): Candidate | null {
  const sel = cfg.vehicles.selection;
  const needM3 = vol.base * (1 + sel.volumeMargin);
  const needKg = vol.weightKg * (1 + sel.payloadMargin);
  const byVol = needM3 / (vehicle.usableM3 * count);
  const byKg = needKg / (vehicle.payloadKg * count);
  const trips = Math.max(1, Math.ceil(Math.max(byVol, byKg) - 1e-9));
  if (trips > sel.maxTrips) return null;
  if (trips > 1 && ctx.route.driveH * 60 > sel.secondTripMaxDriveMin) return null;
  if (vol.longestAssembledCm > vehicle.cargoCm.l) return null;

  const parkedAway: End[] = [];
  const extra = { from: 0, to: 0 };
  for (const end of ['from', 'to'] as const) {
    const rule = accessFor(cfg, order[end]?.zoneId);
    if (rule?.maxGrossWeightT != null && vehicle.grossWeightT > rule.maxGrossWeightT) {
      parkedAway.push(end);
      extra[end] = rule.extraCarryM ?? 0;
    }
  }

  const origin = endTime(order.from ?? {}, 'load', vol, crew, extra.from, cfg);
  const dest = endTime(order.to ?? {}, 'unload', vol, crew, extra.to, cfg);
  const masters = cfg.time.assembly.maxParallelMasters;
  const masterOriginH = order.assembly?.disassembleOnMovingDay ? furnitureMinutes(order, cfg, 'disassemblyMin') / 60 / masters : 0;
  const masterDestH = furnitureMinutes(order, cfg, 'assemblyMin') / 60 / masters;

  const t = cfg.time;
  const driveH = ctx.route.driveH;
  const tripsPerVehicle = Math.ceil(trips / 1);
  const extraTripsH = (tripsPerVehicle - 1) * (2 * driveH + t.drive.tripSecuringMin / 60);
  const parkingMin = (e: OrderInput['from']) => {
    const p = e?.parking && e.parking !== 'unknown' ? e.parking : 'nearby';
    return t.parking.fixedMinutes[p];
  };
  const liftEnds = (origin.hasLift ? 1 : 0) + (dest.hasLift ? 1 : 0);
  const fixedH =
    (t.fixed.setupMin +
      t.fixed.teardownMin +
      t.fixed.liftProtectionMinPerLiftEnd * liftEnds +
      parkingMin(order.from) +
      parkingMin(order.to)) /
    60;

  const originH = Math.max(origin.hours, masterOriginH);
  const crewH = originH + dest.hours + driveH + extraTripsH + fixedH;
  const expected = originH + Math.max(dest.hours, masterDestH) + driveH + extraTripsH + fixedH;
  const p = cfg.pricing.billing;
  const billedH = Math.max(p.minimumBillableH, ceilTo(crewH, p.stepH));
  const windowH = guaranteedWindowH(expected, ctx.sigma, cfg);

  const pricing = priceLines({ order, vol, vehicle, vehicleCount: count, crew, billedH, route: ctx.route, survey: ctx.survey }, cfg);
  const fill = vol.base / (vehicle.usableM3 * count * trips);
  return {
    vehicle,
    count,
    trips,
    parkedAway,
    crew,
    origin,
    dest,
    masterOriginH,
    masterDestH,
    driveH,
    extraTripsH,
    fixedH,
    expectedH: expected,
    crewH,
    billedH,
    windowH,
    pricing,
    fillPct: Math.round(Math.min(1, fill) * 100),
    limitedBy: byKg > byVol ? 'weight' : 'volume',
  };
}

/** Search the cheapest feasible plan. Returns the winner and all candidates of the winning vehicle setup. */
export function bestPlan(order: OrderInput, vol: VolumeResult, ctx: EvalContext, cfg: Cfg): { best: Candidate; sameSetup: Candidate[] } {
  const P = cfg.pricing.crew;
  const nMin = minCrew(vol, cfg);
  const crews: number[] = [];
  for (let n = nMin; n <= Math.max(nMin, P.maxMovers); n++) crews.push(n);
  const vehicles = cfg.vehicles.vehicles.filter((v) => v.enabled);

  const all: Candidate[] = [];
  for (const v of vehicles) {
    const single = crews.map((n) => candidate(order, vol, v, 1, n, ctx, cfg)).filter((c): c is Candidate => c !== null);
    all.push(...single);
    if (!single.some((c) => c.trips === 1)) {
      all.push(...crews.map((n) => candidate(order, vol, v, 2, n, ctx, cfg)).filter((c): c is Candidate => c !== null));
    }
  }
  if (all.length === 0) {
    // nothing fits the rules (e.g. a very large house): take the biggest vehicle anyway, the warning tells the client
    const biggest = [...vehicles].sort((a, b) => b.usableM3 - a.usableM3)[0];
    const relaxed = {
      ...cfg,
      vehicles: { ...cfg.vehicles, selection: { ...cfg.vehicles.selection, maxTrips: 99, secondTripMaxDriveMin: 1e9 } },
    };
    all.push(...crews.map((n) => candidate(order, vol, biggest, 2, n, ctx, relaxed)!));
  }

  const forced = ctx.forcedCrew && ctx.forcedCrew >= nMin ? ctx.forcedCrew : undefined;
  const workday = cfg.time.buffer.workdayMaxH;
  const pool0 = forced ? all.filter((c) => c.crew === forced) : all;
  const pool = pool0.length ? pool0 : all;
  const feasible = pool.filter((c) => c.windowH <= workday);
  const ranked = (feasible.length ? feasible : pool)
    .slice()
    .sort(
      (a, b) =>
        a.pricing.totalBani - b.pricing.totalBani || a.trips - b.trips || a.windowH - b.windowH || a.vehicle.usableM3 - b.vehicle.usableM3,
    );
  const cheapest = ranked[0];
  // within 3% of the cheapest price prefer fewer trips, then a shorter window (D8)
  const near = ranked.filter((c) => c.pricing.totalBani <= cheapest.pricing.totalBani * 1.03);
  const best = near.sort((a, b) => a.trips - b.trips || a.windowH - b.windowH || a.pricing.totalBani - b.pricing.totalBani)[0];
  const sameSetup = all.filter((c) => c.vehicle.id === best.vehicle.id && c.count === best.count).sort((a, b) => a.crew - b.crew);
  return { best, sameSetup };
}

function totalFor(order: OrderInput, vol: VolumeResult, ctx: EvalContext, cfg: Cfg): number {
  return bestPlan(order, vol, ctx, cfg).best.pricing.totalBani;
}

function breakdown(c: Candidate): Explain[] {
  const r = (x: number) => Math.round(x * 100) / 100;
  const out: Explain[] = [
    {
      key: 'time.load',
      params: {
        hours: r(Math.max(c.origin.hours, c.masterOriginH)),
        m3: r(c.origin.vLift + c.origin.vStairs),
        floors: c.origin.floors,
        lift: c.origin.liftClass ?? 'none',
        fLift: r(c.origin.fLift),
        fStairs: r(c.origin.fStairs),
        fCarry: r(c.origin.fCarry),
        crew: c.crew,
      },
    },
    {
      key: 'time.unload',
      params: {
        hours: r(c.dest.hours),
        m3: r(c.dest.vLift + c.dest.vStairs),
        floors: c.dest.floors,
        lift: c.dest.liftClass ?? 'none',
        fLift: r(c.dest.fLift),
        fStairs: r(c.dest.fStairs),
        fCarry: r(c.dest.fCarry),
        crew: c.crew,
      },
    },
    { key: 'time.drive', params: { hours: r(c.driveH) } },
    { key: 'time.fixed', params: { hours: r(c.fixedH) } },
  ];
  if (c.extraTripsH > 0) out.push({ key: 'time.extraTrips', params: { hours: r(c.extraTripsH), trips: c.trips } });
  if (c.masterDestH > 0) out.push({ key: 'time.masterAssembly', params: { hours: r(c.masterDestH) } });
  if (c.masterOriginH > 0) out.push({ key: 'time.masterDisassembly', params: { hours: r(c.masterOriginH) } });
  if (c.origin.liftH > c.origin.crewH) out.push({ key: 'time.liftBottleneck', params: { end: 'from', hours: r(c.origin.liftH) } });
  if (c.dest.liftH > c.dest.crewH) out.push({ key: 'time.liftBottleneck', params: { end: 'to', hours: r(c.dest.liftH) } });
  return out;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function estimate(input: OrderInput, cfg: Cfg): Estimate {
  const rules = applyRules(input, cfg.rules);
  const order = rules.order;
  const survey = surveyMethod(order);
  const vol = computeVolume(order, cfg, survey);
  const route = routeInfo(order, cfg);
  const ctx: EvalContext = { survey, sigma: sigmaFor(rules, vol, cfg), route, forcedCrew: order.crew };
  const { best, sameSetup } = bestPlan(order, vol, ctx, cfg);
  const base = best.pricing.totalBani;

  // scenarios: price for every possible answer of each assumed field (pricing variant B)
  const scenarios: Scenario[] = rules.assumptions.map((a) => ({
    path: a.path,
    assumed: a.value,
    options: a.options.map((value) => {
      const total = value === a.value ? base : totalFor(setPath(order, a.path, value), vol, ctx, cfg);
      return { value, total, delta: total - base };
    }),
  }));

  // range (variant A) ≈ P10–P90: volume bounds and each unknown answer are independent factors,
  // so their deltas combine as root-sum-square instead of stacking every worst case at once.
  const dVolHigh = totalFor(order, scaleVolume(vol, vol.high), ctx, cfg) - base;
  const dVolLow = totalFor(order, scaleVolume(vol, vol.low), ctx, cfg) - base;
  let up2 = Math.max(0, dVolHigh) ** 2;
  let down2 = Math.min(0, dVolLow) ** 2;
  let worstOrder = order;
  for (const s of scenarios) {
    const deltas = s.options.map((o) => o.delta);
    up2 += Math.max(0, ...deltas) ** 2;
    down2 += Math.min(0, ...deltas) ** 2;
    const worst = s.options.reduce((a, b) => (b.total > a.total ? b : a));
    worstOrder = setPath(worstOrder, s.path, worst.value);
  }
  // full worst case (every unknown at its worst + max volume) — shown in pricing variant B
  const worstTotal = Math.max(base, totalFor(worstOrder, scaleVolume(vol, vol.high), ctx, cfg));
  const step = cfg.pricing.rounding.rangeLei;
  const low = toBani(floorTo((base - Math.sqrt(down2)) / 100, step));
  const high = toBani(ceilTo((base + Math.sqrt(up2)) / 100, step));
  const worst = toBani(ceilTo(worstTotal / 100, step));

  const reasons: Explain[] = [];
  if (vol.source !== 'list')
    reasons.push({ key: 'range.volumePreset', params: { min: Math.round(vol.low * 10) / 10, max: Math.round(vol.high * 10) / 10 } });
  else
    reasons.push({
      key: `range.volumeList.${survey}`,
      params: {
        lowPct: Math.round(cfg.pricing.range.volumeLow[survey] * 100),
        highPct: Math.round(cfg.pricing.range.volumeHigh[survey] * 100),
      },
    });
  for (const s of scenarios) {
    const spread = Math.max(...s.options.map((o) => o.total)) - Math.min(...s.options.map((o) => o.total));
    if (spread > 0)
      reasons.push({ key: 'range.assumption', params: { path: s.path, assumed: String(s.assumed), spreadLei: Math.round(spread / 100) } });
  }

  // warnings and tasks
  const warnings: Explain[] = [];
  const tasks = [...rules.tasks];
  for (const [end, r] of [
    ['from', best.origin],
    ['to', best.dest],
  ] as const) {
    for (const nf of r.noFit)
      warnings.push({ key: `warn.noFitLift.${nf.reason}`, params: { item: nf.itemId, end, lift: r.liftClass ?? '' } });
  }
  for (const l of vol.items)
    if (l.item.disassembly === 'required' && !l.byUs) warnings.push({ key: 'warn.selfDisassembly', params: { item: l.item.id } });
  for (const end of best.parkedAway) {
    const rule = accessFor(cfg, order[end]?.zoneId);
    warnings.push({
      key: 'warn.parkedAway',
      params: { end, vehicle: best.vehicle.id, meters: rule?.extraCarryM ?? 0, maxT: rule?.maxGrossWeightT ?? 0 },
    });
  }
  const cityRule = cfg.zones.cityAccessRule ? cfg.zones.accessRules[cfg.zones.cityAccessRule] : undefined;
  if (cityRule?.permitAboveT !== undefined && best.vehicle.grossWeightT > cityRule.permitAboveT)
    tasks.push({ code: 'REQUEST_ACCESS_PERMIT' });
  if (best.windowH > cfg.time.buffer.workdayMaxH)
    warnings.push({ key: 'warn.exceedsWorkday', params: { windowH: best.windowH, max: cfg.time.buffer.workdayMaxH } });
  if (order.schedule?.fullDay && best.billedH > cfg.pricing.fullDay.hours)
    warnings.push({ key: 'warn.fullDayExceeded', params: { hours: best.billedH } });
  if (input.crew && input.crew < minCrew(vol, cfg)) warnings.push({ key: 'warn.crewMin', params: { min: minCrew(vol, cfg) } });
  for (const f of rules.forced)
    warnings.push({ key: 'warn.forcedOption', params: { path: f.path, from: String(f.from), to: String(f.to), rule: f.ruleId } });
  if (route.intercity && !order.distanceKm) warnings.push({ key: 'warn.intercityDistanceAssumed', params: { km: Math.round(route.km) } });

  // timeline
  const date = order.schedule?.date;
  const crates = order.packing?.containers === 'crates';
  const events: Estimate['timeline'] = [];
  const P = cfg.pricing;
  if (crates || survey === 'onsite')
    events.push({ kind: crates ? 'cratesDelivery' : 'survey', dayOffset: -P.crates.deliveryDaysBeforeMove });
  if ((order.packing?.who ?? 'self') !== 'self') events.push({ kind: 'packing', dayOffset: -1 });
  events.push({ kind: 'move', dayOffset: 0 });
  if (crates) events.push({ kind: 'cratesPickup', dayOffset: order.packing?.crateDays ?? P.crates.includedDays });
  const timeline = events.map((e) => (date ? { ...e, date: addDays(date, e.dayOffset) } : e));

  const capTolerance = survey === 'none' ? null : P.survey[survey].capTolerance;
  const r1 = (x: number) => Math.round(x * 10) / 10;

  return {
    configVersion: cfg.version,
    rulesVersion: cfg.rules.version,
    price: {
      kind: 'range',
      base,
      low,
      high,
      worst: Math.max(worst, high),
      vat: best.pricing.vatBani,
      ...(capTolerance !== null && survey !== 'none' ? { afterSurvey: { capTolerance, method: survey } } : {}),
      reasons,
    },
    volume: { m3: r1(vol.base), low: r1(vol.low), high: r1(vol.high), weightKg: vol.weightKg, source: vol.source, boxes: vol.boxes },
    vehicle: {
      id: best.vehicle.id,
      count: best.count,
      trips: best.trips,
      fillPct: best.fillPct,
      parkedAway: best.parkedAway,
      explain: {
        key: best.parkedAway.length
          ? 'vehicle.reasonAccess'
          : best.limitedBy === 'weight'
            ? 'vehicle.reasonWeight'
            : 'vehicle.reasonVolume',
        params: {
          vehicle: best.vehicle.id,
          m3: r1(vol.base),
          usable: best.vehicle.usableM3,
          kg: vol.weightKg,
          payload: best.vehicle.payloadKg,
          fill: best.fillPct,
          trips: best.trips,
          count: best.count,
        },
      },
    },
    crew: {
      size: best.crew,
      alternatives: sameSetup.map((c) => ({ size: c.crew, total: c.pricing.totalBani, windowH: c.windowH })),
      explain: {
        key: order.crew ? 'crew.chosenByClient' : 'crew.reason',
        params: { crew: best.crew, windowH: best.windowH, min: minCrew(vol, cfg) },
      },
    },
    time: {
      expectedH: ceilTo(best.expectedH, cfg.time.buffer.estimateRoundingH),
      windowH: best.windowH,
      billedH: best.billedH,
      breakdown: breakdown(best),
    },
    overtime: { perHour: best.pricing.overtimePerHourBani, stepMin: Math.round(P.billing.stepH * 60) },
    lines: best.pricing.lines,
    included: P.includedFree,
    assumptions: rules.assumptions.map((a) => ({
      path: a.path,
      value: a.value,
      explain: { key: a.explain, params: { path: a.path, value: String(a.value) } },
    })),
    scenarios,
    tasks,
    warnings,
    hints: rules.hints.map((key) => ({ key })),
    timeline,
  };
}
