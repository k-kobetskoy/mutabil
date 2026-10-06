'use client';
import { useTranslations } from 'next-intl';
import { useOrderStore } from '@/state/order-store';
import { ChoiceTiles } from '@/ui/ChoiceTiles';
import { Stepper } from '@/ui/Stepper';
import { useCfg } from '../providers';
import type { StepProps } from '../StepScreen';

/** Quick mode: the rough distance class instead of exact zones. */
export function StepRoute({ errors }: StepProps) {
  const t = useTranslations();
  const cfg = useCfg();
  const order = useOrderStore((s) => s.order);
  const update = useOrderStore((s) => s.update);
  return (
    <>
      <ChoiceTiles
        label={t('steps.route.title')}
        value={order.route}
        onChange={(v) => update('route', v)}
        columns={3}
        isInvalid={!!errors.route}
        errorMessage={errors.route && t(errors.route)}
        tiles={[
          { value: 'city', label: t('steps.route.city') },
          { value: 'suburb', label: t('steps.route.suburb'), hint: t('steps.route.suburbText') },
          { value: 'intercity', label: t('steps.route.intercity') },
        ]}
      />
      {order.route === 'intercity' && (
        <Stepper
          label={t('steps.access.distanceKm')}
          value={order.distanceKm ?? cfg.zones.intercityDefaultKm}
          min={1}
          max={1500}
          step={5}
          onChange={(v) => update('distanceKm', v)}
        />
      )}
    </>
  );
}
