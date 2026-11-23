import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../ui/cn';

/** Floating glass bar of key facts — same treatment as the home page pillars bar. */
export function FactsBar({ items, className }: { items: { icon: LucideIcon; label: string; value: ReactNode }[]; className?: string }) {
  const cols = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[Math.min(items.length, 4) as 2 | 3 | 4] ?? 'sm:grid-cols-2';
  return (
    <div className={cn('container-site relative z-10', className)}>
      <ul className={cn('glass grid grid-cols-1 gap-y-1 rounded-[2rem] px-3 py-4 lg:divide-x lg:divide-gold-200 rtl:lg:divide-x-reverse', cols)}>
        {items.map((f) => (
          <li key={f.label} className="flex items-center gap-4 px-5 py-2">
            <f.icon className="size-9 shrink-0 text-gold-600" strokeWidth={1.4} aria-hidden />
            <div className="min-w-0"><p className="text-xs text-muted">{f.label}</p><div className="break-words font-semibold text-brand-900">{f.value}</div></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
