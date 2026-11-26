'use client';

import { useId, useState, type ReactNode } from 'react';
import { cn } from '../ui/cn';

/**
 * Lightweight charts for the student portal, drawn with SVG/HTML in the theme colours.
 * One series per chart (brand teal), gold for the highlighted point, recessive grid, hover tooltips.
 */
export interface Datum { label: string; value: number }

const niceMax = (v: number) => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };

function Tip({ children, left, top }: { children: ReactNode; left: string; top: string }) {
  return (
    <span role="status" className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-brand-950 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg" style={{ left, top }}>
      {children}
    </span>
  );
}

/** Area + line trend with crosshair tooltip. */
export function AreaTrend({ data, format = String, height = 180, max, label }: { data: Datum[]; format?: (v: number) => string; height?: number; max?: number; label: string }) {
  const gid = useId().replace(/:/g, '');
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return null;
  const top = max ?? niceMax(Math.max(...data.map((d) => d.value)));
  const W = 100, n = data.length;
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => 100 - (v / top) * 100;
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join(' ');
  const area = `${line} L${x(n - 1)},100 L${x(0)},100 Z`;
  const ticks = [0, 0.5, 1].map((f) => top * f);
  return (
    <figure aria-label={label}>
      <div className="flex gap-2">
        <div className="flex w-9 shrink-0 flex-col justify-between text-end text-[10px] text-muted" style={{ height }}>{[...ticks].reverse().map((t) => <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{format(t)}</span>)}</div>
        <div className="relative flex-1" style={{ height }} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => <span key={t} className="absolute inset-x-0 border-t border-dashed border-line/80" style={{ top: `${y(t)}%` }} />)}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
            <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--color-brand-600)" stopOpacity="0.28" /><stop offset="100%" stopColor="var(--color-brand-600)" stopOpacity="0" /></linearGradient></defs>
            <path d={area} fill={`url(#${gid})`} />
            <path d={line} fill="none" stroke="var(--color-brand-700)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          {data.map((d, i) => (
            <button key={d.label} type="button" aria-label={`${d.label}: ${format(d.value)}`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              className="absolute top-0 h-full -translate-x-1/2 outline-none" style={{ left: `${x(i)}%`, width: `${100 / n}%` }}>
              {hover === i && <span className="absolute inset-y-0 left-1/2 border-l border-brand-700/30" />}
              <span className={cn('absolute left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white transition', i === n - 1 ? 'bg-gold-500' : 'bg-brand-700', hover === i || i === n - 1 ? 'scale-125' : 'scale-75 opacity-0')} style={{ top: `${y(d.value)}%` }} />
            </button>
          ))}
          {hover !== null && <Tip left={`${x(hover)}%`} top={`calc(${y(data[hover].value)}% - 10px)`}>{data[hover].label} · {format(data[hover].value)}</Tip>}
        </div>
      </div>
      <div className="ms-11 mt-2 flex justify-between text-[10px] text-muted">{data.map((d, i) => <span key={d.label} className={cn(n > 8 && i % 2 && 'invisible')}>{d.label}</span>)}</div>
    </figure>
  );
}

/** Vertical bars; the last (current) bar is gold. */
export function Bars({ data, format = String, height = 160, max, label, highlight }: { data: Datum[]; format?: (v: number) => string; height?: number; max?: number; label: string; highlight?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return null;
  const top = max ?? niceMax(Math.max(...data.map((d) => d.value)));
  const hi = highlight ?? data.length - 1;
  return (
    <figure aria-label={label}>
      <div className="relative flex items-end gap-[2px] sm:gap-1.5" style={{ height }} onMouseLeave={() => setHover(null)}>
        {[0.5, 1].map((f) => <span key={f} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line/80" style={{ bottom: `${f * 100}%` }}><span className="absolute -top-3 end-0 text-[10px] text-muted">{format(top * f)}</span></span>)}
        {data.map((d, i) => (
          <button key={d.label} type="button" aria-label={`${d.label}: ${format(d.value)}`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} className="relative flex h-full flex-1 items-end outline-none">
            <span className={cn('w-full rounded-t-[4px] transition-colors', i === hi ? 'bg-gold-500' : hover === i ? 'bg-brand-700' : 'bg-brand-600/75')} style={{ height: `${Math.max(2, (d.value / top) * 100)}%` }} />
            {hover === i && <Tip left="50%" top={`calc(${100 - (d.value / top) * 100}% - 6px)`}>{d.label} · {format(d.value)}</Tip>}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-[2px] text-center text-[10px] text-muted sm:gap-1.5">{data.map((d) => <span key={d.label} className="flex-1 truncate">{d.label}</span>)}</div>
    </figure>
  );
}

/** Progress ring with the value in the middle. */
export function Ring({ value, size = 96, stroke = 9, label, sub, tone = 'brand' }: { value: number; size?: number; stroke?: number; label?: ReactNode; sub?: ReactNode; tone?: 'brand' | 'gold' | 'warn' }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value));
  const color = tone === 'gold' ? 'var(--color-gold-500)' : tone === 'warn' ? 'var(--color-warning, #b7791f)' : 'var(--color-brand-700)';
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${v}%`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-cream-200)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <span className="absolute text-center leading-none"><span className="block font-display text-2xl font-semibold text-brand-900">{label ?? `${v}%`}</span>{sub && <span className="mt-0.5 block text-[10px] text-muted">{sub}</span>}</span>
    </div>
  );
}

/** One horizontal bar split into segments (with a 2px gap), plus a legend. */
export function StackBar({ segments, label }: { segments: { label: string; value: number; className: string }[]; label: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <figure aria-label={label}>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-cream-200">{segments.filter((s) => s.value > 0).map((s) => <span key={s.label} title={`${s.label}: ${s.value}`} className={cn('h-full first:rounded-s-full last:rounded-e-full', s.className)} style={{ width: `${(s.value / total) * 100}%` }} />)}</div>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted">{segments.map((s) => <span key={s.label} className="inline-flex items-center gap-1.5"><span className={cn('size-2.5 rounded-full', s.className)} />{s.label} <strong className="text-brand-900">{s.value}</strong></span>)}</figcaption>
    </figure>
  );
}

/** Tiny sparkline for KPI tiles. */
export function Spark({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const mx = Math.max(...values), mn = Math.min(...values), span = mx - mn || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - mn) / span) * 26 - 2}`).join(' ');
  return <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={cn('h-8 w-24', className)} aria-hidden><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
