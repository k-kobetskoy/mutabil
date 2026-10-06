import { getLocale, getTranslations } from 'next-intl/server';
import { Check, Minus } from 'lucide-react';
import { getConfig } from '@/config';
import { SiteHeader } from '@/features/shell/SiteHeader';
import { SiteFooter } from '@/features/shell/SiteFooter';
import { QuickSearch } from '@/features/landing/QuickSearch';
import { Link } from '@/i18n/navigation';
import { AssemblySketch, CrateSketch, MattressBagSketch, PackingSketch, WardrobeBoxSketch } from '@/ui/Sketch';

export default async function LandingPage() {
  const t = await getTranslations();
  const locale = (await getLocale()) as 'ro' | 'en';
  const cfg = getConfig();
  const P = cfg.pricing;
  const pct = (x: number) => Math.round(x * 100);

  const fares = [
    { id: 'estimate', name: t('landing.fares.estimate'), who: t('landing.fares.estimateFor') },
    { id: 'fixed', name: t('landing.fares.fixed'), who: t('landing.fares.fixedFor') },
    { id: 'complete', name: t('landing.fares.complete'), who: t('landing.fares.completeFor') },
  ];
  const rows: { label: string; cells: (string | boolean)[] }[] = [
    { label: t('landing.fares.rowPrice'), cells: [t('landing.fares.priceInterval'), t('landing.fares.priceCapRemote', { pct: pct(P.survey.remote.capTolerance) }), t('landing.fares.priceCapOnsite', { pct: pct(P.survey.onsite.capTolerance) })] },
    { label: t('landing.fares.rowSurvey'), cells: [t('landing.fares.surveyNone'), t('landing.fares.surveyRemote'), t('landing.fares.surveyOnsite')] },
    { label: t('landing.fares.rowProtection'), cells: [t('landing.fares.protectionBasic'), t('landing.fares.protectionBasic'), t('landing.fares.protectionFull')] },
    { label: t('landing.fares.rowCrates'), cells: [false, t('landing.fares.cratesOptional'), t('landing.fares.cratesIncluded')] },
  ];

  const extras = [
    { id: 'crates', Sketch: CrateSketch, title: t('landing.extras.crates'), text: t('landing.extras.cratesText', { before: P.crates.deliveryDaysBeforeMove, after: P.crates.includedDays }), price: t('landing.extras.cratesPrice', { rate: P.crates.perCrateIncludedLei, days: P.crates.includedDays, extra: P.crates.extraPerCratePerDayLei }) },
    { id: 'wardrobe', Sketch: WardrobeBoxSketch, title: t('landing.extras.wardrobe'), text: t('landing.extras.wardrobeText'), price: t('landing.extras.wardrobePrice', { rate: P.materials.wardrobeBoxRentalLei }) },
    { id: 'mattress', Sketch: MattressBagSketch, title: t('landing.extras.mattress'), text: t('landing.extras.mattressText'), price: t('landing.extras.mattressPrice', { single: P.materials.mattressBagSingleLei, double: P.materials.mattressBagDoubleLei }) },
    { id: 'assembly', Sketch: AssemblySketch, title: t('landing.extras.assembly'), text: t('landing.extras.assemblyText'), price: t('landing.extras.assemblyPrice', { bed: P.assembly.perClassLei.bed, wardrobe: P.assembly.perClassLei.wardrobeLarge }) },
    { id: 'packing', Sketch: PackingSketch, title: t('landing.extras.packing'), text: t('landing.extras.packingText'), price: t('landing.extras.packingPrice', { rate: P.packing.perBoxLei }) },
  ];

  const journey = [
    { day: '', title: t('landing.journey.request'), text: t('landing.journey.requestText') },
    { day: '', title: t('landing.journey.survey'), text: t('landing.journey.surveyText') },
    { day: t('landing.journey.dayBefore', { n: P.crates.deliveryDaysBeforeMove }), title: t('landing.journey.crates'), text: t('landing.journey.cratesText') },
    { day: t('landing.journey.day'), title: t('landing.journey.move'), text: t('landing.journey.moveText') },
    { day: t('landing.journey.dayAfter', { n: P.crates.includedDays }), title: t('landing.journey.pickup'), text: t('landing.journey.pickupText') },
  ];

  const faq = [1, 2, 3, 4, 5, 6].map((n) => ({ q: t(`landing.faq.q${n}`), a: t(`landing.faq.a${n}`) }));
  const vehicles = cfg.vehicles.vehicles.filter((v) => v.enabled);

  return (
    <>
      <SiteHeader />
      <main id="main">
        {/* Hero: the route search is the first thing, in working form */}
        <section className="mx-auto max-w-6xl px-4 pt-6 pb-14 sm:px-6 sm:pt-10">
          <h1 className="max-w-[16ch] text-[clamp(2.4rem,7vw,4.6rem)] leading-[0.98] font-extrabold [font-stretch:108%]">{t('landing.title')}</h1>
          <p className="mt-4 mb-8 max-w-[52ch] text-[1.1rem] text-ink-muted sm:text-[1.2rem]">{t('landing.lead')}</p>
          <QuickSearch />
        </section>

        {/* Fares */}
        <section id="tarife" aria-labelledby="fares-title" className="border-y border-line bg-paper">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 id="fares-title" className="max-w-[24ch] text-[clamp(1.7rem,4vw,2.6rem)] leading-tight font-extrabold">
              {t('landing.fares.title')}
            </h2>
            <p className="mt-3 max-w-[60ch] text-ink-muted">{t('landing.fares.lead')}</p>
            <div className="mt-8 overflow-hidden rounded-[var(--radius-panel)] border border-line">
              <table className="w-full table-fixed border-collapse text-left">
                <caption className="sr-only">{t('landing.fares.title')}</caption>
                <thead>
                  <tr className="bg-night text-white">
                    <td className="hidden w-[22%] md:table-cell" />
                    {fares.map((f) => (
                      <th key={f.id} scope="col" className="px-3 py-4 align-top sm:px-5">
                        <span className="code-wide block text-[0.9rem] sm:text-[1.05rem]">{f.name}</span>
                        <span className="mt-1 hidden text-[0.85rem] font-normal text-on-night-muted sm:block">{f.who}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <FareRow key={r.label} label={r.label} cells={r.cells} />
                  ))}
                  <tr className="border-t border-line bg-ok-soft">
                    <td colSpan={4} className="px-3 py-3 text-[0.92rem] text-ok-ink sm:px-5">
                      <Check size={16} aria-hidden className="mr-1.5 inline align-[-3px]" />
                      {t('landing.fares.includedAll')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Extras (baggage) */}
        <section id="bagaje" aria-labelledby="extras-title" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 id="extras-title" className="text-[clamp(1.7rem,4vw,2.6rem)] leading-tight font-extrabold">
            {t('landing.extras.title')}
          </h2>
          <p className="mt-3 max-w-[60ch] text-ink-muted">{t('landing.extras.lead')}</p>
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {extras.map(({ id, Sketch, title, text, price }) => (
              <li key={id} className="grid grid-cols-[88px_1fr] items-center gap-4 py-5 sm:grid-cols-[140px_1fr_auto] sm:gap-8">
                <figure className="m-0 text-ink">
                  <Sketch title={title} />
                  <figcaption className="text-center text-[0.68rem] text-ink-muted">{t('common.sketch')}</figcaption>
                </figure>
                <div>
                  <h3 className="text-[1.15rem] font-extrabold">{title}</h3>
                  <p className="mt-1 max-w-[56ch] text-ink-muted">{text}</p>
                  <p className="tabular mt-2 font-semibold sm:hidden">{price}</p>
                </div>
                <p className="tabular hidden text-right font-[family-name:var(--font-display)] font-bold sm:block">{price}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Journey */}
        <section id="cum" aria-labelledby="journey-title" className="on-night bg-night text-on-night">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 id="journey-title" className="text-[clamp(1.7rem,4vw,2.6rem)] font-extrabold">
              {t('landing.journey.title')}
            </h2>
            <ol className="relative mt-10 grid gap-8 md:grid-cols-5 md:gap-4">
              <span aria-hidden className="absolute top-[11px] bottom-2 left-[11px] border-l-2 border-dashed border-white/30 md:top-[11px] md:right-6 md:bottom-auto md:left-6 md:border-t-2 md:border-l-0" />
              {journey.map((j, i) => (
                <li key={i} className="relative grid grid-cols-[24px_1fr] gap-4 md:grid-cols-1 md:gap-3">
                  <span aria-hidden className={`relative z-10 size-6 rounded-full border-2 ${i === 3 ? 'border-amber bg-amber' : 'border-white bg-night'}`} />
                  <div>
                    {j.day && <span className="code-wide text-[0.8rem] text-amber">{j.day}</span>}
                    <h3 className="text-[1.1rem] font-extrabold">{j.title}</h3>
                    <p className="mt-1 text-[0.95rem] text-on-night-muted">{j.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* How we calculate (public rates = honest trust) */}
        <section id="calcul" aria-labelledby="rules-title" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="grid gap-8 md:grid-cols-[1fr_1.3fr]">
            <div>
              <h2 id="rules-title" className="text-[clamp(1.7rem,4vw,2.6rem)] font-extrabold">
                {t('landing.rules.title')}
              </h2>
              <p className="mt-3 text-ink-muted">{t('landing.rules.lead')}</p>
              <p className="mt-4 text-[0.9rem] text-ink-muted">{t('landing.rules.note')}</p>
            </div>
            <dl className="divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-paper">
              <RateRow term={t('landing.rules.mover')} value={`${P.crew.moverHourlyLei} lei ${t('common.perHour')}`} />
              {vehicles.map((v) => (
                <RateRow key={v.id} term={t('landing.rules.vehicle', { name: t(`vehicles.${v.id}`) })} value={`${v.hourlyLei} lei ${t('common.perHour')}`} />
              ))}
              <RateRow term={t('landing.rules.overtime')} value={t('landing.rules.overtimeText')} />
              <RateRow term={t('landing.rules.minimum')} value={t('landing.rules.minimumText', { min: P.minimumOrderLei, hours: P.billing.minimumBillableH })} />
              <RateRow
                term={t('landing.rules.cap')}
                value={t('landing.rules.capText', { remote: pct(P.survey.remote.capTolerance), onsite: pct(P.survey.onsite.capTolerance) })}
                promise
              />
            </dl>
          </div>
        </section>

        {/* FAQ: what happens if… */}
        <section id="intrebari" aria-labelledby="faq-title" className="border-t border-line bg-paper">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
            <h2 id="faq-title" className="text-[clamp(1.7rem,4vw,2.6rem)] font-extrabold">
              {t('landing.faq.title')}
            </h2>
            <div className="mt-6 divide-y divide-line border-y border-line">
              {faq.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-[family-name:var(--font-display)] text-[1.08rem] font-bold">
                    {f.q}
                    <Minus size={18} aria-hidden className="shrink-0 rotate-90 transition-transform group-open:rotate-0" />
                  </summary>
                  <p className="mt-2 max-w-[62ch] text-ink-muted">{f.a}</p>
                </details>
              ))}
            </div>
            <Link
              href="/estimate"
              className="mt-10 inline-flex min-h-14 items-center rounded-[var(--radius-field)] bg-route px-7 font-[family-name:var(--font-display)] font-bold text-white no-underline shadow-[var(--shadow-lift)] hover:bg-route-hover"
            >
              {t('nav.start')}
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}

function FareRow({ label, cells }: { label: string; cells: (string | boolean)[] }) {
  return (
    <>
      <tr aria-hidden className="border-t border-line md:hidden">
        <td colSpan={3} className="label-cap px-3 pt-3 text-ink-muted">
          {label}
        </td>
      </tr>
      <tr className="md:border-t md:border-line">
        <th scope="row" className="sr-only px-5 py-4 text-[0.95rem] font-semibold md:not-sr-only md:table-cell">
          {label}
        </th>
        {cells.map((c, i) => (
          <td key={i} className="px-3 pt-1 pb-3 font-[family-name:var(--font-display)] text-[0.95rem] font-bold md:px-5 md:py-4">
            {c === false ? <Minus size={16} aria-label="—" className="text-ink-muted" /> : c}
          </td>
        ))}
      </tr>
    </>
  );
}

function RateRow({ term, value, promise }: { term: string; value: string; promise?: boolean }) {
  return (
    <div className="grid gap-1 px-5 py-4 sm:grid-cols-[1fr_1.2fr] sm:gap-6">
      <dt className="font-semibold">{term}</dt>
      <dd className={`tabular m-0 ${promise ? 'rounded-md bg-amber-soft px-2 py-1 text-ink' : 'text-ink-muted'}`}>{value}</dd>
    </div>
  );
}
