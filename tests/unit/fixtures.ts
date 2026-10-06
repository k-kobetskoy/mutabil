import type { OrderInput } from '@/contract/order';

/** Typical scenarios from the brief (ТЗ «Нефункциональные требования»). */
export const studioNoLift: OrderInput = {
  v: 1,
  mode: 'detailed',
  taskType: 'apartment',
  size: { presetId: 'garsoniera' },
  from: { zoneId: 'manastur', floor: 3, elevator: 'none', carry: 'lt10', parking: 'atEntrance', stairs: 'normal' },
  to: { zoneId: 'marasti', floor: 2, elevator: 'none', carry: 'lt10', parking: 'atEntrance', stairs: 'normal' },
  inventory: { mode: 'preset' },
  packing: { who: 'self', containers: 'own' },
  protection: { level: 'basic' },
  survey: { method: 'none' },
  schedule: { date: '2026-11-04', slot: 'morning' },
};

export const twoRoomsLiftCrates: OrderInput = {
  v: 1,
  mode: 'detailed',
  taskType: 'apartment',
  size: { presetId: 'apartament-2-camere' },
  from: {
    zoneId: 'gheorgheni',
    floor: 4,
    elevator: 'medium',
    furnitureInLift: 'yes',
    carry: 'lt10',
    parking: 'atEntrance',
    stairs: 'normal',
  },
  to: { zoneId: 'zorilor', floor: 6, elevator: 'large', furnitureInLift: 'yes', carry: '10to30', parking: 'nearby', stairs: 'normal' },
  inventory: {
    mode: 'list',
    items: {
      'wardrobe-2-door': 1,
      'bed-double-frame': 1,
      'mattress-double': 1,
      'sofa-3-seat': 1,
      'dining-table': 1,
      'dining-chair': 4,
      tv: 1,
      'washing-machine': 1,
      'fridge-standard': 1,
      desk: 1,
      'kallax-2x4': 2,
    },
    boxes: 35,
    kallaxInserts: 8,
  },
  packing: { who: 'self', containers: 'crates', mattressBagsDouble: 1, tvProtection: 1 },
  assembly: { items: { 'wardrobe-2-door': 1, 'bed-double-frame': 1 } },
  protection: { level: 'basic' },
  survey: { method: 'onsite' },
  schedule: { date: '2026-11-05', slot: 'morning' },
};

export const singleSofa: OrderInput = {
  v: 1,
  mode: 'detailed',
  taskType: 'items',
  from: { zoneId: 'zorilor', floor: 1, elevator: 'none', carry: 'lt10', parking: 'atEntrance', stairs: 'normal' },
  to: { zoneId: 'marasti', floor: 0, carry: 'lt10', parking: 'atEntrance' },
  inventory: { mode: 'list', items: { 'sofa-3-seat': 1 } },
  protection: { level: 'basic' },
  survey: { method: 'none' },
  schedule: { date: '2026-11-04', slot: 'afternoon' },
};

export const fullPacking: OrderInput = {
  v: 1,
  mode: 'detailed',
  taskType: 'apartment',
  size: { presetId: 'apartament-3-camere' },
  from: { zoneId: 'grigorescu', floor: 2, elevator: 'none', carry: '10to30', parking: 'nearby', stairs: 'normal' },
  to: { zoneId: 'floresti', floor: 3, elevator: 'large', furnitureInLift: 'yes', carry: 'lt10', parking: 'atEntrance', stairs: 'normal' },
  inventory: { mode: 'preset' },
  packing: { who: 'full', containers: 'cardboard', wardrobeBoxes: 4, tvProtection: 1, mirrorProtection: 2 },
  protection: { level: 'full', declaredValueLei: 60000 },
  special: [
    { kind: 'fragile', label: 'vase' },
    { kind: 'pristine', declaredValueLei: 8000 },
  ],
  survey: { method: 'remote' },
  schedule: { date: '2026-11-06', slot: 'morning' },
};

export const quickTwoRooms: OrderInput = {
  v: 1,
  mode: 'quick',
  taskType: 'apartment',
  size: { presetId: 'apartament-2-camere' },
  from: { floor: 4, elevator: 'unknown' },
  to: { floor: 3, elevator: 'none' },
  route: 'city',
};
