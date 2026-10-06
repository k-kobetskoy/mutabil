'use client';
import { useLocale, useTranslations } from 'next-intl';
import { Armchair, Briefcase, Building2, Home } from 'lucide-react';
import type { OrderInput } from '@/contract/order';
import type { AppLocale } from '@/lib/format';
import { useOrderStore } from '@/state/order-store';
import { ChoiceTiles } from '@/ui/ChoiceTiles';
import { Switch } from '@/ui/Fields';
import { Stepper } from '@/ui/Stepper';
import { useCfg } from '../providers';
import type { StepProps } from '../StepScreen';

type TaskType = NonNullable<OrderInput['taskType']>;

export function StepWhat({ errors }: StepProps) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const cfg = useCfg();
  const order = useOrderStore((s) => s.order);
  const patch = useOrderStore((s) => s.patch);
  const update = useOrderStore((s) => s.update);

  const chooseType = (taskType: TaskType) =>
    patch((o) => {
      const size = { ...o.size };
      if (taskType === 'house') size.presetId = 'casa';
      else if (taskType === 'office') {
        size.presetId = 'birou-per-post';
        size.workstations ??= 5;
      } else if (size.presetId === 'casa' || size.presetId === 'birou-per-post') delete size.presetId;
      const next: OrderInput = { ...o, taskType, size };
      // a few items are picked from the list, which only the detailed estimate has
      if (taskType === 'items') return { ...next, mode: 'detailed', inventory: { ...o.inventory, mode: 'list' } };
      if (o.taskType === 'items' && o.inventory?.mode === 'list' && !Object.keys(o.inventory.items ?? {}).length) {
        const { inventory: _drop, ...rest } = next;
        return rest;
      }
      return next;
    });

  const presets = cfg.catalog.presets.filter((p) => p.id !== 'birou-per-post' && p.id !== 'casa');
  const icon = (n: TaskType) => ({ apartment: <Building2 size={26} aria-hidden />, house: <Home size={26} aria-hidden />, items: <Armchair size={26} aria-hidden />, office: <Briefcase size={26} aria-hidden /> })[n];

  return (
    <>
      <ChoiceTiles<TaskType>
        label={t('steps.what.taskType')}
        value={order.taskType}
        onChange={chooseType}
        columns={4}
        isInvalid={!!errors.taskType}
        errorMessage={errors.taskType && t(errors.taskType)}
        tiles={(['apartment', 'house', 'items', 'office'] as const).map((v) => ({ value: v, label: t(`fields.taskType.${v}`), icon: icon(v) }))}
      />
      {order.taskType === 'items' && <p className="-mt-5 rounded-lg bg-route-soft px-4 py-3 text-[0.95rem]">{t('flow.itemsMovedToDetailed')}</p>}

      {order.taskType === 'apartment' && (
        <ChoiceTiles
          label={t('steps.what.size')}
          value={order.size?.presetId}
          onChange={(v) => update('size.presetId', v)}
          columns={5}
          size="sm"
          isInvalid={!!errors['size.presetId']}
          errorMessage={errors['size.presetId'] && t(errors['size.presetId'])}
          tiles={presets.map((p) => ({ value: p.id, label: p.name[locale], hint: p.description[locale] }))}
        />
      )}

      {(order.taskType === 'apartment' || order.taskType === 'house') && (
        <>
          <ChoiceTiles
            label={t('steps.what.amount')}
            value={order.size?.amount ?? 'normal'}
            onChange={(v) => update('size.amount', v)}
            columns={3}
            size="sm"
            tiles={(['light', 'normal', 'heavy'] as const).map((v) => ({ value: v, label: t(`fields.amount.${v}`) }))}
          />
          <Switch isSelected={!!order.size?.storage} onChange={(v) => update('size.storage', v || undefined)}>
            {t('steps.what.storage')}
          </Switch>
        </>
      )}

      {order.taskType === 'office' && (
        <Stepper label={t('steps.what.workstations')} value={order.size?.workstations ?? 5} min={1} max={200} onChange={(v) => update('size.workstations', v)} />
      )}
    </>
  );
}
