/**
 * The landing sells the service (decisions D30): the working quick estimate first, then what you
 * get, how we take care of the home, two ways to order, how the move goes and the FAQ. Rates and
 * per-item prices live on /rates (D33); nothing here asks for money before showing value.
 */
import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowRight, Boxes, Check, DoorOpen, Layers, Plus, Sofa, Truck, Wrench } from 'lucide-react';
import { getConfig } from '@/config';
import { fullServiceFrom } from '@/domain/fullService';
import { SiteHeader } from '@/features/shell/SiteHeader';
import { SiteFooter } from '@/features/shell/SiteFooter';
import { QuickSearch } from '@/features/landing/QuickSearch';
import { Link } from '@/i18n/navigation';
import { lei } from '@/lib/format';
import { cx } from '@/ui/cx';
import { AssemblySketch, CrateSketch, MattressBagSketch, PackingSketch, VisitSketch, WardrobeBoxSketch } from '@/ui/Sketch';

const H2 = 'text-[clamp(1.8rem,4.2vw,2.7rem)] leading-[1.05] font-extrabold';
const CTA =
  'inline-flex min-h-14 items-center gap-2 rounded-[var(--radius-field)] bg-route px-7 font-[family-name:var(--font-display)] font-bold text-white no-underline shadow-[var(--shadow-lift)] hover:bg-route-hover';

