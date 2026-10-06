import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function SiteFooter({ locale }: { locale: 'ro' | 'en' }) {
  const t = await getTranslations({ locale, namespace: 'landing.footer' });
  const tn = await getTranslations({ locale, namespace: 'nav' });
  return (
    <footer className="on-night bg-night text-on-night-muted">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-[0.9rem] sm:grid-cols-[1.2fr_1fr] sm:px-6">
        <div>
          <p className="code-wide text-[1.1rem] tracking-[0.12em] text-white">Mutabil</p>
          <p className="mt-3">{t('company')}</p>
          <p>{t('address')}</p>
          <p>{t('contact')}</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end sm:text-right">
          <Link href="/rates" className="text-white underline decoration-white/40">
            {tn('rules')}
          </Link>
          <p>{t('legal')}</p>
          <a href="https://anpc.ro/ce-este-sal/" className="text-white underline decoration-white/40">
            {t('anpc')}
          </a>
          <p>{t('vat')}</p>
        </div>
      </div>
    </footer>
  );
}
