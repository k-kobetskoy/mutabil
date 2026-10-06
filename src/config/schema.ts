/**
 * Zod schemas of the UNWRAPPED config files (see unwrap.ts). They validate config/*.json at
 * load time and in tests, so a typo in a rate fails fast instead of producing a wrong price.
 */
import * as z from 'zod';

const num = z.number().finite();
const pos = num.nonnegative();
const frac = num.min(0).max(1);
const I18n = z.object({ ro: z.string(), en: z.string() });
const Dims = z.object({ w: pos, d: pos, h: pos });
const provenance = { source: z.string(), verified: z.boolean(), note: z.string().optional() };

export const PricingConfig = z.object({
  version: z.string(),
  currency: z.literal('RON'),
  vat: z.object({ rate: frac, pricesIncludeVat: z.literal(true) }),
  rounding: z.object({ lineLei: pos, totalLei: pos, rangeLei: pos }),
  crew: z.object({ moverHourlyLei: pos, minMovers: z.int().min(1), maxMovers: z.int().min(2) }),
  billing: z.object({ minimumBillableH: pos, stepH: pos }),
  minimumOrderLei: pos,
  dispatch: z.object({
    feeByZoneClassLei: z.object({ city: pos, suburb: pos, intercity: pos }),
    perKmIntercityLei: pos,
  }),
  surcharges: z.object({ weekend: frac }),
  fullDay: z.object({ hours: pos, discount: frac }),
  fullService: z.object({
    multiplier: pos,
    roundUpLei: pos,
    presets: z.array(z.string()).min(1),
    reference: z.object({ fromZoneId: z.string(), toZoneId: z.string(), floor: z.int().min(0) }),
  }),
  overtime: z.object({ multiplier: pos }),
  packing: z.object({ perBoxLei: pos, partialShare: frac }),
  materials: z.object({
    cardboardBoxLei: pos,
    wardrobeBoxRentalLei: pos,
    mattressBagDoubleLei: pos,
    mattressBagSingleLei: pos,
    tvProtectionLei: pos,
    mirrorProtectionLei: pos,
  }),
  crates: z.object({
    includedDays: z.int().min(1),
    perCrateIncludedLei: pos,
    extraPerCratePerDayLei: pos,
    minCrates: z.int().min(0),
    lostOrDamagedLei: pos,
    deliveryDaysBeforeMove: z.int().min(0),
  }),
  assembly: z.object({ masterOnMovingDayLei: pos, perClassLei: z.record(z.string(), pos) }),
  special: z.object({
    reinforcedPackingLei: z.object({ fragile: pos, valuable: pos, pristine: pos, piano: pos }),
  }),
  protection: z.object({
    fullRate: frac,
    fullRateWithDeductible: frac,
    deductibleLei: pos,
    minFeeLei: pos,
    minDeclaredLei: pos,
    minDeclaredPerM3Lei: pos,
    highValueItemLei: pos,
  }),
  includedFree: z.array(z.string()),
  survey: z.object({
    onsite: z.object({ priceLei: pos, deductibleFromOrder: z.boolean(), deductibleValidDays: z.int(), capTolerance: frac }),
    remote: z.object({ priceLei: pos, deductibleFromOrder: z.boolean(), capTolerance: frac }),
    none: z.object({ priceLei: pos, deductibleFromOrder: z.boolean(), capTolerance: z.null() }),
  }),
  range: z.object({
    volumeLow: z.object({ none: frac, remote: frac, onsite: frac }),
    volumeHigh: z.object({ none: pos, remote: pos, onsite: pos }),
  }),
});

export const TimeConfig = z.object({
  version: z.string(),
  productivity: z.object({
    loadRatePerMover: pos,
    unloadRatePerMover: pos,
    crewEfficiency: z.record(z.string(), pos),
  }),
  access: z.object({
    floorPenaltyNoLift: pos,
    progressiveFromFloor: pos,
    progressiveMultiplier: pos,
    stairTypeFactor: z.object({ normal: pos, narrow: pos, winding: pos }),
    raisedEntranceFloors: pos,
    liftPerFloorPenalty: pos,
    freeCarryM: pos,
    carryPenaltyPer10m: pos,
    carryDistanceM: z.object({ lt10: pos, '10to30': pos, gt30: pos }),
    bulkyStairsExtraManMinPerFloor: pos,
  }),
  parking: z.object({
    fixedMinutes: z.object({ atEntrance: pos, nearby: pos, far: pos }),
    extraCarryM: z.object({ atEntrance: pos, nearby: pos, far: pos }),
  }),
  drive: z.object({
    avgUrbanSpeedKmh: pos,
    intercitySpeedKmh: pos,
    detourFactor: pos,
    peakFactor: pos,
    minDriveMin: pos,
    tripSecuringMin: pos,
  }),
  fixed: z.object({ setupMin: pos, teardownMin: pos, liftProtectionMinPerLiftEnd: pos }),
  buffer: z.object({
    sigmaLn: pos,
    quantileZ: pos,
    sigmaAdders: z.record(z.string(), pos),
    minBufferH: pos,
    estimateRoundingH: pos,
    windowRoundingH: pos,
    workdayMaxH: pos,
  }),
  assembly: z.object({ maxParallelMasters: z.int().min(1) }),
});

export const ElevatorClass = z.object({
  id: z.enum(['small', 'medium', 'large']),
  ratedLoadKg: pos,
  persons: z.int(),
  cabinCm: Dims,
  doorCm: z.object({ w: pos, h: pos }),
  timeFactor: pos,
  m3PerTrip: pos,
  cabinLoadSec: pos,
  maxLongThinItemCm: pos,
  ...provenance,
});

