'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { getConfig } from '@/config';
import { stepBySlug } from '@/domain/flow/steps';
import { cx } from '@/ui/cx';

/** RO | EN. On a step page the step slug is translated too (acces ↔ access). */
export function LocaleSwitcher({ onNight }: { onNight?: boolean }) {
  const t = useTranslations('nav');
  const locale = useLocale() as 'ro' | 'en';
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ step?: string }>();

  const go = (next: 'ro' | 'en') => {
    if (next === locale) return;
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (pathname === '/estimate/[step]' && params.step) {
      const step = stepBySlug(params.step, locale, getConfig().steps);
      router.replace({ pathname: '/estimate/[step]', params: { step: step?.slug[next] ?? params.step } }, { locale: next });
    } else {
      router.replace(`${pathname}${hash}` as never, { locale: next });
    }
  };

  return (
    <div role="group" aria-label={t('language')} className="flex items-center gap-0.5">
      {(['ro', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => go(l)}
          aria-current={l === locale ? 'true' : undefined}
          lang={l}
          className={cx(
            'code-wide min-h-10 cursor-pointer rounded-md px-2.5 text-[0.75rem]',
            l === locale
              ? onNight
                ? 'bg-white text-night'
                : 'bg-night text-white'
              : onNight
                ? 'text-on-night-muted hover:text-white'
                : 'text-ink-muted hover:text-ink',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
