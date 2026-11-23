import { getTranslations } from 'next-intl/server';
import { Clock, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './cn';

/** Small pill shown next to information that awaits official confirmation. */
export async function TbaBadge({ className }: { className?: string }) {
  const t = await getTranslations('tba');
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-cream-200 px-2.5 py-0.5 text-xs font-semibold text-muted ring-1 ring-inset ring-line', className)}>
      <Clock className="size-3" aria-hidden /> {t('badge')}
    </span>
  );
}

/** Empty / to-be-announced state for a whole section. Never invents content. */
export async function TbaPanel({ message, title, children, className, compact = false }: { message?: string; title?: string; children?: ReactNode; className?: string; compact?: boolean }) {
  const t = await getTranslations('tba');
  return (
    <div role="status" className={cn('pattern-cream flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-gold-400/60 text-center', compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-10', className)}>
      <span className="grid size-10 place-items-center rounded-full bg-white text-gold-600 shadow-sm"><Clock className="size-5" aria-hidden /></span>
      <p className="font-display text-lg font-semibold text-brand-900">{title ?? t('title')}</p>
      <p className="max-w-xl text-sm text-muted">{message ?? t('body')}</p>
      {children}
    </div>
  );
}

/** Explains that the university is proposed. */
export async function ProposedNotice({ className }: { className?: string }) {
  const t = await getTranslations('tba');
  return (
    <div className={cn('flex items-start gap-3 rounded-md border border-gold-200 bg-gold-100/60 px-4 py-3 text-sm text-brand-900', className)}>
      <Info className="mt-0.5 size-4 shrink-0 text-gold-700" aria-hidden />
      <p><strong className="font-semibold">{t('proposed')}.</strong> {t('proposedNote')}</p>
    </div>
  );
}
