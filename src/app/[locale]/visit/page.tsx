import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SiteHeader } from '@/features/shell/SiteHeader';
import { VisitScreen } from '@/features/visit/VisitScreen';

export async function generateMetadata({ params }: PageProps<'/[locale]/visit'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'visit' });
  return { title: t('metaTitle'), description: t('lead') };
}

export default function VisitPage() {
  return (
    <div className="min-h-dvh bg-cloud">
      <SiteHeader compact />
      <VisitScreen />
    </div>
  );
}
