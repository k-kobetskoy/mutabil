/**
 * "Does this item fit into this elevator?" (R3 §7.4, decisions D7).
 * Dimensions are sorted a ≥ b ≥ c. The item must pass the door with its thinnest side across,
 * then stand inside the cabin in some orientation (floor rectangle checked with rotation).
 * Disassembled furniture travels as flat panels; long thin things can be tilted.
 */
import type { ElevatorClass, ElevatorsConfig } from '@/config/schema';

export type FitResult = { fits: true } | { fits: false; reason: 'door' | 'cabin' };

export function rectFits(p: number, q: number, A: number, B: number): boolean {
  for (let deg = 0; deg <= 90; deg += 1) {
    const t = (deg * Math.PI) / 180;
    const w = p * Math.cos(t) + q * Math.sin(t);
    const h = p * Math.sin(t) + q * Math.cos(t);
    if (w <= A + 1e-9 && h <= B + 1e-9) return true;
  }
  return false;
}

export function fitsInElevator(
  dims: { w: number; d: number; h: number },
  flags: { flexible?: boolean; disassembled?: boolean },
  cls: ElevatorClass,
  cfg: ElevatorsConfig,
): FitResult {
  const m = cfg.fitMarginsCm;
  const sorted = [dims.w, dims.d, dims.h].sort((x, y) => y - x);
  const bend = flags.flexible ? 1 + cfg.flexibleExtraLength : 1;
  const a = sorted[0] / bend;
  const [, b, c] = sorted;

  if (flags.disassembled) {
    return sorted[0] <= cls.maxLongThinItemCm ? { fits: true } : { fits: false, reason: 'cabin' };
  }

  if (c > cls.doorCm.w - m.door || b > cls.doorCm.h - m.height) return { fits: false, reason: 'door' };

  const H = cls.cabinCm.h - m.height;
  const A = cls.cabinCm.w - m.floor;
  const B = cls.cabinCm.d - m.floor;
  const orientations: [number, number, number][] = [
    [a, b, c],
    [b, a, c],
    [c, a, b],
  ];
  for (const [v, p, q] of orientations) if (v <= H && rectFits(p, q, A, B)) return { fits: true };

  if (c <= cfg.longThinMaxThicknessCm && b <= cfg.longThinMaxWidthCm && a <= cls.maxLongThinItemCm) return { fits: true };
  return { fits: false, reason: 'cabin' };
}

export function elevatorClass(cfg: ElevatorsConfig, id: string): ElevatorClass | undefined {
  return cfg.classes.find((c) => c.id === id);
}
