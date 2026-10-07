'use client';
/**
 * One wizard step: stage strip (like an airline booking: Route · Baggage · Fare · Date),
 * the questions, Back / Continue, and the live booking on the side (desktop) or in the bottom
 * bar (phones). Validation runs on Continue and then live, with human messages.
 */
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertCircle, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { validateStep } from '@/domain/flow/validate';
import { Link, useRouter } from '@/i18n/navigation';
import { lei, type AppLocale } from '@/lib/format';
import { useOrderStore } from '@/state/order-store';
import { Button } from '@/ui/Button';
import { Disclosure } from '@/ui/Disclosure';
import { cx } from '@/ui/cx';
import { BoardingPass } from './BoardingPass';
import { Breakdown } from './Breakdown';
import { PriceBar, DeltaChip, usePriceDelta } from './PriceBar';
import { useCfg, useEstimate } from './providers';
import { useFlow } from './useFlow';
import { StepWhat } from './steps/StepWhat';
import { StepAccess } from './steps/StepAccess';
import { StepRoute } from './steps/StepRoute';
import { StepItems } from './steps/StepItems';
import { StepServices } from './steps/StepServices';
import { StepProtection } from './steps/StepProtection';
import { StepWhen } from './steps/StepWhen';

export type StepProps = { errors: Record<string, string> };

const BODIES: Record<string, ComponentType<StepProps>> = {
  what: StepWhat,
  access: StepAccess,
  route: StepRoute,
  items: StepItems,
  services: StepServices,
  protection: StepProtection,
  when: StepWhen,
};

export function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest' }).format(new Date());
}

