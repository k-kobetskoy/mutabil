/**
 * Business-rules interpreter (decisions D18).
 *
 * A rule = { when: JSONLogic subset, then: effects[] }. The same JSON is meant to be executed by
 * the Go backend later (diegoholiveira/jsonlogic), so the operator set is deliberately small and
 * the effects vocabulary is closed. Rules see the order AFTER previous rules' assumptions.
 *
 * For an Angular dev: think of it as data-driven route guards + resolvers, but pure functions.
 */
import jsonLogic from 'json-logic-js';
import * as z from 'zod';
import type { OrderInput } from '@/contract/order';
import { getPath, setPath } from '../path';

export const ALLOWED_OPERATORS = ['var', '==', '!=', '<', '<=', '>', '>=', 'and', 'or', '!', 'in', 'missing'] as const;

const Scalar = z.union([z.string(), z.number(), z.boolean()]);

export const Effect = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('assume'),
    path: z.string(),
    value: Scalar,
    options: z.array(Scalar).min(2),
    sigma: z.string().optional(),
    explain: z.string(),
  }),
  z.object({ type: z.literal('addTask'), code: z.string(), params: z.record(z.string(), z.string()).optional() }),
  z.object({ type: z.literal('restrictOptions'), path: z.string(), allow: z.array(Scalar).min(1) }),
  z.object({ type: z.literal('setDefault'), path: z.string(), value: Scalar }),
  z.object({ type: z.literal('hint'), key: z.string() }),
  z.object({ type: z.literal('explain'), key: z.string() }),
  z.object({ type: z.literal('hideStep'), step: z.string() }),
]);
export type Effect = z.infer<typeof Effect>;

export const Rule = z.object({
  id: z.string(),
  each: z.array(z.enum(['from', 'to'])).optional(),
  when: z.unknown(),
  then: z.array(Effect),
});
export const RulesConfig = z.object({ version: z.string(), rules: z.array(Rule) });
export type RulesConfig = z.infer<typeof RulesConfig>;

export type AssumptionRecord = {
  ruleId: string;
  path: string;
  value: string | number | boolean;
  options: (string | number | boolean)[];
  sigma?: string;
  explain: string;
};

export type RulesResult = {
  order: OrderInput;
  assumptions: AssumptionRecord[];
  tasks: { code: string; params?: Record<string, string> }[];
  restrictions: { path: string; allow: (string | number | boolean)[]; ruleId: string }[];
  forced: { path: string; from: unknown; to: unknown; ruleId: string }[];
  hints: string[];
  explanations: string[];
  hiddenSteps: string[];
  fired: string[];
};

/** Throws if a rule uses an operator outside the shared TS/Go subset. */
export function validateLogic(logic: unknown, where = 'rule'): void {
  if (Array.isArray(logic)) return logic.forEach((l) => validateLogic(l, where));
  if (logic && typeof logic === 'object') {
    const keys = Object.keys(logic);
    if (keys.length !== 1) throw new Error(`${where}: JSONLogic node must have exactly one operator, got ${keys.join(',')}`);
    const op = keys[0];
    if (!(ALLOWED_OPERATORS as readonly string[]).includes(op)) throw new Error(`${where}: operator "${op}" is not allowed`);
    validateLogic((logic as Record<string, unknown>)[op], where);
  }
}

export function parseRules(raw: unknown): RulesConfig {
  const cfg = RulesConfig.parse(raw);
  for (const r of cfg.rules) validateLogic(r.when, r.id);
  return cfg;
}

function substitute<T>(x: T, end: string | undefined): T {
  if (!end) return x;
  return JSON.parse(JSON.stringify(x).replaceAll('$end', end)) as T;
}

export function evaluate(logic: unknown, data: unknown): boolean {
  return Boolean(jsonLogic.apply(logic as jsonLogic.RulesLogic, data as object));
}

export function applyRules(input: OrderInput, cfg: RulesConfig): RulesResult {
  let order: OrderInput = structuredClone(input);
  const res: RulesResult = {
    order,
    assumptions: [],
    tasks: [],
    restrictions: [],
    forced: [],
    hints: [],
    explanations: [],
    hiddenSteps: [],
    fired: [],
  };

  for (const rule of cfg.rules) {
    const ends: (string | undefined)[] = rule.each ?? [undefined];
    for (const end of ends) {
      const when = substitute(rule.when, end);
      if (!evaluate(when, order)) continue;
      res.fired.push(end ? `${rule.id}:${end}` : rule.id);
      for (const raw of rule.then) {
        const eff = substitute(raw, end);
        switch (eff.type) {
          case 'assume':
            order = setPath(order, eff.path, eff.value);
            res.assumptions.push({ ruleId: rule.id, path: eff.path, value: eff.value, options: eff.options, sigma: eff.sigma, explain: eff.explain });
            break;
          case 'addTask':
            if (!res.tasks.some((t) => t.code === eff.code && JSON.stringify(t.params) === JSON.stringify(eff.params)))
              res.tasks.push({ code: eff.code, ...(eff.params ? { params: eff.params } : {}) });
            break;
          case 'restrictOptions': {
            res.restrictions.push({ path: eff.path, allow: eff.allow, ruleId: rule.id });
            const current = getPath(order, eff.path);
            if (current !== undefined && !eff.allow.includes(current as string)) {
              order = setPath(order, eff.path, eff.allow[0]);
              res.forced.push({ path: eff.path, from: current, to: eff.allow[0], ruleId: rule.id });
            }
            break;
          }
          case 'setDefault':
            if (getPath(order, eff.path) === undefined) order = setPath(order, eff.path, eff.value);
            break;
          case 'hint':
            if (!res.hints.includes(eff.key)) res.hints.push(eff.key);
            break;
          case 'explain':
            res.explanations.push(eff.key);
            break;
          case 'hideStep':
            if (!res.hiddenSteps.includes(eff.step)) res.hiddenSteps.push(eff.step);
            break;
        }
      }
    }
  }
  res.order = order;
  return res;
}