export const ElevatorsConfig = z.object({
  version: z.string(),
  unknownFallback: z.enum(['small', 'medium', 'large']),
  fitMarginsCm: z.object({ door: pos, height: pos, floor: pos }),
  longThinMaxThicknessCm: pos,
  longThinMaxWidthCm: pos,
  flexibleExtraLength: frac,
  presetNoFitShare: z.object({ small: frac, medium: frac, large: frac }),
  presetFurnitureShare: frac,
  classes: z.array(ElevatorClass).length(3),
  throughput: z.object({ floorHeightM: pos, liftSpeedMs: pos, doorCycleSec: pos }),
});

export const Vehicle = z.object({
  id: z.string(),
  enabled: z.boolean(),
  grossWeightT: pos,
  licence: z.enum(['B', 'C1', 'C']),
  usableM3: pos,
  payloadKg: pos,
  cargoCm: z.object({ l: pos, w: pos, h: pos }),
  hourlyLei: pos,
  example: z.string(),
  ...provenance,
});

export const VehiclesConfig = z.object({
  version: z.string(),
  selection: z.object({ volumeMargin: frac, payloadMargin: frac, secondTripMaxDriveMin: pos, maxTrips: z.int().min(1) }),
  vehicles: z.array(Vehicle).min(1),
});

export const CatalogItem = z.object({
  id: z.string(),
  category: z.string(),
  name: I18n,
  volumeM3: pos,
  dimensionsCm: Dims.nullable(),
  weightKg: pos,
  disassembly: z.enum(['no', 'optional', 'required']),
  disassemblyMin: pos,
  assemblyMin: pos,
  assemblyClass: z.string().optional(),
  heavy: z.boolean(),
  fragile: z.boolean(),
  canStandOnEnd: z.enum(['yes', 'no', 'caution']),
  flexible: z.boolean().optional(),
  common: z.boolean().optional(),
  packaging: z.array(z.string()),
  minMovers: z.int().optional(),
  surveyRecommended: z.boolean().optional(),
  ...provenance,
});

const PackUnit = z.object({ volumeM3: pos, weightKg: pos, dimensionsCm: Dims, ...provenance });

export const CatalogConfig = z.object({
  version: z.string(),
  loadFactor: pos,
  geometricVolumeFactor: pos,
  densityFallbackKgM3: pos,
  listSmallItemsShare: frac,
  packaging: z.object({ box: PackUnit, crate: PackUnit, wardrobeBox: PackUnit, kallaxInsert: PackUnit }),
  presets: z.array(
    z.object({
      id: z.string(),
      name: I18n,
      description: I18n,
      volumeM3: z.object({ min: pos, typical: pos, max: pos }),
      boxes: z.object({ min: pos, typical: pos, max: pos }),
      ...provenance,
    }),
  ),
  amountModifiers: z.object({ light: pos, normal: pos, heavy: pos }),
  storageExtraM3: pos,
  items: z.array(CatalogItem),
});

export const AccessRule = z.object({
  maxGrossWeightT: pos.nullable(),
  extraCarryM: pos.optional(),
  permitRequired: z.boolean().optional(),
  permitAboveT: pos.optional(),
  ...provenance,
});

export const ZonesConfig = z.object({
  version: z.string(),
  depot: z.object({ lat: num, lng: num, note: z.string().optional() }),
  sameZoneKm: pos,
  intercityDefaultKm: pos,
  quickRouteKm: z.object({ city: pos, suburb: pos, intercity: pos }),
  accessRules: z.record(z.string(), AccessRule),
  cityAccessRule: z.string().optional(),
  zones: z.array(
    z.object({
      id: z.string(),
      code: z.string().min(2).max(4),
      name: I18n,
      class: z.enum(['city', 'suburb', 'intercity']),
      lat: num.nullable(),
      lng: num.nullable(),
      access: z.string().optional(),
      uncertainAccess: z.boolean().optional(),
    }),
  ),
  source: z.string(),
  verified: z.boolean(),
});

export const AppConfig = z.object({
  version: z.string(),
  ui: z.object({ pricingPresentation: z.enum(['range', 'conditional']), maxConditionalLines: z.int().min(1) }),
  media: z.object({ maxPhotos: z.int(), maxVideos: z.int(), maxVideoTotalMb: pos, photoMaxSidePx: z.int(), photoJpegQuality: frac }),
  slots: z.array(z.object({ id: z.enum(['morning', 'midday', 'afternoon']), start: z.string(), peak: z.boolean() })),
  dayEndHour: pos,
  bookingHorizonDays: z.int(),
  draftTtlDays: z.int(),
});

export type PricingConfig = z.infer<typeof PricingConfig>;
export type TimeConfig = z.infer<typeof TimeConfig>;
export type ElevatorsConfig = z.infer<typeof ElevatorsConfig>;
export type ElevatorClass = z.infer<typeof ElevatorClass>;
export type VehiclesConfig = z.infer<typeof VehiclesConfig>;
export type Vehicle = z.infer<typeof Vehicle>;
export type CatalogConfig = z.infer<typeof CatalogConfig>;
export type CatalogItem = z.infer<typeof CatalogItem>;
export type ZonesConfig = z.infer<typeof ZonesConfig>;
export type AppConfig = z.infer<typeof AppConfig>;
