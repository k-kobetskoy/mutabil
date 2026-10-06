import { describe, expect, it } from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import { getConfig } from '@/config';
import { estimate } from '@/domain/estimate';
import { VECTORS } from '../vectors';

type Tree = { [k: string]: string | Tree };
const flatten = (t: Tree, prefix = ''): string[] =>
  Object.entries(t).flatMap(([k, v]) => (typeof v === 'string' ? [`${prefix}${k}`] : flatten(v, `${prefix}${k}.`)));
const has = (t: Tree, key: string) => key.split('.').reduce<string | Tree | undefined>((n, k) => (n && typeof n === 'object' ? n[k] : undefined), t) !== undefined;

describe('translations', () => {
  it('RO and EN have exactly the same keys', () => {
    expect(flatten(en as Tree).sort()).toEqual(flatten(ro as Tree).sort());
  });

  it('every explanation the domain can produce has a text in both languages', () => {
    const cfg = getConfig();
    const keys = new Set<string>();
    for (const o of Object.values(VECTORS)) {
      for (const method of ['none', 'remote', 'onsite'] as const) {
        const e = estimate({ ...o, survey: { method } }, cfg);
        e.lines.forEach((l) => {
          keys.add(l.explain.key);
          l.details?.forEach((d) => keys.add(d.key));
        });
        [...e.warnings, ...e.hints, ...e.price.reasons, ...e.time.breakdown, e.vehicle.explain, e.crew.explain].forEach((x) => keys.add(x.key));
        e.assumptions.forEach((a) => keys.add(a.explain.key));
        e.tasks.forEach((t) => keys.add(`tasks.${t.code}`));
        e.included.forEach((i) => keys.add(`included.${i}`));
      }
    }
    for (const r of cfg.rules.rules)
      for (const t of r.then) {
        if (t.type === 'hint') keys.add(t.key);
        if (t.type === 'assume') keys.add(t.explain);
        if (t.type === 'addTask') keys.add(`tasks.${t.code}`);
      }
    for (const v of cfg.vehicles.vehicles) keys.add(`vehicles.${v.id}`);
    const missing = [...keys].filter((k) => !has(ro as Tree, k) || !has(en as Tree, k));
    expect(missing).toEqual([]);
  });
});
