'use client';
/**
 * The fare: two independent answers (survey method × protection level). Fare cards are only
 * shortcuts that set both; none is pre-selected and each shows its difference to the current
 * estimate, so the cheaper choice is as visible as the safer one (R7: no dark patterns).
 */
import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { OrderInput } from '@/contract/order';
import { estimate } from '@/domain/estimate';
import { canEstimate } from '@/domain/volume';
import { leiRange, signedLei, type AppLocale } from '@/lib/format';
import { useOrderStore } from '@/state/order-store';
import { ChoiceTiles } from '@/ui/ChoiceTiles';
import { Switch, TextInput } from '@/ui/Fields';
import { applyFare, fareOf, FARES, type Fare } from '../fares';
import { useCfg } from '../providers';
import type { StepProps } from '../StepScreen';
import { useFlow } from '../useFlow';

type Survey = NonNullable<OrderInput['survey']>['method'];
type Level = NonNullable<OrderInput['protection']>['level'];

export function StepProtection({ errors }: StepProps) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const cfg = useCfg();
  const P = cfg.pricing;
  const order = useOrderStore((s) => s.order);
  const replace = useOrderStore((s) => s.replace);
  const update = useOrderStore((s) => s.update);
  const flow = useFlow('protection');
  const allowedSurvey = flow.allowed('survey.method');
  const pct = (x: number) => Math.round(x * 1000) / 10;

  const fares = useMemo(() => {
    if (!canEstimate(order, cfg)) return null;
    const now = estimate(order, cfg).price.base;
    return Object.fromEntries(
      FARES.map((f) => {
        const e = estimate(applyFare(order, f), cfg);
        return [f, { low: e.price.low, high: e.price.high, delta: e.price.base - now }];
      }),
    ) as Record<Fare, { low: number; high: number; delta: number }>;
  }, [order, cfg]);

  const fareName: Record<Fare, string> = { estimate: t('landing.fares.estimate'), fixed: t('landing.fares.fixed'), complete: t('landing.fares.complete') };
  const fareFor: Record<Fare, string> = { estimate: t('landing.fares.estimateFor'), fixed: t('landing.fares.fixedFor'), complete: t('landing.fares.completeFor') };
  const level = order.protection?.level;

  return (
    <>
      <ChoiceTiles<Fare>
        label={t('steps.protection.fares')}
        value={fareOf(order) ?? undefined}
        onChange={(f) => replace(applyFare(order, f))}
        columns={3}
        tiles={FARES.map((f) => ({
          value: f,
          label: fareName[f],
          hint: fareFor[f],
          aside: fares && (
            <span className="flex flex-col">
              <span className="tabular font-[family-name:var(--font-display)] font-extrabold">{leiRange(fares[f].low, fares[f].high, locale)}</span>
              {fares[f].delta !== 0 && <span className="tabular text-[0.85rem] text-ink-muted">{t('steps.protection.difference', { delta: signedLei(fares[f].delta, locale) })}</span>}
            </span>
          ),
        }))}
      />

      <ChoiceTiles<Survey>
        label={t('steps.protection.survey')}
        value={order.survey?.method}
        onChange={(v) => update('survey.method', v)}
        columns={3}
        isInvalid={!!errors['survey.method']}
        errorMessage={errors['survey.method'] && t(errors['survey.method'])}
        tiles={(['onsite', 'remote', 'none'] as const).map((m) => {
          const disabled = !!allowedSurvey && !allowedSurvey.includes(m);
          const blocked = flow.blockedBy('survey.method', m);
          const text =
            m === 'onsite'
              ? t('steps.protection.onsiteText', { price: P.survey.onsite.priceLei, days: P.survey.onsite.deductibleValidDays, pct: pct(P.survey.onsite.capTolerance) })
              : m === 'remote'
                ? t('steps.protection.remoteText', { pct: pct(P.survey.remote.capTolerance) })
                : t('steps.protection.noneText');
          return {
            value: m,
            label: t(`steps.protection.${m}`),
            hint: disabled ? t(blocked === 'crates-onsite-survey' ? 'steps.protection.disabledByCrates' : 'steps.protection.disabledByAtSurvey') : text,
            aside: !disabled && <span className="text-[0.82rem] text-ink-muted italic">{t(`steps.protection.${m}Risk`)}</span>,
            disabled,
          };
        })}
      />

      <div className="flex flex-col gap-4">
        <ChoiceTiles<Level>
          label={t('steps.protection.level')}
          value={level}
          onChange={(v) => update('protection.level', v)}
          columns={2}
          isInvalid={!!errors['protection.level']}
          errorMessage={errors['protection.level'] && t(errors['protection.level'])}
          tiles={[
            { value: 'basic', label: t('steps.protection.basic'), hint: t('steps.protection.basicText') },
            { value: 'full', label: t('steps.protection.full'), hint: t('steps.protection.fullText', { rate: pct(P.protection.fullRate), min: P.protection.minFeeLei }) },
          ]}
        />
        {level === 'full' && (
          <div className="grid gap-4 rounded-[var(--radius-panel)] border border-line bg-paper p-5 sm:grid-cols-2 sm:items-start">
            <TextInput
              label={t('steps.protection.declared')}
              inputMode="numeric"
              value={order.protection?.declaredValueLei?.toString()}
              onChange={(v) => {
                const n = Number(v.replace(/\D/g, '').slice(0, 8));
                update('protection.declaredValueLei', n > 0 ? n : undefined);
              }}
              description={t('steps.protection.declaredHint', { min: P.protection.minDeclaredLei, perM3: P.protection.minDeclaredPerM3Lei, item: P.protection.highValueItemLei })}
            />
            <Switch isSelected={!!order.protection?.deductible} onChange={(v) => update('protection.deductible', v || undefined)}>
              {t('steps.protection.deductible', { amount: P.protection.deductibleLei, rate: pct(P.protection.fullRateWithDeductible) })}
            </Switch>
          </div>
        )}
      </div>
    </>
  );
}
