import { describe, expect, it } from 'vitest';
import { getConfig } from '@/config';
import { estimate } from '@/domain/estimate';
import { fullServiceFrom, fullServiceOrder } from '@/domain/fullService';

describe('full-service "from" price (D31)', () => {
  const cfg = getConfig();
  const F = cfg.pricing.fullService;

  it('is the low end of a fully packed move with crates, times the margin, rounded up', () => {
    for (const id of F.presets) {
      const low = estimate(fullServiceOrder(id, cfg), cfg).price.low;
      const from = fullServiceFrom(id, cfg);
      expect(from).toBeGreaterThanOrEqual(low * F.multiplier);
      expect(from % (F.roundUpLei * 100)).toBe(0);
      expect(from - low * F.multiplier).toBeLessThan(F.roundUpLei * 100);
    }
  });

  it('grows with the size of the home', () => {
    const prices = F.presets.map((id) => fullServiceFrom(id, cfg));
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
    expect(new Set(prices).size).toBe(prices.length);
  });

  it('uses only presets and zones that exist', () => {
    const presetIds = new Set(cfg.catalog.presets.map((p) => p.id));
    const zoneIds = new Set(cfg.zones.zones.map((z) => z.id));
    for (const id of F.presets) expect(presetIds.has(id)).toBe(true);
    expect(zoneIds.has(F.reference.fromZoneId) && zoneIds.has(F.reference.toZoneId)).toBe(true);
  });
});
