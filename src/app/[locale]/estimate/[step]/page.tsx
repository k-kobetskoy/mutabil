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

export default async function StepPage({ params }: PageProps<'/[locale]/estimate/[step]'>) {
  const { locale, step } = await params;
  const def = stepBySlug(step, locale as Locale, getConfig().steps);
  if (!def) notFound();
  return <StepScreen stepId={def.id} />;
}
