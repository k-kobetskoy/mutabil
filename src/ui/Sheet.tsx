'use client';
import type { ReactNode } from 'react';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { X } from 'lucide-react';
import { Button } from './Button';

/** Bottom sheet on phones, side panel on desktop. Esc / Back / ✕ close it; focus is trapped while open. */
export function Sheet({ isOpen, onOpenChange, title, children, closeLabel }: { isOpen: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; children: ReactNode; closeLabel: string }) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="fixed inset-0 z-50 flex items-end justify-center bg-night/40 backdrop-blur-[2px] md:items-stretch md:justify-end"
    >
      <Modal className="max-h-[88dvh] w-full overflow-auto rounded-t-[var(--radius-panel)] bg-paper shadow-[var(--shadow-panel)] md:max-h-none md:w-[440px] md:rounded-none md:rounded-l-[var(--radius-panel)]">
        <Dialog className="outline-none">
          {({ close }) => (
            <div className="flex flex-col">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-paper px-5 py-3">
                <span aria-hidden className="absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-line-strong md:hidden" />
                <Heading slot="title" className="text-[1.1rem] font-extrabold">
                  {title}
                </Heading>
                <Button variant="ghost" onPress={close} aria-label={closeLabel} className="!min-h-10 !px-2">
                  <X size={20} aria-hidden />
                </Button>
              </div>
              <div className="px-5 py-4">{children}</div>
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
