'use client';
/**
 * Send the request (R6): contact, optional exact addresses, one comment, two separate consents
 * (understanding the price terms is required, marketing is optional and unticked). The mock
 * service recomputes the estimate as the server will.
 */
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Form } from 'react-aria-components';
import type { Contact, OrderRequest, SubmitResult } from '@/contract/api';
import { Link } from '@/i18n/navigation';
import { leiRange, type AppLocale } from '@/lib/format';
import { ValidationProblem } from '@/services/types';
import { useOrderStore } from '@/state/order-store';
import { useMediaStore, usePrivateStore } from '@/state/private-store';
import { Button } from '@/ui/Button';
import { ChoiceTiles } from '@/ui/ChoiceTiles';
import { Checkbox, TextInput } from '@/ui/Fields';
import { BoardingPass } from './BoardingPass';
import { useEstimate, useServices } from './providers';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function ContactScreen() {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const { orders } = useServices();
  const hydrated = useOrderStore((s) => s.hydrated);
  const order = useOrderStore((s) => s.order);
  const resetOrder = useOrderStore((s) => s.reset);
  const est = useEstimate();
  const p = usePrivateStore();
  const media = useMediaStore((s) => s.items);
  const generalNote = useMediaStore((s) => s.generalNote);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<SubmitResult | null>(null);

  if (!hydrated) return <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-busy="true" />;

  if (done) {
    return (
      <main id="main" className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <CheckCircle2 size={44} aria-hidden className="text-ok" />
        <h1 className="mt-4 text-[2.2rem] font-extrabold">{t('contact.successTitle')}</h1>
        <p className="mt-2 text-[1.05rem]">{t('contact.successText', { id: done.requestId })}</p>
        {done.tasks.length > 0 && (
          <>
            <p className="mt-6 font-semibold">{t('contact.successTasks')}</p>
            <ul className="mt-2 list-disc pl-5">
              {done.tasks.map((c) => (
                <li key={c}>{t.has(`tasks.${c}`) ? t(`tasks.${c}`) : c}</li>
              ))}
            </ul>
          </>
        )}
        <Button
          className="mt-8"
          variant="secondary"
          onPress={() => {
            resetOrder('detailed');
            p.clear();
            setDone(null);
          }}
        >
          {t('contact.newEstimate')}
        </Button>
      </main>
    );
  }

  if (!est) {
    return (
      <main id="main" className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <p>{t('estimate.empty')}</p>
        <Link href="/estimate" className="mt-4 inline-block font-semibold text-route underline">
          {t('estimate.emptyCta')}
        </Link>
      </main>
    );
  }

  const c = p.contact;
  const check = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!c.name?.trim()) e.name = 'validation.contact.name';
    if (!c.phone?.trim() && !c.email?.trim()) e.phone = 'validation.contact.phoneOrEmail';
    if (c.email?.trim() && !EMAIL.test(c.email.trim())) e.email = 'validation.contact.email';
    if (!p.estimateTerms) e.terms = 'validation.terms';
    return e;
  };

  const submit = async () => {
    const e = check();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSending(true);
    const contact: Contact = {
      name: c.name!.trim(),
      ...(c.phone?.trim() ? { phone: c.phone.trim() } : {}),
      ...(c.email?.trim() ? { email: c.email.trim() } : {}),
      ...(c.channel ? { channel: c.channel } : {}),
    };
    const comment = [generalNote.trim(), p.comment.trim()].filter(Boolean).join('\n\n');
    const req: OrderRequest = {
      order,
      contact,
      addresses: { ...(p.addresses.from ? { from: p.addresses.from } : {}), ...(p.addresses.to ? { to: p.addresses.to } : {}) },
      ...(comment ? { comment: comment.slice(0, 2000) } : {}),
      ...(media.length ? { media: media.slice(0, 30).map((m) => ({ id: m.id, kind: m.kind, ...(m.annotation ? { annotation: m.annotation } : {}) })) } : {}),
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
      <Link href="/estimate/result" className="inline-flex min-h-11 items-center gap-2 font-[family-name:var(--font-display)] font-bold text-ink no-underline">
        <ArrowLeft size={18} aria-hidden /> {t('flow.toResult')}
      </Link>
      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div>
          <h1 className="text-[clamp(2rem,5vw,2.6rem)] leading-[1.05] font-extrabold">{t('contact.title')}</h1>
          <p className="mt-2 text-ink-muted">{t('contact.lead')}</p>
          {errList.length > 0 && (
            <div role="alert" className="mt-5 rounded-[var(--radius-field)] border-l-4 border-error bg-paper px-4 py-3">
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
            <TextInput label={t('contact.name')} value={c.name} onChange={(name) => p.setContact({ name })} autoComplete="name" isRequired isInvalid={!!errors.name} errorMessage={errors.name && t(errors.name)} />
            <div className="grid gap-6 sm:grid-cols-2">
              <TextInput label={t('contact.phone')} type="tel" inputMode="tel" value={c.phone} onChange={(phone) => p.setContact({ phone })} autoComplete="tel" isInvalid={!!errors.phone} errorMessage={errors.phone && t(errors.phone)} />
              <TextInput label={t('contact.email')} type="email" inputMode="email" value={c.email} onChange={(email) => p.setContact({ email })} autoComplete="email" isInvalid={!!errors.email} errorMessage={errors.email && t(errors.email)} />
            </div>
            <ChoiceTiles
              label={t('contact.channel')}
              value={c.channel}
              onChange={(channel) => p.setContact({ channel })}
              columns={3}
              size="sm"
              tiles={(['phone', 'whatsapp', 'email'] as const).map((v) => ({ value: v, label: t(`contact.channels.${v}`) }))}
            />
            <TextInput label={t('contact.comment')} value={p.comment} onChange={p.setComment} multiline description={t('contact.commentHint')} />
            <div className="flex flex-col gap-4 rounded-[var(--radius-panel)] border border-line bg-paper p-5">
              <Checkbox isSelected={p.estimateTerms} onChange={(v) => p.setConsent('estimateTerms', v)} isInvalid={!!errors.terms}>
                {t('contact.estimateTerms')}
              </Checkbox>
              <Checkbox isSelected={p.marketing} onChange={(v) => p.setConsent('marketing', v)}>
                {t('contact.marketing')} <span className="text-ink-muted">({t('common.optional')})</span>
              </Checkbox>
              <p className="text-[0.85rem] text-ink-muted">{t('contact.privacy')}</p>
            </div>
            <Button type="submit" size="lg" isDisabled={sending} className="self-start max-sm:w-full">
              {sending ? t('contact.sending') : t('contact.submit')}
            </Button>
          </Form>
        </div>
        <aside aria-label={t('contact.summary')} className="flex flex-col gap-3 lg:sticky lg:top-6">
          <p className="label-cap text-ink-muted">{t('contact.summary')}</p>
          <BoardingPass order={order} est={est} compact />
          <p className="text-[0.9rem] text-ink-muted">
            {t('media.photos', { count: media.filter((m) => m.kind === 'photo').length })} · {t('media.videos', { count: media.filter((m) => m.kind === 'video').length })} · {leiRange(est.price.low, est.price.high, locale)}
          </p>
        </aside>
      </div>
    </main>
  );
}
