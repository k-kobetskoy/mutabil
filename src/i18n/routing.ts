/**
 * Locales and localized pathnames (decisions D20). `/ro/estimare/acces` ↔ `/en/estimate/access`.
 * Step slugs live in config/steps.json; the `[step]` param is translated by the step pages.
 */
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ro', 'en'],
  defaultLocale: 'ro',
  localePrefix: 'always',
  localeCookie: false,
  pathnames: {
    '/': '/',
    '/estimate': { ro: '/estimare', en: '/estimate' },
    '/estimate/[step]': { ro: '/estimare/[step]', en: '/estimate/[step]' },
    '/estimate/result': { ro: '/estimare/rezultat', en: '/estimate/result' },
    '/estimate/contact': { ro: '/estimare/trimite', en: '/estimate/send' },
  },
});

export type Locale = (typeof routing.locales)[number];
