'use client';
/**
 * The signature object: the estimate as a boarding pass (design plan, direction "Rezervare").
 * Night field, route codes, departure / estimated finish / guaranteed-by times, a perforated stub
 * with the total. Amber marks only what is guaranteed.
 */
import { useLocale, useTranslations } from 'next-intl';
import type { Estimate } from '@/contract/estimate';
import type { OrderInput } from '@/contract/order';
import { getConfig } from '@/config';
import { addClock, lei, leiRange, longDate, num, type AppLocale } from '@/lib/format';
import { VanSketch } from '@/ui/Sketch';
import { cx } from '@/ui/cx';
import { PriceExplainer } from './PriceExplainer';
import { useRouteLabels } from './useRoute';

export function BoardingPass({
  order,
  est,
  sample,
  className,
  compact,
  variant = 'range',
}: {
  order: OrderInput;
  est: Estimate;
  sample?: boolean;
  className?: string;
  compact?: boolean;
  variant?: 'range' | 'conditional';
}) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const r = useRouteLabels(order);
  const slot = getConfig().app.slots.find((s) => s.id === (order.schedule?.slot ?? 'morning'))!;
  const start = slot.start;
  const method = order.survey?.method;
  const surveyName = t(
    method === 'onsite'
      ? 'estimate.passSurveyOnsite'
      : method === 'remote'
        ? 'estimate.passSurveyRemote'
        : method === 'none'
          ? 'estimate.passSurveyNone'
          : 'estimate.passSurveyUnset',
  );

  return (
    <article
      aria-label={t('estimate.title')}
      className={cx(
        'on-night relative isolate overflow-hidden rounded-[var(--radius-panel)] bg-night text-on-night shadow-[var(--shadow-panel)]',
        className,
      )}
    >
      <div className={cx('grid gap-5 p-5 sm:p-6', !compact && 'lg:grid-cols-[1fr_auto]')}>
        <div className="flex flex-col gap-4">
          {sample && (
            <span className="label-cap -mb-1 self-start rounded-full border border-white/30 px-2.5 py-0.5 text-on-night-muted">
              {t('common.example')}
            </span>
          )}
          <div className="grid grid-cols-[auto_1fr_auto] items-end gap-3">
            <div>
              <div className="code-wide text-[2.4rem] leading-none sm:text-[3rem]">{r.fromCode}</div>
              <div className="mt-1 truncate text-[0.85rem] text-on-night-muted">{r.fromName ?? t('common.from')}</div>
            </div>
            <div className="relative mb-6 h-6" aria-hidden>
              <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-white/35" />
              <VanSketch
                title=""
                className="pass-van absolute top-1/2 left-1/2 h-6 w-12 -translate-x-1/2 -translate-y-1/2 bg-night px-1 text-white"
              />
            </div>
            <div className="text-right">
              <div className="code-wide text-[2.4rem] leading-none sm:text-[3rem]">{r.toCode}</div>
              <div className="mt-1 truncate text-[0.85rem] text-on-night-muted">{r.toName ?? t('common.to')}</div>
            </div>
          </div>
          <dl className="grid grid-cols-[auto_auto_auto] justify-between gap-3 border-t border-white/15 pt-4 [&_dt]:whitespace-nowrap [&>div]:flex [&>div]:flex-col [&>div]:justify-between [&>div]:gap-1">
            <div>
              <dt className="label-cap text-on-night-muted">{t('estimate.passFrom')}</dt>
              <dd className="tabular font-[family-name:var(--font-display)] text-[1.5rem] font-extrabold">{start}</dd>
            </div>
            <div>
              <dt className="label-cap text-on-night-muted">{t('estimate.passArrival')}</dt>
              <dd className="tabular font-[family-name:var(--font-display)] text-[1.5rem] font-extrabold">
                ≈{addClock(start, est.time.expectedH)}
              </dd>
            </div>
            <div>
              <dt className="label-cap text-amber">{t('estimate.passGuaranteed')}</dt>
              <dd className="tabular self-start rounded-md bg-amber px-1.5 font-[family-name:var(--font-display)] text-[1.5rem] font-extrabold text-night">
                {addClock(start, est.time.windowH)}
              </dd>
            </div>
          </dl>
          <p className="text-[0.85rem] text-on-night-muted">
            {t('estimate.passWindow', { expected: num(est.time.expectedH, locale), window: num(est.time.windowH, locale) })}
          </p>
        </div>

        <div
          className={cx(
            'relative flex flex-col gap-3 border-t-2 border-dashed border-white/25 pt-5',
            !compact && 'lg:min-w-60 lg:border-t-0 lg:border-l-2 lg:pt-0 lg:pl-6',
          )}
        >
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[0.92rem]">
            <dt className="text-on-night-muted">{t('estimate.passDate')}</dt>
            <dd className="text-right font-semibold">
              {order.schedule?.date ? longDate(order.schedule.date, locale) : t('estimate.passNoDate')}
            </dd>
            <dt className="text-on-night-muted">{t('estimate.passVehicle')}</dt>
            <dd className="text-right font-semibold">
              {t(`vehicles.${est.vehicle.id}`)}
              {est.vehicle.count > 1 ? ` × ${est.vehicle.count}` : ''}
            </dd>
            <dt className="text-on-night-muted">{t('estimate.passCrew')}</dt>
            <dd className="text-right font-semibold">{t('estimate.passCrewValue', { n: est.crew.size })}</dd>
            <dt className="text-on-night-muted">{t('estimate.passSurvey')}</dt>
            <dd className="text-right font-semibold">{surveyName}</dd>
          </dl>
          <div className="mt-auto">
            <div className="label-cap text-on-night-muted">{t('estimate.passTotal')}</div>
            <div className="tabular price-digits font-[family-name:var(--font-display)] text-[1.9rem] leading-tight font-extrabold">
              {variant === 'conditional' ? lei(est.price.base, locale) : leiRange(est.price.low, est.price.high, locale)}
            </div>
            <PriceExplainer est={est} onNight />
          </div>
        </div>
      </div>
    </article>
  );
}
