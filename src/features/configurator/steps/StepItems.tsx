'use client';
/**
 * What we carry. Three ways to count: pick the big items (most precise), by rooms (fast,
 * wider range) or count at the survey. Small things go in boxes; special things get their own
 * packing. Photos/video are optional and help the estimator.
 */
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import type { OrderInput } from '@/contract/order';
import { presetFor } from '@/domain/volume';
import type { AppLocale } from '@/lib/format';
import { useOrderStore } from '@/state/order-store';
import { Button } from '@/ui/Button';
import { ChoiceTiles } from '@/ui/ChoiceTiles';
import { Switch, TextInput } from '@/ui/Fields';
import { Stepper } from '@/ui/Stepper';
import { MediaBlock } from '../../media/MediaBlock';
import { useCfg } from '../providers';
import type { StepProps } from '../StepScreen';

type InvMode = NonNullable<OrderInput['inventory']>['mode'];
const CATEGORY_ORDER = ['bedroom', 'living', 'appliances', 'electronics', 'office', 'special', 'misc'];

export function StepItems({ errors }: StepProps) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const cfg = useCfg();
  const order = useOrderStore((s) => s.order);
  const update = useOrderStore((s) => s.update);
  const mode = order.inventory?.mode;
  const onlyList = order.taskType === 'items';
  const preset = presetFor(order, cfg);

  return (
    <>
      {!onlyList && (
        <ChoiceTiles<InvMode>
          label={t('steps.items.mode')}
          value={mode}
          onChange={(v) => update('inventory.mode', v)}
          columns={3}
          isInvalid={!!errors['inventory.mode']}
          errorMessage={errors['inventory.mode'] && t(errors['inventory.mode'])}
          tiles={[
            { value: 'list', label: t('steps.items.modeList'), hint: t('steps.items.modeListText') },
            { value: 'preset', label: t('steps.items.modePreset'), hint: t('steps.items.modePresetText') },
            { value: 'atSurvey', label: t('steps.items.modeSurvey'), hint: t('steps.items.modeSurveyText') },
          ]}
        />
      )}

      {mode === 'list' && <ItemList error={errors['inventory.items']} />}

      {(mode === 'list' || mode === 'preset') && order.taskType !== 'office' && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Stepper
            label={t('steps.items.boxes')}
            value={order.inventory?.boxes ?? preset?.boxes.typical ?? 0}
            min={0}
            max={400}
            step={5}
            onChange={(v) => update('inventory.boxes', v)}
            description={preset ? t('steps.items.boxesHint', { preset: preset.name[locale], typical: preset.boxes.typical }) : undefined}
          />
          <Stepper
            label={t('steps.items.kallax')}
            value={order.inventory?.kallaxInserts ?? 0}
            min={0}
            max={400}
            onChange={(v) => update('inventory.kallaxInserts', v || undefined)}
            description={t('steps.items.kallaxHint')}
          />
        </div>
      )}

      {mode === 'list' && <CustomItems />}
      {mode && <SpecialItems />}
      {mode && <MediaBlock />}
    </>
  );
}

