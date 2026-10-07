import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getConfig } from '@/config';
import { stepBySlug } from '@/domain/flow/steps';
import { StepScreen } from '@/features/configurator/StepScreen';

type Locale = 'ro' | 'en';

export function generateStaticParams({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  return getConfig().steps.steps.map((s) => ({ step: s.slug[locale] }));
}

export async function generateMetadata({ params }: PageProps<'/[locale]/estimate/[step]'>): Promise<Metadata> {
  const { locale, step } = await params;
  const def = stepBySlug(step, locale as Locale, getConfig().steps);
  const t = await getTranslations({ locale });
  return { title: def ? t(`steps.${def.id}.title`) : t('estimate.title'), robots: { index: false } };
}

// URL data (params) is read inside Suspense so the shared shell can render without it
// (Next 16: "URL data outside of Suspense", docs/01-app/02-guides/adopting-partial-prefetching.md)
export default function StepPage({ params }: PageProps<'/[locale]/estimate/[step]'>) {
  return (
    <Suspense>
      <Step params={params} />
    </Suspense>
  );
}

async function Step({ params }: { params: PageProps<'/[locale]/estimate/[step]'>['params'] }) {
  const { locale, step } = await params;
  const def = stepBySlug(step, locale as Locale, getConfig().steps);
  if (!def) notFound();
  return <StepScreen stepId={def.id} />;
}
