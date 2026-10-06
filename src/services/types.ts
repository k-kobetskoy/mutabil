/**
 * Service interfaces (decisions D23). The UI depends only on these; the MVP ships mock
 * implementations, a later HTTP implementation talks to the Go API (contract/openapi.yaml).
 * For an Angular/.NET dev: these are the abstract providers / interfaces you register in DI;
 * the React context in src/services/provider.tsx plays the role of the injector.
 */
import type { AddressDetails, AddressRecord, OrderRequest, Slot, SubmitResult } from '@/contract/api';

export interface OrderService {
  submitOrder(req: OrderRequest, opts?: { signal?: AbortSignal }): Promise<SubmitResult>;
}

export interface SlotService {
  listSlots(q: { from: string; to: string; windowH: number; fullDay?: boolean }, opts?: { signal?: AbortSignal }): Promise<Slot[]>;
}

export interface AddressDirectoryService {
  lookup(address: AddressDetails): Promise<AddressRecord | null>;
  remember(address: AddressDetails, facts: Omit<AddressRecord, 'key' | 'confirmedAt'>): Promise<void>;
}

export type StoredMedia = {
  id: string;
  kind: 'photo' | 'video' | 'elevatorPlate' | 'access';
  name: string;
  type: string;
  size: number;
  createdAt: string;
};

export interface UploadService {
  put(file: Blob, meta: { kind: StoredMedia['kind']; name: string }): Promise<StoredMedia>;
  get(id: string): Promise<Blob | undefined>;
  list(): Promise<StoredMedia[]>;
  remove(id: string): Promise<void>;
}

export type Services = {
  orders: OrderService;
  slots: SlotService;
  addresses: AddressDirectoryService;
  uploads: UploadService;
};

export class ValidationProblem extends Error {
  constructor(public readonly errors: { path: string; key: string }[]) {
    super('validation');
  }
}
