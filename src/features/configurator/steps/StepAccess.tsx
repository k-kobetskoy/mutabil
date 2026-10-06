'use client';
/**
 * Both ends of the move: zone, floor, lift by picture, then the details most people can skip
 * (carry distance, parking, stairs). Quick mode keeps only floors and lifts.
 * The exact address is optional, stays in this session only, and lets us prefill a known building.
 */
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Camera, CheckCircle2 } from 'lucide-react';
import type { AddressDetails, AddressRecord } from '@/contract/api';
import type { ElevatorChoice, Endpoint } from '@/contract/order';
import { normalizeAddressKey } from '@/domain/address';
import type { AppLocale } from '@/lib/format';
import { useOrderStore } from '@/state/order-store';
import { useMediaStore, usePrivateStore } from '@/state/private-store';
import { ChoiceTiles } from '@/ui/ChoiceTiles';
import { Disclosure } from '@/ui/Disclosure';
import { Switch, TextInput } from '@/ui/Fields';
import { SelectField } from '@/ui/SelectField';
import { LiftPlan } from '@/ui/Sketch';
import { Stepper } from '@/ui/Stepper';
import { Button } from '@/ui/Button';
import { useCfg, useServices } from '../providers';
import type { StepProps } from '../StepScreen';
import { zoneGroups } from '../useRoute';

type End = 'from' | 'to';
const LIFTS: ElevatorChoice[] = ['none', 'small', 'medium', 'large', 'unknown'];

