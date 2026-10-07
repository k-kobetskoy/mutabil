'use client';
/**
 * A typed date in the page's own format (zz.ll.aaaa in Romanian), not the browser's: the native
 * date input follows the system language and showed "mm/dd/yyyy" to Romanian visitors.
 * The value is an ISO date string, empty while unset.
 */
import type { ReactNode } from 'react';
import { DateField, DateInput as AriaDateInput, DateSegment, FieldError, I18nProvider, Label, Text } from 'react-aria-components';
import { CalendarDate, parseDate } from '@internationalized/date';
import { cx } from './cx';

// Without a placeholder date react-aria asks for today's date while rendering, which Next 16 rejects
// during prerender; the placeholder only shapes the empty segments, it is never shown as a value.
const PLACEHOLDER = new CalendarDate(2000, 1, 1);

export function DateInput({
  label,
  value,
  onChange,
  locale,
  description,
  isInvalid,
  errorMessage,
  className,
}: {
  label: ReactNode;
  value: string;
  onChange: (iso: string) => void;
  locale: 'ro' | 'en';
  description?: ReactNode;
  isInvalid?: boolean;
  errorMessage?: string;
  className?: string;
}) {
  return (
    <I18nProvider locale={locale === 'ro' ? 'ro-RO' : 'en-GB'}>
      <DateField
        value={value ? parseDate(value) : null}
        onChange={(d) => onChange(d ? d.toString() : '')}
        isInvalid={isInvalid}
        granularity="day"
        placeholderValue={PLACEHOLDER}
        className={cx('flex flex-col gap-1.5', className)}
      >
        <Label className="label-cap text-ink-muted">{label}</Label>
        <AriaDateInput className="flex min-h-12 w-full items-center rounded-[var(--radius-field)] border border-line bg-paper px-4 text-ink transition-colors hover:border-line-strong focus-within:border-route data-[invalid]:border-error">
          {(segment) => (
            <DateSegment
              segment={segment}
              className="tabular rounded px-0.5 outline-none focus:bg-route focus:text-white data-[placeholder]:text-ink-muted data-[type=literal]:px-0"
            />
          )}
        </AriaDateInput>
        {description && (
          <Text slot="description" className="text-[0.88rem] text-ink-muted">
            {description}
          </Text>
        )}
        <FieldError className="text-[0.92rem] font-semibold text-error">{errorMessage}</FieldError>
      </DateField>
    </I18nProvider>
  );
}
