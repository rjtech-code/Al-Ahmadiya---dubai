'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { cn } from '../ui/cn';

const card = 'rounded-[1.25rem] border border-brand-900/[0.07] bg-white shadow-[0_1px_2px_rgb(11_58_60/0.04),0_10px_30px_-18px_rgb(11_58_60/0.25)]';

/** Brand hero shared by every staff dashboard: date, greeting, role line, optional figures. */
export function WelcomeBanner({ title, subtitle, image = '/images/campus/academic.jpg', children }: { title: string; subtitle: string; image?: string; children?: ReactNode }) {
  const [today] = useState(() => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Dubai' }));
  return (
    <section className="pattern-girih relative mb-6 overflow-hidden rounded-[1.75rem] bg-brand-900 text-white shadow-[0_24px_50px_-28px_rgb(5_40_42/0.9)]">
      <div className="absolute inset-y-0 end-0 hidden w-[45%] md:block">
        <Image src={image} alt="" fill sizes="45vw" className="object-cover opacity-45 mix-blend-luminosity" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-900 via-brand-900/70 to-transparent rtl:bg-gradient-to-l" />
      </div>
      <span aria-hidden className="pointer-events-none absolute -start-24 -top-24 size-72 rounded-full bg-gold-400/15 blur-3xl" />
      <div className="relative px-6 py-8 sm:px-8 md:max-w-[65%]">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold-300">{today}</p>
        <h1 className="mt-2 font-[family-name:var(--font-cormorant)] text-3xl font-semibold leading-tight sm:text-[2.6rem]">{title}</h1>
        <p className="mt-1.5 text-sm text-white/70">{subtitle}</p>
        {children && <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">{children}</div>}
      </div>
    </section>
  );
}

export function IconStat({ icon: Icon, label, value, hint, href }: { icon: React.ComponentType<{ className?: string }>; label: string; value: ReactNode; hint?: ReactNode; href?: string }) {
  const body = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{label}</span>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-700"><Icon className="size-5" /></span>
      </span>
      <span className="mt-2 block font-[family-name:var(--font-cormorant)] text-[clamp(1.6rem,2.4vw,2.25rem)] font-semibold leading-tight text-brand-900 [overflow-wrap:anywhere]">{value}</span>
      {hint && <span className="mt-2 block text-xs text-muted">{hint}</span>}
    </>
  );
  const cls = cn(card, 'flex flex-col p-5');
  return href ? <Link href={href} className={cn(cls, 'transition hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-22px_rgb(11_58_60/0.45)]')}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function DashPanel({ title, action, children, className, id }: { title: string; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn(card, 'min-w-0 p-5 sm:p-6', className)}>
      <div className="mb-4 flex items-center justify-between gap-2"><h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold leading-tight text-brand-900">{title}</h2>{action}</div>
      {children}
    </section>
  );
}

export function ViewAll({ href, label = 'View all' }: { href: string; label?: string }) {
  return <Link href={href} className="rounded-lg px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-cream-100">{label} →</Link>;
}

/**
 * Single-series vertical bar chart: one brand hue (the title names the series, so no legend),
 * rounded data-ends on a shared baseline, recessive grid, hover tooltip and a screen-reader table.
 */
export function BarChart({ data, format = String, label }: { data: { x: string; y: number }[]; format?: (v: number) => string; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const ticks = niceTicks(Math.max(...data.map((d) => d.y), 0));
  const max = ticks[ticks.length - 1];
  return (
    <figure>
      <div className="relative flex h-48 gap-2">
        <div className="flex w-14 flex-col-reverse justify-between pb-6 text-end text-[10px] text-muted" aria-hidden>{ticks.map((t) => <span key={t}>{format(t)}</span>)}</div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between" aria-hidden>{ticks.map((t) => <span key={t} className="border-t border-line/70" />)}</div>
          <div className="absolute inset-x-0 top-0 bottom-6 flex items-end gap-2 px-1">
            {data.map((d, i) => (
              <div key={d.x} className="relative flex h-full flex-1 items-end justify-center" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${d.x}: ${format(d.y)}`}>
                <div className={cn('w-full max-w-12 rounded-t-[4px] transition-colors', i === data.length - 1 ? 'bg-gold-500' : hover === i ? 'bg-brand-800' : 'bg-brand-600/75')} style={{ height: `${(d.y / max) * 100}%`, minHeight: d.y ? 3 : 0 }} />
                {hover === i && <span className="pointer-events-none absolute -top-8 z-10 whitespace-nowrap rounded-lg bg-brand-950 px-2 py-1 text-[11px] font-semibold text-white shadow">{d.x}: {format(d.y)}</span>}
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex gap-2 px-1 text-[11px] text-muted" aria-hidden>{data.map((d) => <span key={d.x} className="flex-1 text-center">{d.x}</span>)}</div>
        </div>
      </div>
      <table className="sr-only"><caption>{label}</caption><tbody>{data.map((d) => <tr key={d.x}><th scope="row">{d.x}</th><td>{format(d.y)}</td></tr>)}</tbody></table>
    </figure>
  );
}

/** Round axis ticks (0 … top) with a 1/2/5×10ⁿ step; at least 0 and 1. */
function niceTicks(maxValue: number) {
  const raw = Math.max(1, maxValue) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag);
  const top = Math.max(step, Math.ceil(Math.max(1, maxValue) / step) * step);
  const out: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) out.push(Math.round(v));
  return out;
}

/** Horizontal bars for a few buckets (one hue; values labelled directly). */
export function HBars({ rows, format = String }: { rows: { label: string; value: number }[]; format?: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-sm">
          <span className="text-xs text-muted">{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-cream-200"><span className="block h-full rounded-full bg-gradient-to-r from-brand-700 to-brand-600" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="font-semibold text-brand-900">{format(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/** One headline percentage as a ring. */
export function Ring({ value, label }: { value: number; label: string }) {
  const r = 42, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" className="size-32 shrink-0" role="img" aria-label={`${label}: ${value}%`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-cream-200)" strokeWidth="9" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-brand-700)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} transform="rotate(-90 50 50)" />
      <text x="50" y="56" textAnchor="middle" className="fill-brand-900 font-semibold" fontSize="20">{value}%</text>
    </svg>
  );
}

export function QuickActions({ items }: { items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2">
      {items.map((q) => (
        <Link key={q.label} href={q.href} className="group flex flex-col items-center gap-2 rounded-2xl border border-brand-900/[0.06] bg-cream-50/50 p-3 text-center text-[11px] font-semibold text-brand-900 transition hover:-translate-y-0.5 hover:border-gold-400 hover:bg-white">
          <span className="grid size-10 place-items-center rounded-xl bg-white text-brand-700 shadow-sm transition group-hover:bg-brand-900 group-hover:text-gold-300"><q.icon className="size-5" /></span>{q.label}
        </Link>
      ))}
    </div>
  );
}

export const monthLabel = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