export function StepAccess({ errors }: StepProps) {
  const t = useTranslations();
  const order = useOrderStore((s) => s.order);
  const update = useOrderStore((s) => s.update);
  const cfg = useCfg();
  const detailed = order.mode === 'detailed';
  const intercity = [order.from?.zoneId, order.to?.zoneId].some((id) => cfg.zones.zones.find((z) => z.id === id)?.class === 'intercity');

  return (
    <>
      <div className="flex flex-col gap-6">
        <EndCard end="from" errors={errors} detailed={detailed} />
        <EndCard end="to" errors={errors} detailed={detailed} />
      </div>
      {detailed && intercity && (
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

function EndCard({ end, errors, detailed }: { end: End; errors: Record<string, string>; detailed: boolean }) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const e: Endpoint = useOrderStore((s) => s.order[end]) ?? {};
  const update = useOrderStore((s) => s.update);
  const set = (k: keyof Endpoint, v: unknown) => update(`${end}.${k}`, v);
  const floor = e.floor;
  const hasLift = e.elevator && e.elevator !== 'none' && e.elevator !== 'unknown';
  const err = (k: string) => errors[`${end}.${k}`];

  return (
    <section aria-labelledby={`${end}-title`} className="flex flex-col gap-6 rounded-[var(--radius-panel)] border border-line bg-paper p-5 sm:p-6">
      <h2 id={`${end}-title`} className="flex items-center gap-3 text-[1.25rem] font-extrabold">
        <span className="label-cap rounded-md bg-night px-2 py-1 text-[0.7rem] text-white">{end === 'from' ? 'A' : 'B'}</span>
        {t(`steps.access.${end}`)}
      </h2>

      {detailed && (
        <SelectField
          label={t('steps.access.zone')}
          value={e.zoneId}
          onChange={(v) => set('zoneId', v)}
          groups={zoneGroups(locale, t)}
          placeholder={t('steps.access.zonePlaceholder')}
          isInvalid={!!err('zoneId')}
          errorMessage={err('zoneId') && t(err('zoneId'))}
        />
      )}

      <div className="flex flex-col gap-1.5">
        <Stepper label={t('steps.access.floor')} value={floor} min={0} max={30} onChange={(v) => set('floor', v)} description={t('steps.access.floorHint')} />
        {err('floor') && <p className="text-[0.92rem] font-semibold text-error">{t(err('floor'))}</p>}
      </div>

      {(floor ?? 0) > 0 && (
        <>
          <ChoiceTiles<ElevatorChoice>
            label={t('steps.access.elevator')}
            description={t('steps.access.plateHint')}
            value={e.elevator}
            onChange={(v) => set('elevator', v)}
            columns={5}
            size="sm"
            isInvalid={!!err('elevator')}
            errorMessage={err('elevator') && t(err('elevator'))}
            tiles={LIFTS.map((k) => ({
              value: k,
              label: t(`lift.tile.${k}`),
              hint: t(`lift.tileHint.${k}`),
              icon: <LiftPlan kind={k} title="" className="h-12 w-full" />,
            }))}
          />
          {detailed && <PlatePhoto end={end} />}
          {hasLift && (
            <ChoiceTiles
              label={t('steps.access.furnitureInLift')}
              value={e.furnitureInLift}
              onChange={(v) => set('furnitureInLift', v)}
              columns={3}
              size="sm"
              tiles={(['yes', 'no', 'unknown'] as const).map((v) => ({ value: v, label: v === 'unknown' ? t('common.unknown') : t(`common.${v}`) }))}
            />
          )}
        </>
      )}

      {detailed && (
        <>
          <Disclosure title={t('steps.access.more')} className="border-t border-line pt-2">
            <div className="flex flex-col gap-6 pt-2">
              <ChoiceTiles
                label={t('steps.access.carry')}
                value={e.carry}
                onChange={(v) => set('carry', v)}
                columns={4}
                size="sm"
                tiles={(['lt10', '10to30', 'gt30', 'unknown'] as const).map((v) => ({ value: v, label: v === 'unknown' ? t('common.unknown') : t(`choices.carry.${v}`) }))}
              />
              <ChoiceTiles
                label={t('steps.access.parking')}
                value={e.parking}
                onChange={(v) => set('parking', v)}
                columns={4}
                size="sm"
                tiles={(['atEntrance', 'nearby', 'far', 'unknown'] as const).map((v) => ({ value: v, label: v === 'unknown' ? t('common.unknown') : t(`choices.parking.${v}`) }))}
              />
              {(floor ?? 0) > 0 && (
                <ChoiceTiles
                  label={t('steps.access.stairs')}
                  value={e.stairs}
                  onChange={(v) => set('stairs', v)}
                  columns={4}
                  size="sm"
                  tiles={(['normal', 'narrow', 'winding', 'unknown'] as const).map((v) => ({ value: v, label: v === 'unknown' ? t('common.unknown') : t(`choices.stairs.${v}`) }))}
                />
              )}
              <Switch isSelected={!!e.raisedEntrance} onChange={(v) => set('raisedEntrance', v || undefined)}>
                {t('steps.access.raisedEntrance')}
              </Switch>
            </div>
          </Disclosure>
          <AddressFields end={end} />
        </>
      )}
    </section>
  );
}

/** A photo of the lift plate: the estimator reads persons / kg from it. Stored on this device. */
function PlatePhoto({ end }: { end: End }) {
  const t = useTranslations();
  const { uploads } = useServices();
  const items = useMediaStore((s) => s.items);
  const add = useMediaStore((s) => s.add);
  const name = `plate-${end}`;
  const has = items.some((i) => i.kind === 'elevatorPlate' && i.name === name);
  return (
    <div className="flex items-center gap-3">
      {has ? (
        <p className="flex items-center gap-2 text-[0.95rem] font-semibold text-ok-ink">
          <CheckCircle2 size={18} aria-hidden />
          {t('steps.access.plateAdded')}
        </p>
      ) : (
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-field)] border border-line-strong px-4 font-[family-name:var(--font-display)] text-[0.92rem] font-bold hover:border-ink focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-route">
          <Camera size={18} aria-hidden />
          {t('steps.access.platePhoto')}
          <span className="text-[0.8rem] font-normal text-ink-muted">· {t('common.optional')}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={async (ev) => {
              const f = ev.target.files?.[0];
              if (!f) return;
              add(await uploads.put(f, { kind: 'elevatorPlate', name }));
            }}
          />
        </label>
      )}
    </div>
  );
}

function AddressFields({ end }: { end: End }) {
  const t = useTranslations();
  const { addresses } = useServices();
  const a: AddressDetails = usePrivateStore((s) => s.addresses[end]) ?? {};
  const setAddress = usePrivateStore((s) => s.setAddress);
  const e = useOrderStore((s) => s.order[end]) ?? {};
  const patch = useOrderStore((s) => s.patch);
  const [lookup, setLookup] = useState<{ key: string; rec: AddressRecord | null } | null>(null);
  const key = normalizeAddressKey(a);
  const found = key && lookup?.key === key ? lookup.rec : null;

  useEffect(() => {
    let live = true;
    if (!key) return;
    void addresses.lookup(a).then((r) => {
      if (!live) return;
      setLookup({ key, rec: r });
      // a known building fills the lift only if the client has not answered it yet
      if (r?.elevator && !useOrderStore.getState().order[end]?.elevator) apply(r);
    });
    return () => {
      live = false;
    };
    // the normalised key is the identity of the building entrance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, addresses]);

  const applied = found?.elevator && e.elevator === found.elevator;
  function apply(r: AddressRecord) {
    patch((o) => ({
      ...o,
      [end]: {
        ...o[end],
        elevator: r.elevator,
        ...(r.furnitureInLift ? { furnitureInLift: r.furnitureInLift } : {}),
        ...(r.raisedEntrance !== undefined ? { raisedEntrance: r.raisedEntrance } : {}),
      },
    }));
  }
  const field = (k: keyof AddressDetails, label: string, cls = '') => (
    <TextInput label={label} value={a[k]} onChange={(v) => setAddress(end, { [k]: v })} autoComplete={k === 'street' ? 'address-line1' : 'off'} className={cls} />
  );

  return (
    <Disclosure title={<span>{t('steps.access.address')} <span className="font-normal text-ink-muted">· {t('common.optional')}</span></span>} className="-mt-3 border-t border-line pt-2">
      <p className="mb-4 text-[0.92rem] text-ink-muted">{t('steps.access.addressHint')}</p>
      <div className="grid grid-cols-3 gap-3">
        {field('street', t('steps.access.street'), 'col-span-3')}
        {field('number', t('steps.access.number'))}
        {field('block', t('steps.access.block'))}
        {field('stair', t('steps.access.stair'))}
        {field('apartment', t('steps.access.apartment'))}
      </div>
      {found?.elevator && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-ok-soft px-4 py-3 text-[0.95rem] text-ok-ink" role="status">
          <span>{t(applied ? 'steps.access.directoryFound' : 'steps.access.directoryKnown', { lift: t(`lift.short.${found.elevator}`) })}</span>
          {!applied && (
            <Button variant="secondary" className="!min-h-10" onPress={() => apply(found)}>
              {t('steps.access.directoryUse')}
            </Button>
          )}
        </div>
      )}
    </Disclosure>
  );
}
