import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { StartScreen } from '@/features/configurator/StartScreen';

export async function generateMetadata({ params }: PageProps<'/[locale]/estimate'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return { title: t('start.title') };
}

export default function EstimateStart() {
  // ?mode= is read on the client; the static shell renders without it
  return (
    <Suspense>
      <StartScreen />
    </Suspense>
  );
}
