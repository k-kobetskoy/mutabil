'use client';
/**
 * One question instead of fares (decisions D36): do you want a fixed price, and how do we survey?
 * Each answer shows the range it leads to, so the cheaper choice is as visible as the safer one.
 * Liability is by law and always included; full protection is out of the MVP (owner, 2026-10-07).
 */
import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { OrderInput } from '@/contract/order';
import { estimate } from '@/domain/estimate';
import { canEstimate } from '@/domain/volume';
import { leiRange, type AppLocale } from '@/lib/format';
import { useOrderStore } from '@/state/order-store';
import { ChoiceTiles } from '@/ui/ChoiceTiles';
import { useCfg } from '../providers';
import type { StepProps } from '../StepScreen';
import { useFlow } from '../useFlow';

type Survey = NonNullable<OrderInput['survey']>['method'];
const METHODS: Survey[] = ['remote', 'onsite', 'none'];

export function StepProtection({ errors }: StepProps) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const cfg = useCfg();
  const P = cfg.pricing;
  const order = useOrderStore((s) => s.order);
  const patch = useOrderStore((s) => s.patch);
  const flow = useFlow('protection');
  const allowed = flow.allowed('survey.method');
  const pct = (x: number) => Math.round(x * 100);

  const ranges = useMemo(() => {
    if (!canEstimate(order, cfg)) return null;
    return Object.fromEntries(
      METHODS.map((m) => {
        const e = estimate({ ...order, survey: { method: m }, protection: { level: 'basic' } }, cfg);
        return [m, leiRange(e.price.low, e.price.high, locale)];
      }),
    ) as Record<Survey, string>;
  }, [order, cfg, locale]);

  const text: Record<Survey, string> = {
    remote: t('steps.protection.remoteText', { pct: pct(P.survey.remote.capTolerance) }),
    onsite: t('steps.protection.onsiteText', { price: P.survey.onsite.priceLei, pct: pct(P.survey.onsite.capTolerance) }),
    none: t('steps.protection.noneText'),
  };

  return (
    <>
      <ChoiceTiles<Survey>
        label={t('steps.protection.question')}
        description={t('steps.protection.lead')}
        value={order.survey?.method}
        // choosing an answer also drops a full-protection level left in an older draft
        onChange={(m) => patch((o) => ({ ...o, survey: { method: m }, protection: { level: 'basic' } }))}
        columns={3}
        isInvalid={!!errors['survey.method']}
        errorMessage={errors['survey.method'] && t(errors['survey.method'])}
        tiles={METHODS.map((m) => {
          const disabled = !!allowed && !allowed.includes(m);
          const blocked = flow.blockedBy('survey.method', m);
          return {
            value: m,
            label: t(`steps.protection.${m}`),
            hint: disabled
              ? t(blocked === 'crates-onsite-survey' ? 'steps.protection.disabledByCrates' : 'steps.protection.disabledByAtSurvey')
              : text[m],
            aside: ranges && !disabled && (
              <span className="tabular font-[family-name:var(--font-display)] font-extrabold">{ranges[m]}</span>
            ),
            disabled,
          };
        })}
      />
      <p className="max-w-[62ch] text-[0.95rem] text-ink-muted">{t('steps.protection.liability')}</p>
    </>
  );
}