function ItemList({ error }: { error?: string }) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const cfg = useCfg();
  const items = useOrderStore((s) => s.order.inventory?.items) ?? {};
  const update = useOrderStore((s) => s.update);
  const [all, setAll] = useState(false);
  const chosen = Object.values(items).reduce((a, b) => a + b, 0);

  const shown = cfg.catalog.items.filter((i) => all || i.common || items[i.id]);
  const groups = CATEGORY_ORDER.map((c) => ({
    c,
    list: shown.filter((i) => (CATEGORY_ORDER.includes(i.category) ? i.category : 'misc') === c),
  })).filter((g) => g.list.length);

  return (
    <section aria-labelledby="items-list" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="items-list" className="text-[1.25rem] font-extrabold">
          {t('steps.items.modeList')}
        </h2>
        <p className="tabular text-[0.95rem] font-semibold text-ink-muted" aria-live="polite">
          {t('flow.chosenCount', { count: chosen })}
        </p>
      </div>
      <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
        {groups.map((g) => (
          <fieldset key={g.c} className="flex flex-col">
            <legend className="label-cap mb-1 text-ink-muted">{t(`steps.items.categories.${g.c}`)}</legend>
            <ul className="divide-y divide-line border-y border-line">
              {g.list.map((i) => (
                <li key={i.id} className="py-1.5">
                  <Stepper
                    compact
                    label={i.name[locale]}
                    value={items[i.id] ?? 0}
                    min={0}
                    max={99}
                    onChange={(v) => update(`inventory.items.${i.id}`, v > 0 ? v : undefined)}
                  />
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
      </div>
      <Switch isSelected={all} onChange={setAll}>
        {t('steps.items.showAll')}
      </Switch>
      {error && (
        <p role="alert" className="text-[0.92rem] font-semibold text-error">
          {t(error)}
        </p>
      )}
    </section>
  );
}

function CustomItems() {
  const t = useTranslations();
  const custom = useOrderStore((s) => s.order.inventory?.custom) ?? [];
  const update = useOrderStore((s) => s.update);
  const [draft, setDraft] = useState({ label: '', w: 80, d: 60, h: 100, qty: 1 });
  return (
    <section aria-labelledby="custom-title" className="flex flex-col gap-4 rounded-[var(--radius-panel)] border border-line bg-paper p-5">
      <h2 id="custom-title" className="text-[1.1rem] font-extrabold">
        {t('steps.items.custom')}
      </h2>
      {custom.length > 0 && (
        <ul className="divide-y divide-line">
          {custom.map((c, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-2">
              <span>
                <span className="font-semibold">{c.label || t('steps.items.custom')}</span>{' '}
                <span className="tabular text-ink-muted">
                  {c.wCm}×{c.dCm}×{c.hCm} cm · × {c.qty}
                </span>
              </span>
              <Button variant="ghost" aria-label={`${t('common.remove')}: ${c.label || t('steps.items.custom')}`} className="!min-h-10 !px-2" onPress={() => update('inventory.custom', custom.filter((_, j) => j !== i).length ? custom.filter((_, j) => j !== i) : undefined)}>
                <Trash2 size={16} aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <TextInput className="col-span-2 sm:col-span-4" label={t('steps.items.customLabel')} value={draft.label} onChange={(label) => setDraft({ ...draft, label: label.slice(0, 60) })} />
        <Stepper label={t('steps.items.customW')} value={draft.w} min={1} max={400} step={5} onChange={(w) => setDraft({ ...draft, w })} />
        <Stepper label={t('steps.items.customD')} value={draft.d} min={1} max={400} step={5} onChange={(d) => setDraft({ ...draft, d })} />
        <Stepper label={t('steps.items.customH')} value={draft.h} min={1} max={400} step={5} onChange={(h) => setDraft({ ...draft, h })} />
        <Stepper label={t('common.pieces')} value={draft.qty} min={1} max={99} onChange={(qty) => setDraft({ ...draft, qty })} />
      </div>
      <Button
        variant="secondary"
        className="self-start"
        isDisabled={custom.length >= 20}
        onPress={() => {
          update('inventory.custom', [...custom, { ...(draft.label.trim() ? { label: draft.label.trim() } : {}), wCm: draft.w, dCm: draft.d, hCm: draft.h, qty: draft.qty }]);
          setDraft({ ...draft, label: '' });
        }}
      >
        <Plus size={18} aria-hidden />
        {t('steps.items.addCustom')}
      </Button>
    </section>
  );
}

type SpecialKind = NonNullable<OrderInput['special']>[number]['kind'];

function SpecialItems() {
  const t = useTranslations();
  const cfg = useCfg();
  const special = useOrderStore((s) => s.order.special) ?? [];
  const update = useOrderStore((s) => s.update);
  const [kind, setKind] = useState<SpecialKind>('fragile');
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const rates = cfg.pricing.special.reinforcedPackingLei;
  return (
    <section aria-labelledby="special-title" className="flex flex-col gap-4 rounded-[var(--radius-panel)] border border-line bg-paper p-5">
      <div>
        <h2 id="special-title" className="text-[1.1rem] font-extrabold">
          {t('steps.items.special')} <span className="text-[0.92rem] font-normal text-ink-muted">· {t('common.optional')}</span>
        </h2>
        <p className="text-[0.92rem] text-ink-muted">{t('steps.items.specialText')}</p>
      </div>
      {special.length > 0 && (
        <ul className="divide-y divide-line">
          {special.map((s, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-2">
              <span>
                <span className="font-semibold">{t(`steps.items.specialKind.${s.kind}`)}</span>
                {s.label && <span className="text-ink-muted"> · {s.label}</span>}
              </span>
              <Button variant="ghost" aria-label={`${t('common.remove')}: ${s.label || t(`steps.items.specialKind.${s.kind}`)}`} className="!min-h-10 !px-2" onPress={() => update('special', special.length > 1 ? special.filter((_, j) => j !== i) : undefined)}>
                <Trash2 size={16} aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <ChoiceTiles<SpecialKind>
        label={t('steps.items.specialKindLabel')}
        value={kind}
        onChange={setKind}
        columns={4}
        size="sm"
        tiles={(['fragile', 'valuable', 'pristine', 'piano'] as const).map((k) => ({ value: k, label: t(`steps.items.specialKind.${k}`), hint: `${rates[k]} lei` }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label={t('steps.items.specialLabel')} value={label} onChange={(v) => setLabel(v.slice(0, 60))} />
        <TextInput label={t('steps.items.specialValue')} value={value} onChange={(v) => setValue(v.replace(/\D/g, '').slice(0, 8))} inputMode="numeric" />
      </div>
      <Button
        variant="secondary"
        className="self-start"
        isDisabled={special.length >= 20}
        onPress={() => {
          update('special', [...special, { kind, ...(label.trim() ? { label: label.trim() } : {}), ...(value ? { declaredValueLei: Number(value) } : {}) }]);
          setLabel('');
          setValue('');
        }}
      >
        <Plus size={18} aria-hidden />
        {t('steps.items.addSpecial')}
      </Button>
    </section>
  );
}
