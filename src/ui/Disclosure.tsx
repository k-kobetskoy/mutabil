'use client';
import type { ReactNode } from 'react';
import { Button, Disclosure as AriaDisclosure, DisclosurePanel, Heading } from 'react-aria-components';
import { ChevronDown } from 'lucide-react';
import { cx } from './cx';

/** "De ce?" / details toggle: keyboard and screen-reader friendly (aria-expanded). */
export function Disclosure({
  title,
  children,
  defaultExpanded,
  className,
  titleClassName,
  level = 3,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  titleClassName?: string;
  /** heading level of the toggle, so the outline has no gaps (h1 → h2 in an aside) */
  level?: 2 | 3 | 4;
}) {
  return (
    <AriaDisclosure defaultExpanded={defaultExpanded} className={cx('group', className)}>
      <Heading level={level} className="m-0 font-[family-name:var(--font-sans)] text-[inherit] font-normal tracking-normal">
        <Button
          slot="trigger"
          className={cx('flex w-full cursor-pointer items-center justify-between gap-3 py-2 text-left font-semibold', titleClassName)}
        >
          {title}
          <ChevronDown size={18} aria-hidden className="shrink-0 transition-transform duration-200 group-data-[expanded]:rotate-180" />
        </Button>
      </Heading>
      <DisclosurePanel className="h-(--disclosure-panel-height) overflow-clip transition-[height] duration-200 ease-[var(--ease-out-expo)]">
        <div className="pb-3">{children}</div>
      </DisclosurePanel>
    </AriaDisclosure>
  );
}

/** Small inline "Why?" toggle used next to every amount. */
export function Why({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <AriaDisclosure className="group">
      <Button
        slot="trigger"
        className="cursor-pointer text-[0.85rem] font-semibold text-route underline decoration-dotted underline-offset-4 hover:text-route-hover"
      >
        {label}
      </Button>
      <DisclosurePanel className="overflow-clip">
        <div className="mt-2 rounded-lg bg-route-soft px-3 py-2 text-[0.92rem] leading-snug text-ink">{children}</div>
      </DisclosurePanel>
    </AriaDisclosure>
  );
}
