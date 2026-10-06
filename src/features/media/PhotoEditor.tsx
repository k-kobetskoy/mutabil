'use client';
/**
 * Marks on a photo of the home (decisions D27): a pencil whose colour means "we move / it stays /
 * careful" and numbered points with comments. The photo itself is never changed; the vector
 * layer (annotation.ts) is saved to this device as the user works.
 *
 * Drawing needs a pointer, so points are the keyboard path: "Add a point" puts one in the centre,
 * arrow keys move it, its comment is an ordinary text field. Wheel and two fingers zoom;
 * the canvas has touch-action: none so drawing never scrolls the page.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, Heading, Modal, ModalOverlay, ToggleButton, ToggleButtonGroup, type Key } from 'react-aria-components';
import { Eraser, Hand, MapPin, Pencil, Redo2, Trash2, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import { useMediaStore, type MediaItem } from '@/state/private-store';
import { Button } from '@/ui/Button';
import { TextInput } from '@/ui/Fields';
import { cx } from '@/ui/cx';
import { useMediaUrl } from './MediaBlock';
import {
  LIMITS,
  NUDGE,
  VIEW_W,
  WIDTHS,
  addPin,
  addPoint,
  addStroke,
  commit,
  emptyLayer,
  fromAnnotation,
  history,
  movePin,
  nudgePin,
  point,
  redo,
  removePin,
  setPinText,
  strokePath,
  toAnnotation,
  undo,
  type Intent,
  type Stroke,
} from './annotation';

type Tool = 'draw' | 'pin' | 'pan';
type View = { s: number; x: number; y: number };
type Gesture =
  | { kind: 'draw' }
  | { kind: 'tap'; x: number; y: number }
  | { kind: 'pan'; x: number; y: number }
  | { kind: 'pinch'; d: number; mx: number; my: number }
  | { kind: 'idle' };

const INTENTS: Intent[] = ['move', 'stay', 'careful'];
const COLOR: Record<Intent, string> = { move: 'var(--color-ok)', stay: 'var(--color-route)', careful: 'var(--color-amber)' };
const PIN_INK: Record<Intent, string> = { move: 'text-white', stay: 'text-white', careful: 'text-night' };
const MAX_ZOOM = 5;
const TAP_SLOP = 8;

export function PhotoEditor({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const t = useTranslations('editor');
  const tm = useTranslations('media');
  const annotate = useMediaStore((s) => s.annotate);
  const url = useMediaUrl(item.id);
  // Read from the store, not from the prop: the prop is a snapshot taken when the editor opened.
  const [initial] = useState(() => fromAnnotation(useMediaStore.getState().items.find((i) => i.id === item.id)?.annotation));
  const [h, setH] = useState(() => history(initial.layer));
  const [note, setNote] = useState(initial.note);
  const [tool, setTool] = useState<Tool>('draw');
  const [intent, setIntent] = useState<Intent>('move');
  const [width, setWidth] = useState<number>(WIDTHS[1]);
  const [draft, setDraft] = useState<Stroke | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ s: 1, x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const addPinRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture>({ kind: 'idle' });
  const draftRef = useRef<Stroke | null>(null);
  const pinDrag = useRef<{ id: string; key: string; x: number; y: number; moved: boolean } | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const hintId = useId();
  const layer = h.present;

  // Focus moves to a point or its comment once it is on screen (keyboard path, D27).
  useEffect(() => {
    if (!pendingFocus.current) return;
    document.querySelector<HTMLElement>(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  });

  // Saved on every change: closing the editor or reloading the page loses nothing.
  useEffect(() => annotate(item.id, toAnnotation(layer, note)), [annotate, item.id, layer, note]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setBox({ w: e.contentRect.width, h: e.contentRect.height });
      setView({ s: 1, x: 0, y: 0 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Image fitted into the stage ("contain"); zoom and pan are applied on top of this frame.
  const fit = nat && box.w && box.h ? Math.min(box.w / nat.w, box.h / nat.h) : 0;
  const fw = nat ? nat.w * fit : 0;
  const fh = nat ? nat.h * fit : 0;
  const left = (box.w - fw) / 2;
  const top = (box.h - fh) / 2;
  const aspect = nat ? nat.h / nat.w : 0.75;

  const clampView = (v: View): View => {
    const s = Math.min(MAX_ZOOM, Math.max(1, v.s));
    return { s, x: Math.min(0, Math.max(fw * (1 - s), v.x)), y: Math.min(0, Math.max(fh * (1 - s), v.y)) };
  };
  /** Zoom by `k` keeping the frame point (fx, fy) under the finger / cursor. */
  const zoomBy = (fx: number, fy: number, k: number) =>
    setView((v) => {
      const s = Math.min(MAX_ZOOM, Math.max(1, v.s * k));
      return clampView({ s, x: fx - ((fx - v.x) / v.s) * s, y: fy - ((fy - v.y) / v.s) * s });
    });
  const toFrame = (cx0: number, cy0: number) => {
    const r = stageRef.current!.getBoundingClientRect();
    return [cx0 - r.left - left, cy0 - r.top - top] as const;
  };
  const toNorm = (cx0: number, cy0: number) => {
    const r = frameRef.current!.getBoundingClientRect();
    return [(cx0 - r.left) / r.width, (cy0 - r.top) / r.height] as const;
  };

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomBy(e.clientX - r.left - left, e.clientY - r.top - top, Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  /* ---------- pointer on the stage: draw, tap to place a point, pan, pinch ---------- */

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!nat || (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      draftRef.current = null;
      setDraft(null);
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      return;
    }
    if (pointers.current.size > 2) return;
    const [nx, ny] = toNorm(e.clientX, e.clientY);
    const inside = nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1;
    if (tool === 'pan' || e.button === 1 || !inside) {
      gesture.current = { kind: 'pan', x: e.clientX, y: e.clientY };
    } else if (tool === 'draw') {
      if (layer.strokes.length >= LIMITS.strokes) return;
      const p = point(nx, ny, e.pointerType === 'pen' ? e.pressure : undefined);
      draftRef.current = { intent, width, points: [p] };
      setDraft(draftRef.current);
      gesture.current = { kind: 'draw' };
    } else {
      gesture.current = { kind: 'tap', x: e.clientX, y: e.clientY };
    }
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (g.kind === 'pinch' && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const [fx, fy] = toFrame(mx, my);
      setView((v) => clampView({ ...v, x: v.x + mx - g.mx, y: v.y + my - g.my }));
      zoomBy(fx, fy, d / g.d);
      gesture.current = { kind: 'pinch', d, mx, my };
    } else if (g.kind === 'pan') {
      setView((v) => clampView({ ...v, x: v.x + e.clientX - g.x, y: v.y + e.clientY - g.y }));
      gesture.current = { kind: 'pan', x: e.clientX, y: e.clientY };
    } else if (g.kind === 'draw' && draftRef.current) {
      let pts = draftRef.current.points;
      const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
      for (const ev of events.length ? events : [e.nativeEvent]) {
        const [nx, ny] = toNorm(ev.clientX, ev.clientY);
        pts = addPoint(pts, point(nx, ny, e.pointerType === 'pen' ? ev.pressure : undefined));
      }
      if (pts !== draftRef.current.points) {
        draftRef.current = { ...draftRef.current, points: pts };
        setDraft(draftRef.current);
      }
    } else if (g.kind === 'tap' && Math.hypot(e.clientX - g.x, e.clientY - g.y) > TAP_SLOP) {
      gesture.current = { kind: 'pan', x: e.clientX, y: e.clientY };
    }
  };

  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(e.pointerId)) return;
    const g = gesture.current;
    if (g.kind === 'draw' && draftRef.current) {
      const s = draftRef.current;
      setH((x) => commit(x, addStroke(x.present, s)));
      draftRef.current = null;
      setDraft(null);
    } else if (g.kind === 'tap' && e.type === 'pointerup') {
      const [nx, ny] = toNorm(e.clientX, e.clientY);
      placePin(nx, ny, 'text');
    }
    // After a pinch the remaining finger must not start drawing.
    gesture.current = pointers.current.size ? { kind: 'pan', ...pointers.current.values().next().value! } : { kind: 'idle' };
  };

  /* ---------- points ---------- */

  const focusSoon = (selector: string) => {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) el.focus();
    else pendingFocus.current = selector;
  };

  const placePin = (x: number, y: number, focus: 'marker' | 'text') => {
    const r = addPin(layer, x, y, intent);
    if (!r.pin) return;
    setH((x0) => commit(x0, r.layer));
    focusSoon(focus === 'marker' ? `[data-marker="${r.pin.id}"]` : `[data-pin-text="${r.pin.id}"] input`);
  };

  const deletePin = (id: string) => {
    setH((x) => commit(x, removePin(x.present, id)));
    addPinRef.current?.querySelector('button')?.focus();
  };

  const onPinKey = (e: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const step = e.shiftKey ? NUDGE.big : NUDGE.step;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (d) {
      e.preventDefault();
      setH((x) => commit(x, nudgePin(x.present, id, d[0], d[1]), `nudge:${id}`));
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      deletePin(id);
    }
  };

  const onPinDown = (e: PointerEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    pinDrag.current = { id, key: `drag:${id}:${e.timeStamp}`, x: e.clientX, y: e.clientY, moved: false };
  };
  const onPinMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = pinDrag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < TAP_SLOP / 2) return;
    d.moved = true;
    const [nx, ny] = toNorm(e.clientX, e.clientY);
    setH((x) => commit(x, movePin(x.present, d.id, nx, ny), d.key));
  };
  /** A tap or Enter on a point opens its comment; the end of a drag does not. */
  const onPinClick = (id: string) => {
    const dragged = pinDrag.current?.moved;
    pinDrag.current = null;
    if (!dragged) focusSoon(`[data-pin-text="${id}"] input`);
  };

  /* ---------- keyboard shortcuts (not while typing: text fields keep their own undo) ---------- */

  const onKeys = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea') || !(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) setH(undo);
    else if (k === 'y' || (k === 'z' && e.shiftKey)) setH(redo);
    else return;
    e.preventDefault();
  };

  const single = (keys: 'all' | Set<Key>) => (keys === 'all' ? undefined : (keys.values().next().value as string | undefined));
  const toggle =
    'inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-field)] px-3 text-[0.9rem] font-bold text-on-night-muted transition-colors hover:text-white data-[selected]:bg-white data-[selected]:text-night cursor-pointer';
  const iconBtn = '!min-h-11 !px-3';
  const marks = layer.strokes.length + layer.pins.length;

  return (
    <ModalOverlay isOpen onOpenChange={(o) => !o && onClose()} isDismissable={false} className="fixed inset-0 z-50 bg-night">
      <Modal className="size-full">
        <Dialog className="outline-none">
          <div className="flex h-dvh flex-col" onKeyDown={onKeys}>
            <header className="on-night flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5 text-white">
              <div className="min-w-0">
                <Heading slot="title" className="truncate text-[1.1rem] font-extrabold">
                  {t('title')}
                </Heading>
                <p className="truncate text-[0.82rem] text-on-night-muted">
                  {item.name} · {tm('marks', { count: marks })}
                </p>
              </div>
              <Button onPress={onClose} className="!min-h-11 shrink-0">
                {t('done')}
              </Button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              <div className="flex min-h-0 flex-col md:flex-1">
                <div className="on-night flex flex-col gap-2 bg-night-2 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ToggleButtonGroup
                      aria-label={t('tools')}
                      selectionMode="single"
                      disallowEmptySelection
                      selectedKeys={[tool]}
                      onSelectionChange={(k) => setTool((single(k) as Tool) ?? tool)}
                      className="flex gap-1"
                    >
                      {(
                        [
                          ['draw', Pencil],
                          ['pin', MapPin],
                          ['pan', Hand],
                        ] as const
                      ).map(([id, Icon]) => (
                        <ToggleButton key={id} id={id} aria-label={t(id)} className={toggle}>
                          <Icon size={18} aria-hidden />
                          <span aria-hidden className="max-sm:hidden">
                            {t(id)}
                          </span>
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                    <div className="flex gap-1">
                      <Button
                        variant="onNight"
                        onPress={() => setH(undo)}
                        isDisabled={!h.past.length}
                        aria-label={t('undo')}
                        className={iconBtn}
                      >
                        <Undo2 size={18} aria-hidden />
                      </Button>
                      <Button
                        variant="onNight"
                        onPress={() => setH(redo)}
                        isDisabled={!h.future.length}
                        aria-label={t('redo')}
                        className={iconBtn}
                      >
                        <Redo2 size={18} aria-hidden />
                      </Button>
                      <Button
                        variant="onNight"
                        onPress={() => setH((x) => commit(x, emptyLayer()))}
                        isDisabled={!marks}
                        aria-label={t('clear')}
                        className={iconBtn}
                      >
                        <Eraser size={18} aria-hidden />
                      </Button>
                    </div>
                  </div>
                  <ToggleButtonGroup
                    aria-label={t('intents')}
                    selectionMode="single"
                    disallowEmptySelection
                    selectedKeys={[intent]}
                    onSelectionChange={(k) => setIntent((single(k) as Intent) ?? intent)}
                    className="flex gap-1"
                  >
                    {INTENTS.map((i) => (
                      <ToggleButton key={i} id={i} className={cx(toggle, 'flex-1 justify-center px-2 sm:flex-none sm:px-3')}>
                        <span
                          aria-hidden
                          className="size-3.5 shrink-0 rounded-full ring-2 ring-white/70"
                          style={{ background: COLOR[i] }}
                        />
                        {t(i)}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </div>

                <div
                  ref={stageRef}
                  onPointerDown={onDown}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={onUp}
                  className={cx(
                    'relative h-[46dvh] touch-none overflow-hidden select-none md:h-auto md:flex-1',
                    tool === 'pan' ? 'cursor-grab' : tool === 'draw' ? 'cursor-crosshair' : 'cursor-copy',
                  )}
                >
                  {!nat && <p className="absolute inset-0 grid place-items-center text-on-night-muted">{t('loading')}</p>}
                  <div
                    ref={frameRef}
                    className="absolute origin-top-left"
                    style={{
                      left,
                      top,
                      width: fw,
                      height: fh,
                      transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`,
                      visibility: nat ? 'visible' : 'hidden',
                    }}
                  >
                    {url && (
                      // eslint-disable-next-line @next/next/no-img-element -- local blob, never leaves the device
                      <img
                        src={url}
                        alt={item.name}
                        draggable={false}
                        onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                        className="pointer-events-none size-full"
                      />
                    )}
                    <svg
                      aria-hidden
                      viewBox={`0 0 ${VIEW_W} ${VIEW_W * aspect}`}
                      className="pointer-events-none absolute inset-0 size-full"
                    >
                      {[...layer.strokes, ...(draft ? [draft] : [])].map((s, i) => (
                        <path
                          key={i}
                          d={strokePath(s, aspect, s !== draft)}
                          fill={COLOR[s.intent]}
                          fillOpacity={0.9}
                          stroke="rgb(11 31 58 / 0.55)"
                          strokeWidth={1.5}
                          vectorEffect="non-scaling-stroke"
                          paintOrder="stroke"
                        />
                      ))}
                    </svg>
                    {layer.pins.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        data-marker={p.id}
                        aria-label={p.text ? `${t('pinLabel', { n: p.n })}: ${p.text}` : t('pinLabel', { n: p.n })}
                        aria-describedby={hintId}
                        onPointerDown={(e) => onPinDown(e, p.id)}
                        onPointerMove={onPinMove}
                        onClick={() => onPinClick(p.id)}
                        onKeyDown={(e) => onPinKey(e, p.id)}
                        className={cx(
                          'tabular absolute grid size-9 cursor-grab touch-none place-items-center rounded-full border-2 border-white font-[family-name:var(--font-display)] text-[0.95rem] font-extrabold shadow-[0_2px_8px_rgb(11_31_58/0.45)] focus-visible:outline-amber',
                          "after:absolute after:-inset-1.5 after:content-['']",
                          p.intent ? PIN_INK[p.intent] : 'text-white',
                        )}
                        style={{
                          left: `${p.x * 100}%`,
                          top: `${p.y * 100}%`,
                          transform: `translate(-50%, -50%) scale(${1 / view.s})`,
                          background: p.intent ? COLOR[p.intent] : 'var(--color-night)',
                        }}
                      >
                        {p.n}
                      </button>
                    ))}
                  </div>
                  <span id={hintId} className="sr-only">
                    {t('pinMove')}
                  </span>
                  {tool === 'draw' && (
                    <ToggleButtonGroup
                      aria-label={t('width')}
                      selectionMode="single"
                      disallowEmptySelection
                      selectedKeys={[String(width)]}
                      onSelectionChange={(k) => setWidth(Number(single(k) ?? width))}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="on-night absolute bottom-3 left-3 flex gap-0.5 rounded-[var(--radius-field)] bg-night/70 p-0.5"
                    >
                      {WIDTHS.map((w, i) => (
                        <ToggleButton
                          key={w}
                          id={String(w)}
                          aria-label={`${t('width')}: ${t((['thin', 'medium', 'thick'] as const)[i])}`}
                          className={cx(toggle, 'w-11 justify-center px-0')}
                        >
                          <span aria-hidden className="rounded-full bg-current" style={{ width: 4 + i * 4, height: 4 + i * 4 }} />
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  )}
                  <div className="on-night absolute right-3 bottom-3 flex gap-1" onPointerDown={(e) => e.stopPropagation()}>
                    <Button
                      variant="onNight"
                      onPress={() => zoomBy(fw / 2, fh / 2, 1 / 1.5)}
                      isDisabled={view.s <= 1}
                      aria-label={t('zoomOut')}
                      className={cx(iconBtn, 'bg-night/70')}
                    >
                      <ZoomOut size={18} aria-hidden />
                    </Button>
                    <Button
                      variant="onNight"
                      onPress={() => zoomBy(fw / 2, fh / 2, 1.5)}
                      isDisabled={view.s >= MAX_ZOOM}
                      aria-label={t('zoomIn')}
                      className={cx(iconBtn, 'bg-night/70')}
                    >
                      <ZoomIn size={18} aria-hidden />
                    </Button>
                  </div>
                </div>
              </div>

              <aside className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto bg-paper px-4 py-4 md:w-[380px] md:flex-none">
                <p className="text-[0.92rem] leading-snug text-ink-muted">{t('legend')}</p>

                <section aria-labelledby={`${hintId}-pins`} className="flex flex-col gap-3">
                  <h3 id={`${hintId}-pins`} className="text-[1.05rem] font-extrabold">
                    {t('pins')} {layer.pins.length > 0 && <span className="tabular font-normal text-ink-muted">· {layer.pins.length}</span>}
                  </h3>
                  {layer.pins.length === 0 && <p className="text-[0.92rem] text-ink-muted">{t('pinsEmpty')}</p>}
                  <ol className="flex flex-col gap-3">
                    {layer.pins.map((p) => (
                      <li key={p.id} data-pin-text={p.id} className="flex items-end gap-2">
                        <span
                          aria-hidden
                          className={cx(
                            'tabular mb-2.5 grid size-8 shrink-0 place-items-center rounded-full font-[family-name:var(--font-display)] text-[0.9rem] font-extrabold',
                            p.intent ? PIN_INK[p.intent] : 'text-white',
                          )}
                          style={{ background: p.intent ? COLOR[p.intent] : 'var(--color-night)' }}
                        >
                          {p.n}
                        </span>
                        <TextInput
                          label={t('pinText', { n: p.n })}
                          value={p.text}
                          onChange={(v) => setH((x) => commit(x, setPinText(x.present, p.id, v), `text:${p.id}`))}
                          className="min-w-0 flex-1"
                        />
                        <Button
                          variant="ghost"
                          onPress={() => deletePin(p.id)}
                          aria-label={t('removePin', { n: p.n })}
                          className="!min-h-12 min-w-12 !px-0"
                        >
                          <Trash2 size={18} aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ol>
                  <div ref={addPinRef} className="self-start">
                    <Button
                      variant="secondary"
                      onPress={() => placePin(0.5, 0.5, 'marker')}
                      isDisabled={layer.pins.length >= LIMITS.pins || !nat}
                    >
                      <MapPin size={18} aria-hidden />
                      {t('addPin')}
                    </Button>
                  </div>
                </section>

                <TextInput label={t('photoNote')} value={note} onChange={(v) => setNote(v.slice(0, LIMITS.note))} multiline />
                <p className="text-[0.85rem] text-ink-muted">{t('saved')}</p>
                <Button onPress={onClose} className="md:hidden">
                  {t('done')}
                </Button>
              </aside>
            </div>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
