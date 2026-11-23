import { cn } from '../ui/cn';

/**
 * Temporary mark: a stylised arch with a wind-tower window — the architectural motif of the
 * 1912 Al Ahmadiya building and of the new design. Replace with the official logo once supplied.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('shrink-0', className)} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 42h36" />
        <path d="M10 42V22a14 14 0 0 1 28 0v20" />
        <path d="M16 42V24a8 8 0 0 1 16 0v18" />
        <path d="M21 42V28a3 3 0 0 1 6 0v14" />
        <path d="M24 4v4M20 8h8" />
      </g>
    </svg>
  );
}

export function Logo({ light = false, nameEn, line1, since, className, compact = false }: {
  light?: boolean; nameEn: string; nameAr?: string; line1: string; since: string; className?: string; compact?: boolean;
}) {
  return (
    <span className={cn('flex items-center gap-3', className)}>
      <LogoMark className={cn(compact ? 'size-10' : 'size-12', light ? 'text-gold-400' : 'text-gold-600')} />
      <span className="flex flex-col leading-none">
        <span className={cn('font-[family-name:var(--font-cormorant)] text-[22px] font-semibold uppercase tracking-[0.04em]', light ? 'text-white' : 'text-brand-900')} lang="en">{nameEn}</span>
        <span className={cn('mt-1 text-[11px] font-semibold uppercase tracking-[0.22em]', light ? 'text-white/80' : 'text-brand-800')}>{line1}</span>
        {!compact && <span className={cn('mt-1 text-[11px]', light ? 'text-white/60' : 'text-muted')}>{since}</span>}
      </span>
    </span>
  );
}
