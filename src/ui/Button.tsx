'use client';
import { Button as AriaButton, type ButtonProps } from 'react-aria-components';
import { cx } from './cx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'onNight' | 'link';
type Size = 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-field)] font-[family-name:var(--font-display)] font-bold tracking-[0.01em] transition-[background-color,color,box-shadow,transform] duration-150 ease-[var(--ease-out-expo)] select-none disabled:opacity-45 disabled:cursor-not-allowed data-[pressed]:translate-y-px cursor-pointer';
const variants: Record<Variant, string> = {
  primary: 'bg-route text-white hover:bg-route-hover shadow-[var(--shadow-lift)]',
  secondary: 'bg-paper text-ink border border-line-strong hover:border-ink',
  ghost: 'text-ink hover:bg-route-soft',
  onNight: 'bg-white/10 text-white border border-white/25 hover:bg-white/18',
  link: 'text-route underline underline-offset-4 hover:text-route-hover px-0 min-h-0',
};
const sizes: Record<Size, string> = { md: 'min-h-12 px-5 text-[0.95rem]', lg: 'min-h-14 px-7 text-[1.05rem]' };

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps & { variant?: Variant; size?: Size; className?: string }) {
  return <AriaButton {...props} className={cx(base, variants[variant], variant !== 'link' && sizes[size], className)} />;
}
