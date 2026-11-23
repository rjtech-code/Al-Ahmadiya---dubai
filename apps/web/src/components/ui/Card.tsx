import type { ReactNode } from 'react';
import { cn } from './cn';

export function Card({ children, className, as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'article' | 'li' }) {
  return <Tag className={cn('rounded-[var(--radius-card)] border border-white/80 bg-cream-50 shadow-[var(--shadow-card)]', className)}>{children}</Tag>;
}

/** Card that lifts slightly on hover; used for linkable items. */
export function HoverCard({ children, className, as: Tag = 'article' }: { children: ReactNode; className?: string; as?: 'div' | 'article' | 'li' }) {
  return (
    <Tag
      className={cn(
        'group relative overflow-hidden rounded-[var(--radius-card)] border border-white/80 bg-cream-50 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] focus-within:shadow-[var(--shadow-card-hover)]',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
