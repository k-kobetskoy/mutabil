'use client';
/** Choose quick (3 questions → range) or detailed; offer to continue a saved draft. */
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, History, Timer, ListChecks } from 'lucide-react';
import { firstIncomplete, visibleSteps } from '@/domain/flow/steps';
import { applyRules } from '@/domain/rules/engine';
import { useRouter } from '@/i18n/navigation';
import type { AppLocale } from '@/lib/format';
import { hasProgress, useOrderStore } from '@/state/order-store';
import { Button } from '@/ui/Button';
import { useCfg } from './providers';
import type { OrderInput } from '@/contract/order';

export function StartScreen() {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const cfg = useCfg();
  const router = useRouter();
  const hydrated = useOrderStore((s) => s.hydrated);
  const order = useOrderStore((s) => s.order);
  const setMode = useOrderStore((s) => s.setMode);
  const reset = useOrderStore((s) => s.reset);

  const go = (mode: OrderInput['mode'], o: OrderInput) => {
    const next = { ...o, mode };
    const hidden = applyRules(next, cfg.rules).hiddenSteps;
    const target = firstIncomplete(next, mode, cfg.steps, hidden) ?? null;
    if (!target) return router.push('/estimate/result');
    // start from the first step so the client sees the answers, unless they are deep in the draft
    const first = visibleSteps(next, mode, cfg.steps, hidden)[0];
    const step = hasProgress(o) ? target : first;
    router.push({ pathname: '/estimate/[step]', params: { step: step.slug[locale] } });
  };

  const choose = (mode: OrderInput['mode']) => {
    setMode(mode);
    go(mode, useOrderStore.getState().order);
  };

  const card = 'group flex flex-col gap-4 rounded-[var(--radius-panel)] border border-line bg-paper p-6 text-left transition-[border-color,box-shadow] hover:border-route hover:shadow-[var(--shadow-lift)] cursor-pointer focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-route';

  return (
    <main id="main" className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-[clamp(2rem,5vw,3rem)] leading-[1.05] font-extrabold">{t('start.title')}</h1>
      {hydrated && hasProgress(order) && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-panel)] bg-night p-5 text-on-night">
          <p className="flex items-center gap-3 font-semibold text-white">
            <History size={22} aria-hidden />
            {t('start.continue')}
          </p>
          <div className="flex gap-2">
            <Button variant="onNight" onPress={() => reset('detailed')}>
              {t('start.restart')}
            </Button>
            <Button onPress={() => go(order.mode, order)}>
              {t('common.continue')}
              <ArrowRight size={18} aria-hidden />
            </Button>
          </div>
        </div>
      )}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <button type="button" className={card} onClick={() => choose('quick')}>
          <Timer size={28} aria-hidden className="text-route" />
          <span className="text-[1.5rem] font-extrabold">{t('start.quick')}</span>
          <span className="text-ink-muted">{t('start.quickText')}</span>
          <span className="mt-auto inline-flex items-center gap-2 font-[family-name:var(--font-display)] font-bold text-route">
            {t('common.continue')} <ArrowRight size={18} aria-hidden className="transition-transform group-hover:translate-x-1" />
          </span>
        </button>
        <button type="button" className={card} onClick={() => choose('detailed')}>
          <ListChecks size={28} aria-hidden className="text-route" />
          <span className="text-[1.5rem] font-extrabold">{t('start.detailed')}</span>
          <span className="text-ink-muted">{t('start.detailedText')}</span>
          <span className="mt-auto inline-flex items-center gap-2 font-[family-name:var(--font-display)] font-bold text-route">
            {t('common.continue')} <ArrowRight size={18} aria-hidden className="transition-transform group-hover:translate-x-1" />
          </span>
        </button>
      </div>
      <p className="mt-5 text-[0.92rem] text-ink-muted">{t('start.carry')}</p>
    </main>
  );
}
