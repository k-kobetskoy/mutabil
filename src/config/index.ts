/**
 * Loads config/*.json, unwraps provenance wrappers and validates with Zod.
 * Domain functions receive the resulting `Cfg` as a parameter (no hidden globals), so tests can
 * pass modified configs and the future Go service can mirror the same shape.
 */
import pricingRaw from '../../config/pricing.json';
import timeRaw from '../../config/time.json';
import elevatorsRaw from '../../config/elevators.json';
import vehiclesRaw from '../../config/vehicles.json';
import catalogRaw from '../../config/catalog.json';
import zonesRaw from '../../config/zones.json';
import appRaw from '../../config/app.json';
import rulesRaw from '../../config/rules.json';
import stepsRaw from '../../config/steps.json';
import { unwrap } from './unwrap';
import { AppConfig, CatalogConfig, ElevatorsConfig, PricingConfig, TimeConfig, VehiclesConfig, ZonesConfig } from './schema';
import { parseRules, type RulesConfig } from '@/domain/rules/engine';
import { StepsConfig } from '@/domain/flow/steps';

export const RAW_CONFIGS = {
  pricing: pricingRaw,
  time: timeRaw,
  elevators: elevatorsRaw,
  vehicles: vehiclesRaw,
  catalog: catalogRaw,
  zones: zonesRaw,
  app: appRaw,
  rules: rulesRaw,
  steps: stepsRaw,
} as const;

export type Cfg = {
  pricing: PricingConfig;
  time: TimeConfig;
  elevators: ElevatorsConfig;
  vehicles: VehiclesConfig;
  catalog: CatalogConfig;
  zones: ZonesConfig;
  app: AppConfig;
  rules: RulesConfig;
  steps: StepsConfig;
  version: string;
};

export function loadConfig(raw: Record<keyof typeof RAW_CONFIGS, unknown> = RAW_CONFIGS): Cfg {
  const pricing = PricingConfig.parse(unwrap(raw.pricing));
  const time = TimeConfig.parse(unwrap(raw.time));
  const elevators = ElevatorsConfig.parse(unwrap(raw.elevators));
  const vehicles = VehiclesConfig.parse(unwrap(raw.vehicles));
  const catalog = CatalogConfig.parse(unwrap(raw.catalog));
  const zones = ZonesConfig.parse(unwrap(raw.zones));
  const app = AppConfig.parse(unwrap(raw.app));
  const rules = parseRules(unwrap(raw.rules));
  const steps = StepsConfig.parse(unwrap(raw.steps));
  const version = [pricing.version, time.version, catalog.version, vehicles.version].join('+');
  return { pricing, time, elevators, vehicles, catalog, zones, app, rules, steps, version };
}

let cached: Cfg | undefined;
/** Lazily parsed default config (from the repository's config/ folder). */
export function getConfig(): Cfg {
  cached ??= loadConfig();
  return cached;
}
