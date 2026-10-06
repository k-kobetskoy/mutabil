/** Immutable get/set by dotted path ("from.elevator"). Item ids may contain dashes, not dots. */
export function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

export function setPath<T>(obj: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split('.');
  const base = (obj && typeof obj === 'object' ? obj : {}) as Record<string, unknown>;
  return {
    ...base,
    [head]: rest.length ? setPath(base[head], rest.join('.'), value) : value,
  } as T;
}
