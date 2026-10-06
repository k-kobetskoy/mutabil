/**
 * Price lines (decisions D9, D12–D15). Hours inside, sum outside: time-driven lines are
 * rate × billed hours, the rest are fixed lines. Each line carries an explanation (i18n key+params).
 */
import type { OrderInput } from '@/contract/order';
import type { EstimateLine, Explain } from '@/contract/estimate';
import type { Cfg } from '@/config';
import type { Vehicle } from '@/config/schema';
import type { RouteInfo } from './route';
import type { SurveyMethod, VolumeResult } from './volume';
import { ceilTo, leiLine, toBani } from './money';

export type PricingInput = {
  order: OrderInput;
  vol: VolumeResult;
  vehicle: Vehicle;
  vehicleCount: number;
  crew: number;
  billedH: number;
  route: RouteInfo;
  survey: SurveyMethod;
};

export type PricingResult = {
  lines: EstimateLine[];
  totalBani: number;
  vatBani: number;
  overtimePerHourBani: number;
  weekend: boolean;
  fullDay: boolean;
};

export function isWeekend(date: string | undefined): boolean {
  if (!date) return false;
  const d = new Date(`${date}T12:00:00Z`).getUTCDay();
  return d === 0 || d === 6;
}

export function boxesPackedByUs(order: OrderInput, vol: VolumeResult, cfg: Cfg): number {
  const who = order.packing?.who ?? 'self';
  if (who === 'full') return vol.boxes;
  if (who === 'partial') return Math.round(vol.boxes * cfg.pricing.packing.partialShare);
  return 0;
}

export function crateCount(order: OrderInput, vol: VolumeResult, cfg: Cfg): number {
  if (order.packing?.containers !== 'crates') return 0;
  return Math.max(cfg.pricing.crates.minCrates, vol.boxes);
}

export function declaredValue(order: OrderInput, vol: VolumeResult, cfg: Cfg): number {
  const p = cfg.pricing.protection;
  return Math.max(order.protection?.declaredValueLei ?? 0, p.minDeclaredLei, Math.ceil(vol.base * p.minDeclaredPerM3Lei));
}

