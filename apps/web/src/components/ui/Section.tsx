import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import { cn } from './cn';
import { FadeUp } from '../motion';
import { SectionArt } from '../motion/Illustrations';

export function Section({ children, className, tone = 'plain', id, labelledBy }: { children: ReactNode; className?: string; tone?: 'plain' | 'white' | 'cream' | 'brand'; id?: string; labelledBy?: string }) {
  const tones = { plain: '', white: 'bg-cream-50/70', cream: 'pattern-cream', brand: 'pattern-girih text-white' };
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn('relative isolate py-12 sm:py-16', tones[tone], className)}>
      <SectionArt variant={[...(id ?? labelledBy ?? '')].reduce((h, ch) => h + ch.charCodeAt(0), 0)} dark={tone === 'brand'} />
      <FadeUp className="container-site relative z-10" y={36}>{children}</FadeUp>
    </section>
  );
}

export function SectionHeading({
  id, title, eyebrow, subtitle, action, light = false, center = false,
}: { id?: string; title: string; eyebrow?: string; subtitle?: string; action?: { href: string; label: string }; light?: boolean; center?: boolean }) {
  return (
    <div className={cn('mb-10 flex gap-4', center ? 'flex-col items-center text-center' : 'flex-wrap items-end justify-between')}>
      <div className={cn(center && 'flex flex-col items-center')}>
        <span className="gold-rule mb-4 !w-20 !h-0.5" aria-hidden />
        {eyebrow && <p className={cn('mb-2 text-xs font-semibold uppercase tracking-widest', light ? 'text-gold-400' : 'text-gold-700')}>{eyebrow}</p>}
        <h2 id={id} className={cn('font-display text-3xl font-semibold leading-tight sm:text-[2.6rem]', light ? 'text-white' : 'text-brand-900')}>{title}</h2>
        {subtitle && <p className={cn('mt-3 max-w-2xl text-sm sm:text-base', light ? 'text-white/75' : 'text-muted')}>{subtitle}</p>}
      </div>
      {action && (
        <Link href={action.href} className={cn('inline-flex items-center gap-1 text-sm font-semibold hover:underline', light ? 'text-gold-400' : 'text-brand-700')}>
          {action.label} <ArrowRight className="flip-rtl size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
