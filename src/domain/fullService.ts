/**
 * "Ne ocupăm de tot" (decisions D31): the landing shows "from X lei" per home size. X is the low end
 * of a typical full-service move (everything packed by the crew, reusable crates, a specialist
 * visit) at the published rates, times the full-service margin, rounded up. The margin itself is
 * never shown.
 */
import type { OrderInput } from '@/contract/order';
import type { Cfg } from '@/config';
import { estimate } from './estimate';
import { ceilTo, toBani } from './money';

export function fullServiceOrder(presetId: string, cfg: Cfg): OrderInput {
  const R = cfg.pricing.fullService.reference;
  const end = {
    floor: R.floor,
    elevator: 'medium',
    furnitureInLift: 'yes',
    carry: 'lt10',
    parking: 'atEntrance',
    stairs: 'normal',
  } as const;
  return {
    v: 1,
    mode: 'detailed',
    taskType: 'apartment',
    size: { presetId },
    from: { zoneId: R.fromZoneId, ...end },
    to: { zoneId: R.toZoneId, ...end },
    inventory: { mode: 'preset' },
    packing: { who: 'full', containers: 'crates' },
    survey: { method: 'onsite' },
    protection: { level: 'basic' },
  };
}

/** "From" price for one home size, in bani like every domain amount. */
export function fullServiceFrom(presetId: string, cfg: Cfg): number {
  const F = cfg.pricing.fullService;
  const low = estimate(fullServiceOrder(presetId, cfg), cfg).price.low;
  return ceilTo(low * F.multiplier, toBani(F.roundUpLei));
}
