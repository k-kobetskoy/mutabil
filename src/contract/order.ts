/**
 * Order input: everything that affects the estimate. Shareable via link, so it holds
 * NO personal data (no names, phones, exact addresses). Personal data lives in OrderRequest.
 *
 * Contract rules (docs/decisions.md D22): no transform / coerce / date / custom here,
 * money in integer bani, conditional fields via optional + rules.json.
 * An unanswered field (undefined) is treated by the domain like "unknown".
 */
import * as z from 'zod';

export const ElevatorChoice = z
  .enum(['none', 'small', 'medium', 'large', 'unknown'])
  .meta({ id: 'ElevatorChoice', description: 'Elevator class picked by picture. unknown → company clarifies.' });

export const TriState = z.enum(['yes', 'no', 'unknown']).meta({ id: 'TriState' });

export const CarryChoice = z
  .enum(['lt10', '10to30', 'gt30', 'unknown'])
  .meta({ id: 'CarryChoice', description: 'Distance from the van to the building entrance, metres.' });

export const ParkingChoice = z
  .enum(['atEntrance', 'nearby', 'far', 'unknown'])
  .meta({ id: 'ParkingChoice' });

export const StairsChoice = z.enum(['normal', 'narrow', 'winding', 'unknown']).meta({ id: 'StairsChoice' });

export const Endpoint = z
  .object({
    zoneId: z.string().min(1).max(40).optional().meta({ description: 'Zone id from config/zones.json' }),
    floor: z.int().min(0).max(30).optional().meta({ description: 'Romanian count: parter = 0' }),
    elevator: ElevatorChoice.optional(),
    furnitureInLift: TriState.optional().meta({ description: 'Does the building association allow furniture in the lift?' }),
    carry: CarryChoice.optional(),
    parking: ParkingChoice.optional(),
    stairs: StairsChoice.optional(),
    raisedEntrance: z.boolean().optional().meta({ description: 'Steps at the entrance / half-floor lift stops' }),
  })
  .meta({ id: 'Endpoint' });

export const TaskType = z.enum(['apartment', 'house', 'items', 'office']).meta({ id: 'TaskType' });

export const Qty = z.int().min(1).max(99);
export const Count = z.int().min(0).max(400);

export const CustomItem = z
  .object({
    label: z.string().max(60).optional(),
    wCm: z.int().min(1).max(400),
    dCm: z.int().min(1).max(400),
    hCm: z.int().min(1).max(400),
    weightKg: z.int().min(0).max(1000).optional(),
    qty: Qty,
  })
  .meta({ id: 'CustomItem' });

export const SpecialItem = z
  .object({
    kind: z.enum(['fragile', 'valuable', 'pristine', 'piano']),
    label: z.string().max(60).optional(),
    declaredValueLei: z.int().min(0).max(10_000_000).optional(),
  })
  .meta({ id: 'SpecialItem' });

export const OrderInput = z
  .object({
    v: z.literal(1),
    mode: z.enum(['quick', 'detailed']),
    taskType: TaskType.optional(),
    size: z
      .object({
        presetId: z.string().max(40).optional(),
        amount: z.enum(['light', 'normal', 'heavy']).optional(),
        storage: z.boolean().optional(),
        workstations: z.int().min(1).max(200).optional(),
      })
      .optional(),
    route: z
      .enum(['city', 'suburb', 'intercity'])
      .optional()
      .meta({ description: 'Quick mode only: rough route when zones are not chosen' }),
    distanceKm: z.int().min(1).max(1500).optional().meta({ description: 'Only for another city' }),
    from: Endpoint.optional(),
    to: Endpoint.optional(),
    inventory: z
      .object({
        mode: z.enum(['preset', 'list', 'atSurvey']),
        items: z.record(z.string().max(40), Qty).optional(),
        custom: z.array(CustomItem).max(20).optional(),
        boxes: Count.optional().meta({ description: 'undefined → typical for the home preset' }),
        kallaxInserts: Count.optional(),
      })
      .optional(),
    special: z.array(SpecialItem).max(20).optional(),
    packing: z
      .object({
        who: z.enum(['self', 'partial', 'full']).optional(),
        containers: z.enum(['crates', 'cardboard', 'own']).optional(),
        wardrobeBoxes: z.int().min(0).max(50).optional(),
        mattressBagsDouble: z.int().min(0).max(20).optional(),
        mattressBagsSingle: z.int().min(0).max(20).optional(),
        tvProtection: z.int().min(0).max(20).optional(),
        mirrorProtection: z.int().min(0).max(20).optional(),
        crateDays: z.int().min(1).max(60).optional().meta({ description: 'Days the crates stay with the client' }),
      })
      .optional(),
    assembly: z
      .object({
        items: z.record(z.string().max(40), Qty).optional(),
        disassembleOnMovingDay: z.boolean().optional(),
      })
      .optional(),
    protection: z
      .object({
        level: z.enum(['basic', 'full']),
        declaredValueLei: z.int().min(0).max(10_000_000).optional(),
        deductible: z.boolean().optional(),
      })
      .optional(),
    survey: z.object({ method: z.enum(['onsite', 'remote', 'none']) }).optional(),
    schedule: z
      .object({
        date: z.iso.date().optional(),
        slot: z.enum(['morning', 'midday', 'afternoon']).optional(),
        fullDay: z.boolean().optional(),
      })
      .optional(),
    crew: z.int().min(2).max(6).optional().meta({ description: 'Client-chosen crew size (alternative)' }),
  })
  .meta({ id: 'OrderInput' });

export type OrderInput = z.infer<typeof OrderInput>;
export type Endpoint = z.infer<typeof Endpoint>;
export type ElevatorChoice = z.infer<typeof ElevatorChoice>;