export default async function LandingPage() {
  const t = await getTranslations();
  const locale = (await getLocale()) as 'ro' | 'en';
  const cfg = getConfig();
  const P = cfg.pricing;

  const gets = [
    {
      id: 'crates',
      Sketch: CrateSketch,
      text: t('landing.gets.cratesText', { before: P.crates.deliveryDaysBeforeMove, after: P.crates.includedDays }),
    },
    { id: 'wardrobe', Sketch: WardrobeBoxSketch, text: t('landing.gets.wardrobeText') },
    { id: 'mattress', Sketch: MattressBagSketch, text: t('landing.gets.mattressText') },
    { id: 'assembly', Sketch: AssemblySketch, text: t('landing.gets.assemblyText') },
    { id: 'packing', Sketch: PackingSketch, text: t('landing.gets.packingText') },
    { id: 'visit', Sketch: VisitSketch, text: t('landing.gets.visitText') },
  ] as const;

  const care = [
    { id: 'floor', Icon: Layers },
    { id: 'doors', Icon: DoorOpen },
    { id: 'furniture', Icon: Sofa },
    { id: 'crates', Icon: Boxes },
    { id: 'van', Icon: Truck },
    { id: 'crew', Icon: Wrench },
  ] as const;

  const guides = P.fullService.presets.map((id) => ({
    id,
    name: cfg.catalog.presets.find((p) => p.id === id)?.name[locale] ?? id,
    price: lei(fullServiceFrom(id, cfg), locale),
  }));

  const journey = [
    { day: '', title: t('landing.journey.request'), text: t('landing.journey.requestText') },
    { day: '', title: t('landing.journey.survey'), text: t('landing.journey.surveyText') },
    {
      day: t('landing.journey.dayBefore', { n: P.crates.deliveryDaysBeforeMove }),
      title: t('landing.journey.crates'),
      text: t('landing.journey.cratesText'),
    },
    { day: t('landing.journey.day'), title: t('landing.journey.move'), text: t('landing.journey.moveText') },
    {
      day: t('landing.journey.dayAfter', { n: P.crates.includedDays }),
      title: t('landing.journey.pickup'),
      text: t('landing.journey.pickupText'),
    },
  ];

  const faq = [1, 2, 3, 4, 5, 6].map((n) => ({ q: t(`landing.faq.q${n}`), a: t(`landing.faq.a${n}`) }));

  return (
    <>
      <SiteHeader />
      <main id="main">
        {/* Hero: the route search is the first thing, in working form */}
        <section className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
          <h1 className="max-w-[16ch] text-[clamp(2.4rem,7vw,4.6rem)] leading-[0.98] font-extrabold [font-stretch:108%]">
            {t('landing.title')}
          </h1>
          <p className="mt-4 mb-8 max-w-[52ch] text-[1.1rem] text-ink-muted sm:text-[1.2rem]">{t('landing.lead')}</p>
          <QuickSearch />
        </section>

        {/* What you get: advantages, not a price list (D32) */}
        <section id="ce-primesti" aria-labelledby="gets-title" className="scroll-mt-4 border-y border-line bg-paper">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 id="gets-title" className={H2}>
              {t('landing.gets.title')}
            </h2>
            <p className="mt-3 max-w-[56ch] text-[1.05rem] text-ink-muted">{t('landing.gets.lead')}</p>
            <ul className="mt-10 grid gap-x-12 md:grid-cols-2">
              {gets.map(({ id, Sketch, text }) => (
                <li key={id} className="grid grid-cols-[84px_1fr] items-start gap-5 border-t border-line py-6 sm:grid-cols-[112px_1fr]">
                  <Sketch title="" className="text-ink" />
                  <div>
                    <h3 className="text-[1.2rem] leading-tight font-extrabold">{t(`landing.gets.${id}`)}</h3>
                    <p className="mt-1.5 max-w-[46ch] text-ink-muted">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/estimate" className={CTA}>
                {t('landing.gets.cta')}
                <ArrowRight size={20} aria-hidden />
              </Link>
              <Link href="/visit" className="font-semibold text-route underline underline-offset-4 hover:text-route-hover">
                {t('landing.ways.fullCta')}
              </Link>
            </div>
          </div>
        </section>

        {/* How we take care: photo slots until real photos arrive (D35) */}
        <section id="grija" aria-labelledby="care-title" className="mx-auto max-w-6xl scroll-mt-4 px-4 py-16 sm:px-6">
          <h2 id="care-title" className={cx(H2, 'max-w-[20ch]')}>
            {t('landing.care.title')}
          </h2>
          <p className="mt-3 max-w-[58ch] text-[1.05rem] text-ink-muted">{t('landing.care.lead')}</p>
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-3">
            {care.map(({ id, Icon }) => (
              <li key={id}>
                <figure className="m-0">
                  <div className="grid aspect-[4/3] place-items-center rounded-[var(--radius-field)] border border-dashed border-line-strong bg-paper text-line-strong">
                    <Icon size={40} strokeWidth={1.4} aria-hidden />
                  </div>
                  <figcaption className="mt-3">
                    <span className="block font-[family-name:var(--font-display)] text-[1.05rem] leading-tight font-bold">
                      {t(`landing.care.${id}`)}
                    </span>
                    <span className="mt-1 block text-[0.95rem] leading-snug text-ink-muted">{t(`landing.care.${id}Text`)}</span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-[0.9rem] text-ink-muted">{t('landing.care.note')}</p>
        </section>

        {/* Two ways to order instead of three fares (D31) */}
        <section id="moduri" aria-labelledby="ways-title" className="mx-auto max-w-6xl scroll-mt-4 px-4 pb-20 sm:px-6">
          <h2 id="ways-title" className={H2}>
            {t('landing.ways.title')}
          </h2>
          <p className="mt-3 max-w-[56ch] text-[1.05rem] text-ink-muted">{t('landing.ways.lead')}</p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <Way
              title={t('landing.ways.flexTitle')}
              who={t('landing.ways.flexWho')}
              items={[t('landing.ways.flex1'), t('landing.ways.flex2'), t('landing.ways.flex3')]}
              cta={
                <Link href="/estimate" className={CTA}>
                  {t('landing.ways.flexCta')}
                  <ArrowRight size={20} aria-hidden />
                </Link>
              }
            />
            <Way
              night
              title={t('landing.ways.fullTitle')}
              who={t('landing.ways.fullWho')}
              items={[
                t('landing.ways.full1'),
                t('landing.ways.full2'),
                t('landing.ways.full3'),
                t('landing.ways.full4'),
                t('landing.ways.full5'),
              ]}
              extra={
                <div className="mt-6 border-t border-white/15 pt-4">
                  <p className="label-cap text-on-night-muted">{t('landing.ways.fromTitle')}</p>
                  <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
                    {guides.map((g) => (
                      <div key={g.id} className="contents">
                        <dt className="text-on-night-muted first-letter:uppercase">{g.name}</dt>
                        <dd className="tabular m-0 text-right font-[family-name:var(--font-display)] font-bold text-white">
                          {t('landing.ways.from', { price: g.price })}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              }
              cta={
                <Link
                  href="/visit"
                  className="inline-flex min-h-14 items-center gap-2 rounded-[var(--radius-field)] bg-white px-7 font-[family-name:var(--font-display)] font-bold text-night no-underline hover:bg-cloud"
                >
                  {t('landing.ways.fullCta')}
                  <ArrowRight size={20} aria-hidden />
                </Link>
              }
            />
          </div>
        </section>

        {/* Journey */}
        <section id="cum" aria-labelledby="journey-title" className="on-night scroll-mt-4 bg-night text-on-night">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 id="journey-title" className={H2}>
              {t('landing.journey.title')}
            </h2>
            <ol className="relative mt-10 grid gap-8 md:grid-cols-5 md:gap-4">
              <span
                aria-hidden
                className="absolute top-[11px] bottom-2 left-[11px] border-l-2 border-dashed border-white/30 md:right-6 md:bottom-auto md:left-6 md:border-t-2 md:border-l-0"
              />
              {journey.map((j, i) => (
                <li key={i} className="relative grid content-start grid-cols-[24px_1fr] gap-4 md:grid-cols-1 md:gap-3">
                  <span
                    aria-hidden
                    className={cx(
                      'relative z-10 size-6 rounded-full border-2',
                      i === 3 ? 'border-amber bg-amber' : 'border-white bg-night',
                    )}
                  />
                  <div>
                    {/* the day line is always there, so every title sits on the same line */}
                    <span className={cx('block h-5 text-[0.82rem] leading-5 font-bold', i === 3 ? 'text-amber' : 'text-on-night-muted')}>
                      {j.day}
                    </span>
                    <h3 className="text-[1.1rem] font-extrabold">{j.title}</h3>
                    <p className="mt-1 text-[0.95rem] text-on-night-muted">{j.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ: what happens if… */}
        <section id="intrebari" aria-labelledby="faq-title" className="scroll-mt-4 bg-paper">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <h2 id="faq-title" className={H2}>
              {t('landing.faq.title')}
            </h2>
            <div className="mt-6 divide-y divide-line border-y border-line">
              {faq.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-[family-name:var(--font-display)] text-[1.08rem] font-bold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <Plus size={20} aria-hidden className="shrink-0 text-route transition-transform duration-200 group-open:rotate-45" />
                  </summary>
                  <p className="mt-2 max-w-[62ch] text-ink-muted">{f.a}</p>
                </details>
              ))}
            </div>
            <Link
              href="/rates"
              className="mt-6 inline-flex min-h-11 items-center gap-1.5 font-semibold text-route underline underline-offset-4 hover:text-route-hover"
            >
              {t('landing.faq.more')}
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </section>

        {/* Final call to action */}
        <section aria-labelledby="final-title" className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 id="final-title" className={H2}>
                {t('landing.final.title')}
              </h2>
              <p className="mt-3 text-[1.05rem] text-ink-muted">{t('landing.final.text')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/estimate" className={CTA}>
                {t('landing.ways.flexCta')}
                <ArrowRight size={20} aria-hidden />
              </Link>
              <Link href="/visit" className="font-semibold text-route underline underline-offset-4 hover:text-route-hover">
                {t('landing.ways.fullCta')}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}

function Way({
  title,
  who,
  items,
  cta,
  extra,
  night,
}: {
  title: string;
  who: string;
  items: string[];
  cta: ReactNode;
  extra?: ReactNode;
  night?: boolean;
}) {
  return (
    <article
      className={cx(
        'flex flex-col rounded-[var(--radius-panel)] p-6 sm:p-8',
        night ? 'on-night bg-night text-on-night shadow-[var(--shadow-panel)]' : 'border border-line bg-paper',
      )}
    >
      <h3 className="text-[1.6rem] leading-tight font-extrabold">{title}</h3>
      <p className={cx('mt-2', night ? 'text-on-night-muted' : 'text-ink-muted')}>{who}</p>
      <ul className="mt-6 flex flex-col gap-3">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2.5">
            <Check size={20} aria-hidden className={cx('mt-0.5 shrink-0', night ? 'text-white' : 'text-ok')} />
            {it}
          </li>
        ))}
      </ul>
      {extra}
      <div className="mt-auto pt-8">{cta}</div>
    </article>
  );
}
