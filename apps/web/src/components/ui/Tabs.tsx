'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from './cn';

/** Accessible tabs (WAI-ARIA tabs pattern with arrow-key navigation). */
export function Tabs({ tabs, label }: { tabs: { label: string; content: ReactNode }[]; label: string }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent) => {
    const dir = document.documentElement.dir === 'rtl' ? -1 : 1;
    let next = active;
    if (e.key === 'ArrowRight') next = (active + dir + tabs.length) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (active - dir + tabs.length) % tabs.length;
    else return;
    e.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  };
  return (
    <div>
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-2" onKeyDown={onKey}>
        {tabs.map((t, i) => (
          <button
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            id={`${id}-tab-${i}`}
            aria-selected={active === i}
            aria-controls={`${id}-panel-${i}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            className={cn('rounded-full px-5 py-2 text-sm font-semibold transition-colors', active === i ? 'bg-brand-900 text-white shadow-md' : 'bg-cream-50 text-brand-800 ring-1 ring-line hover:bg-white')}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={i} role="tabpanel" id={`${id}-panel-${i}`} aria-labelledby={`${id}-tab-${i}`} hidden={active !== i} className="mt-5">
          {t.content}
        </div>
      ))}
    </div>
  );
}
