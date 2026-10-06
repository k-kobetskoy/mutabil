import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ResultScreen } from '@/features/configurator/ResultScreen';

export async function generateMetadata({ params }: PageProps<'/[locale]/estimate/result'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return { title: t('estimate.title'), robots: { index: false } };
}

export default function ResultPage() {
  // ?pricing= is read on the client; the static shell renders without it
  return (
    <Suspense>
      <ResultScreen />
    </Suspense>
  );
}
