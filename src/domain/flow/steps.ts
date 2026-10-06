/**
 * Wizard navigation as pure functions over config/steps.json (decisions D1, D18).
 * Angular analogy: a route config + canActivate guards, but declared as data.
 */
import * as z from 'zod';
import type { OrderInput } from '@/contract/order';
import { getPath } from '../path';
import { evaluate } from '../rules/engine';

export const Mode = z.enum(['quick', 'detailed']);
export type Mode = z.infer<typeof Mode>;

export const StepDef = z.object({
  id: z.string(),
  slug: z.object({ ro: z.string(), en: z.string() }),
  modes: z.array(Mode).min(1),
  required: z.object({ quick: z.array(z.string()).optional(), detailed: z.array(z.string()).optional() }),
  visibleIf: z.unknown().optional(),
});
export const StepsConfig = z.object({ version: z.string(), steps: z.array(StepDef).min(1) });
export type StepDef = z.infer<typeof StepDef>;
export type StepsConfig = z.infer<typeof StepsConfig>;

export function visibleSteps(order: Partial<OrderInput>, mode: Mode, cfg: StepsConfig, hidden: string[] = []): StepDef[] {
  return cfg.steps.filter(
    (s) => s.modes.includes(mode) && !hidden.includes(s.id) && (s.visibleIf === undefined || evaluate(s.visibleIf, order)),
  );
}

export function missingFields(order: Partial<OrderInput>, step: StepDef, mode: Mode): string[] {
  return (step.required[mode] ?? []).filter((p) => {
    const v = getPath(order, p);
    return v === undefined || v === null || v === '';
  });
}

export function isStepComplete(order: Partial<OrderInput>, step: StepDef, mode: Mode): boolean {
  return missingFields(order, step, mode).length === 0;
}

/** First step that still has unanswered required fields, or null when the wizard is complete. */
export function firstIncomplete(order: Partial<OrderInput>, mode: Mode, cfg: StepsConfig, hidden: string[] = []): StepDef | null {
  return visibleSteps(order, mode, cfg, hidden).find((s) => !isStepComplete(order, s, mode)) ?? null;
}

export function nextStep(current: string, order: Partial<OrderInput>, mode: Mode, cfg: StepsConfig, hidden: string[] = []): StepDef | null {
  const steps = visibleSteps(order, mode, cfg, hidden);
  const i = steps.findIndex((s) => s.id === current);
  return i >= 0 && i + 1 < steps.length ? steps[i + 1] : null;
}

export function prevStep(current: string, order: Partial<OrderInput>, mode: Mode, cfg: StepsConfig, hidden: string[] = []): StepDef | null {
  const steps = visibleSteps(order, mode, cfg, hidden);
  const i = steps.findIndex((s) => s.id === current);
  return i > 0 ? steps[i - 1] : null;
}

/** A step may be opened only if all steps before it are complete (no gaps in data). */
export function canOpen(target: string, order: Partial<OrderInput>, mode: Mode, cfg: StepsConfig, hidden: string[] = []): boolean {
  for (const s of visibleSteps(order, mode, cfg, hidden)) {
    if (s.id === target) return true;
    if (!isStepComplete(order, s, mode)) return false;
  }
  return false;
}

export function stepBySlug(slug: string, locale: 'ro' | 'en', cfg: StepsConfig): StepDef | undefined {
  return cfg.steps.find((s) => s.slug[locale] === slug);
}
