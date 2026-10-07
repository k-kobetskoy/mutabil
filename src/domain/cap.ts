/**
 * The guaranteed maximum (decisions D10, D38): after the chosen survey confirms the answers, the
 * confirmed estimate is the base, and the client never pays more than base × (1 + cap). Shown on
 * the pass and the estimate page as "at most X lei, if the survey confirms".
 *
 * Only when the things were listed item by item: counted "by rooms" or "at the survey", the volume
 * itself is what the survey finds out, so "if it confirms what you described" would promise a
 * number the client never actually described. Null then, and without a survey.
 */
import type { Estimate } from '@/contract/estimate';
import type { OrderInput } from '@/contract/order';
import type { Cfg } from '@/config';
import { ceilTo, toBani } from './money';
import { inventoryMode } from './volume';

export function guaranteedMax(est: Estimate, order: OrderInput, cfg: Cfg): number | null {
  const cap = est.price.afterSurvey?.capTolerance;
  if (cap === undefined || inventoryMode(order) !== 'list') return null;
  return ceilTo(est.price.base * (1 + cap), toBani(cfg.pricing.rounding.totalLei));
}
