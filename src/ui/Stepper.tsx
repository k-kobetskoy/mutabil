'use client';
import type { ReactNode } from 'react';
import { Button, Group, Input, Label, NumberField, Text } from 'react-aria-components';
import { Minus, Plus } from 'lucide-react';
import { cx } from './cx';

/** − value + : NumberField with locale formatting, keyboard arrows and typing. */
export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  description,
  compact,
  className,
  onNight,
}: {
  label: ReactNode;
  value: number | undefined;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  description?: ReactNode;
  compact?: boolean;
  className?: string;
  onNight?: boolean;
}) {
  const btn = cx(
    'grid size-11 place-items-center rounded-[calc(var(--radius-field)-2px)] transition-colors disabled:opacity-35 cursor-pointer',
    onNight ? 'text-white hover:bg-white/12' : 'text-ink hover:bg-route-soft',
  );
  return (
    <NumberField
      value={value ?? NaN}
      onChange={(v) => onChange(Number.isNaN(v) ? min : v)}
      minValue={min}
      maxValue={max}
      step={step}
      className={cx('flex', compact ? 'items-center justify-between gap-3' : 'flex-col gap-1.5', className)}
    >
      <Label
        className={cx(compact ? 'text-[0.98rem]' : 'label-cap', onNight ? 'text-on-night-muted' : compact ? 'text-ink' : 'text-ink-muted')}
      >
        {label}
      </Label>
      <Group
        className={cx(
          'flex w-fit items-center rounded-[var(--radius-field)] border p-0.5',
          onNight ? 'border-white/25 bg-white/8' : 'border-line bg-paper',
        )}
      >
        <Button slot="decrement" className={btn}>
          <Minus size={18} aria-hidden />
        </Button>
        {/* An unanswered value shows a question mark, not an empty gap (a dash read as a second minus) */}
        <Input
          placeholder="?"
          // react-aria picks inputMode by platform, so server and Android disagree; our values are whole numbers
          inputMode="numeric"
          className={cx(
            'tabular w-12 bg-transparent text-center font-[family-name:var(--font-display)] text-[1.15rem] font-bold outline-none',
            onNight ? 'text-white placeholder:text-white/65' : 'text-ink placeholder:text-ink-muted',
          )}
        />
        <Button slot="increment" className={btn}>
          <Plus size={18} aria-hidden />
        </Button>
      </Group>
      {description && (
        <Text slot="description" className={cx('text-[0.85rem]', onNight ? 'text-on-night-muted' : 'text-ink-muted')}>
          {description}
        </Text>
      )}
    </NumberField>
  );
}
