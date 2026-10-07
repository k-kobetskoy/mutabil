/**
 * Step validation with human messages as i18n keys ("Enter the floor", not "Error").
 * Required fields come from config/steps.json; conditional ones (the lift only above the ground
 * floor, items in list mode) are checked here. Returns {path: messageKey}.
 */
import type { OrderInput } from '@/contract/order';
import type { Mode, StepDef } from './steps';
import { missingFields } from './steps';
import { getPath } from '../path';

const MESSAGE: Record<string, string> = {
  taskType: 'validation.taskType.required',
  'from.zoneId': 'validation.zone.required',
  'to.zoneId': 'validation.zone.required',
  'from.floor': 'validation.floor.required',
  'to.floor': 'validation.floor.required',
  'inventory.mode': 'validation.inventory.required',
  'survey.method': 'validation.survey.required',
  'schedule.date': 'validation.date.required',
  route: 'validation.route.required',
};

export function validateStep(order: OrderInput, step: StepDef, mode: Mode, today: string): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const p of missingFields(order, step, mode)) errors[p] = MESSAGE[p] ?? 'validation.required';

  if (step.id === 'what' && (order.taskType === 'apartment' || order.taskType === undefined) && order.taskType && !order.size?.presetId)
    errors['size.presetId'] = 'validation.size.required';
  if (step.id === 'access') {
    for (const end of ['from', 'to'] as const) {
      const floor = getPath(order, `${end}.floor`) as number | undefined;
      if ((floor ?? 0) > 0 && !getPath(order, `${end}.elevator`)) errors[`${end}.elevator`] = 'validation.elevator.required';
    }
  }
  if (step.id === 'items' && order.inventory?.mode === 'list') {
    const n = Object.keys(order.inventory.items ?? {}).length + (order.inventory.custom?.length ?? 0);
    if (n === 0 && order.taskType === 'items') errors['inventory.items'] = 'validation.inventory.emptyItems';
  }
  if (step.id === 'when' && order.schedule?.date && order.schedule.date <= today) errors['schedule.date'] = 'validation.date.past';
  return errors;
}
