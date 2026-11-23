import { Link } from '@/i18n/navigation';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from './cn';

type Variant = 'gold' | 'brand' | 'outline' | 'outline-light' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-55 select-none';
const variants: Record<Variant, string> = {
  gold: 'bg-gold-400 text-brand-950 shadow-sm hover:bg-gold-300 hover:-translate-y-px hover:shadow-md',
  brand: 'bg-brand-900 text-white hover:bg-brand-800 hover:-translate-y-px hover:shadow-md',
  outline: 'border border-gold-400 bg-transparent text-brand-900 hover:bg-white',
  'outline-light': 'border border-white/40 text-white hover:bg-white/10 hover:border-white',
  ghost: 'text-brand-800 hover:text-gold-700',
};
const sizes: Record<Size, string> = { sm: 'h-9 px-4 text-sm', md: 'h-11 px-6 text-sm', lg: 'h-13 px-7 text-[15px]' };

export function buttonClass(variant: Variant = 'gold', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({ variant = 'gold', size = 'md', className, ...props }: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = 'gold', size = 'md', className, children, ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