export function priceLines(input: PricingInput, cfg: Cfg): PricingResult {
  const { order, vol, vehicle, vehicleCount, crew, billedH, route, survey } = input;
  const P = cfg.pricing;
  const step = P.rounding.lineLei;
  const lines: EstimateLine[] = [];
  const add = (id: EstimateLine['id'], lei: number, explain: Explain, extra: Partial<EstimateLine> = {}) => {
    const amount = leiLine(lei, step);
    if (amount !== 0) lines.push({ id, amount, explain, ...extra });
  };

  const fullDay = order.schedule?.fullDay === true;
  const hours = fullDay ? Math.max(P.fullDay.hours, billedH) : billedH;
  const vehicleLei = vehicle.hourlyLei * vehicleCount * hours;
  const crewLei = crew * P.crew.moverHourlyLei * hours;
  add(
    'transport',
    vehicleLei,
    { key: 'lines.transport', params: { vehicle: vehicle.id, count: vehicleCount, rate: vehicle.hourlyLei, hours } },
    { step: 'items' },
  );
  add('crew', crewLei, { key: 'lines.crew', params: { crew, rate: P.crew.moverHourlyLei, hours } }, { step: 'access' });
  let timeLei = vehicleLei + crewLei;
  if (fullDay) {
    const discount = -(vehicle.hourlyLei * vehicleCount + crew * P.crew.moverHourlyLei) * P.fullDay.hours * P.fullDay.discount;
    add(
      'fullDayDiscount',
      discount,
      { key: 'lines.fullDayDiscount', params: { hours: P.fullDay.hours, pct: Math.round(P.fullDay.discount * 100) } },
      { step: 'when' },
    );
    timeLei += discount;
  }
  const weekend = isWeekend(order.schedule?.date);
  if (weekend)
    add(
      'weekend',
      timeLei * P.surcharges.weekend,
      { key: 'lines.weekend', params: { pct: Math.round(P.surcharges.weekend * 100) } },
      { step: 'when' },
    );

  add(
    'dispatch',
    P.dispatch.feeByZoneClassLei[route.fromClass],
    { key: 'lines.dispatch', params: { zoneClass: route.fromClass } },
    { step: 'access' },
  );
  if (route.intercity)
    add(
      'intercity',
      P.dispatch.perKmIntercityLei * route.km,
      { key: 'lines.intercity', params: { km: Math.round(route.km), rate: P.dispatch.perKmIntercityLei } },
      { step: 'access' },
    );

  const packed = boxesPackedByUs(order, vol, cfg);
  if (packed > 0)
    add(
      'packing',
      packed * P.packing.perBoxLei,
      { key: 'lines.packing', params: { boxes: packed, rate: P.packing.perBoxLei, who: order.packing?.who ?? 'self' } },
      { step: 'services' },
    );

  // materials (and reinforced packing of special items unless full protection shows them separately)
  const pk = order.packing ?? {};
  const m = P.materials;
  const matDetails: Explain[] = [];
  let matLei = 0;
  const mat = (qty: number | undefined, rate: number, key: string) => {
    if (!qty) return;
    matLei += qty * rate;
    matDetails.push({ key, params: { qty, rate } });
  };
  if (pk.containers === 'cardboard') mat(vol.boxes, m.cardboardBoxLei, 'materials.cardboard');
  mat(pk.wardrobeBoxes, m.wardrobeBoxRentalLei, 'materials.wardrobeBox');
  mat(pk.mattressBagsDouble, m.mattressBagDoubleLei, 'materials.mattressBagDouble');
  mat(pk.mattressBagsSingle, m.mattressBagSingleLei, 'materials.mattressBagSingle');
  mat(pk.tvProtection, m.tvProtectionLei, 'materials.tv');
  mat(pk.mirrorProtection, m.mirrorProtectionLei, 'materials.mirror');
  const full = order.protection?.level === 'full';
  const special = order.special ?? [];
  const specialLei = special.reduce((s, it) => s + P.special.reinforcedPackingLei[it.kind], 0);
  if (!full && special.length) {
    matLei += specialLei;
    matDetails.push({ key: 'materials.special', params: { qty: special.length } });
  }
  if (matLei > 0) add('materials', matLei, { key: 'lines.materials' }, { details: matDetails, step: 'services' });

  const crates = crateCount(order, vol, cfg);
  if (crates > 0) {
    const c = P.crates;
    const days = pk.crateDays ?? c.includedDays;
    const extraDays = Math.max(0, days - c.includedDays);
    add(
      'crates',
      crates * c.perCrateIncludedLei + crates * extraDays * c.extraPerCratePerDayLei,
      {
        key: 'lines.crates',
        params: { crates, rate: c.perCrateIncludedLei, includedDays: c.includedDays, extraDays, extraRate: c.extraPerCratePerDayLei },
      },
      { step: 'services' },
    );
  }

  const asm = Object.entries(order.assembly?.items ?? {});
  if (asm.length) {
    let lei = 0;
    const details: Explain[] = [];
    for (const [id, qty] of asm) {
      const item = cfg.catalog.items.find((i) => i.id === id);
      const price = P.assembly.perClassLei[item?.assemblyClass ?? 'generic'] ?? P.assembly.perClassLei.generic;
      lei += price * qty;
      details.push({ key: 'assembly.item', params: { item: id, qty, rate: price } });
    }
    if (order.assembly?.disassembleOnMovingDay) {
      lei += P.assembly.masterOnMovingDayLei;
      details.push({ key: 'assembly.masterOnMovingDay', params: { rate: P.assembly.masterOnMovingDayLei } });
    }
    add('assembly', lei, { key: 'lines.assembly', params: { items: asm.reduce((s, [, q]) => s + q, 0) } }, { details, step: 'services' });
  }

  if (full && special.length) {
    add(
      'special',
      specialLei,
      { key: 'lines.special', params: { qty: special.length } },
      {
        details: special.map((s) => ({
          key: `special.${s.kind}`,
          params: { rate: P.special.reinforcedPackingLei[s.kind], declared: s.declaredValueLei ?? 0 },
        })),
        step: 'items',
      },
    );
  }

  if (full) {
    const pr = P.protection;
    const declared = declaredValue(order, vol, cfg);
    const rate = order.protection?.deductible ? pr.fullRateWithDeductible : pr.fullRate;
    add(
      'protection',
      Math.max(pr.minFeeLei, declared * rate),
      {
        key: 'lines.protection',
        params: {
          declared,
          ratePct: Math.round(rate * 1000) / 10,
          deductible: order.protection?.deductible ? pr.deductibleLei : 0,
          minFee: pr.minFeeLei,
        },
      },
      { step: 'protection' },
    );
  }

  const sv = P.survey[survey];
  if (sv.priceLei > 0) {
    add('survey', sv.priceLei, { key: `lines.survey.${survey}`, params: { rate: sv.priceLei } }, { step: 'protection' });
    if (sv.deductibleFromOrder)
      add(
        'surveyCredit',
        -sv.priceLei,
        { key: 'lines.surveyCredit', params: { days: P.survey.onsite.deductibleValidDays } },
        { step: 'protection' },
      );
  }

  let subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const minimum = toBani(P.minimumOrderLei);
  if (subtotal < minimum) {
    lines.push({
      id: 'minimumOrder',
      amount: minimum - subtotal,
      explain: { key: 'lines.minimumOrder', params: { min: P.minimumOrderLei } },
    });
    subtotal = minimum;
  }

  const totalBani = toBani(ceilTo(subtotal / 100, P.rounding.totalLei));
  const vatBani = Math.round((totalBani * P.vat.rate) / (1 + P.vat.rate));
  const overtimeLei =
    (vehicle.hourlyLei * vehicleCount + crew * P.crew.moverHourlyLei) * P.overtime.multiplier * (weekend ? 1 + P.surcharges.weekend : 1);
  return { lines, totalBani, vatBani, overtimePerHourBani: leiLine(overtimeLei, step), weekend, fullDay };
}
