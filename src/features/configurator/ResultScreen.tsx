'use client';
/**
 * The estimate as a booking summary: boarding pass, the price in one of two presentations
 * (D10-alt: range vs "sum + conditions", switch with ?pricing=), what can change it, crew
 * options, time, what happens next, what we check. Shared links (#s=…) load here.
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertCircle, ArrowRight, Check, Info, PencilLine, Share2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import type { Estimate, Scenario } from '@/contract/estimate';
import type { OrderInput } from '@/contract/order';
import { firstIncomplete, visibleSteps } from '@/domain/flow/steps';
import { guaranteedMax } from '@/domain/cap';
import { applyRules } from '@/domain/rules/engine';
import { decodeShare, encodeShare } from '@/domain/share';
import { Link, useRouter } from '@/i18n/navigation';
import { useExplain } from '@/lib/explain';
import { addClock, lei, longDate, num, signedLei, type AppLocale } from '@/lib/format';
import { useOrderStore } from '@/state/order-store';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { Why } from '@/ui/Disclosure';
import { BoardingPass } from './BoardingPass';
import { Breakdown } from './Breakdown';
import { useCfg, useEstimate } from './providers';

type Variant = 'range' | 'conditional';

/**
 * ?pricing=range|conditional (D10-alt). The switch is no longer on screen (D37): the variant is
 * compared through the link only, so clients never see an internal toggle.
 */
function useVariant(defaultVariant: Variant): Variant {
  const q = useSearchParams().get('pricing');
  return q === 'range' || q === 'conditional' ? q : defaultVariant;
}

/** Applies a shared estimate from the URL fragment once the local draft has been restored. */
function useSharedLink() {
  const hydrated = useOrderStore((s) => s.hydrated);
  const replace = useOrderStore((s) => s.replace);
  const [status, setStatus] = useState<'none' | 'loaded' | 'invalid'>('none');
  useEffect(() => {
    if (!hydrated) return;
    const m = window.location.hash.match(/[#&]s=([^&]+)/);
    if (!m) return;
    const r = decodeShare(decodeURIComponent(m[1]));
    if (r.ok) replace(r.order);
    // the fragment is an external input read once; the notice reflects what happened to it
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(r.ok ? 'loaded' : 'invalid');
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  }, [hydrated, replace]);
  return status;
}

export function ResultScreen() {
  const t = useTranslations();
  const cfg = useCfg();
  const hydrated = useOrderStore((s) => s.hydrated);
  const order = useOrderStore((s) => s.order);
  const shared = useSharedLink();
  const est = useEstimate();
  const variant = useVariant(cfg.app.ui.pricingPresentation);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-busy="true">
        <p className="text-ink-muted">{t('flow.loading')}</p>
      </div>
    );
  }

  if (!est) {
    return (
      <main id="main" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {shared === 'invalid' && <Notice tone="warn">{t('estimate.linkInvalid')}</Notice>}
        <h1 className="text-[2.2rem] font-extrabold">{t('estimate.title')}</h1>
        <p className="mt-3 text-ink-muted">{t('estimate.empty')}</p>
        <Link
          href="/estimate"
          className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-field)] bg-route px-6 font-[family-name:var(--font-display)] font-bold text-white no-underline hover:bg-route-hover"
        >
          {t('estimate.emptyCta')} <ArrowRight size={18} aria-hidden />
        </Link>
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 pt-6 pb-32 sm:px-6 lg:pb-20">
      {shared === 'loaded' && <Notice tone="info">{t('estimate.linkLoaded')}</Notice>}
      {shared === 'invalid' && <Notice tone="warn">{t('estimate.linkInvalid')}</Notice>}
      <h1 className="text-[clamp(2rem,5vw,2.8rem)] leading-[1.05] font-extrabold">{t('estimate.title')}</h1>

      {/* The one total is on the pass, with "what's in this price?" right under it (D37) */}
      <BoardingPass order={order} est={est} variant={variant} className="mt-6" />

      {/* Phones read one column in the order a client asks: how sure is it, what to know, what it is
          made of, how long, alternatives, dates, and the page ends on what happens next. On desktop
          the two columns come back (`contents` lets the cards reorder across them). */}
      <div className="mt-8 flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="contents lg:flex lg:flex-col lg:gap-8">
          <div className="order-1 lg:order-none">
            <PriceBlock est={est} order={order} variant={variant} />
          </div>
          <div className="order-3 lg:order-none">
            <Card title={t('estimate.breakdown')}>
              <Breakdown est={est} />
              <p className="mt-3 border-t border-line pt-3 text-[0.92rem]">
                <Overtime est={est} />
              </p>
            </Card>
          </div>
          <div className="order-4 lg:order-none">
            <TimeBlock est={est} order={order} />
          </div>
          <div className="order-8 lg:order-none">
            <NextSteps order={order} />
          </div>
        </div>
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <div className="order-7 lg:order-none">
            <Actions order={order} />
          </div>
          <div className="order-5 empty:hidden lg:order-none">
            <CrewOptions est={est} />
          </div>
          <div className="order-6 empty:hidden lg:order-none">
            <Timeline est={est} />
          </div>
          <div className="order-2 empty:hidden lg:order-none">
            <Checks est={est} />
          </div>
        </div>
      </div>
      <div className="on-night fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-night px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] lg:hidden">
        <SendLink className="inline-flex w-full" />
      </div>
    </main>
  );
}

