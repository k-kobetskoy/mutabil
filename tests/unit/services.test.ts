import { describe, expect, it } from 'vitest';
import { MockAddressDirectory, MockOrderService, MockSlotService } from '@/services/mock';
import { ValidationProblem } from '@/services/types';
import type { OrderRequest } from '@/contract/api';
import { twoRoomsLiftCrates } from './fixtures';

const request = (over: Partial<OrderRequest> = {}): OrderRequest => ({
  order: twoRoomsLiftCrates,
  contact: { name: 'Ana', phone: '+40 712 345 678' },
  addresses: { from: { street: 'Str. Observatorului', number: '12', block: 'A', stair: '2' } },
  consents: { estimateTerms: true, marketing: false },
  locale: 'ro',
  ...over,
});

describe('mock order service', () => {
  it('recomputes the estimate (client price is not trusted) and adds tasks', async () => {
    const svc = new MockOrderService(new MockAddressDirectory());
    const res = await svc.submitOrder(request({ media: [{ id: 'm1', kind: 'video' }] }));
    expect(res.status).toBe('received');
    expect(res.estimate.lines.length).toBeGreaterThan(0);
    expect(res.tasks).toContain('REVIEW_MEDIA');
  });
  it('a full-service request (D31) asks first to schedule the specialist visit', async () => {
    const svc = new MockOrderService(new MockAddressDirectory());
    const res = await svc.submitOrder(
      request({
        order: {
          v: 1,
          mode: 'detailed',
          service: 'full',
          taskType: 'apartment',
          size: { presetId: 'apartament-2-camere' },
          from: { zoneId: 'manastur' },
          to: { zoneId: 'gheorgheni' },
          inventory: { mode: 'atSurvey' },
          packing: { who: 'full', containers: 'crates' },
          survey: { method: 'onsite' },
        },
        addresses: {},
      }),
    );
    expect(res.tasks[0]).toBe('SCHEDULE_VISIT');
  });
  it('requires phone or email', async () => {
    const svc = new MockOrderService(new MockAddressDirectory());
    await expect(svc.submitOrder(request({ contact: { name: 'Ana' } }))).rejects.toBeInstanceOf(ValidationProblem);
  });
  it('remembers the elevator of the address for the next client (business rule)', async () => {
    const dir = new MockAddressDirectory();
    await new MockOrderService(dir).submitOrder(request());
    const rec = await dir.lookup({ street: 'strada Observatorului', number: '12', block: 'bl. A', stair: 'sc. 2' });
    expect(rec).toMatchObject({ elevator: 'medium', furnitureInLift: 'yes', confirmedBy: 'client' });
  });
  it('does not remember an unknown elevator', async () => {
    const dir = new MockAddressDirectory();
    const order = { ...twoRoomsLiftCrates, from: { ...twoRoomsLiftCrates.from, elevator: 'unknown' as const } };
    await new MockOrderService(dir).submitOrder(request({ order }));
    expect(await dir.lookup({ street: 'Observatorului', number: '12', block: 'A', stair: '2' })).toBeNull();
  });
});

describe('mock slots', () => {
  it('never offers a slot whose window ends after the working day', async () => {
    const slots = await new MockSlotService().listSlots({ from: '2026-11-02', to: '2026-11-08', windowH: 9 });
    expect(slots.filter((s) => s.slot === 'afternoon' && s.available)).toEqual([]);
    expect(slots.some((s) => s.available)).toBe(true);
  });
});
