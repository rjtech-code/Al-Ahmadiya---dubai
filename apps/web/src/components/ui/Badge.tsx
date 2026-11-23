import type { ReactNode } from 'react';
import { cn } from './cn';

const tones = {
  gold: 'bg-gold-100 text-gold-700 ring-gold-200',
  brand: 'bg-brand-100 text-brand-800 ring-brand-100',
  muted: 'bg-cream-200 text-muted ring-line',
  success: 'bg-emerald-50 text-success ring-emerald-100',
  danger: 'bg-red-50 text-danger ring-red-100',
  warning: 'bg-amber-50 text-warning ring-amber-100',
} as const;

export function Badge({ children, tone = 'gold', className }: { children: ReactNode; tone?: keyof typeof tones; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', tones[tone], className)}>{children}</span>;
}
