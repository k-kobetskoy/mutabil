/**
 * How we calculate (decisions D33): the public rates moved off the landing. A reading page:
 * what the total is made of, hourly and per-item rates, what is free, how a range becomes a fixed
 * price and what never happens. Every number comes from config.
 */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowRight, Check } from 'lucide-react';
import { getConfig } from '@/config';
import { SiteHeader } from '@/features/shell/SiteHeader';
import { SiteFooter } from '@/features/shell/SiteFooter';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({ params }: PageProps<'/[locale]/rates'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'rates' });
  return { title: t('title'), description: t('metaDescription') };
}

export default async function RatesPage() {
  const t = await getTranslations();
  const locale = (await getLocale()) as 'ro' | 'en';
  const cfg = getConfig();
  const P = cfg.pricing;
  const pct = (x: number) => Math.round(x * 100);
  const perHour = (lei: number) => t('rates.perHour', { lei });
  const vehicles = cfg.vehicles.vehicles.filter((v) => v.enabled);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
        <h1 className="text-[clamp(2.1rem,6vw,3.4rem)] leading-[1.02] font-extrabold">{t('rates.title')}</h1>
        <p className="mt-4 max-w-[60ch] text-[1.1rem] text-ink-muted">{t('rates.lead')}</p>

        <Section title={t('rates.madeTitle')}>
          <ul className="flex flex-col gap-3">
            {(['made1', 'made2', 'made3', 'made4'] as const).map((k) => (
              <li key={k} className="grid grid-cols-[10px_1fr] items-baseline gap-3">
                <span aria-hidden className="size-2 translate-y-[-2px] rounded-full bg-route" />
                <span>{t(`rates.${k}`)}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t('rates.hourlyTitle')}>
          <Rates>
            <Rate term={t('rates.mover')} value={perHour(P.crew.moverHourlyLei)} />
            {vehicles.map((v) => (
              <Rate key={v.id} term={t(`vehicles.${v.id}`)} value={perHour(v.hourlyLei)} />
            ))}
          </Rates>
        </Section>

        <Section title={t('rates.servicesTitle')}>
          <Rates>
            <Rate
              term={t('rates.crates')}
              value={t('rates.cratesPrice', {
                rate: P.crates.perCrateIncludedLei,
                days: P.crates.includedDays,
                extra: P.crates.extraPerCratePerDayLei,
              })}
            />
            <Rate term={t('rates.cardboard')} value={t('rates.cardboardPrice', { rate: P.materials.cardboardBoxLei })} />
            <Rate term={t('rates.wardrobe')} value={t('rates.wardrobePrice', { rate: P.materials.wardrobeBoxRentalLei })} />
            <Rate
              term={t('rates.mattress')}
              value={t('rates.mattressPrice', { single: P.materials.mattressBagSingleLei, double: P.materials.mattressBagDoubleLei })}
            />
            <Rate term={t('rates.tv')} value={t('rates.piecePrice', { rate: P.materials.tvProtectionLei })} />
            <Rate term={t('rates.mirror')} value={t('rates.piecePrice', { rate: P.materials.mirrorProtectionLei })} />
            <Rate term={t('rates.packing')} value={t('rates.packingPrice', { rate: P.packing.perBoxLei })} />
            <Rate
              term={t('rates.assembly')}
              value={t('rates.assemblyPrice', { bed: P.assembly.perClassLei.bed, wardrobe: P.assembly.perClassLei.wardrobeLarge })}
            />
            <Rate term={t('rates.master')} value={t('rates.masterPrice', { rate: P.assembly.masterOnMovingDayLei })} />
          </Rates>
        </Section>

        <Section title={t('rates.includedTitle')}>
          <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {P.includedFree.map((k) => (
              <li key={k} className="flex items-center gap-2">
                <Check size={18} aria-hidden className="shrink-0 text-ok" />
                {t(`included.${k}`)}
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t('rates.rangeTitle')}>
          <div className="flex max-w-[40rem] flex-col gap-3">
            <p>{t('rates.range1')}</p>
            <p className="rounded-[var(--radius-field)] bg-amber-soft px-4 py-3">
              {t('rates.range2', { remote: pct(P.survey.remote.capTolerance), onsite: pct(P.survey.onsite.capTolerance) })}
            </p>
            {P.survey.onsite.deductibleFromOrder && (
              <p className="text-ink-muted">{t('rates.range3', { fee: P.survey.onsite.priceLei })}</p>
            )}
            <p>{t('rates.range4', { fee: P.survey.onsite.priceLei })}</p>
          </div>
        </Section>

        <Section title={t('rates.changesTitle')}>
          <Rates>
            <Rate term={t('rates.overtime')} value={t('rates.overtimeText')} />
            <Rate term={t('rates.weekend')} value={t('rates.weekendText', { pct: pct(P.surcharges.weekend) })} />
            <Rate term={t('rates.minimum')} value={t('rates.minimumText', { min: P.minimumOrderLei, hours: P.billing.minimumBillableH })} />
          </Rates>
        </Section>

        <Section title={t('rates.promiseTitle')}>
          <ul className="flex flex-col gap-2">
            {(['promise1', 'promise2', 'promise3'] as const).map((k) => (
              <li key={k} className="flex items-start gap-2 font-semibold">
                <Check size={18} aria-hidden className="mt-1 shrink-0 text-ok" />
                {t(`rates.${k}`)}
              </li>
            ))}
          </ul>
        </Section>

        <p className="mt-12 text-[0.9rem] text-ink-muted">{t('rates.note')}</p>
        <Link
          href="/estimate"
          className="mt-6 inline-flex min-h-14 items-center gap-2 rounded-[var(--radius-field)] bg-route px-7 font-[family-name:var(--font-display)] font-bold text-white no-underline shadow-[var(--shadow-lift)] hover:bg-route-hover"
        >
          {t('rates.cta')}
          <ArrowRight size={20} aria-hidden />
        </Link>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-4 text-[1.5rem] leading-tight font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

function Rates({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-line border-y border-line">{children}</dl>;
}

function Rate({ term, value }: { term: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[1fr_1.1fr] sm:gap-6">
      <dt className="font-semibold first-letter:uppercase">{term}</dt>
      <dd className="tabular m-0 text-ink-muted">{value}</dd>
    </div>
  );
}
