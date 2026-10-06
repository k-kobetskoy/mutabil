import type { OrderInput } from '@/contract/order';
import { fullPacking, quickTwoRooms, singleSofa, studioNoLift, twoRoomsLiftCrates } from './unit/fixtures';

/** Named inputs turned into golden vectors (contract/fixtures). Add a case here, run pnpm vectors:gen. */
export const VECTORS: Record<string, OrderInput> = {
  'studio-no-lift': studioNoLift,
  'two-rooms-lift-crates': twoRoomsLiftCrates,
  'single-sofa': singleSofa,
  'full-packing': fullPacking,
  'quick-two-rooms-unknown-lift': quickTwoRooms,
  'crates-force-onsite': { ...twoRoomsLiftCrates, survey: { method: 'remote' } },
  'zona0-house': { ...fullPacking, taskType: 'house', size: { presetId: 'casa' }, from: { ...fullPacking.from, zoneId: 'centru' } },
  'piano-weekend': {
    ...singleSofa,
    inventory: { mode: 'list', items: { 'piano-upright': 1 } },
    schedule: { date: '2026-11-07', slot: 'morning' },
  },
  'intercity-quick': {
    v: 1,
    mode: 'quick',
    taskType: 'apartment',
    size: { presetId: 'apartament-1-camera' },
    from: { floor: 1, elevator: 'none' },
    to: { floor: 0 },
    route: 'intercity',
  },
  'empty-live-preview': { v: 1, mode: 'quick', taskType: 'apartment', size: { presetId: 'garsoniera' } },
};
