import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ContactScreen } from '@/features/configurator/ContactScreen';

export async function generateMetadata({ params }: PageProps<'/[locale]/estimate/contact'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return { title: t('contact.title'), robots: { index: false } };
}

export default function ContactPage() {
  return <ContactScreen />;
}
