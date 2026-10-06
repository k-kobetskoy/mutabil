import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './LocaleSwitcher';

export async function SiteHeader() {
  const t = await getTranslations('nav');
  return (
    <header className="relative z-20">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-md focus:bg-paper focus:px-3 focus:py-2">
        {t('skip')}
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="code-wide text-[1.15rem] tracking-[0.12em] text-ink no-underline">
          Mutabil
        </Link>
        <nav aria-label="Mutabil" className="hidden items-center gap-6 text-[0.95rem] font-semibold md:flex">
          <a href="#tarife" className="text-ink no-underline hover:text-route">
            {t('fares')}
          </a>
          <a href="#bagaje" className="text-ink no-underline hover:text-route">
            {t('extras')}
          </a>
          <a href="#cum" className="text-ink no-underline hover:text-route">
            {t('how')}
          </a>
          <a href="#calcul" className="text-ink no-underline hover:text-route">
            {t('rules')}
          </a>
          <a href="#intrebari" className="text-ink no-underline hover:text-route">
            {t('faq')}
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <Link
            href="/estimate"
            className="hidden min-h-10 items-center rounded-[var(--radius-field)] bg-night px-4 font-[family-name:var(--font-display)] text-[0.9rem] font-bold text-white no-underline hover:bg-night-3 sm:inline-flex"
          >
            {t('start')}
          </Link>
        </div>
      </div>
    </header>
  );
}
