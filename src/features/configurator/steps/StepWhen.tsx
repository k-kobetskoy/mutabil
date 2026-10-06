'use client';
/**
 * Date and arrival slot. A slot is offered only if the guaranteed window ends within the
 * working day (domain/slots); busy slots come from the SlotService. Weekend surcharge is shown
 * before the choice, not after.
 */
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button as AriaButton, Calendar, CalendarCell, CalendarGrid, CalendarGridBody, CalendarGridHeader, CalendarHeaderCell, Heading } from 'react-aria-components';
import { getDayOfWeek, parseDate, today } from '@internationalized/date';
import type { Slot } from '@/contract/api';
import { addClock, num, type AppLocale } from '@/lib/format';
import { useOrderStore } from '@/state/order-store';
import { ChoiceTiles } from '@/ui/ChoiceTiles';
import { Switch } from '@/ui/Fields';
import { cx } from '@/ui/cx';
import { useCfg, useEstimate, useServices } from '../providers';
import type { StepProps } from '../StepScreen';

const TZ = 'Europe/Bucharest';
type SlotId = Slot['slot'];

export function StepWhen({ errors }: StepProps) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const cfg = useCfg();
  const { slots } = useServices();
  const order = useOrderStore((s) => s.order);
  const update = useOrderStore((s) => s.update);
  const est = useEstimate();
  const date = order.schedule?.date;
  const fullDay = !!order.schedule?.fullDay;
  const windowH = est?.time.windowH ?? 4;
  const [day, setDay] = useState<Slot[] | null>(null);

  useEffect(() => {
    if (!date) return;
    const ctrl = new AbortController();
    void slots.listSlots({ from: date, to: date, windowH, fullDay }, { signal: ctrl.signal }).then((s) => !ctrl.signal.aborted && setDay(s));
    return () => ctrl.abort();
  }, [date, windowH, fullDay, slots]);

  // a slot that stopped fitting (bigger window, full day) is cleared rather than kept silently
  useEffect(() => {
    const chosen = order.schedule?.slot;
    if (chosen && day && !day.find((s) => s.slot === chosen)?.available) update('schedule.slot', undefined);
  }, [day, order.schedule?.slot, update]);

  const min = today(TZ).add({ days: 1 });
  const max = today(TZ).add({ days: cfg.app.bookingHorizonDays });
  const weekend = date ? [0, 6].includes(getDayOfWeek(parseDate(date), 'en-US')) : false;
  const err = errors['schedule.date'];

  return (
    <>
      <div className="grid gap-8 md:grid-cols-[minmax(0,340px)_1fr] md:items-start">
        <div className="flex flex-col gap-2">
          <span className="label-cap text-ink-muted" id="date-label">
            {t('steps.when.date')}
          </span>
          <Calendar
            aria-labelledby="date-label"
            value={date ? parseDate(date) : null}
            onChange={(d) => update('schedule.date', d.toString())}
            minValue={min}
            maxValue={max}
            isInvalid={!!err}
            className="w-full max-w-[340px] rounded-[var(--radius-panel)] border border-line bg-paper p-3"
          >
            <header className="mb-2 flex items-center justify-between">
              <AriaButton slot="previous" className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-route-soft disabled:opacity-30">
                <ChevronLeft size={20} aria-hidden />
              </AriaButton>
              <Heading className="font-[family-name:var(--font-display)] text-[1rem] font-bold capitalize" />
              <AriaButton slot="next" className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-route-soft disabled:opacity-30">
                <ChevronRight size={20} aria-hidden />
              </AriaButton>
            </header>
            <CalendarGrid className="w-full border-collapse" weekdayStyle="short">
              <CalendarGridHeader>{(d) => <CalendarHeaderCell className="pb-1 text-[0.75rem] font-semibold text-ink-muted">{d}</CalendarHeaderCell>}</CalendarGridHeader>
              <CalendarGridBody>
                {(d) => (
                  <CalendarCell
                    date={d}
                    className={({ isSelected, isDisabled, isOutsideMonth, isFocusVisible }) =>
                      cx(
                        'tabular m-0.5 grid aspect-square cursor-pointer place-items-center rounded-full text-[0.95rem] outline-none',
                        isOutsideMonth && 'invisible',
                        isDisabled ? 'cursor-default text-ink-muted/40' : 'hover:bg-route-soft',
                        isSelected && 'bg-route font-bold text-white hover:bg-route',
                        isFocusVisible && 'outline-3 outline-offset-1 outline-route',
                      )
                    }
                  />
                )}
              </CalendarGridBody>
            </CalendarGrid>
          </Calendar>
          {err && <p className="text-[0.92rem] font-semibold text-error">{t(err)}</p>}
        </div>

        <div className="flex flex-col gap-5">
          {date ? (
            <ChoiceTiles<SlotId>
              label={t('steps.when.slot')}
              value={order.schedule?.slot}
              onChange={(v) => update('schedule.slot', v)}
              columns={3}
              size="sm"
              tiles={cfg.app.slots.map((s) => {
                const info = day?.find((x) => x.slot === s.id);
                const fits = info ? info.available : true;
                const reason = info && !info.available ? (addHours(s.start, windowH) > cfg.app.dayEndHour || (fullDay && s.id !== 'morning') ? t('steps.when.tooLate') : t('steps.when.busy')) : null;
                return {
                  value: s.id,
                  label: t(`steps.when.slots.${s.id}`),
                  hint: reason ?? t('steps.when.arrival', { from: s.start, to: addClock(s.start, 1) }),
                  disabled: !fits,
                };
              })}
            />
          ) : (
            <p className="rounded-lg bg-cloud px-4 py-3 text-[0.95rem] text-ink-muted">{t('steps.when.pickDate')}</p>
          )}
          <Switch
            isSelected={fullDay}
            onChange={(v) => update('schedule.fullDay', v || undefined)}
            description={t('steps.when.fullDayText', { hours: num(cfg.pricing.fullDay.hours, locale), pct: Math.round(cfg.pricing.fullDay.discount * 100) })}
          >
            {t('steps.when.fullDay')}
          </Switch>
          {weekend && <p className="rounded-lg border-l-4 border-amber bg-amber-soft px-4 py-3 text-[0.95rem]">{t('steps.when.weekend', { pct: Math.round(cfg.pricing.surcharges.weekend * 100) })}</p>}
        </div>
      </div>
    </>
  );
}

function addHours(start: string, h: number): number {
  const [hh, mm] = start.split(':').map(Number);
  return hh + mm / 60 + h;
}
