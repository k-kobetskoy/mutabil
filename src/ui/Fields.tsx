'use client';
import type { ReactNode } from 'react';
import { Checkbox as AriaCheckbox, FieldError, Input, Label, Switch as AriaSwitch, Text, TextArea, TextField } from 'react-aria-components';
import { Check } from 'lucide-react';
import { cx } from './cx';

export function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  description,
  errorMessage,
  isInvalid,
  autoComplete,
  inputMode,
  multiline,
  placeholder,
  className,
  isRequired,
}: {
  label: ReactNode;
  value: string | undefined;
  onChange: (v: string) => void;
  type?: string;
  description?: ReactNode;
  errorMessage?: string;
  isInvalid?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric';
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  isRequired?: boolean;
}) {
  const field = 'w-full rounded-[var(--radius-field)] border border-line bg-paper px-4 text-ink outline-none transition-colors hover:border-line-strong focus:border-route data-[invalid]:border-error';
  return (
    <TextField value={value ?? ''} onChange={onChange} type={type} isInvalid={isInvalid} isRequired={isRequired} autoComplete={autoComplete} className={cx('flex flex-col gap-1.5', className)}>
      <Label className="label-cap text-ink-muted">{label}</Label>
      {multiline ? (
        <TextArea placeholder={placeholder} rows={4} className={cx(field, 'py-3')} />
      ) : (
        <Input placeholder={placeholder} inputMode={inputMode} className={cx(field, 'min-h-12')} />
      )}
      {description && (
        <Text slot="description" className="text-[0.88rem] text-ink-muted">
          {description}
        </Text>
      )}
      <FieldError className="text-[0.92rem] font-semibold text-error">{errorMessage}</FieldError>
    </TextField>
  );
}

export function Checkbox({ children, isSelected, onChange, isInvalid }: { children: ReactNode; isSelected: boolean; onChange: (v: boolean) => void; isInvalid?: boolean }) {
  return (
    <AriaCheckbox isSelected={isSelected} onChange={onChange} isInvalid={isInvalid} className="group flex cursor-pointer items-start gap-3 text-[0.98rem] leading-snug">
      {({ isSelected: sel, isFocusVisible, isInvalid: inv }) => (
        <>
          <span
            className={cx(
              'mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors',
              sel ? 'border-route bg-route text-white' : inv ? 'border-error bg-paper' : 'border-line-strong bg-paper',
              isFocusVisible && 'outline-3 outline-offset-2 outline-route',
            )}
          >
            {sel && <Check size={16} strokeWidth={3} aria-hidden />}
          </span>
          <span>{children}</span>
        </>
      )}
    </AriaCheckbox>
  );
}

export function Switch({ children, isSelected, onChange, description }: { children: ReactNode; isSelected: boolean; onChange: (v: boolean) => void; description?: ReactNode }) {
  return (
    <AriaSwitch isSelected={isSelected} onChange={onChange} className="group flex cursor-pointer items-start justify-between gap-4">
      {({ isSelected: sel, isFocusVisible }) => (
        <>
          <span className="flex flex-col">
            <span className="text-[0.98rem] font-semibold">{children}</span>
            {description && <span className="text-[0.88rem] text-ink-muted">{description}</span>}
          </span>
          <span className={cx('relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors', sel ? 'bg-route' : 'bg-line-strong', isFocusVisible && 'outline-3 outline-offset-2 outline-route')}>
            <span className={cx('absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform duration-200 ease-[var(--ease-out-expo)]', sel ? 'translate-x-5.5' : 'translate-x-0.5')} />
          </span>
        </>
      )}
    </AriaSwitch>
  );
}
