/** Locale-aware formatting of money (bani → lei), hours and dates. */
export type AppLocale = 'ro' | 'en';

const nf = (locale: AppLocale, digits = 0) =>
  new Intl.NumberFormat(locale === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export function lei(bani: number, locale: AppLocale): string {
  return `${nf(locale).format(Math.round(bani / 100))} lei`;
}

export function leiPlain(bani: number, locale: AppLocale): string {
  return nf(locale).format(Math.round(bani / 100));
}

export function leiRange(low: number, high: number, locale: AppLocale): string {
  return low === high ? lei(low, locale) : `${leiPlain(low, locale)} – ${leiPlain(high, locale)} lei`;
}

export function signedLei(bani: number, locale: AppLocale): string {
  const v = Math.round(bani / 100);
  return `${v > 0 ? '+' : v < 0 ? '−' : '±'}${nf(locale).format(Math.abs(v))} lei`;
}

export function hours(h: number, locale: AppLocale): string {
  return `${nf(locale, 1).format(h)} h`;
}

export function num(n: number, locale: AppLocale, digits = 1): string {
  return nf(locale, digits).format(n);
}

/** "08:00" + hours → "13:30" (clock time, may pass midnight in theory: clamp to 23:59). */
export function addClock(start: string, h: number): string {
  const [hh, mm] = start.split(':').map(Number);
  const total = Math.min(hh * 60 + mm + Math.round(h * 60), 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function longDate(iso: string, locale: AppLocale): string {
  return new Intl.DateTimeFormat(locale === 'ro' ? 'ro-RO' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}
