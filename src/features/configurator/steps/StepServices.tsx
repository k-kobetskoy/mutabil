'use client';
/** Packing, containers (reusable crates), special packaging, assembly by our master. */
import { useLocale, useTranslations } from 'next-intl';
import type { OrderInput } from '@/contract/order';
import type { AppLocale } from '@/lib/format';
import { useOrderStore } from '@/state/order-store';
import { ChoiceTiles } from '@/ui/ChoiceTiles';
import { Switch } from '@/ui/Fields';
import { Stepper } from '@/ui/Stepper';
import { useCfg } from '../providers';
import type { StepProps } from '../StepScreen';

type Packing = NonNullable<OrderInput['packing']>;
const EXTRAS = ['wardrobeBoxes', 'mattressBagsDouble', 'mattressBagsSingle', 'tvProtection', 'mirrorProtection'] as const;

export function StepServices(_props: StepProps) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const cfg = useCfg();
  const P = cfg.pricing;
  const order = useOrderStore((s) => s.order);
  const update = useOrderStore((s) => s.update);
  const packing: Packing = order.packing ?? {};
  const extraRate: Record<(typeof EXTRAS)[number], number> = {
    wardrobeBoxes: P.materials.wardrobeBoxRentalLei,
    mattressBagsDouble: P.materials.mattressBagDoubleLei,
    mattressBagsSingle: P.materials.mattressBagSingleLei,
    tvProtection: P.materials.tvProtectionLei,
    mirrorProtection: P.materials.mirrorProtectionLei,
  };

  const listed = order.inventory?.mode === 'list' ? (order.inventory.items ?? {}) : {};
  const assemblable = cfg.catalog.items.filter((i) => i.assemblyClass && listed[i.id]);
  const assembly = order.assembly?.items ?? {};
  const anyAssembly = Object.values(assembly).some((n) => n > 0);

  return (
    <>
      <ChoiceTiles<NonNullable<Packing['who']>>
        label={t('steps.services.who')}
        value={packing.who ?? 'self'}
        onChange={(v) => update('packing.who', v)}
        columns={3}
        tiles={(['self', 'partial', 'full'] as const).map((v) => ({
          value: v,
          label: t(`choices.who.${v}`),
          hint: t(`choices.who.${v}Text`),
        }))}
      />

      <div className="flex flex-col gap-4">
        <ChoiceTiles<NonNullable<Packing['containers']>>
          label={t('steps.services.containers')}
          value={packing.containers ?? 'own'}
          onChange={(v) => update('packing.containers', v)}
          columns={3}
          tiles={[
            {
              value: 'crates',
              label: t('choices.containers.crates'),
              hint: t('choices.containers.cratesText', {
                rate: P.crates.perCrateIncludedLei,
                days: P.crates.includedDays,
                fee: P.survey.onsite.priceLei,
              }),
            },
            {
              value: 'cardboard',
              label: t('choices.containers.cardboard'),
              hint: t('choices.containers.cardboardText', { rate: P.materials.cardboardBoxLei }),
            },
            { value: 'own', label: t('choices.containers.own'), hint: t('choices.containers.ownText') },
          ]}
        />
        {packing.containers === 'crates' && (
          <div className="flex flex-col gap-4 rounded-[var(--radius-panel)] border border-line bg-paper p-5">
            <p className="text-[0.95rem]">{t('steps.services.cratesRule', { days: P.crates.deliveryDaysBeforeMove })}</p>
            <Stepper
              label={t('steps.services.crateDays')}
              value={packing.crateDays ?? P.crates.includedDays}
              min={1}
              max={60}
              onChange={(v) => update('packing.crateDays', v)}
              description={t('steps.services.crateDaysHint', { included: P.crates.includedDays, rate: P.crates.extraPerCratePerDayLei })}
            />
          </div>
        )}
      </div>

      <fieldset className="flex flex-col">
        <legend className="label-cap mb-1 text-ink-muted">{t('steps.services.extras')}</legend>
        <ul className="divide-y divide-line border-y border-line">
          {EXTRAS.map((k) => (
            <li key={k} className="py-1.5">
              <Stepper
                compact
                label={
                  <span>
                    {t(`choices.extras.${k}`)} <span className="tabular text-ink-muted">· {extraRate[k]} lei</span>
                  </span>
                }
                value={packing[k] ?? 0}
                min={0}
                max={k === 'wardrobeBoxes' ? 50 : 20}
                onChange={(v) => update(`packing.${k}`, v || undefined)}
              />
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="label-cap mb-1 text-ink-muted">{t('steps.services.assembly')}</legend>
        <p className="-mt-1 text-[0.92rem] text-ink-muted">{t('steps.services.assemblyText')}</p>
        {assemblable.length ? (
          <ul className="divide-y divide-line border-y border-line">
            {assemblable.map((i) => (
              <li key={i.id} className="py-1.5">
                <Stepper
                  compact
                  label={
                    <span>
                      {i.name[locale]} <span className="tabular text-ink-muted">· {P.assembly.perClassLei[i.assemblyClass!]} lei</span>
                    </span>
                  }
                  value={assembly[i.id] ?? 0}
                  min={0}
                  max={listed[i.id]}
                  onChange={(v) => update(`assembly.items.${i.id}`, v || undefined)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg bg-cloud px-4 py-3 text-[0.92rem]">{t('steps.services.noAssemblyItems')}</p>
        )}
        {anyAssembly && (
          <Switch
            isSelected={!!order.assembly?.disassembleOnMovingDay}
            onChange={(v) => update('assembly.disassembleOnMovingDay', v || undefined)}
            description={t('steps.services.onMovingDayText', { fee: P.assembly.masterOnMovingDayLei })}
          >
            {t('steps.services.onMovingDay')}
          </Switch>
        )}
      </fieldset>
    </>
  );
}
