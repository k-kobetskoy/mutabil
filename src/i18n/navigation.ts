import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/** Locale-aware Link / router (Angular analogy: routerLink + Router with the locale baked in). */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
