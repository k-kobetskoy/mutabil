'use client';
/**
 * The landing's working action (Persuade mode): a route search like an airline's.
 * Quick mode = what + floors/lifts + route (zones). The boarding pass below updates live;
 * until the visitor answers, it shows a labelled example.
 */
import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeftRight, ArrowRight } from 'lucide-react';
import { Form } from 'react-aria-components';
import type { ElevatorChoice, OrderInput } from '@/contract/order';
import { getConfig } from '@/config';
import { estimate } from '@/domain/estimate';
import { canEstimate } from '@/domain/volume';
import { useRouter, Link } from '@/i18n/navigation';
import type { AppLocale } from '@/lib/format';
import { useOrderStore } from '@/state/order-store';
import { Button } from '@/ui/Button';
import { SelectField } from '@/ui/SelectField';
import { Stepper } from '@/ui/Stepper';
import { BoardingPass } from '../configurator/BoardingPass';
import { zoneGroups } from '../configurator/useRoute';

export type WhatChoice = string; // preset id | 'items' | 'office'

export const SAMPLE_ORDER: OrderInput = {
  v: 1,
  mode: 'quick',
  taskType: 'apartment',
  size: { presetId: 'apartament-2-camere' },
  from: {
    zoneId: 'manastur',
    floor: 4,
    elevator: 'medium',
    furnitureInLift: 'yes',
    carry: 'lt10',
    parking: 'atEntrance',
    stairs: 'normal',
  },
  to: { zoneId: 'gheorgheni', floor: 1, elevator: 'none', carry: 'lt10', parking: 'atEntrance', stairs: 'normal' },
  survey: { method: 'remote' },
  protection: { level: 'basic' },
};

export function whatToOrder(what: WhatChoice | undefined): Pick<OrderInput, 'taskType' | 'size'> {
  if (!what) return {};
  if (what === 'items') return { taskType: 'items' };
  if (what === 'office') return { taskType: 'office', size: { presetId: 'birou-per-post', workstations: 5 } };
  if (what === 'casa') return { taskType: 'house', size: { presetId: 'casa' } };
  return { taskType: 'apartment', size: { presetId: what } };
}

type EndState = { zoneId?: string; floor?: number; elevator?: ElevatorChoice };

