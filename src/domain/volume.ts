/**
 * Volume and weight (R2 §8, decisions D4).
 * - list mode: Σ catalog items + boxes/crates + small-items allowance, × loadFactor, + custom items
 * - preset mode / at survey: home preset (min / typical / max) × amount modifier (+ storage)
 * Catalog volumes are "space in the truck" (RLAU / cube sheet), not W×D×H.
 */
import type { OrderInput } from '@/contract/order';
import type { Cfg } from '@/config';
import type { CatalogItem } from '@/config/schema';

export type SurveyMethod = 'onsite' | 'remote' | 'none';

export type ItemLine = { item: CatalogItem; qty: number; disassembled: boolean; byUs: boolean };
export type CustomLine = { dims: { w: number; d: number; h: number }; qty: number; volumeM3: number; weightKg: number };

export type VolumeResult = {
  source: 'preset' | 'list' | 'atSurvey';
  base: number;
  /** base before any low/high scaling (keeps per-item shares stable) */
  unscaledBase: number;
  low: number;
  high: number;
  weightKg: number;
  boxes: number;
  boxesM3: number;
  items: ItemLine[];
  custom: CustomLine[];
  presetId?: string;
  /** Longest dimension (cm) among items that travel assembled — must fit the cargo area. */
  longestAssembledCm: number;
};

export function presetFor(order: OrderInput, cfg: Cfg) {
  const id = order.size?.presetId ?? (order.taskType === 'house' ? 'casa' : order.taskType === 'office' ? 'birou-per-post' : undefined);
  return id ? cfg.catalog.presets.find((p) => p.id === id) : undefined;
}

export function inventoryMode(order: OrderInput): VolumeResult['source'] {
  if (order.inventory?.mode) return order.inventory.mode;
  return order.taskType === 'items' ? 'list' : 'preset';
}

export function canEstimate(order: OrderInput, cfg: Cfg): boolean {
  if (!order.taskType) return false;
  const mode = inventoryMode(order);
  if (order.taskType === 'items') return Object.keys(order.inventory?.items ?? {}).length > 0 || (order.inventory?.custom?.length ?? 0) > 0;
  if (mode === 'list') return true;
  return presetFor(order, cfg) !== undefined;
}

export function computeVolume(order: OrderInput, cfg: Cfg, survey: SurveyMethod): VolumeResult {
  const cat = cfg.catalog;
  const mode = inventoryMode(order);
  const preset = presetFor(order, cfg);
  const amount = cat.amountModifiers[order.size?.amount ?? 'normal'];
  const multiplier = order.taskType === 'office' ? (order.size?.workstations ?? 1) : 1;
  const storage = order.size?.storage ? cat.storageExtraM3 : 0;
  const crates = order.packing?.containers === 'crates';
  const boxUnit = crates ? cat.packaging.crate : cat.packaging.box;
  const assemblyItems = order.assembly?.items ?? {};

  const typicalBoxes = preset ? Math.round(preset.boxes.typical * amount * multiplier) : 0;
  const boxes = order.inventory?.boxes ?? (order.taskType === 'items' ? 0 : typicalBoxes);
  const wardrobeBoxes = order.packing?.wardrobeBoxes ?? 0;
  const inserts = order.inventory?.kallaxInserts ?? 0;
  const boxesM3 =
    boxes * boxUnit.volumeM3 + wardrobeBoxes * cat.packaging.wardrobeBox.volumeM3 + inserts * cat.packaging.kallaxInsert.volumeM3;
  const boxesKg =
    boxes * boxUnit.weightKg + wardrobeBoxes * cat.packaging.wardrobeBox.weightKg + inserts * cat.packaging.kallaxInsert.weightKg;

  const items: ItemLine[] = [];
  for (const [id, qty] of Object.entries(order.inventory?.items ?? {})) {
    const item = cat.items.find((i) => i.id === id);
    if (!item || qty <= 0) continue;
    const byUs = (assemblyItems[id] ?? 0) > 0;
    // items that require disassembly travel as panels: by our master, or by the client (warned)
    const disassembled = byUs || item.disassembly === 'required';
    items.push({ item, qty, disassembled, byUs });
  }
  const custom: CustomLine[] = (order.inventory?.custom ?? []).map((c) => {
    const geo = ((c.wCm * c.dCm * c.hCm) / 1e6) * cat.geometricVolumeFactor;
    return {
      dims: { w: c.wCm, d: c.dCm, h: c.hCm },
      qty: c.qty,
      volumeM3: geo * c.qty,
      weightKg: (c.weightKg ?? geo * cat.densityFallbackKgM3) * c.qty,
    };
  });
  const customM3 = custom.reduce((s, c) => s + c.volumeM3, 0);
  const customKg = custom.reduce((s, c) => s + c.weightKg, 0);

  const longestAssembledCm = Math.max(
    0,
    ...items
      .filter((l) => !l.disassembled && l.item.dimensionsCm)
      .map((l) => Math.max(l.item.dimensionsCm!.w, l.item.dimensionsCm!.d, l.item.dimensionsCm!.h)),
    ...custom.map((c) => Math.max(c.dims.w, c.dims.d, c.dims.h)),
  );

  const useList = mode === 'list' || (mode === 'atSurvey' && !preset);
  if (useList) {
    const itemsM3 = items.reduce((s, l) => s + l.item.volumeM3 * l.qty, 0);
    const itemsKg = items.reduce((s, l) => s + l.item.weightKg * l.qty, 0);
    const smallStuff = preset && order.taskType !== 'items' ? preset.volumeM3.typical * amount * multiplier * cat.listSmallItemsShare : 0;
    const base = (itemsM3 + boxesM3 + smallStuff) * cat.loadFactor + customM3;
    const lowF = 1 - cfg.pricing.range.volumeLow[survey];
    const highF = 1 + cfg.pricing.range.volumeHigh[survey];
    return {
      source: mode === 'atSurvey' ? 'atSurvey' : 'list',
      base,
      unscaledBase: base,
      low: base * lowF,
      high: base * highF,
      weightKg: Math.round(itemsKg + boxesKg + customKg + smallStuff * cat.densityFallbackKgM3),
      boxes,
      boxesM3,
      items,
      custom,
      presetId: preset?.id,
      longestAssembledCm,
    };
  }

  // preset-based (quick mode, "estimate at survey", or no list yet)
  const p = preset!;
  const scale = (x: number) => (x * amount * multiplier + storage) * cat.loadFactor;
  const extraItemsM3 = items.reduce((s, l) => s + l.item.volumeM3 * l.qty, 0) * (order.taskType === 'office' ? cat.loadFactor : 0);
  const base = scale(p.volumeM3.typical) + extraItemsM3 + customM3;
  return {
    source: mode === 'atSurvey' ? 'atSurvey' : 'preset',
    base,
    unscaledBase: base,
    low: scale(p.volumeM3.min) + extraItemsM3 + customM3,
    high: scale(p.volumeM3.max) + extraItemsM3 + customM3,
    weightKg: Math.round((base / cat.loadFactor) * cat.densityFallbackKgM3),
    boxes,
    boxesM3,
    items,
    custom,
    presetId: p.id,
    longestAssembledCm,
  };
}

/**
 * Same result with the loaded volume scaled (low/high price bounds). Box counts stay as answered:
 * material lines are identical in both bounds, only time-driven lines move (R4 §8).
 */
export function scaleVolume(v: VolumeResult, target: number): VolumeResult {
  const k = v.base > 0 ? target / v.base : 1;
  return { ...v, base: target, weightKg: Math.round(v.weightKg * k) };
}
