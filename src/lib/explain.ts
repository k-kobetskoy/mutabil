'use client';
/**
 * Turns domain explanations ({key, params}) into text. Ids in params (item, vehicle, lift…) are
 * translated first, so the domain stays language-free and every number keeps its reason.
 */
import { useLocale, useTranslations } from 'next-intl';
import type { Explain } from '@/contract/estimate';
import { getConfig } from '@/config';
import { num, type AppLocale } from './format';

export function useExplain() {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const cfg = getConfig();
  const tr = (ns: string, v: string) => (t.has(`${ns}.${v}`) ? t(`${ns}.${v}`) : v);

  return (e: Explain | undefined): string => {
    if (!e) return '';
    const p: Record<string, string | number> = {};
    for (const [k, raw] of Object.entries(e.params ?? {})) {
      const v = typeof raw === 'boolean' ? String(raw) : raw;
      if (k === 'item') p[k] = cfg.catalog.items.find((i) => i.id === v)?.name[locale] ?? String(v);
      else if (k === 'vehicle') p[k] = tr('vehicles', String(v));
      else if (k === 'lift') p[k] = tr('lift.short', String(v || 'none'));
      else if (k === 'end') p[k] = tr('end', String(v));
      else if (k === 'zoneClass') p[k] = tr('zoneClass', String(v));
      else if (k === 'path') p[k] = tr('paths', String(v));
      else if (k === 'who') p[k] = tr('packing.who', String(v));
      else if (k === 'assumed' || k === 'value' || k === 'from' || k === 'to') p[k] = tr('values', String(v));
      else if (typeof v === 'number' && !Number.isInteger(v)) p[k] = num(v, locale, 2);
      else p[k] = v;
    }
    return t.has(e.key) ? t(e.key, p) : e.key;
  };
}