export function QuickSearch() {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const replace = useOrderStore((s) => s.replace);
  const current = useOrderStore((s) => s.order);
  const cfg = getConfig();

  const [what, setWhat] = useState<WhatChoice>();
  const [from, setFrom] = useState<EndState>({});
  const [to, setTo] = useState<EndState>({});
  const [tried, setTried] = useState(false);

  const draft: OrderInput = useMemo(
    () => ({ v: 1, mode: 'quick', ...whatToOrder(what), from: { ...from }, to: { ...to } }),
    [what, from, to],
  );
  const touched = !!what;
  const shown = touched && canEstimate(draft, cfg) ? draft : SAMPLE_ORDER;
  const est = useMemo(() => (canEstimate(shown, cfg) ? estimate(shown, cfg) : null), [shown, cfg]);

  const presets = cfg.catalog.presets.filter((p) => p.id !== 'birou-per-post');
  const whatGroups = [
    { options: presets.map((p) => ({ id: p.id, label: p.name[locale] })) },
    {
      options: [
        { id: 'items', label: t('fields.taskType.items') },
        { id: 'office', label: t('fields.taskType.office') },
      ],
    },
  ];
  const liftGroups = [
    {
      options: (['none', 'small', 'medium', 'large', 'unknown'] as const).map((k) => ({
        id: k,
        label: `${t(`lift.tile.${k}`)} · ${t(`lift.tileHint.${k}`)}`,
      })),
    },
  ];
  const zones = zoneGroups(locale, t);

  const submit = () => {
    setTried(true);
    if (!what || !from.zoneId || !to.zoneId) return;
    const cls = (id?: string) => cfg.zones.zones.find((z) => z.id === id)?.class;
    const route =
      cls(from.zoneId) === 'intercity' || cls(to.zoneId) === 'intercity'
        ? 'intercity'
        : cls(from.zoneId) === 'suburb' || cls(to.zoneId) === 'suburb'
          ? 'suburb'
          : 'city';
    // A different home starts fresh: the old item list, crates, survey and crew belonged to the
    // old one and gave a wrong maximum for the new one (critique 5). The same home keeps the draft.
    const sameHome = current.taskType === draft.taskType && current.size?.presetId === draft.size?.presetId;
    const base: OrderInput = sameHome ? current : { v: 1, mode: current.mode, ...(current.schedule ? { schedule: current.schedule } : {}) };
    const order: OrderInput = {
      ...base,
      ...draft,
      route,
      mode: what === 'items' ? 'detailed' : 'quick',
      from: { ...base.from, ...from },
      to: { ...base.to, ...to },
    };
    replace(order);
    if (what === 'items')
      router.push({ pathname: '/estimate/[step]', params: { step: cfg.steps.steps.find((s) => s.id === 'items')!.slug[locale] } });
    else router.push('/estimate/result');
  };

  // One column per end: the floor, then the lift under it at full width. Side by side, the lift
  // select pushed into the other end's column and out of the panel (owner's screenshots, EN).
  const endFields = (end: 'from' | 'to', state: EndState, set: (s: EndState) => void) => (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-end gap-3">
        <Stepper
          onNight
          label={end === 'from' ? t('landing.floorFrom') : t('landing.floorTo')}
          value={state.floor}
          min={0}
          max={30}
          onChange={(floor) => set({ ...state, floor })}
        />
        {(state.floor ?? 0) === 0 && <p className="pb-3 text-[0.85rem] text-on-night-muted">{t('steps.access.floorHint')}</p>}
      </div>
      {(state.floor ?? 0) > 0 && (
        <SelectField
          onNight
          className="min-w-0"
          label={end === 'from' ? t('landing.liftFrom') : t('landing.liftTo')}
          value={state.elevator}
          onChange={(v) => set({ ...state, elevator: v as ElevatorChoice })}
          groups={liftGroups}
          placeholder={t('steps.access.zonePlaceholder')}
        />
      )}
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
      <section
        aria-labelledby="search-title"
        className="on-night rounded-[var(--radius-panel)] bg-night p-5 text-on-night shadow-[var(--shadow-panel)] sm:p-6"
      >
        <h2 id="search-title" className="sr-only">
          {t('landing.searchTitle')}
        </h2>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-5"
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <SelectField
              onNight
              label={t('common.from')}
              value={from.zoneId}
              onChange={(zoneId) => setFrom({ ...from, zoneId })}
              groups={zones}
              placeholder={t('steps.access.zonePlaceholder')}
              isInvalid={tried && !from.zoneId}
              errorMessage={t('validation.zone.required')}
            />
            <Button
              variant="onNight"
              aria-label={t('common.swap')}
              onPress={() => {
                setFrom(to);
                setTo(from);
              }}
              className="mb-0 !min-h-12 !px-3"
            >
              <ArrowLeftRight size={18} aria-hidden />
            </Button>
            <SelectField
              onNight
              label={t('common.to')}
              value={to.zoneId}
              onChange={(zoneId) => setTo({ ...to, zoneId })}
              groups={zones}
              placeholder={t('steps.access.zonePlaceholder')}
              isInvalid={tried && !to.zoneId}
              errorMessage={t('validation.zone.required')}
            />
          </div>
          <SelectField
            onNight
            label={t('landing.what')}
            value={what}
            onChange={setWhat}
            groups={whatGroups}
            placeholder={t('steps.access.zonePlaceholder')}
            isInvalid={tried && !what}
            errorMessage={t('validation.taskType.required')}
          />
          <fieldset className="grid gap-4 border-t border-white/15 pt-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <legend className="sr-only">{t('landing.floors')}</legend>
            {endFields('from', from, setFrom)}
            {endFields('to', to, setTo)}
          </fieldset>
          {tried && (!what || !from.zoneId || !to.zoneId) && (
            <p role="alert" className="rounded-md border border-white/40 bg-white px-3 py-2 text-[0.92rem] font-semibold text-error">
              {!what ? t('validation.taskType.required') : t('validation.zone.required')}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full">
            {t('landing.cta')}
            <ArrowRight size={20} aria-hidden />
          </Button>
          <Link
            href={{ pathname: '/estimate', query: { mode: 'detailed' } }}
            className="text-center text-[0.95rem] font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
          >
            {t('landing.exact')}
          </Link>
        </Form>
      </section>

      <div className="flex flex-col gap-2">
        {/* The sample carries its own "example" badge; screen readers hear when it becomes theirs */}
        <p className="sr-only" aria-live="polite">
          {touched ? t('landing.passTitleLive') : ''}
        </p>
        {est && <BoardingPass order={shown} est={est} sample={!touched} compact />}
        {/* D43: the sample counts by rooms, so its range is wide; say so plainly */}
        {!touched && <p className="text-[0.88rem] text-ink-muted">{t('landing.sampleNote')}</p>}
      </div>
    </div>
  );
}
