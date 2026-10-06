/**
 * Money and rounding helpers. All amounts leave the domain as integer bani (1 leu = 100 bani).
 * Rounding lives here only, with an epsilon so that 3.4999999 from float math rounds like 3.5.
 * The Go implementation must mirror these functions exactly (golden vectors check it).
 */
const EPS = 1e-9;

export const toBani = (lei: number): number => Math.round(lei * 100);
export const fromBani = (bani: number): number => bani / 100;

export function roundHalfUp(x: number, step = 1): number {
  return Math.floor(x / step + 0.5 + EPS) * step;
}
export function ceilTo(x: number, step: number): number {
  return Math.ceil(x / step - EPS) * step;
}
export function floorTo(x: number, step: number): number {
  return Math.floor(x / step + EPS) * step;
}
/** Rounds a lei amount to `stepLei` and converts it to bani. */
export function leiLine(lei: number, stepLei: number): number {
  return toBani(roundHalfUp(lei, stepLei));
}
