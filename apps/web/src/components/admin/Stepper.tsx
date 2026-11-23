'use client';

import { Check } from 'lucide-react';
import { cn } from '../ui/cn';

/** Horizontal step indicator for single-page builders. */
export function Stepper({ steps, current, onSelect, enabled }: { steps: string[]; current: number; onSelect: (i: number) => void; enabled: (i: number) => boolean }) {
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-2 rounded-full border border-white/80 bg-cream-50 p-2 shadow-[var(--shadow-card)]">
      {steps.map((s, i) => (
        <li key={s}>
          <button type="button" disabled={!enabled(i)} onClick={() => onSelect(i)} aria-current={current === i ? 'step' : undefined}
            className={cn('flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40', current === i ? 'bg-brand-900 text-white' : 'text-brand-900 hover:bg-cream-200')}>
            <span className={cn('grid size-6 place-items-center rounded-full text-xs', current === i ? 'bg-gold-400 text-brand-950' : 'bg-cream-200')}>{i < current ? <Check className="size-3.5" /> : i + 1}</span>{s}
          </button>
        </li>
      ))}
    </ol>
  );
}
