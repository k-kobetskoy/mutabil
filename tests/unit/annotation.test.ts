import { describe, expect, it } from 'vitest';
import { Annotation } from '@/contract/api';
import {
  LIMITS,
  addPin,
  addPoint,
  addStroke,
  commit,
  emptyLayer,
  fromAnnotation,
  history,
  nudgePin,
  point,
  redo,
  removePin,
  setPinText,
  strokePath,
  toAnnotation,
  undo,
  type Stroke,
} from '@/features/media/annotation';

const stroke = (n = 3): Stroke => ({ intent: 'move', width: 8, points: Array.from({ length: n }, (_, i) => point(0.1 + i * 0.05, 0.2)) });

describe('annotation layer', () => {
  it('normalises points into 0..1 with 4 decimals', () => {
    expect(point(-0.2, 1.7, 0.123456)).toEqual([0, 1, 0.1235]);
    expect(point(0.333333, 0.5)).toEqual([0.3333, 0.5, 0.5]);
  });

  it('drops points that are too close and caps stroke length', () => {
    const a = addPoint([], point(0.1, 0.1));
    expect(addPoint(a, point(0.1005, 0.1))).toBe(a);
    expect(addPoint(a, point(0.2, 0.1))).toHaveLength(2);
    const full = Array.from({ length: LIMITS.points }, (_, i) => point(i / LIMITS.points, 0));
    expect(addPoint(full, point(0.5, 0.9))).toBe(full);
  });

  it('numbers pins in order, shifts overlapping ones and renumbers after removal', () => {
    const first = addPin(emptyLayer(), 0.5, 0.5, 'stay');
    let layer = first.layer;
    ({ layer } = addPin(layer, 0.5, 0.5));
    ({ layer } = addPin(layer, 0.9, 0.1));
    expect(layer.pins.map((p) => p.n)).toEqual([1, 2, 3]);
    expect(layer.pins[1]).toMatchObject({ x: 0.54, y: 0.54 });
    layer = removePin(layer, first.pin!.id);
    expect(layer.pins.map((p) => [p.n, p.x])).toEqual([
      [1, 0.54],
      [2, 0.9],
    ]);
  });

  it('keeps nudged pins inside the image and trims long comments', () => {
    const { layer, pin } = addPin(emptyLayer(), 0.995, 0.5);
    expect(nudgePin(layer, pin!.id, 0.05, 0).pins[0].x).toBe(1);
    expect(setPinText(layer, pin!.id, 'x'.repeat(600)).pins[0].text).toHaveLength(LIMITS.pinText);
  });

  it('respects the stroke and pin limits', () => {
    let layer = emptyLayer();
    for (let i = 0; i < LIMITS.strokes + 5; i++) layer = addStroke(layer, stroke());
    expect(layer.strokes).toHaveLength(LIMITS.strokes);
    expect(addStroke(emptyLayer(), { ...stroke(), points: [] }).strokes).toHaveLength(0);
    for (let i = 0; i < LIMITS.pins + 5; i++) layer = addPin(layer, i / 60, 0.5).layer;
    expect(layer.pins).toHaveLength(LIMITS.pins);
  });
});

describe('undo / redo', () => {
  it('undoes and redoes changes; a new change clears redo', () => {
    let h = history(emptyLayer());
    h = commit(h, addStroke(h.present, stroke()));
    h = commit(h, addStroke(h.present, stroke()));
    h = undo(h);
    expect(h.present.strokes).toHaveLength(1);
    h = redo(h);
    expect(h.present.strokes).toHaveLength(2);
    h = undo(undo(h));
    expect(h.present.strokes).toHaveLength(0);
    expect(undo(h)).toBe(h);
    h = commit(h, addStroke(h.present, stroke()));
    expect(h.future).toHaveLength(0);
    expect(redo(h)).toBe(h);
  });

  it('collapses changes with the same key into one step', () => {
    const { layer, pin } = addPin(emptyLayer(), 0.5, 0.5);
    let h = commit(history(emptyLayer()), layer);
    for (const text of ['d', 'du', 'dul', 'dulap']) h = commit(h, setPinText(h.present, pin!.id, text), `text:${pin!.id}`);
    for (let i = 0; i < 3; i++) h = commit(h, nudgePin(h.present, pin!.id, 0.01, 0), `nudge:${pin!.id}`);
    expect(h.past).toHaveLength(3);
    h = undo(h);
    expect(h.present.pins[0]).toMatchObject({ text: 'dulap', x: 0.5 });
    h = undo(h);
    expect(h.present.pins[0].text).toBe('');
  });

  it('keeps a bounded history', () => {
    let h = history(emptyLayer());
    for (let i = 0; i < LIMITS.history + 20; i++) h = commit(h, addStroke(h.present, stroke()));
    expect(h.past).toHaveLength(LIMITS.history);
  });
});

describe('storage', () => {
  it('round-trips through the contract schema without local ids', () => {
    const added = addPin(addStroke(emptyLayer(), stroke()), 0.3, 0.4, 'careful');
    const pin = added.pin;
    let layer = added.layer;
    layer = setPinText(layer, pin!.id, '  oglindă fragilă ');
    const a = toAnnotation(layer, ' tot, în afară de bucătărie ');
    expect(Annotation.parse(a)).toEqual(a);
    expect(a?.pins[0]).toEqual({ n: 1, x: 0.3, y: 0.4, intent: 'careful', text: 'oglindă fragilă' });
    expect(a?.note).toBe('tot, în afară de bucătărie');
    const back = fromAnnotation(a);
    expect(back.note).toBe(a?.note);
    expect(toAnnotation(back.layer, back.note)).toEqual(a);
  });

  it('stores nothing for an untouched photo', () => {
    expect(toAnnotation(emptyLayer(), '   ')).toBeUndefined();
    expect(fromAnnotation(undefined)).toMatchObject({ layer: { strokes: [], pins: [] }, note: '' });
  });

  it('renumbers pins loaded out of order', () => {
    const { layer } = fromAnnotation({
      strokes: [],
      pins: [
        { n: 4, x: 0.1, y: 0.1, text: 'b' },
        { n: 2, x: 0.2, y: 0.2, text: 'a' },
      ],
    });
    expect(layer.pins.map((p) => [p.n, p.text])).toEqual([
      [1, 'a'],
      [2, 'b'],
    ]);
  });

  it('draws a closed SVG path in viewBox units, also for a single tap', () => {
    const d = strokePath(stroke(5), 0.75);
    expect(d).toMatch(/^M[\d.]+,[\d.]+ Q.+Z$/);
    expect(strokePath({ ...stroke(1) }, 0.75)).toMatch(/Z$/);
  });
});
