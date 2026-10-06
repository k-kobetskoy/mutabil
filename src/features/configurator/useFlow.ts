'use client';
/**
 * Wizard state derived from the draft: which steps are visible for the mode, where we are,
 * where Back/Continue go. Pure helpers from src/domain/flow, wired to the store and locale.
 */
import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { applyRules } from '@/domain/rules/engine';
import { canOpen, firstIncomplete, visibleSteps, type StepDef } from '@/domain/flow/steps';
import type { AppLocale } from '@/lib/format';
import { useOrderStore } from '@/state/order-store';
import { useCfg } from './providers';

export type StepHref = { pathname: '/estimate/[step]'; params: { step: string } };

export function useFlow(currentId?: string) {
  const order = useOrderStore((s) => s.order);
  const cfg = useCfg();
  const locale = useLocale() as AppLocale;
  const rules = useMemo(() => applyRules(order, cfg.rules), [order, cfg]);
  const hidden = rules.hiddenSteps;
  const mode = order.mode;
  const steps = useMemo(() => visibleSteps(order, mode, cfg.steps, hidden), [order, mode, cfg, hidden]);
  const index = steps.findIndex((s) => s.id === currentId);
  const href = (s: StepDef): StepHref => ({ pathname: '/estimate/[step]', params: { step: s.slug[locale] } });
  return {
    order,
    mode,
    rules,
    steps,
    index,
    current: index >= 0 ? steps[index] : undefined,
    next: index >= 0 && index + 1 < steps.length ? steps[index + 1] : null,
    prev: index > 0 ? steps[index - 1] : null,
    firstIncomplete: firstIncomplete(order, mode, cfg.steps, hidden),
    canOpen: (id: string) => canOpen(id, order, mode, cfg.steps, hidden),
    href,
    /** values the rules allow for a path, or null when unrestricted */
    allowed: (path: string) => {
      const r = rules.restrictions.filter((x) => x.path === path);
      return r.length ? r[r.length - 1].allow : null;
    },
    /** the rule that removed an option, to say why it is unavailable */
    blockedBy: (path: string, value: string) => rules.restrictions.find((x) => x.path === path && !x.allow.includes(value))?.ruleId,
  };
}
