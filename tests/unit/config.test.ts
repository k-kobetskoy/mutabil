import { describe, expect, it } from 'vitest';
import { loadConfig, RAW_CONFIGS } from '@/config';
import { unwrappedNumbers } from '@/config/unwrap';

describe('config files', () => {
  it('parse and validate against their schemas', () => {
    const cfg = loadConfig();
    expect(cfg.vehicles.vehicles.length).toBeGreaterThan(3);
    expect(cfg.catalog.items.length).toBeGreaterThan(30);
  });

  it('every rate/coefficient has provenance (wrapped or inside a row with source/verified)', () => {
    // app (UI limits), rules and steps (logic) hold no business numbers
    const business = ['pricing', 'time', 'elevators', 'vehicles', 'catalog', 'zones'] as const;
    for (const name of business) {
      const raw = RAW_CONFIGS[name];
      expect(unwrappedNumbers(raw, name)).toEqual([]);
    }
  });

  it('nothing is marked verified yet (placeholders until checked)', () => {
    const verifiedTrue = JSON.stringify(RAW_CONFIGS).match(/"verified":true/g) ?? [];
    expect(verifiedTrue.length).toBe(0);
  });

  it('catalog ids are unique and assembly classes are priced', () => {
    const cfg = loadConfig();
    const ids = cfg.catalog.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const i of cfg.catalog.items) if (i.assemblyClass) expect(cfg.pricing.assembly.perClassLei[i.assemblyClass]).toBeGreaterThan(0);
  });
});
