/**
 * The vector layer over a photo (decisions D27): pure functions, no DOM. Coordinates are
 * normalised to 0..1 of the image, so the layer does not depend on the screen size.
 * Stroke widths are in units of 1/1000 of the image width (the SVG viewBox is 1000 wide).
 */
import getStroke from 'perfect-freehand';
import type { Annotation } from '@/contract/api';

export type Intent = 'move' | 'stay' | 'careful';
export type Stroke = Annotation['strokes'][number];
/** Pins carry a local id for React keys and focus; it is stripped before saving. */
export type Pin = Annotation['pins'][number] & { id: string };
export type Layer = { strokes: Stroke[]; pins: Pin[] };
export type History = { past: Layer[]; present: Layer; future: Layer[]; key?: string };

export const LIMITS = { strokes: 200, pins: 50, points: 2000, pinText: 500, note: 2000, history: 100 } as const;
export const VIEW_W = 1000;
export const WIDTHS = [4, 8, 14] as const;
/** Arrow keys move a pin by 1% of the image, with Shift by 5%. */
export const NUDGE = { step: 0.01, big: 0.05 } as const;
/** Mouse and finger report no real pressure; such strokes get simulated pressure when drawn. */
export const NO_PRESSURE = 0.5;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const r4 = (v: number) => Math.round(clamp01(v) * 1e4) / 1e4;
export const point = (x: number, y: number, p = NO_PRESSURE): number[] => [r4(x), r4(y), r4(p)];

/** Appends a point unless it is closer than `minDist` to the last one or the stroke is full. */
export function addPoint(points: number[][], p: number[], minDist = 0.002): number[][] {
  const last = points.at(-1);
  if (points.length >= LIMITS.points) return points;
  if (last && Math.hypot(last[0] - p[0], last[1] - p[1]) < minDist) return points;
  return [...points, p];
}

let seq = 0;
const pinId = () => `pin-${++seq}`;

export const emptyLayer = (): Layer => ({ strokes: [], pins: [] });

export function addStroke(layer: Layer, stroke: Stroke): Layer {
  if (!stroke.points.length || layer.strokes.length >= LIMITS.strokes) return layer;
  return { ...layer, strokes: [...layer.strokes, stroke] };
}

/** Pins are numbered 1..n in order; a new pin that lands on another one is shifted aside. */
export function addPin(layer: Layer, x: number, y: number, intent?: Intent): { layer: Layer; pin?: Pin } {
  if (layer.pins.length >= LIMITS.pins) return { layer };
  let [px, py] = [x, y];
  for (let i = 0; i < 20 && layer.pins.some((p) => Math.hypot(p.x - px, p.y - py) < 0.03); i++) {
    px = px + 0.04 > 1 ? 0.04 : px + 0.04;
    py = py + 0.04 > 1 ? 0.04 : py + 0.04;
  }
  const pin: Pin = { id: pinId(), n: layer.pins.length + 1, x: r4(px), y: r4(py), text: '', ...(intent ? { intent } : {}) };
  return { layer: { ...layer, pins: [...layer.pins, pin] }, pin };
}

const mapPin = (layer: Layer, id: string, f: (p: Pin) => Pin): Layer => ({
  ...layer,
  pins: layer.pins.map((p) => (p.id === id ? f(p) : p)),
});

export const movePin = (layer: Layer, id: string, x: number, y: number) => mapPin(layer, id, (p) => ({ ...p, x: r4(x), y: r4(y) }));
export const nudgePin = (layer: Layer, id: string, dx: number, dy: number) =>
  mapPin(layer, id, (p) => ({ ...p, x: r4(p.x + dx), y: r4(p.y + dy) }));
export const setPinText = (layer: Layer, id: string, text: string) =>
  mapPin(layer, id, (p) => ({ ...p, text: text.slice(0, LIMITS.pinText) }));

export function removePin(layer: Layer, id: string): Layer {
  return { ...layer, pins: layer.pins.filter((p) => p.id !== id).map((p, i) => ({ ...p, n: i + 1 })) };
}

/* ---------- undo / redo ---------- */

export const history = (present: Layer): History => ({ past: [], present, future: [] });

/**
 * Records a change. Changes with the same `key` in a row (typing into one comment, dragging or
 * nudging one pin) collapse into one undo step.
 */
export function commit(h: History, next: Layer, key?: string): History {
  if (next === h.present) return h;
  if (key && key === h.key) return { ...h, present: next, future: [] };
  return { past: [...h.past, h.present].slice(-LIMITS.history), present: next, future: [], key };
}

export function undo(h: History): History {
  const prev = h.past.at(-1);
  return prev ? { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future] } : h;
}

export function redo(h: History): History {
  const [next, ...rest] = h.future;
  return next ? { past: [...h.past, h.present], present: next, future: rest } : h;
}

/* ---------- storage ---------- */

export function fromAnnotation(a?: Annotation): { layer: Layer; note: string } {
  if (!a) return { layer: emptyLayer(), note: '' };
  const pins = [...a.pins].sort((p, q) => p.n - q.n).map((p, i) => ({ ...p, n: i + 1, id: pinId() }));
  return { layer: { strokes: a.strokes, pins }, note: a.note ?? '' };
}

/** Nothing drawn, no pins and no comment → no annotation at all. */
export function toAnnotation(layer: Layer, note: string): Annotation | undefined {
  const n = note.trim().slice(0, LIMITS.note);
  if (!layer.strokes.length && !layer.pins.length && !n) return undefined;
  return {
    strokes: layer.strokes,
    pins: layer.pins.map(({ id: _id, ...p }) => ({ ...p, text: p.text.trim() })),
    ...(n ? { note: n } : {}),
  };
}

/* ---------- drawing ---------- */

const avg = (a: number, b: number) => (a + b) / 2;
const f2 = (v: number) => v.toFixed(2);

/** SVG path (in viewBox units 1000 × 1000·aspect) of a smoothed, pressure-aware stroke outline. */
export function strokePath(stroke: Stroke, aspect: number, last = true): string {
  const pts = stroke.points.map(([x, y, p]) => [x * VIEW_W, y * VIEW_W * aspect, p]);
  const outline = getStroke(pts, {
    size: stroke.width,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: stroke.points.every((p) => p[2] === NO_PRESSURE),
    last,
  });
  if (outline.length < 4) return '';
  const [a, b, c] = outline;
  let d = `M${f2(a[0])},${f2(a[1])} Q${f2(b[0])},${f2(b[1])} ${f2(avg(b[0], c[0]))},${f2(avg(b[1], c[1]))} T`;
  for (let i = 2; i < outline.length - 1; i++)
    d += `${f2(avg(outline[i][0], outline[i + 1][0]))},${f2(avg(outline[i][1], outline[i + 1][1]))} `;
  return `${d}Z`;
}
