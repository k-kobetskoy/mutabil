/**
 * Mock services for the MVP: no backend. They behave like the future API would:
 * the order is validated and the price is RECOMPUTED (a client estimate is never trusted),
 * the elevator facts are remembered for the address, media stay in IndexedDB on this device.
 */
import { createStore, del, get, keys, set, type UseStore } from 'idb-keyval';
import { OrderRequest, type AddressRecord, type Slot, type SubmitResult } from '@/contract/api';
import { getConfig } from '@/config';
import { estimate } from '@/domain/estimate';
import { normalizeAddressKey } from '@/domain/address';
import { slotsForWindow } from '@/domain/slots';
import {
  ValidationProblem,
  type AddressDirectoryService,
  type OrderService,
  type Services,
  type SlotService,
  type StoredMedia,
  type UploadService,
} from './types';

const DIRECTORY_KEY = 'mutabil:address-directory';
const REQUESTS_KEY = 'mutabil:requests';

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota: the mock simply forgets */
  }
}

export class MockAddressDirectory implements AddressDirectoryService {
  constructor(private readonly memory = new Map<string, AddressRecord>()) {}
  private all(): Record<string, AddressRecord> {
    return { ...readLocal<Record<string, AddressRecord>>(DIRECTORY_KEY, {}), ...Object.fromEntries(this.memory) };
  }
  async lookup(address: Parameters<AddressDirectoryService['lookup']>[0]) {
    const key = normalizeAddressKey(address);
    return key ? (this.all()[key] ?? null) : null;
  }
  async remember(address: Parameters<AddressDirectoryService['remember']>[0], facts: Parameters<AddressDirectoryService['remember']>[1]) {
    const key = normalizeAddressKey(address);
    if (!key) return;
    const rec: AddressRecord = { ...facts, key, confirmedAt: new Date().toISOString() };
    this.memory.set(key, rec);
    writeLocal(DIRECTORY_KEY, { ...readLocal(DIRECTORY_KEY, {}), [key]: rec });
  }
}

export class MockOrderService implements OrderService {
  constructor(private readonly directory: AddressDirectoryService) {}

  async submitOrder(req: OrderRequest): Promise<SubmitResult> {
    const parsed = OrderRequest.safeParse(req);
    const errors = parsed.success
      ? []
      : parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          key: typeof i.message === 'string' && i.message.startsWith('validation.') ? i.message : 'validation.invalid',
        }));
    if (!req.contact?.phone && !req.contact?.email) errors.push({ path: 'contact.phone', key: 'validation.contact.phoneOrEmail' });
    if (errors.length) throw new ValidationProblem(errors);

    const est = estimate(req.order, getConfig()); // server-side recomputation
    const tasks = est.tasks.map((t) => t.code);
    if (req.order.service === 'full') tasks.unshift('SCHEDULE_VISIT');
    if (req.media?.some((m) => m.kind === 'photo' || m.kind === 'video')) tasks.push('REVIEW_MEDIA');

    for (const end of ['from', 'to'] as const) {
      const e = req.order[end];
      const addr = req.addresses[end];
      if (addr && e?.elevator && e.elevator !== 'unknown') {
        await this.directory.remember(addr, {
          elevator: e.elevator,
          ...(e.furnitureInLift && e.furnitureInLift !== 'unknown' ? { furnitureInLift: e.furnitureInLift } : {}),
          ...(e.raisedEntrance !== undefined ? { raisedEntrance: e.raisedEntrance } : {}),
          confirmedBy: 'client',
        });
      }
    }

    const requestId = `REQ-${Date.now().toString(36).toUpperCase()}`;
    const log = readLocal<unknown[]>(REQUESTS_KEY, []);
    writeLocal(REQUESTS_KEY, [...log.slice(-19), { requestId, at: new Date().toISOString(), tasks, total: est.price.base }]);
    console.info('[mock] order received', { requestId, tasks, estimate: est });
    await new Promise((r) => setTimeout(r, 400));
    return { requestId, status: 'received', tasks, estimate: est };
  }
}

export class MockSlotService implements SlotService {
  async listSlots(q: { from: string; to: string; windowH: number; fullDay?: boolean }): Promise<Slot[]> {
    const out: Slot[] = [];
    const cfg = getConfig();
    for (let d = new Date(`${q.from}T12:00:00Z`); d <= new Date(`${q.to}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
      const date = d.toISOString().slice(0, 10);
      const dayHash = [...date].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7);
      for (const s of slotsForWindow(q.windowH, cfg, q.fullDay)) {
        const busy = (dayHash + s.slot.length) % 5 === 0; // deterministic fake bookings
        out.push({ date, slot: s.slot, start: s.start, available: s.fits && !busy });
      }
    }
    return out;
  }
}

export class IndexedDbUploads implements UploadService {
  private store: UseStore | undefined;
  private db() {
    this.store ??= createStore('mutabil-media', 'files');
    return this.store;
  }
  async put(file: Blob, meta: { kind: StoredMedia['kind']; name: string }): Promise<StoredMedia> {
    const id = `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const info: StoredMedia = {
      id,
      kind: meta.kind,
      name: meta.name,
      type: file.type,
      size: file.size,
      createdAt: new Date().toISOString(),
    };
    await set(id, { info, file }, this.db());
    return info;
  }
  async get(id: string) {
    return ((await get(id, this.db())) as { file: Blob } | undefined)?.file;
  }
  async list() {
    const ids = (await keys(this.db())) as string[];
    const rows = await Promise.all(ids.map((id) => get(id, this.db()) as Promise<{ info: StoredMedia } | undefined>));
    return rows
      .filter((r): r is { info: StoredMedia } => !!r)
      .map((r) => r.info)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async remove(id: string) {
    await del(id, this.db());
  }
}

export function createMockServices(): Services {
  const addresses = new MockAddressDirectory();
  return { orders: new MockOrderService(addresses), slots: new MockSlotService(), addresses, uploads: new IndexedDbUploads() };
}