export function StepScreen({ stepId }: { stepId: string }) {
  const t = useTranslations();
  const hydrated = useOrderStore((s) => s.hydrated);
  const setMode = useOrderStore((s) => s.setMode);
  const cfg = useCfg();
  const router = useRouter();
  const flow = useFlow(stepId);
  const est = useEstimate();
  // validation messages show after the first Continue on this step
  const [triedOn, setTriedOn] = useState<string | null>(null);
  const tried = triedOn === stepId;
  const summaryRef = useRef<HTMLDivElement>(null);
  const def = cfg.steps.steps.find((s) => s.id === stepId)!;

  // Guards: wrong mode → switch to the mode that has this step; gaps → first unanswered step.
  useEffect(() => {
    if (!hydrated) return;
    if (!def.modes.includes(flow.mode)) {
      if (def.modes.includes('detailed')) setMode('detailed');
      else router.replace('/estimate');
      return;
    }
    if (flow.index < 0) {
      router.replace(flow.firstIncomplete ? flow.href(flow.firstIncomplete) : '/estimate/result');
      return;
    }
    if (!flow.canOpen(stepId) && flow.firstIncomplete) router.replace(flow.href(flow.firstIncomplete));
  }, [hydrated, flow, def, stepId, setMode, router]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [stepId]);

  const errors = tried && flow.current ? validateStep(flow.order, flow.current, flow.mode, todayIso()) : {};
  const errorList = [...new Set(Object.values(errors))];

  const onContinue = () => {
    if (!flow.current) return;
    const errs = validateStep(flow.order, flow.current, flow.mode, todayIso());
    if (Object.keys(errs).length) {
      setTriedOn(stepId);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    if (flow.next) router.push(flow.href(flow.next));
    else router.push('/estimate/result');
  };

  const Body = BODIES[stepId];
  // with crates the survey is a visit, not a question (D39): the title states it
  const titleKey =
    stepId === 'protection' && flow.allowed('survey.method')?.length === 1 ? 'steps.protection.titleVisit' : `steps.${stepId}.title`;

  if (!hydrated || flow.index < 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-busy="true">
        <p className="text-ink-muted">{t('flow.loading')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-36 sm:px-6 lg:pb-20">
      <StageStrip flow={flow} />
      <div className="grid gap-10 pt-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <main id="main" className="min-w-0">
          <h1 className="text-[clamp(1.9rem,5vw,2.6rem)] leading-[1.05] font-extrabold">{t(titleKey)}</h1>

          {errorList.length > 0 && (
            <div
              ref={summaryRef}
              tabIndex={-1}
              role="alert"
              className="mt-5 flex gap-3 rounded-[var(--radius-field)] border border-error bg-paper px-4 py-3 outline-none"
            >
              <AlertCircle size={20} aria-hidden className="mt-0.5 shrink-0 text-error" />
              <div>
                <p className="font-bold">{t('flow.errorsTitle')}</p>
                <ul className="mt-1 list-disc pl-5 text-[0.95rem]">
                  {errorList.map((k) => (
                    <li key={k}>{t(k)}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div key={stepId} className="step-in mt-7 flex flex-col gap-9">
            <Body errors={errors} />
          </div>

          <div className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-6">
            {flow.prev ? (
              <Link
                href={flow.href(flow.prev)}
                className="inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-field)] px-3 font-[family-name:var(--font-display)] font-bold text-ink no-underline hover:bg-route-soft"
              >
                <ArrowLeft size={18} aria-hidden />
                {t('common.back')}
              </Link>
            ) : (
              <Link
                href="/estimate"
                className="inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-field)] px-3 font-[family-name:var(--font-display)] font-bold text-ink no-underline hover:bg-route-soft"
              >
                <ArrowLeft size={18} aria-hidden />
                {t('common.back')}
              </Link>
            )}
            <Button size="lg" onPress={onContinue}>
              {flow.next ? t('common.continue') : t('flow.toResult')}
              <ArrowRight size={20} aria-hidden />
            </Button>
          </div>
          <p className="mt-4 text-[0.85rem] text-ink-muted">{t('flow.saved', { days: cfg.app.draftTtlDays })}</p>
        </main>

        <BookingAside est={est} />
      </div>
      <PriceBar est={est} />
    </div>
  );
}

function StageStrip({ flow }: { flow: ReturnType<typeof useFlow> }) {
  const t = useTranslations();
  return (
    <nav aria-label={t('flow.nav')} className="border-b border-line pt-2">
      {/* Phones: one line of progress instead of six squeezed circles */}
      <div className="flex flex-col gap-2 pb-3 sm:hidden">
        <p className="text-[0.9rem]">
          <span className="font-bold">{t(`stage.${flow.steps[flow.index].id}`)}</span>
          <span className="text-ink-muted"> · {t('flow.progress', { n: flow.index + 1, total: flow.steps.length })}</span>
        </p>
        <div className="h-1 overflow-hidden rounded-full bg-line" aria-hidden>
          <div
            className="h-full origin-left rounded-full bg-route transition-transform duration-300 ease-[var(--ease-out-expo)]"
            style={{ transform: `scaleX(${(flow.index + 1) / flow.steps.length})` }}
          />
        </div>
      </div>
      <ol className="flex gap-2 overflow-x-auto py-3 max-sm:hidden [&::-webkit-scrollbar]:hidden">
        {flow.steps.map((s, i) => {
          const current = i === flow.index;
          const done = i < flow.index;
          const open = !current && flow.canOpen(s.id);
          const inner = (
            <>
              <span
                className={cx(
                  'grid size-6 shrink-0 place-items-center rounded-full text-[0.75rem] font-bold',
                  current ? 'bg-night text-white' : done ? 'bg-route text-white' : 'border border-line-strong text-ink-muted',
                )}
              >
                {done ? <Check size={14} strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              <span className={cx('whitespace-nowrap', current ? 'font-bold text-ink' : 'text-ink-muted')}>{t(`stage.${s.id}`)}</span>
            </>
          );
          return (
            <li key={s.id} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden className="h-px w-6 bg-line-strong" />}
              {open ? (
                <Link
                  href={flow.href(s)}
                  className="flex min-h-10 items-center gap-2 rounded-full px-1.5 text-[0.9rem] no-underline hover:bg-route-soft"
                >
                  {inner}
                </Link>
              ) : (
                <span aria-current={current ? 'step' : undefined} className="flex min-h-10 items-center gap-2 px-1.5 text-[0.9rem]">
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function BookingAside({ est }: { est: ReturnType<typeof useEstimate> }) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const order = useOrderStore((s) => s.order);
  const delta = usePriceDelta(est);
  return (
    <aside aria-label={t('flow.asideTitle')} className="sticky top-6 hidden flex-col gap-4 lg:flex">
      {est ? (
        <>
          {/* The total lives on the pass only; this card explains it and shows what just changed */}
          <BoardingPass order={order} est={est} compact />
          <div className="rounded-[var(--radius-panel)] border border-line bg-paper p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[0.92rem] text-ink-muted">{t('estimate.vat', { vat: lei(est.price.vat, locale) })}</span>
              <DeltaChip delta={delta} />
            </div>
            <Disclosure title={t('estimate.breakdown')} level={2} className="mt-2 border-t border-line pt-1">
              <Breakdown est={est} />
            </Disclosure>
          </div>
        </>
      ) : (
        <div className="rounded-[var(--radius-panel)] border border-dashed border-line-strong p-6 text-[0.95rem] text-ink-muted">
          {t('flow.noPriceYet')}
        </div>
      )}
    </aside>
  );
}
