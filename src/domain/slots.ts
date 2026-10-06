/**
 * Start slots for a day (decisions D11): a slot is offered only if the guaranteed window ends
 * before the end of the working day. Availability of crews is a service concern (SlotService).
 */
import type { Cfg } from '@/config';

export type DaySlot = { slot: 'morning' | 'midday' | 'afternoon'; start: string; fits: boolean };

export function slotsForWindow(windowH: number, cfg: Cfg, fullDay = false): DaySlot[] {
  return cfg.app.slots.map((s) => {
    const [h, m] = s.start.split(':').map(Number);
    const end = h + m / 60 + (fullDay ? Math.max(windowH, cfg.pricing.fullDay.hours) : windowH);
    return { slot: s.id, start: s.start, fits: (!fullDay || s.id === 'morning') && end <= cfg.app.dayEndHour };
  });
}
