'use client';
/**
 * "What's in this price?" right next to a range (decisions D34): a short answer opens in place,
 * the full rules live on the rates page. Numbers come from config, so the text never promises
 * more than the calculation does.
 */
import { useTranslations } from 'next-intl';
import { Button, Disclosure, DisclosurePanel } from 'react-aria-components';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { getConfig } from '@/config';
import type { Estimate } from '@/contract/estimate';
import { Link } from '@/i18n/navigation';
import { cx } from '@/ui/cx';

export function PriceExplainer({ est, onNight, className }: { est?: Estimate; onNight?: boolean; className?: string }) {
  const t = useTranslations();
  const P = getConfig().pricing;
  const pct = (x: number) => Math.round(x * 100);
  // one cap: the one for the chosen survey; before a choice, each method with its own (D38)
  const cap = est?.price.afterSurvey
    ? t('priceInfo.rangeFor', { pct: pct(est.price.afterSurvey.capTolerance) })
    : t('priceInfo.rangeAny', { onsite: pct(P.survey.onsite.capTolerance), remote: pct(P.survey.remote.capTolerance) });
  const list = P.includedFree.map((k) => t(`included.${k}`).toLowerCase()).join(', ');

  return (
    <Disclosure className={cx('group', className)}>
      <Button
        slot="trigger"
        className={cx(
          'inline-flex min-h-10 cursor-pointer items-center gap-1.5 text-[0.92rem] font-semibold underline decoration-1 underline-offset-4',
          onNight ? 'text-white decoration-white/45 hover:decoration-white' : 'text-route decoration-route/40 hover:text-route-hover',
        )}
      >
        {t('priceInfo.toggle')}
        <ChevronDown size={16} aria-hidden className="transition-transform duration-200 group-data-[expanded]:rotate-180" />
      </Button>
      <DisclosurePanel className="h-(--disclosure-panel-height) overflow-clip transition-[height] duration-200 ease-[var(--ease-out-expo)]">
        <div className={cx('mt-1 flex flex-col gap-2 text-[0.9rem] leading-snug', onNight ? 'text-on-night-muted' : 'text-ink-muted')}>
          <p>{t('priceInfo.made')}</p>
          <p>{t('priceInfo.included', { list })}</p>
          <p>{cap}</p>
          <p className={cx('font-semibold', onNight ? 'text-white' : 'text-ink')}>{t('priceInfo.consent')}</p>
          <Link
            href="/rates"
            className={cx(
              'inline-flex min-h-10 items-center gap-1.5 self-start font-semibold underline underline-offset-4',
              onNight ? 'text-white decoration-white/45' : 'text-route decoration-route/40',
            )}
          >
            {t('priceInfo.more')}
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}
