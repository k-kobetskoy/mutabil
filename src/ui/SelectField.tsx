'use client';
import type { ReactNode } from 'react';
import { Button, FieldError, Header, Label, ListBox, ListBoxItem, ListBoxSection, Popover, Select, SelectValue } from 'react-aria-components';
import { ChevronDown } from 'lucide-react';
import { cx } from './cx';

export type Option = { id: string; label: string; detail?: string };
export type OptionGroup = { title?: string; options: Option[] };

export function SelectField({
  label,
  value,
  onChange,
  groups,
  placeholder,
  onNight,
  errorMessage,
  isInvalid,
  className,
  hideLabel,
}: {
  label: ReactNode;
  value: string | undefined;
  onChange: (v: string) => void;
  groups: OptionGroup[];
  placeholder?: string;
  onNight?: boolean;
  errorMessage?: string;
  isInvalid?: boolean;
  className?: string;
  hideLabel?: boolean;
}) {
  return (
    <Select
      selectedKey={value ?? null}
      onSelectionChange={(k) => k != null && onChange(String(k))}
      placeholder={placeholder}
      isInvalid={isInvalid}
      className={cx('flex flex-col gap-1.5', className)}
    >
      <Label className={cx('label-cap', onNight ? 'text-on-night-muted' : 'text-ink-muted', hideLabel && 'sr-only')}>{label}</Label>
      <Button
        className={cx(
          'flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-field)] border px-4 text-left transition-colors',
          onNight ? 'border-white/25 bg-white/8 text-white hover:border-white/50' : 'border-line bg-paper text-ink hover:border-line-strong',
        )}
      >
        <SelectValue className="truncate font-[family-name:var(--font-display)] text-[1.02rem] font-semibold data-[placeholder]:font-normal data-[placeholder]:opacity-70">
          {({ selectedText, isPlaceholder, defaultChildren }) => (isPlaceholder ? defaultChildren : selectedText)}
        </SelectValue>
        <ChevronDown size={18} aria-hidden className="shrink-0 opacity-70" />
      </Button>
      <FieldError className="text-[0.92rem] font-semibold text-error">{errorMessage}</FieldError>
      <Popover className="max-h-80 w-[--trigger-width] min-w-56 overflow-auto rounded-[var(--radius-field)] border border-line bg-paper p-1 shadow-[var(--shadow-panel)] entering:animate-in">
        <ListBox className="outline-none">
          {groups.map((g, i) => (
            <ListBoxSection key={g.title ?? i}>
              {g.title && <Header className="label-cap px-3 pt-3 pb-1 text-ink-muted">{g.title}</Header>}
              {g.options.map((o) => (
                <ListBoxItem
                  key={o.id}
                  id={o.id}
                  textValue={o.label}
                  className="flex cursor-pointer items-baseline justify-between gap-3 rounded-md px-3 py-2.5 text-ink outline-none data-[focused]:bg-route-soft data-[selected]:font-bold"
                >
                  <span>{o.label}</span>
                  {o.detail && <span className="code-wide text-[0.72rem] text-ink-muted">{o.detail}</span>}
                </ListBoxItem>
              ))}
            </ListBoxSection>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}
