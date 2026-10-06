/**
 * Config files wrap scalars as {value, unit, source, verified, note} for auditing.
 * The domain works with plain values: unwrap() replaces every wrapper by its value and drops
 * documentation keys ($comment). Row-level provenance (source/verified on catalog rows) is kept.
 */
export type Wrapped<T> = { value: T; unit: string; source: string; verified: boolean; note?: string };

export function isWrapped(x: unknown): x is Wrapped<unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x) && 'value' in x && 'verified' in x && 'source' in x && 'unit' in x;
}

export function unwrap(x: unknown): unknown {
  if (isWrapped(x)) return unwrap(x.value);
  if (Array.isArray(x)) return x.map(unwrap);
  if (typeof x === 'object' && x !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(x)) {
      if (k.startsWith('$')) continue;
      out[k] = unwrap(val);
    }
    return out;
  }
  return x;
}

/** Lists numeric leaves that are neither wrapped nor inside a row carrying its own source/verified. */
export function unwrappedNumbers(x: unknown, path = '$', rowHasProvenance = false): string[] {
  if (isWrapped(x)) return [];
  if (typeof x === 'number') return rowHasProvenance ? [] : [path];
  if (Array.isArray(x)) return x.flatMap((v, i) => unwrappedNumbers(v, `${path}[${i}]`, rowHasProvenance));
  if (typeof x === 'object' && x !== null) {
    const own = 'source' in x && 'verified' in x;
    return Object.entries(x).flatMap(([k, v]) => unwrappedNumbers(v, `${path}.${k}`, rowHasProvenance || own));
  }
  return [];
}
