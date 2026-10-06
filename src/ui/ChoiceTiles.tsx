'use client';
/**
 * Picture/answer tiles = an accessible radio group (arrow keys move, Space selects).
 * Used for task type, lift class, who packs, fares… One look for every single choice.
 */
import type { ReactNode } from 'react';
import { Label, Radio, RadioGroup, Text, FieldError } from 'react-aria-components';
import { cx } from './cx';

export type Tile<V extends string> = { value: V; label: ReactNode; hint?: ReactNode; icon?: ReactNode; disabled?: boolean; aside?: ReactNode };

export function ChoiceTiles<V extends string>({
  label,
  description,
  value,
  onChange,
  tiles,
  columns = 2,
  size = 'md',
  errorMessage,
  isInvalid,
  className,
  name,
}: {
  label: ReactNode;
  description?: ReactNode;
  value: V | undefined;
  onChange: (v: V) => void;
  tiles: Tile<V>[];
  columns?: 2 | 3 | 4 | 5;
  size?: 'sm' | 'md';
  errorMessage?: string;
  isInvalid?: boolean;
  className?: string;
  name?: string;
}) {
  const cols = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4', 5: 'grid-cols-3 sm:grid-cols-5' }[columns];
  return (
    <RadioGroup
      name={name}
      value={value ?? null}
      onChange={(v) => onChange(v as V)}
      isInvalid={isInvalid}
      className={cx('flex flex-col gap-2.5', className)}
    >
      <Label className="label-cap text-ink-muted">{label}</Label>
      {description && (
        <Text slot="description" className="-mt-1 text-[0.92rem] text-ink-muted">
          {description}
        </Text>
      )}
      <div className={cx('grid gap-2', cols)}>
        {tiles.map((t) => (
          <Radio
            key={t.value}
            value={t.value}
            isDisabled={t.disabled}
            className={({ isSelected, isFocusVisible, isDisabled }) =>
              cx(
                'group relative flex cursor-pointer flex-col gap-1 rounded-[var(--radius-field)] border bg-paper text-left transition-[border-color,box-shadow,background-color] duration-150',
                size === 'sm' ? 'min-h-12 px-3 py-2.5' : 'min-h-16 px-4 py-3',
                isSelected ? 'border-route bg-route-soft shadow-[inset_0_0_0_1px_var(--color-route)]' : 'border-line hover:border-line-strong',
                isFocusVisible && 'outline-3 outline-offset-2 outline-route',
                isDisabled && 'cursor-not-allowed opacity-45',
              )
            }
          >
            {({ isSelected }) => (
              <>
                {t.icon && <span className={cx('mb-1 text-ink', isSelected && 'text-route')}>{t.icon}</span>}
                <span className="font-[family-name:var(--font-display)] text-[0.98rem] leading-tight font-bold">{t.label}</span>
                {t.hint && <span className="text-[0.85rem] leading-snug text-ink-muted">{t.hint}</span>}
                {t.aside && <span className="mt-1">{t.aside}</span>}
              </>
            )}
          </Radio>
        ))}
      </div>
      <FieldError className="text-[0.92rem] font-semibold text-error">{errorMessage}</FieldError>
    </RadioGroup>
  );
}
