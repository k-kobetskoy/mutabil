/**
 * Request / response envelopes of the order API. OrderRequest = OrderInput + personal data.
 */
import * as z from 'zod';
import { OrderInput } from './order';
import { Estimate } from './estimate';

export const Locale = z.enum(['ro', 'en']).meta({ id: 'Locale' });

export const AddressDetails = z
  .strictObject({
    street: z.string().max(120).optional(),
    number: z.string().max(20).optional(),
    block: z.string().max(20).optional(),
    stair: z.string().max(20).optional(),
    apartment: z.string().max(20).optional(),
  })
  .meta({ id: 'AddressDetails', description: 'Personal data: never put into share links' });

// [x, y, pressure] normalised to 0..1. An array (not a tuple): kin-openapi/oapi-codegen reject `items: false`.
export const Point = z.array(z.number().min(0).max(1)).length(3).meta({ id: 'Point' });

export const MarkIntent = z
  .enum(['move', 'stay', 'careful'])
  .meta({ id: 'MarkIntent', description: 'green = we move it, red = it stays, yellow = careful/fragile/disassemble' });

export const Annotation = z
  .strictObject({
    strokes: z.array(z.strictObject({ intent: MarkIntent, width: z.number().min(1).max(40), points: z.array(Point).max(2000) })).max(200),
    pins: z
      .array(
        z.strictObject({
          n: z.int().min(1).max(99),
          x: z.number().min(0).max(1),
          y: z.number().min(0).max(1),
          intent: MarkIntent.optional(),
          text: z.string().max(500),
        }),
      )
      .max(50),
    note: z.string().max(2000).optional(),
  })
  .meta({ id: 'Annotation', description: 'Vector layer over a photo; coordinates normalised to 0..1' });

export const MediaRef = z
  .strictObject({
    id: z.string().max(64),
    kind: z.enum(['photo', 'video', 'elevatorPlate', 'access']),
    annotation: Annotation.optional(),
  })
  .meta({ id: 'MediaRef' });

export const Contact = z
  .strictObject({
    name: z.string().min(1).max(80),
    phone: z.string().max(30).optional(),
    email: z.email().max(120).optional(),
    channel: z.enum(['phone', 'whatsapp', 'email']).optional(),
  })
  .meta({ id: 'Contact', description: 'Phone or email is required (checked by the server)' });

export const OrderRequest = z
  .strictObject({
    order: OrderInput,
    contact: Contact,
    addresses: z.strictObject({ from: AddressDetails.optional(), to: AddressDetails.optional() }),
    comment: z.string().max(2000).optional(),
    media: z.array(MediaRef).max(30).optional(),
    consents: z.strictObject({
      estimateTerms: z.literal(true).meta({ description: 'Acknowledged: before survey the price is a range' }),
      marketing: z.boolean(),
    }),
    locale: Locale,
  })
  .meta({ id: 'OrderRequest' });

export const SubmitResult = z
  .object({
    requestId: z.string(),
    status: z.enum(['received']),
    tasks: z.array(z.string()),
    estimate: Estimate,
  })
  .meta({ id: 'SubmitResult' });

export const SlotQuery = z
  .strictObject({ from: z.iso.date(), to: z.iso.date(), windowH: z.number().min(1).max(14) })
  .meta({ id: 'SlotQuery' });

export const Slot = z
  .object({
    date: z.iso.date(),
    slot: z.enum(['morning', 'midday', 'afternoon']),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    available: z.boolean(),
  })
  .meta({ id: 'Slot' });

export const Problem = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.int(),
    detail: z.string().optional(),
    errors: z
      .array(z.object({ path: z.string(), key: z.string() }))
      .optional()
      .meta({ description: 'i18n keys, e.g. validation.floor.required' }),
  })
  .meta({ id: 'Problem', description: 'RFC 9457 problem details' });

export type OrderRequest = z.infer<typeof OrderRequest>;
export type SubmitResult = z.infer<typeof SubmitResult>;
export type Slot = z.infer<typeof Slot>;
export type SlotQuery = z.infer<typeof SlotQuery>;
export type Annotation = z.infer<typeof Annotation>;
export type MediaRef = z.infer<typeof MediaRef>;
export type AddressDetails = z.infer<typeof AddressDetails>;
export type Contact = z.infer<typeof Contact>;

export const AddressRecord = z
  .strictObject({
    key: z.string().max(200).meta({ description: 'Normalised: street|number|block|stair (see normalizeAddressKey)' }),
    elevator: z.enum(['none', 'small', 'medium', 'large']).optional(),
    doorWidthCm: z.int().min(40).max(200).optional(),
    plateLoadKg: z.int().min(100).max(5000).optional(),
    platePersons: z.int().min(1).max(60).optional(),
    furnitureInLift: z.enum(['yes', 'no']).optional(),
    raisedEntrance: z.boolean().optional(),
    confirmedBy: z.enum(['client', 'crew', 'administrator']),
    confirmedAt: z.iso.datetime(),
  })
  .meta({ id: 'AddressRecord', description: 'Building facts remembered for the next client from the same entrance' });

export type AddressRecord = z.infer<typeof AddressRecord>;
