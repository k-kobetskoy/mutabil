/**
 * Share link codec (decisions D19): `#s=<version>.<token>` where token = lz-string(JSON(order)).
 * The token carries only OrderInput (no contacts, no exact address) and free-text labels are
 * stripped. The estimate is NOT in the token: it is recomputed with the current config on open.
 */
import LZString from 'lz-string';
import { OrderInput } from '@/contract/order';
import { SHARE_DICT } from './share-dict';

export const SHARE_VERSION = 1;

function prune<T>(x: T): T {
  if (Array.isArray(x)) return x.map(prune) as T;
  if (x && typeof x === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x)) {
      if (v === undefined || k === 'label') continue;
      const p = prune(v);
      if (p && typeof p === 'object' && !Array.isArray(p) && Object.keys(p).length === 0) continue;
      out[k] = p;
    }
    return out as T;
  }
  return x;
}

const INDEX = new Map(SHARE_DICT.map((s, i) => [s, i]));
// '~' marks a dictionary reference: "~12" → SHARE_DICT[12]; a literal leading '~' is escaped as '~~'
const pack = (s: string) => (INDEX.has(s) ? `~${INDEX.get(s)!.toString(36)}` : s.startsWith('~') ? `~${s}` : s);
const unpack = (s: string) => (s.startsWith('~~') ? s.slice(1) : s.startsWith('~') ? (SHARE_DICT[parseInt(s.slice(1), 36)] ?? s) : s);

function mapStrings(x: unknown, f: (s: string) => string): unknown {
  if (typeof x === 'string') return f(x);
  if (Array.isArray(x)) return x.map((v) => mapStrings(v, f));
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [f(k), mapStrings(v, f)]));
  return x;
}

export function encodeShare(order: OrderInput): string {
  const compact = mapStrings(prune(order), pack);
  return `${SHARE_VERSION}.${LZString.compressToEncodedURIComponent(JSON.stringify(compact))}`;
}

/** Older token versions are migrated here before validation. */
const migrations: Record<number, (x: unknown) => unknown> = {};

export type DecodeResult = { ok: true; order: OrderInput } | { ok: false; reason: 'format' | 'version' | 'invalid' };

export function decodeShare(value: string): DecodeResult {
  const dot = value.indexOf('.');
  const version = Number(value.slice(0, dot));
  if (dot < 1 || !Number.isInteger(version)) return { ok: false, reason: 'format' };
  if (version > SHARE_VERSION) return { ok: false, reason: 'version' };
  let data: unknown;
  try {
    const json = LZString.decompressFromEncodedURIComponent(value.slice(dot + 1));
    if (!json) return { ok: false, reason: 'format' };
    data = mapStrings(JSON.parse(json), unpack);
  } catch {
    return { ok: false, reason: 'format' };
  }
  for (let v = version; v < SHARE_VERSION; v++) data = migrations[v]?.(data) ?? data;
  const parsed = OrderInput.safeParse(data);
  return parsed.success ? { ok: true, order: parsed.data } : { ok: false, reason: 'invalid' };
}
