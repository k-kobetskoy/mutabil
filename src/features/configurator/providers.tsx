'use client';
/**
 * Dependency injection for the configurator (Angular analogy: providers at the route level).
 * Services are created once; stores are rehydrated from storage after mount, so the server HTML
 * and the first client render match (no hydration mismatch).
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createMockServices } from '@/services/mock';
import type { Services } from '@/services/types';
import { useOrderStore } from '@/state/order-store';
import { useMediaStore, usePrivateStore } from '@/state/private-store';
import { getConfig, type Cfg } from '@/config';
import { estimate } from '@/domain/estimate';
import { canEstimate } from '@/domain/volume';
import type { OrderInput } from '@/contract/order';

const ServicesContext = createContext<Services | null>(null);

export function AppProviders({ children }: { children: ReactNode }) {
  const [services] = useState(createMockServices);
  useEffect(() => {
    void useOrderStore.persist.rehydrate();
    void usePrivateStore.persist.rehydrate();
    void useMediaStore.persist.rehydrate();
  }, []);
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const s = useContext(ServicesContext);
  if (!s) throw new Error('useServices outside <AppProviders>');
  return s;
}

export function useCfg(): Cfg {
  return getConfig();
}

/** Live client-side preview of the estimate (the server recomputes on submit). */
export function useEstimate(order?: OrderInput) {
  const stored = useOrderStore((s) => s.order);
  const o = order ?? stored;
  const cfg = getConfig();
  return useMemo(() => (canEstimate(o, cfg) ? estimate(o, cfg) : null), [o, cfg]);
}
