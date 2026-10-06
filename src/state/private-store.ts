'use client';
/**
 * Personal data (contacts, exact addresses, comment) — sessionStorage only, never in share links
 * (decisions D19, R6). Media metadata and annotations stay in localStorage; the files themselves
 * live in IndexedDB on this device (UploadService).
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AddressDetails, Annotation, Contact } from '@/contract/api';
import type { StoredMedia } from '@/services/types';
import { safeStorage } from './storage';

type PrivateState = {
  contact: Partial<Contact>;
  addresses: { from?: AddressDetails; to?: AddressDetails };
  comment: string;
  marketing: boolean;
  estimateTerms: boolean;
  setContact: (c: Partial<Contact>) => void;
  setAddress: (end: 'from' | 'to', a: AddressDetails) => void;
  setComment: (c: string) => void;
  setConsent: (k: 'marketing' | 'estimateTerms', v: boolean) => void;
  clear: () => void;
};

export const usePrivateStore = create<PrivateState>()(
  persist(
    (set) => ({
      contact: {},
      addresses: {},
      comment: '',
      marketing: false,
      estimateTerms: false,
      setContact: (c) => set((s) => ({ contact: { ...s.contact, ...c } })),
      setAddress: (end, a) => set((s) => ({ addresses: { ...s.addresses, [end]: { ...s.addresses[end], ...a } } })),
      setComment: (comment) => set({ comment }),
      setConsent: (k, v) => set({ [k]: v } as Pick<PrivateState, typeof k>),
      clear: () => set({ contact: {}, addresses: {}, comment: '', marketing: false, estimateTerms: false }),
    }),
    { name: 'mutabil:private', storage: createJSONStorage(() => safeStorage('session')), skipHydration: true },
  ),
);

export type MediaItem = StoredMedia & { annotation?: Annotation; url?: string };

type MediaState = {
  items: MediaItem[];
  generalNote: string;
  add: (m: MediaItem) => void;
  remove: (id: string) => void;
  annotate: (id: string, a: Annotation) => void;
  setGeneralNote: (n: string) => void;
};

export const useMediaStore = create<MediaState>()(
  persist(
    (set) => ({
      items: [],
      generalNote: '',
      add: (m) => set((s) => ({ items: [...s.items, m] })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      annotate: (id, annotation) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, annotation } : i)) })),
      setGeneralNote: (generalNote) => set({ generalNote }),
    }),
    {
      name: 'mutabil:media',
      storage: createJSONStorage(() => safeStorage('local')),
      skipHydration: true,
      partialize: (s) => ({ items: s.items.map(({ url: _url, ...rest }) => rest), generalNote: s.generalNote }),
    },
  ),
);
