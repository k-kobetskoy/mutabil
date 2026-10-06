import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/** Redirects `/` to the best locale and maps localized pathnames (Next 16: proxy = former middleware). */
export default createMiddleware(routing);

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
