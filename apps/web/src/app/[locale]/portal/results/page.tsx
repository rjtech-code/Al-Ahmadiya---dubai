'use client';

import { Award, BarChart3, GraduationCap, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Bars, Ring } from '@/components/portal/charts';
import { Card, Empty, ErrorBox, Hero, HeroFigure, Loading, PageTitle, Progress, useApi, useFmt } from '@/components/portal/ui';
import { Logo } from '@/components/site/Logo';

interface D { cgpa: number | null; creditsEarned: number; creditsRequired?: number; terms: { term: string; gpa: number | null; credits: number; courses: { id: string; marks: number | null; grade: string; gradePoints: number; creditHours: number; course: { code: string; titleEn: string; titleAr: string } }[] }[] }
interface P { studentId: string; fullName: string; application: { program: { nameEn: string; nameAr: string } | null } | null }

const GRADE_ORDER = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'];

export default function Results() {
  const t = useTranslations('portal.results');
  const f = useFmt();
  const { data, error } = useApi<D>('/me/portal/results');
  const { data: me } = useApi<P>('/me/portal/profile');
  const [issued] = useState(() => Date.now());
  const required = data?.creditsRequired ?? 120;
  const all = data?.terms.flatMap((x) => x.courses) ?? [];
  const grades = GRADE_ORDER.map((g) => ({ label: g, value: all.filter((c) => c.grade === g).length })).filter((g) => g.value > 0);
  const best = [...all].sort((a, b) => (b.marks ?? 0) - (a.marks ?? 0))[0];

  return (
    <>
      <PageTitle eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')}
        actions={data?.terms.length ? <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full border border-gold-400 bg-white px-4 py-2 text-sm font-semibold text-brand-900 shadow-sm hover:bg-cream-100"><Printer className="size-4" />{t('print')}</button> : undefined} />
      <ErrorBox message={error} />
      {!data ? <Loading /> : !data.terms.length ? <Empty text={t('empty')} /> : (
        <div className="space-y-6">
          <Hero title={t('standing')} subtitle={t('scaleNote')}
            aside={<div className="rounded-full bg-white/95 p-2"><Ring value={((data.cgpa ?? 0) / 4) * 100} size={124} stroke={11} tone="gold" label={data.cgpa?.toFixed(2) ?? '—'} sub={t('cgpa')} /></div>}>
            <HeroFigure label={t('credits')} value={data.creditsEarned} hint={t('ofRequired', { n: required })} />
            <HeroFigure label={t('lastGpa')} value={data.terms.at(-1)?.gpa?.toFixed(2) ?? '—'} hint={data.terms.at(-1)?.term} />
            <HeroFigure label={t('coursesDone')} value={all.length} />
            {best && <HeroFigure label={t('best')} value={`${best.marks}%`} hint={best.course.code} />}
          </Hero>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card icon={BarChart3} eyebrow={t('byTerm')} title={t('gpaTrend')} className="lg:col-span-2">
              <Bars data={data.terms.map((x) => ({ label: x.term, value: x.gpa ?? 0 }))} max={4} format={(v) => v.toFixed(2)} label={t('gpaTrend')} />
            </Card>
            <Card icon={GraduationCap} eyebrow={t('degree')} title={t('progressTitle')}>
              <p className="font-display text-4xl font-semibold text-brand-900">{Math.round((data.creditsEarned / required) * 100)}%</p>
              <p className="text-xs text-muted">{t('creditsOf', { done: data.creditsEarned, total: required })}</p>
              <Progress value={(data.creditsEarned / required) * 100} tone="gold" className="mt-3 h-2.5" />
              <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-muted">{t('distribution')}</p>
              <ul className="mt-2 space-y-1.5">
                {grades.map((g) => (
                  <li key={g.label} className="flex items-center gap-3 text-sm">
                    <span className="w-7 font-semibold text-brand-900">{g.label}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-cream-200"><span className="block h-full rounded-full bg-brand-700" style={{ width: `${(g.value / all.length) * 100}%` }} /></span>
                    <span className="w-5 text-end tabular-nums text-muted">{g.value}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Transcript, laid out like a printed document */}
          <article className="mx-auto max-w-4xl rounded-sm border border-line bg-[#fffdf9] px-6 py-8 shadow-[0_2px_4px_rgb(60_40_10/0.06),0_24px_48px_-24px_rgb(60_40_10/0.35)] sm:px-12 sm:py-12 print:shadow-none">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-brand-900 pb-5">
              <Logo nameEn="Al Ahmadiya" line1="School · Dubai" since="Since 1912" />
              <div className="text-end">
                <p className="font-display text-2xl font-semibold text-brand-900">{t('transcript')}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-700">{t('unofficial')}</p>
              </div>
            </header>
            <dl className="mt-5 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              {[[t('student'), me?.fullName ?? '—'], [t('studentId'), me?.studentId ?? '—'], [t('programme'), me?.application?.program ? f.L({ titleEn: me.application.program.nameEn, titleAr: me.application.program.nameAr }) : '—'], [t('issued'), f.date(issued)]].map(([k, v]) => (
                <div key={k} className="flex gap-3 border-b border-dotted border-line py-1.5"><dt className="w-28 shrink-0 text-muted">{k}</dt><dd className="font-semibold text-brand-900">{v}</dd></div>
              ))}
            </dl>
            {data.terms.map((term) => (
              <section key={term.term} className="mt-7 break-inside-avoid">
                <div className="flex items-baseline justify-between border-b border-brand-900/30 pb-1.5"><h2 className="font-display text-lg font-semibold text-brand-900">{term.term}</h2><p className="text-xs text-muted">{t('termGpa')} <strong className="text-brand-900">{term.gpa?.toFixed(2)}</strong> · {term.credits} {t('creditHours')}</p></div>
                <table className="mt-2 w-full text-sm">
                  <thead><tr className="text-[11px] uppercase tracking-wider text-muted"><th className="py-1.5 text-start font-semibold">{t('course')}</th><th className="w-16 text-end font-semibold">{t('creditHours')}</th><th className="w-16 text-end font-semibold">{t('marks')}</th><th className="w-14 text-end font-semibold">{t('grade')}</th><th className="w-16 text-end font-semibold">{t('points')}</th></tr></thead>
                  <tbody>
                    {term.courses.map((r) => <tr key={r.id} className="border-t border-dotted border-line"><td className="py-2"><span className="me-2 font-semibold text-brand-900">{r.course.code}</span>{f.L(r.course)}</td><td className="text-end tabular-nums">{r.creditHours}</td><td className="text-end tabular-nums">{r.marks ?? '—'}</td><td className="text-end font-semibold text-brand-900">{r.grade}</td><td className="text-end tabular-nums">{r.gradePoints.toFixed(1)}</td></tr>)}
                  </tbody>
                </table>
              </section>
            ))}
            <footer className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t-2 border-brand-900 pt-5">
              <div className="text-sm"><p className="text-muted">{t('cumulative')}</p><p className="font-display text-3xl font-semibold text-brand-900">{data.cgpa?.toFixed(2)} <span className="text-base text-muted">/ 4.00</span></p><p className="text-xs text-muted">{t('creditsOf', { done: data.creditsEarned, total: required })}</p></div>
              <div className="grid size-24 place-items-center rounded-full border-2 border-dashed border-gold-500 text-center text-[10px] font-bold uppercase leading-tight tracking-wider text-gold-700"><span><Award className="mx-auto mb-1 size-5" />{t('seal')}</span></div>
            </footer>
            <p className="mt-6 text-center text-[11px] text-muted">{t('disclaimer')}</p>
          </article>
        </div>
      )}
    </>
  );
}
