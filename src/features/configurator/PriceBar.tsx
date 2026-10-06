'use client';
/**
 * Live price while answering (decisions D9). Phones: a sticky night bar at the bottom that opens
 * the breakdown in a sheet. Desktop: the same numbers sit in the aside next to the step.
 * After an answer changes the price, a delta chip ("+420 lei") is announced politely.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronUp } from 'lucide-react';
import type { Estimate } from '@/contract/estimate';
import { leiRange, num, signedLei, type AppLocale } from '@/lib/format';
import { Sheet } from '@/ui/Sheet';
import { cx } from '@/ui/cx';
import { Breakdown } from './Breakdown';

/** Remembers the last total and returns the change for a few seconds after it moves. */
export function usePriceDelta(est: Estimate | null) {
  const prev = useRef<number | null>(null);
  const [delta, setDelta] = useState<number | null>(null);
  const base = est?.price.base ?? null;
  useEffect(() => {
    if (base === null) return;
    const before = prev.current;
    prev.current = base;
    if (before === null || before === base) return;
    setDelta(base - before);
    const id = setTimeout(() => setDelta(null), 4000);
    return () => clearTimeout(id);
  }, [base]);
  return delta;
}

export function DeltaChip({ delta, onNight }: { delta: number | null; onNight?: boolean }) {
  const locale = useLocale() as AppLocale;
  return (
    <span aria-live="polite" className="tabular inline-flex min-h-6 items-center">
      {delta !== null && (
        <span
          className={cx(
            'delta-chip rounded-full px-2 py-0.5 text-[0.8rem] font-bold',
            onNight ? 'bg-white/14 text-white' : delta > 0 ? 'bg-cloud text-ink' : 'bg-ok-soft text-ok-ink',
          )}
        >
          {signedLei(delta, locale)}
        </span>
      )}
    </span>
  );
}

export function PriceBar({ est }: { est: Estimate | null }) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const [open, setOpen] = useState(false);
  const delta = usePriceDelta(est);

  return (
    <>
      <div className="on-night fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-night text-on-night pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
          {est ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex min-h-12 flex-1 cursor-pointer items-center justify-between gap-3 text-left"
              aria-haspopup="dialog"
            >
              <span className="flex flex-col">
                <span className="label-cap text-on-night-muted">
                  {t('flow.priceLabel')} · {t('common.vatIncluded')}
                </span>
                <span className="tabular font-[family-name:var(--font-display)] text-[1.2rem] leading-tight font-extrabold text-white">
                  {leiRange(est.price.low, est.price.high, locale)}
                </span>
                <span className="text-[0.78rem] text-on-night-muted">
                  {t('flow.priceMeta', { crew: est.crew.size, window: num(est.time.windowH, locale) })}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <DeltaChip delta={delta} onNight />
                <span className="flex items-center gap-1 text-[0.85rem] font-semibold text-white">
                  {t('flow.details')}
                  <ChevronUp size={18} aria-hidden />
                </span>
              </span>
            </button>
          ) : (
            <p className="min-h-12 flex-1 py-3 text-[0.92rem] text-on-night-muted">{t('priceBar.noPrice')}</p>
          )}
        </div>
      </div>
      {est && (
        <Sheet isOpen={open} onOpenChange={setOpen} title={t('estimate.breakdown')} closeLabel={t('common.close')}>
          <Breakdown est={est} />
        </Sheet>
      )}
    </>
  );
}
