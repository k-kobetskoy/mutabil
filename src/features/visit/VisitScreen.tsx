'use client';
/**
 * "Ne ocupăm de tot" (decisions D31): a short request for a specialist visit instead of the
 * configurator. Route, home size, a rough date and contacts; we call back, the specialist sets
 * a fixed price on site. Sent through the same OrderService with `service: 'full'`.
 */
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Form } from 'react-aria-components';
import { ArrowRight, Check, CheckCircle2 } from 'lucide-react';
import type { Contact, OrderRequest, SubmitResult } from '@/contract/api';
import type { OrderInput } from '@/contract/order';
import { fullServiceFrom } from '@/domain/fullService';
import { Link } from '@/i18n/navigation';
import { lei, type AppLocale } from '@/lib/format';
import { ValidationProblem } from '@/services/types';
import { usePrivateStore } from '@/state/private-store';
import { Button } from '@/ui/Button';
import { Checkbox, TextInput } from '@/ui/Fields';
import { SelectField } from '@/ui/SelectField';
import { useCfg, useServices } from '../configurator/providers';
import { todayIso } from '../configurator/StepScreen';
import { zoneGroups } from '../configurator/useRoute';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INCLUDED = ['full1', 'full2', 'full3', 'full4', 'full5'] as const;

export function VisitScreen() {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const cfg = useCfg();
  const { orders } = useServices();
  const p = usePrivateStore();
  const [fromZone, setFromZone] = useState<string>();
  const [toZone, setToZone] = useState<string>();
  const [size, setSize] = useState<string>();
  const [date, setDate] = useState('');
  const [cleaning, setCleaning] = useState(false);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<SubmitResult | null>(null);

  const presets = cfg.catalog.presets.filter((x) => x.id !== 'birou-per-post');
  const sizeGroups = [{ options: presets.map((x) => ({ id: x.id, label: x.id === 'casa' ? t('visit.house') : x.name[locale] })) }];
  const zones = zoneGroups(locale, t);
  const guide = size && cfg.pricing.fullService.presets.includes(size) ? fullServiceFrom(size, cfg) : null;
  const sizeName = presets.find((x) => x.id === size)?.name[locale];
  const c = p.contact;

  if (done) {
    return (
      <main id="main" className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <CheckCircle2 size={44} aria-hidden className="text-ok" />
        <h1 className="mt-4 text-[2.2rem] leading-tight font-extrabold">{t('visit.successTitle')}</h1>
        <p className="mt-2 text-[1.05rem]">{t('visit.successText', { id: done.requestId })}</p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-12 items-center rounded-[var(--radius-field)] border border-line-strong bg-paper px-5 font-[family-name:var(--font-display)] font-bold text-ink no-underline hover:border-ink"
        >
          {t('visit.home')}
        </Link>
      </main>
    );
  }

  const check = () => {
    const e: Record<string, string> = {};
    if (!fromZone || !toZone) e.zone = 'validation.zone.required';
    if (!size) e.size = 'validation.visit.size';
    if (date && date < todayIso()) e.date = 'validation.visit.datePast';
    if (!c.name?.trim()) e.name = 'validation.contact.name';
    if (!c.phone?.trim() && !c.email?.trim()) e.phone = 'validation.contact.phoneOrEmail';
    if (c.email?.trim() && !EMAIL.test(c.email.trim())) e.email = 'validation.contact.email';
    if (!terms) e.terms = 'validation.terms';
    return e;
  };

  const submit = async () => {
    const e = check();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSending(true);
    const order: OrderInput = {
      v: 1,
      mode: 'detailed',
      service: 'full',
      taskType: size === 'casa' ? 'house' : 'apartment',
      size: { presetId: size },
      from: { zoneId: fromZone },
      to: { zoneId: toZone },
      inventory: { mode: 'atSurvey' },
      packing: { who: 'full', containers: 'crates' },
      survey: { method: 'onsite' },
      ...(date ? { schedule: { date } } : {}),
    };
    const contact: Contact = {
      name: c.name!.trim(),
      ...(c.phone?.trim() ? { phone: c.phone.trim() } : {}),
      ...(c.email?.trim() ? { email: c.email.trim() } : {}),
    };
    const comment = [cleaning ? t('visit.cleaningNote') : '', p.comment.trim()].filter(Boolean).join('\n\n');
    const req: OrderRequest = {
      order,
      contact,
      addresses: {},
      ...(comment ? { comment: comment.slice(0, 2000) } : {}),
      consents: { estimateTerms: true, marketing: p.marketing },
      locale,
    };
    try {
      setDone(await orders.submitOrder(req));
    } catch (err) {
      if (err instanceof ValidationProblem) setErrors(Object.fromEntries(err.errors.map((x) => [x.path.replace(/^contact\./, ''), x.key])));
      else setErrors({ form: 'contact.failed' });
    } finally {
      setSending(false);
    }
  };

  const errList = [...new Set(Object.values(errors))];

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 pt-6 pb-20 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div>
          <h1 className="text-[clamp(2rem,5vw,2.8rem)] leading-[1.05] font-extrabold">{t('visit.title')}</h1>
          <p className="mt-3 max-w-[58ch] text-[1.05rem] text-ink-muted">{t('visit.lead')}</p>
          {errList.length > 0 && (
            <div role="alert" className="mt-5 rounded-[var(--radius-field)] border border-error bg-paper px-4 py-3">
              <ul className="list-disc pl-5">
                {errList.map((k) => (
                  <li key={k}>{t(k)}</li>
                ))}
              </ul>
            </div>
          )}
          <Form
            className="mt-7 flex flex-col gap-6"
            validationBehavior="aria"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <SelectField
                label={t('visit.from')}
                value={fromZone}
                onChange={setFromZone}
                groups={zones}
                placeholder={t('steps.access.zonePlaceholder')}
                isInvalid={!!errors.zone && !fromZone}
                errorMessage={errors.zone && !fromZone ? t(errors.zone) : undefined}
              />
              <SelectField
                label={t('visit.to')}
                value={toZone}
                onChange={setToZone}
                groups={zones}
                placeholder={t('steps.access.zonePlaceholder')}
                isInvalid={!!errors.zone && !toZone}
                errorMessage={errors.zone && !toZone ? t(errors.zone) : undefined}
              />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <SelectField
                label={t('visit.size')}
                value={size}
                onChange={setSize}
                groups={sizeGroups}
                placeholder={t('steps.access.zonePlaceholder')}
                isInvalid={!!errors.size}
                errorMessage={errors.size && t(errors.size)}
              />
              <TextInput
                label={t('visit.date')}
                type="date"
                value={date}
                onChange={setDate}
                description={t('visit.dateHint')}
                isInvalid={!!errors.date}
                errorMessage={errors.date && t(errors.date)}
              />
            </div>
            <Checkbox isSelected={cleaning} onChange={setCleaning}>
              {t('visit.cleaning')}
            </Checkbox>
            <TextInput
              label={t('contact.name')}
              value={c.name}
              onChange={(name) => p.setContact({ name })}
              autoComplete="name"
              isRequired
              isInvalid={!!errors.name}
              errorMessage={errors.name && t(errors.name)}
            />
            <div className="grid gap-6 sm:grid-cols-2">
              <TextInput
                label={t('contact.phone')}
                type="tel"
                inputMode="tel"
                value={c.phone}
                onChange={(phone) => p.setContact({ phone })}
                autoComplete="tel"
                isInvalid={!!errors.phone}
                errorMessage={errors.phone && t(errors.phone)}
              />
              <TextInput
                label={t('contact.email')}
                type="email"
                inputMode="email"
                value={c.email}
                onChange={(email) => p.setContact({ email })}
                autoComplete="email"
                isInvalid={!!errors.email}
                errorMessage={errors.email && t(errors.email)}
              />
            </div>
            <TextInput label={t('contact.comment')} value={p.comment} onChange={p.setComment} multiline />
            <div className="flex flex-col gap-4 rounded-[var(--radius-panel)] border border-line bg-paper p-5">
              <Checkbox isSelected={terms} onChange={setTerms} isInvalid={!!errors.terms}>
                {t('visit.terms')}
              </Checkbox>
              <Checkbox isSelected={p.marketing} onChange={(v) => p.setConsent('marketing', v)}>
                {t('contact.marketing')} <span className="text-ink-muted">({t('common.optional')})</span>
              </Checkbox>
              <p className="text-[0.85rem] text-ink-muted">{t('contact.privacy')}</p>
            </div>
            <Button type="submit" size="lg" isDisabled={sending} className="self-start max-sm:w-full">
              {sending ? t('contact.sending') : t('visit.submit')}
            </Button>
          </Form>
        </div>

        <aside
          aria-labelledby="visit-included"
          className="on-night rounded-[var(--radius-panel)] bg-night p-6 text-on-night lg:sticky lg:top-6"
        >
          <h2 id="visit-included" className="text-[1.25rem] font-extrabold">
            {t('visit.asideTitle')}
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {INCLUDED.map((k) => (
              <li key={k} className="flex items-start gap-2.5">
                <Check size={18} aria-hidden className="mt-0.5 shrink-0 text-white" />
                {t(`landing.ways.${k}`)}
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-white/15 pt-4 text-[0.95rem] text-on-night-muted">{t('visit.visitFree')}</p>
          {guide !== null && sizeName && (
            <p aria-live="polite" className="tabular mt-3 font-[family-name:var(--font-display)] text-[1.05rem] font-bold text-white">
              {t('visit.fromPrice', { size: sizeName.toLowerCase(), price: lei(guide, locale) })}
            </p>
          )}
          <p className="mt-6 text-[0.92rem] text-on-night-muted">{t('visit.flexible')}</p>
          <Link
            href="/estimate"
            className="mt-1 inline-flex min-h-10 items-center gap-1.5 font-semibold text-white underline decoration-white/45 underline-offset-4"
          >
            {t('visit.flexibleCta')}
            <ArrowRight size={16} aria-hidden />
          </Link>
        </aside>
      </div>
    </main>
  );
}
