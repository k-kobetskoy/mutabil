'use client';
import { useLocale } from 'next-intl';
import type { OrderInput } from '@/contract/order';
import { getConfig } from '@/config';
import type { AppLocale } from '@/lib/format';

/** Route codes and names like on a boarding pass: MĂN → GHE. */
export function useRouteLabels(order: OrderInput) {
  const locale = useLocale() as AppLocale;
  const zones = getConfig().zones.zones;
  const z = (id?: string) => zones.find((x) => x.id === id);
  const from = z(order.from?.zoneId);
  const to = z(order.to?.zoneId);
  return {
    fromCode: from?.code ?? '···',
    toCode: to?.code ?? '···',
    fromName: from?.name[locale],
    toName: to?.name[locale],
  };
}

export function zoneGroups(locale: AppLocale, t: (k: string) => string) {
  const zones = getConfig().zones.zones;
  const opt = (c: 'city' | 'suburb' | 'intercity') =>
    zones.filter((z) => z.class === c).map((z) => ({ id: z.id, label: z.name[locale], detail: z.code }));
  return [
    { title: t('zoneClass.city'), options: opt('city') },
    { title: t('zoneClass.suburb'), options: opt('suburb') },
    { title: t('zoneClass.intercity'), options: opt('intercity') },
  ];
}