function Overtime({ est }: { est: Estimate }) {
  const t = useTranslations();
  const locale = useLocaleTyped();
  return <>{t('estimate.overtime', { perHour: lei(est.overtime.perHour, locale), step: est.overtime.stepMin })}</>;
}

function useLocaleTyped() {
  return useLocale() as AppLocale;
}

function Notice({ tone, children }: { tone: 'info' | 'warn'; children: React.ReactNode }) {
  return (
    <p
      role="status"
      className={cx(
        'mb-5 flex items-start gap-2 rounded-lg px-4 py-3 text-[0.95rem]',
        tone === 'info' ? 'bg-route-soft' : 'border border-line bg-paper',
      )}
    >
      <Info size={18} aria-hidden className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

function Card({ title, children, className }: { title: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-[var(--radius-panel)] border border-line bg-paper p-5 sm:p-6', className)}>
      <h2 className="mb-3 text-[1.2rem] font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

/** The biggest upward change of each unknown answer, for "sum + conditions". */
function conditions(scenarios: Scenario[], max: number) {
  return scenarios
    .map((s) => {
      const worst = s.options.reduce((a, b) => (b.delta > a.delta ? b : a), s.options[0]);
      return { path: s.path, assumed: s.assumed, value: worst.value, delta: worst.delta };
    })
    .filter((c) => c.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, max);
}

function PriceBlock({ est, order, variant }: { est: Estimate; order: OrderInput; variant: Variant }) {
  const t = useTranslations();
  const locale = useLocaleTyped();
  const explain = useExplain();
  const cfg = useCfg();
  const conds = conditions(est.scenarios, cfg.app.ui.maxConditionalLines);
  const pct = est.price.afterSurvey ? Math.round(est.price.afterSurvey.capTolerance * 100) : 0;
  const max = guaranteedMax(est, order, cfg);
  const value = (v: unknown) => explain({ key: 'estimate.scenarioIf', params: { value: v as string } });

  // The total itself is on the pass; this card says how it can move and how it becomes fixed (D37).
  // Amber marks the concrete promise (the number), not the general rule (D38).
  return (
    <section aria-labelledby="price-title" className="rounded-[var(--radius-panel)] border border-line bg-paper p-5 sm:p-6">
      <h2 id="price-title" className="text-[1.2rem] font-extrabold">
        {t(est.scenarios.length || variant === 'conditional' ? 'estimate.scenariosTitle' : 'estimate.priceFixTitle')}
      </h2>
      {max !== null && (
        <p className="tabular mt-3 rounded-[var(--radius-field)] bg-amber-soft px-4 py-3 font-semibold">
          {t('estimate.maxIfConfirmed', { max: lei(max, locale) })}
        </p>
      )}
      <p className="mt-3 text-[0.95rem]">{est.price.afterSurvey ? t('estimate.afterSurvey', { pct }) : t('estimate.noSurvey')}</p>
      {max !== null && (
        <p className="mt-2 text-[0.92rem] text-ink-muted">
          {t(est.price.afterSurvey?.method === 'onsite' ? 'estimate.rangeVsMax' : 'estimate.rangeVsMaxRemote', {
            fee: cfg.pricing.survey.onsite.priceLei,
          })}
        </p>
      )}
      {/* with a survey the guaranteed maximum is the number to remember; the worst case only without one */}
      {!est.price.afterSurvey && (
        <p className="mt-3 text-[0.92rem] text-ink-muted">{t('estimate.worst', { worst: lei(est.price.worst, locale) })}</p>
      )}
      {variant === 'conditional' && (
        <>
          <p className="mt-4 text-[0.95rem] text-ink-muted">{t('estimate.conditionalLead')}</p>
          {conds.length > 0 && (
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {conds.map((c) => (
                <li key={c.path} className="flex items-baseline justify-between gap-4 py-2.5">
                  <span>
                    <span className="font-semibold">{explain({ key: 'estimate.conditionPath', params: { path: c.path } })}</span>{' '}
                    <span className="text-ink-muted">{value(c.value)}</span>
                  </span>
                  <span className="tabular font-[family-name:var(--font-display)] font-extrabold">{signedLei(c.delta, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {variant === 'range' && est.scenarios.length > 0 && <Scenarios est={est} />}
    </section>
  );
}

function Scenarios({ est }: { est: Estimate }) {
  const t = useTranslations();
  const locale = useLocaleTyped();
  const explain = useExplain();
  const steps = useCfg().steps.steps;
  const stepFor = (path: string) => steps.find((s) => s.id === (path.startsWith('survey') ? 'protection' : 'access'));
  return (
    <div className="mt-5 border-t border-line pt-4">
      <ul className="flex flex-col gap-4">
        {est.scenarios.map((s) => {
          const step = stepFor(s.path);
          return (
            <li key={s.path}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">{explain({ key: 'estimate.conditionPath', params: { path: s.path } })}</span>
                {step && (
                  <Link
                    href={{ pathname: '/estimate/[step]', params: { step: step.slug[locale] } }}
                    className="text-[0.88rem] font-semibold text-route underline"
                  >
                    {t('common.edit')}
                  </Link>
                )}
              </div>
              <ul className="mt-1.5 flex flex-wrap gap-2">
                {s.options.map((o) => (
                  <li
                    key={String(o.value)}
                    className={cx(
                      'tabular rounded-full border px-3 py-1 text-[0.85rem]',
                      o.value === s.assumed ? 'border-route bg-route-soft font-bold' : 'border-line',
                    )}
                  >
                    {explain({ key: 'estimate.optionValue', params: { value: o.value as string } })} ·{' '}
                    {o.delta === 0 ? lei(o.total, locale) : signedLei(o.delta, locale)}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TimeBlock({ est, order }: { est: Estimate; order: OrderInput }) {
  const t = useTranslations();
  const locale = useLocaleTyped();
  const explain = useExplain();
  const slot = useCfg().app.slots.find((s) => s.id === order.schedule?.slot);
  return (
    <Card title={t('estimate.time')}>
      <p>{t('estimate.timeLead', { expected: num(est.time.expectedH, locale), window: num(est.time.windowH, locale) })}</p>
      {slot && (
        <p className="mt-1 text-[0.92rem] text-ink-muted">
          {t(`steps.when.slots.${slot.id}`)} · {slot.start}–{addClock(slot.start, est.time.windowH)}
        </p>
      )}
      {/* the formulas stay available, but behind a question the client chooses to ask */}
      <div className="mt-3 flex flex-col gap-1">
        <Why label={t('estimate.timeHow')}>
          <ul className="flex flex-col gap-1">
            {est.time.breakdown.map((b, i) => (
              <li key={i}>{explain(b)}</li>
            ))}
          </ul>
        </Why>
        <Why label={t('estimate.vehicleWhy')}>{explain(est.vehicle.explain)}</Why>
      </div>
    </Card>
  );
}

function CrewOptions({ est }: { est: Estimate }) {
  const t = useTranslations();
  const locale = useLocaleTyped();
  const update = useOrderStore((s) => s.update);
  if (est.crew.alternatives.length < 2) return null;
  // differences, not totals: an absolute "2.910 lei" next to the range reads as a third price
  const current = est.crew.alternatives.find((a) => a.size === est.crew.size)?.total ?? est.price.base;
  return (
    <Card title={t('estimate.crewAlternatives')}>
      <ul className="flex flex-col gap-2">
        {est.crew.alternatives.map((a) => {
          const chosen = a.size === est.crew.size;
          return (
            <li
              key={a.size}
              className={cx(
                'grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-[var(--radius-field)] border px-3 py-2',
                chosen ? 'border-route bg-route-soft' : 'border-line',
              )}
            >
              <span className="flex flex-col leading-tight">
                <span className="font-semibold">{t('estimate.passCrewValue', { n: a.size })}</span>
                <span className="text-[0.85rem] text-ink-muted">{t('estimate.crewWindow', { window: num(a.windowH, locale) })}</span>
              </span>
              <span className="tabular font-[family-name:var(--font-display)] font-bold whitespace-nowrap">
                {chosen ? '' : a.total === current ? '±0 lei' : signedLei(a.total - current, locale)}
              </span>
              {chosen ? (
                <span className="flex items-center gap-1 text-[0.85rem] font-bold text-route">
                  <Check size={16} aria-hidden /> {t('estimate.crewChosen')}
                </span>
              ) : (
                <Button variant="secondary" className="!min-h-10 !px-3 text-[0.85rem]" onPress={() => update('crew', a.size)}>
                  {t('estimate.crewPick')}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Timeline({ est }: { est: Estimate }) {
  const t = useTranslations();
  const locale = useLocaleTyped();
  if (!est.timeline.length) return null;
  const when = (d: number, date?: string) =>
    date
      ? longDate(date, locale)
      : d === 0
        ? t('estimate.moveDay')
        : d < 0
          ? t('estimate.daysBefore', { n: -d })
          : t('estimate.daysAfter', { n: d });
  return (
    <Card title={t('estimate.timeline')}>
      <ol className="relative flex flex-col gap-4 border-l-2 border-dashed border-line-strong pl-5">
        {est.timeline.map((e, i) => (
          <li key={i} className="relative">
            <span
              aria-hidden
              className={cx(
                'absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-paper',
                e.kind === 'move' ? 'bg-route' : 'bg-line-strong',
              )}
            />
            <p className="font-semibold">{t(`estimate.timelineKind.${e.kind}`)}</p>
            <p className="text-[0.88rem] text-ink-muted">{when(e.dayOffset, e.date)}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Checks({ est }: { est: Estimate }) {
  const t = useTranslations();
  const explain = useExplain();
  if (!est.warnings.length && !est.hints.length && !est.assumptions.length && !est.tasks.length) return null;
  return (
    <Card title={t('estimate.warnings')}>
      <ul className="flex flex-col gap-2.5 text-[0.95rem]">
        {est.warnings.map((w, i) => (
          <li key={`w${i}`} className="flex gap-2">
            <AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0 text-ink-muted" />
            {explain(w)}
          </li>
        ))}
        {est.hints.map((h, i) => (
          <li key={`h${i}`} className="flex gap-2">
            <Info size={18} aria-hidden className="mt-0.5 shrink-0 text-route" />
            {explain(h)}
          </li>
        ))}
      </ul>
      {est.assumptions.length > 0 && (
        <>
          <h3 className="mt-4 text-[1rem] font-extrabold">{t('estimate.assumptions')}</h3>
          <ul className="mt-1 flex flex-col gap-1.5 text-[0.92rem] text-ink-muted">
            {est.assumptions.map((a, i) => (
              <li key={i}>{explain(a.explain)}</li>
            ))}
          </ul>
        </>
      )}
      {est.tasks.length > 0 && (
        <>
          <h3 className="mt-4 text-[1rem] font-extrabold">{t('estimate.tasksTitle')}</h3>
          <ul className="mt-1 flex flex-col gap-1 text-[0.92rem]">
            {est.tasks.map((x) => (
              <li key={x.code} className="flex items-center gap-2">
                <Check size={16} aria-hidden className="text-ok" />
                {t.has(`tasks.${x.code}`) ? t(`tasks.${x.code}`) : x.code}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function SendLink({ className }: { className?: string }) {
  const t = useTranslations();
  return (
    <Link
      href="/estimate/contact"
      className={cx(
        // no display utility here: each caller sets it, so hidden is never overridden
        'min-h-14 flex-col items-center justify-center rounded-[var(--radius-field)] bg-route px-6 py-1.5 text-white no-underline shadow-[var(--shadow-lift)] hover:bg-route-hover',
        className,
      )}
    >
      <span className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-[1.02rem] font-bold">
        {t('estimate.send')} <ArrowRight size={20} aria-hidden />
      </span>
      <span className="text-[0.8rem] text-white/85">{t('estimate.sendNote')}</span>
    </Link>
  );
}

/** The page ends on what happens next and the main action, not on warnings (D37, critique). */
function NextSteps({ order }: { order: OrderInput }) {
  const t = useTranslations();
  const method = order.survey?.method ?? 'none';
  const steps = [t('estimate.next.contact'), t(`estimate.next.${method}`), ...(method === 'none' ? [] : [t('estimate.next.fixed')])];
  return (
    <section aria-labelledby="next-title" className="rounded-[var(--radius-panel)] border border-line bg-paper p-5 sm:p-6">
      <h2 id="next-title" className="text-[1.2rem] font-extrabold">
        {t('estimate.next.title')}
      </h2>
      <ol className="mt-4 flex flex-col gap-3">
        {steps.map((s, i) => (
          <li key={s} className="grid grid-cols-[28px_1fr] items-baseline gap-3">
            <span
              aria-hidden
              className="tabular grid size-7 place-items-center rounded-full bg-cloud font-[family-name:var(--font-display)] text-[0.9rem] font-bold"
            >
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
      <p className="mt-4 flex items-center gap-2 font-semibold">
        <Check size={18} aria-hidden className="text-ok" />
        {t('estimate.next.free')}
      </p>
      <SendLink className="mt-5 hidden w-full sm:w-auto lg:inline-flex" />
    </section>
  );
}

function Actions({ order }: { order: OrderInput }) {
  const t = useTranslations();
  const locale = useLocaleTyped();
  const cfg = useCfg();
  const router = useRouter();
  const setMode = useOrderStore((s) => s.setMode);
  const [copied, setCopied] = useState(false);
  const firstStep = useMemo(() => {
    const hidden = applyRules(order, cfg.rules).hiddenSteps;
    return visibleSteps(order, order.mode, cfg.steps, hidden)[0];
  }, [order, cfg]);

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#s=${encodeShare(order)}`;
    try {
      if (navigator.share) await navigator.share({ title: t('estimate.title'), url });
      else await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      /* the user closed the share sheet */
    }
  };

  const refine = () => {
    setMode('detailed');
    const o = { ...useOrderStore.getState().order };
    const hidden = applyRules(o, cfg.rules).hiddenSteps;
    const target = firstIncomplete(o, 'detailed', cfg.steps, hidden);
    if (target) router.push({ pathname: '/estimate/[step]', params: { step: target.slug[locale] } });
  };

  return (
    <section aria-label={t('estimate.send')} className="flex flex-col gap-3 rounded-[var(--radius-panel)] bg-night p-5 text-on-night">
      <SendLink className="hidden lg:inline-flex" />
      {order.mode === 'quick' && (
        <div className="rounded-[var(--radius-field)] border border-white/20 p-4">
          <Button variant="onNight" className="w-full" onPress={refine}>
            {t('estimate.refine')}
          </Button>
          <p className="mt-2 text-[0.85rem] text-on-night-muted">{t('estimate.refineText')}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="onNight" onPress={() => void share()} className="!px-3 whitespace-nowrap">
          <Share2 size={18} aria-hidden /> {t('estimate.shareShort')}
        </Button>
        {firstStep && (
          <Link
            href={{ pathname: '/estimate/[step]', params: { step: firstStep.slug[locale] } }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-field)] border border-white/25 bg-white/10 font-[family-name:var(--font-display)] text-[0.95rem] font-bold text-white no-underline hover:bg-white/18"
          >
            <PencilLine size={18} aria-hidden /> {t('estimate.editShort')}
          </Link>
        )}
      </div>
      <p aria-live="polite" className="text-[0.85rem] text-on-night-muted">
        {copied ? t('estimate.shareCopied') : t('estimate.shareNote')}
      </p>
    </section>
  );
}
