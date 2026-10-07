'use client';
/** Price details: every line has its formula and a "Why?" with the reason and a link to change it. */
import { useLocale, useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import type { Estimate } from '@/contract/estimate';
import { getConfig } from '@/config';
import { Link } from '@/i18n/navigation';
import { useExplain } from '@/lib/explain';
import { lei, leiRange, type AppLocale } from '@/lib/format';
import { Why } from '@/ui/Disclosure';

export function Breakdown({ est, editable = true }: { est: Estimate; editable?: boolean }) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const explain = useExplain();
  const steps = getConfig().steps.steps;

  return (
    <div className="flex flex-col">
      <ul className="divide-y divide-line">
        {est.lines.map((l) => {
          const step = steps.find((s) => s.id === l.step);
          const label = t(`lineLabel.${l.id}`);
          // the formula line starts with the label ("Transport · van 12 m³ · …"): show only the rest
          const formula = explain(l.explain);
          const sub = formula === label ? '' : formula.startsWith(`${label} · `) ? formula.slice(label.length + 3) : formula;
          // "Why?" only where there is a real reason to read, not just an edit link
          const why = !!l.details?.length || l.id === 'transport' || l.id === 'crew';
          return (
            <li key={l.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-3">
              <span className="font-[family-name:var(--font-display)] font-bold">{label}</span>
              <span className="tabular text-right font-[family-name:var(--font-display)] text-[1.05rem] font-extrabold">
                {lei(l.amount, locale)}
              </span>
              {sub && <span className="col-span-2 text-[0.9rem] text-ink-muted first-letter:uppercase">{sub}</span>}
              {why && (
                <div className="col-span-2">
                  <Why label={t('common.why')}>
                    {l.details && (
                      <ul className="mb-1 list-disc pl-5">
                        {l.details.map((d, i) => (
                          <li key={i}>{explain(d)}</li>
                        ))}
                      </ul>
                    )}
                    {l.id === 'transport' && <p>{explain(est.vehicle.explain)}</p>}
                    {l.id === 'crew' && (
                      <>
                        <p>{explain(est.crew.explain)}</p>
                        <ul className="mt-1 list-disc pl-5">
                          {est.time.breakdown.map((b, i) => (
                            <li key={i}>{explain(b)}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    {editable && step && (
                      <Link
                        href={{ pathname: '/estimate/[step]', params: { step: step.slug[locale] } }}
                        className="mt-1 inline-block font-semibold text-route underline"
                      >
                        {t('common.edit')}
                      </Link>
                    )}
                  </Why>
                </div>
              )}
            </li>
          );
        })}
        <li className="grid grid-cols-[1fr_auto] gap-x-4 py-3">
          <span className="font-[family-name:var(--font-display)] font-bold text-ok-ink">{t('estimate.included')}</span>
          <span className="tabular text-right font-[family-name:var(--font-display)] font-extrabold text-ok-ink">0 lei</span>
          <ul className="col-span-2 mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[0.9rem] text-ink-muted">
            {est.included.map((i) => (
              <li key={i} className="inline-flex items-center gap-1">
                <Check size={14} className="text-ok" aria-hidden />
                {t(`included.${i}`)}
              </li>
            ))}
          </ul>
        </li>
        {/* exactly the sum of the lines above (the domain's base is the same sum rounded up to 10 lei) */}
        <li className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t-2 border-ink py-3">
          <span className="font-[family-name:var(--font-display)] font-extrabold">{t('estimate.baseTotal')}</span>
          <span className="tabular text-right font-[family-name:var(--font-display)] text-[1.1rem] font-extrabold">
            {lei(
              est.lines.reduce((s, l) => s + l.amount, 0),
              locale,
            )}
          </span>
          {est.price.low !== est.price.high && (
            <span className="col-span-2 text-[0.9rem] text-ink-muted">
              {t('estimate.rangeNote', { range: leiRange(est.price.low, est.price.high, locale) })}
            </span>
          )}
        </li>
      </ul>
      <p className="mt-2 text-[0.88rem] text-ink-muted">{t('estimate.vat', { vat: lei(est.price.vat, locale) })}</p>
    </div>
  );
}
