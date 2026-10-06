/**
 * Estimate: computed result. The server is the only authority (decisions D23); a client
 * estimate is a preview. Every number carries an explanation key for i18n.
 */
import * as z from 'zod';

/** string | number | boolean (rendered as anyOf for oapi-codegen, see scripts/gen-contract.ts). */
export const Scalar = z.union([z.string(), z.number(), z.boolean()]).meta({ id: 'Scalar' });

export const Bani = z.int().meta({ id: 'Bani', description: 'Money in bani (1 leu = 100 bani), VAT included' });

export const Explain = z
  .object({
    key: z.string(),
    params: z.record(z.string(), Scalar).optional(),
  })
  .meta({ id: 'Explain', description: 'i18n key + params; texts live in messages/*.json' });

export const LineId = z
  .enum([
    'transport',
    'crew',
    'fullDayDiscount',
    'weekend',
    'dispatch',
    'intercity',
    'packing',
    'materials',
    'crates',
    'assembly',
    'special',
    'protection',
    'survey',
    'surveyCredit',
    'minimumOrder',
  ])
  .meta({ id: 'LineId' });

export const EstimateLine = z
  .object({
    id: LineId,
    amount: Bani,
    explain: Explain,
    details: z.array(Explain).optional(),
    step: z.string().optional().meta({ description: 'Step id where the answer behind this line can be changed' }),
  })
  .meta({ id: 'EstimateLine' });

export const Assumption = z
  .object({
    path: z.string(),
    value: Scalar,
    explain: Explain,
  })
  .meta({ id: 'Assumption' });

export const ScenarioOption = z
  .object({
    value: Scalar,
    total: Bani,
    delta: Bani,
  })
  .meta({ id: 'ScenarioOption' });

export const Scenario = z
  .object({
    path: z.string(),
    assumed: Scalar,
    options: z.array(ScenarioOption),
  })
  .meta({ id: 'Scenario', description: 'Price for each possible answer of an unknown field (pricing variant B)' });

export const TimelineEvent = z
  .object({
    kind: z.enum(['survey', 'cratesDelivery', 'packing', 'move', 'cratesPickup']),
    dayOffset: z.int().meta({ description: 'Days relative to the moving day' }),
    date: z.iso.date().optional(),
  })
  .meta({ id: 'TimelineEvent' });

export const Estimate = z
  .object({
    configVersion: z.string(),
    rulesVersion: z.string(),
    price: z.object({
      kind: z.enum(['range']).meta({ description: 'Until a survey is confirmed the price is always a range' }),
      base: Bani,
      low: Bani,
      high: Bani,
      worst: Bani.meta({ description: 'Every unknown answer at its worst and max volume' }),
      vat: Bani,
      afterSurvey: z
        .object({ capTolerance: z.number(), method: z.enum(['onsite', 'remote']) })
        .optional()
        .meta({ description: 'After confirmation: final ≤ confirmed estimate × (1 + capTolerance)' }),
      reasons: z.array(Explain).meta({ description: 'Why the range is this wide' }),
    }),
    volume: z.object({
      m3: z.number(),
      low: z.number(),
      high: z.number(),
      weightKg: z.int(),
      source: z.enum(['preset', 'list', 'atSurvey']),
      boxes: z.int(),
    }),
    vehicle: z.object({
      id: z.string(),
      count: z.int(),
      trips: z.int(),
      fillPct: z.int(),
      explain: Explain,
      parkedAway: z.array(z.enum(['from', 'to'])),
    }),
    crew: z.object({
      size: z.int(),
      alternatives: z.array(z.object({ size: z.int(), total: Bani, windowH: z.number() })),
      explain: Explain,
    }),
    time: z.object({
      expectedH: z.number(),
      windowH: z.number(),
      billedH: z.number(),
      breakdown: z.array(Explain),
    }),
    overtime: z.object({ perHour: Bani, stepMin: z.int() }),
    lines: z.array(EstimateLine),
    included: z.array(z.string()),
    assumptions: z.array(Assumption),
    scenarios: z.array(Scenario),
    tasks: z.array(z.object({ code: z.string(), params: z.record(z.string(), z.string()).optional() })),
    warnings: z.array(Explain),
    hints: z.array(Explain),
    timeline: z.array(TimelineEvent),
  })
  .meta({ id: 'Estimate' });

export type Estimate = z.infer<typeof Estimate>;
export type EstimateLine = z.infer<typeof EstimateLine>;
export type Explain = z.infer<typeof Explain>;
export type LineId = z.infer<typeof LineId>;
export type Scenario = z.infer<typeof Scenario>;
