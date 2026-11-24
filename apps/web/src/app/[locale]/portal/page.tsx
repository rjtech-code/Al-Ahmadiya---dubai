'use client';

import { ArrowRight, BookOpen, CalendarDays, CalendarClock, CheckCircle2, Clock, FileText, GraduationCap, PlayCircle, User, Video, Wallet } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import { Empty, ErrorBox, Loading, useApi, useFmt } from '@/components/portal/ui';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import { useSession } from '@/lib/session';

interface Dash {
  cgpa: number | null; attendance: number | null; upcomingCount: number;
  courses: { id: string }[];
  today: { kind: 'class' | 'deadline'; id: string; at: string; endsAt: string; titleEn: string; titleAr: string; code: string; status: string }[];
  nextClass: { id: string; scheduledAt: string; durationMin: number; status: string; course: { code: string; titleEn: string; titleAr: string; imagePath: string | null; teacher: { fullName: string } | null } } | null;
  pendingAssignments: { id: string; titleEn: string; titleAr: string; dueAt: string; course: { code: string } }[];
  recentLectures: { id: string; titleEn: string; titleAr: string; durationSec: number | null; createdAt: string; course: { slug: string; code: string; titleEn: string; titleAr: string; imagePath: string | null } }[];
}

/** Minutes until a time, refreshed every 30 s for the "starts in" label. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);
  return now;
}

function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-[1.5rem] border border-white/80 bg-cream-50 p-5 shadow-[var(--shadow-card)]', className)}>
      <div className="mb-4 flex items-center justify-between gap-2"><h2 className="font-display text-xl font-semibold text-brand-900">{title}</h2>{action}</div>
      {children}
    </section>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[1.5rem] border border-white/80 bg-cream-50 p-3 text-center shadow-[var(--shadow-card)] sm:flex-row sm:gap-4 sm:p-5 sm:text-start">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold-100 text-brand-900 sm:size-14"><Icon className="size-5 sm:size-7" /></span>
      <span className="min-w-0">
        <span className="hidden text-sm text-muted sm:block">{label}</span>
        <span className="block font-display text-2xl font-semibold leading-tight text-brand-900 sm:text-4xl">{value}</span>
        <span className="text-[11px] text-muted sm:hidden">{label}</span>
      </span>
    </div>
  );
}

export default function Dashboard() {
  const t = useTranslations('portal.dash');
  const f = useFmt();
  const now = useNow();
  const { state } = useSession();
  const { data: d, error } = useApi<Dash>('/me/portal/dashboard');
  const first = state.status === 'authed' ? state.user.fullName.split(' ')[0] : '';
  const hour = Number(new Date(now).toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Dubai' }));
  const greeting = hour < 12 ? t('morning', { name: first }) : hour < 17 ? t('afternoon', { name: first }) : t('evening', { name: first });
  const viewAll = (href: string, label = t('viewAll')) => <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">{label}<ArrowRight className="size-3.5 rtl:rotate-180" /></Link>;

  const next = d?.nextClass;
  const startsIn = next ? Math.round((new Date(next.scheduledAt).getTime() - now) / 60_000) : 0;
  const classes = d?.today.filter((e) => e.kind === 'class') ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-3xl font-semibold text-brand-900 sm:text-4xl">{greeting} <span aria-hidden>👋</span></h1>
      <p className="mb-6 mt-1 text-muted">{t('overview')}</p>
      <ErrorBox message={error} />
      {!d ? <Loading /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            <StatCard icon={CalendarDays} label={t('attendance')} value={d.attendance === null ? '—' : `${d.attendance}%`} />
            <StatCard icon={GraduationCap} label={t('gpa')} value={d.cgpa ?? '—'} />
            <StatCard icon={BookOpen} label={t('activeCourses')} value={d.courses.length} />
            <StatCard icon={Clock} label={t('upcomingClasses')} value={d.upcomingCount} />
          </div>

          {/* Next live class */}
          <section className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-gradient-to-br from-cream-50 to-gold-100/60 shadow-[var(--shadow-card)]">
            {next ? (
              <div className="grid gap-0 md:grid-cols-[minmax(0,20rem)_1fr]">
                <div className="relative hidden aspect-[16/10] md:block md:aspect-auto">
                  {next.course.imagePath ? <Image src={next.course.imagePath} alt="" fill sizes="320px" className="object-cover" /> : <div className="pattern-girih absolute inset-0 bg-brand-900" />}
                  <span className={cn('absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white', next.status === 'LIVE' ? 'bg-danger' : 'bg-brand-900/90')}><Video className="size-3.5" />{next.status === 'LIVE' ? t('live') : t('upcoming')}</span>
                  <span className="absolute inset-0 grid place-items-center"><span className="grid size-14 place-items-center rounded-full bg-white/85 text-brand-900 shadow-lg"><PlayCircle className="size-8" /></span></span>
                </div>
                <div className="p-5 sm:p-6">
                  <p className="flex items-center gap-2 text-sm font-semibold text-brand-900"><span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-white md:hidden', next.status === 'LIVE' ? 'bg-danger' : 'bg-brand-900')}><Video className="size-3" />{next.status === 'LIVE' ? t('live') : t('upcoming')}</span>{t('nextClass')}</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-brand-900 sm:text-3xl">{f.L(next.course)}</h2>
                  <ul className="mt-3 space-y-1.5 text-sm text-ink/80">
                    {next.course.teacher && <li className="flex items-center gap-2"><User className="size-4 text-gold-600" />{next.course.teacher.fullName}</li>}
                    <li className="flex flex-wrap items-center gap-2"><CalendarClock className="size-4 text-gold-600" />{f.dateTime(next.scheduledAt)}
                      {next.status === 'LIVE' ? <span className="inline-flex items-center gap-1 font-semibold text-danger"><span className="size-2 animate-pulse rounded-full bg-danger" />{t('liveNow')}</span>
                        : startsIn > 0 && startsIn <= 24 * 60 && <span className="inline-flex items-center gap-1 font-semibold text-success"><span className="size-2 rounded-full bg-success" />{startsIn < 60 ? t('startsInMin', { n: startsIn }) : t('startsInHours', { n: Math.round(startsIn / 60) })}</span>}
                    </li>
                  </ul>
                  {next.status === 'LIVE'
                    ? <Link href={`/portal/live/${next.id}`} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-900 font-semibold text-white hover:bg-brand-800">{t('joinClass')}<ArrowRight className="size-4 rtl:rotate-180" /></Link>
                    : <Link href="/portal/live" className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-900/90 font-semibold text-white hover:bg-brand-800">{t('opensAuto', { time: f.time(next.scheduledAt) })}</Link>}
                </div>
              </div>
            ) : <div className="p-6"><Empty text={t('noUpcoming')} /></div>}
          </section>

          <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            <Panel title={t('todayTimetable')} action={viewAll('/portal/schedule', t('fullSchedule'))}>
              {classes.length ? (
                <>
                  <ol className="hidden gap-2 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]">
                    {classes.map((e, i) => (
                      <li key={e.id} className={cn('rounded-2xl border p-3 text-sm', e.status === 'LIVE' || (i === 0 && e.status === 'SCHEDULED') ? 'border-gold-400 bg-gold-100/70' : 'border-line bg-white')}>
                        <p className="text-xs font-semibold text-gold-700">{f.time(e.at)}</p>
                        <p className="line-clamp-2 font-semibold text-brand-900">{f.L(e)}</p>
                      </li>
                    ))}
                  </ol>
                  <ol className="space-y-2 sm:hidden">
                    {classes.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 border-b border-line pb-2 text-sm last:border-0">
                        <span className={cn('size-2.5 rounded-full', e.status === 'LIVE' ? 'bg-danger' : 'bg-gold-400')} />
                        <span className="w-20 shrink-0 text-muted">{f.time(e.at)}</span>
                        <span className="flex-1 font-semibold text-brand-900">{f.L(e)}</span>
                        {e.status === 'LIVE' && <span className="rounded-full bg-success/15 px-2 text-[11px] font-semibold text-success">{t('live')}</span>}
                      </li>
                    ))}
                  </ol>
                </>
              ) : <p className="rounded-2xl bg-white p-4 text-sm text-muted">{t('noClassesToday')}</p>}
            </Panel>

            <Panel title={t('attendanceProgress')} action={<span className="text-xs text-muted">{t('allClasses')}</span>}>
              {d.attendance === null ? <p className="text-sm text-muted">{t('noClassesYet')}</p> : (
                <div className="flex items-center gap-4">
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-cream-200"><div className={cn('h-full rounded-full', d.attendance >= 75 ? 'bg-success' : 'bg-warning')} style={{ width: `${d.attendance}%` }} /></div>
                  <span className="font-display text-2xl font-semibold text-brand-900">{d.attendance}%</span>
                </div>
              )}
              {d.attendance !== null && d.attendance < 75 && <p className="mt-2 text-xs text-warning">{t('attendanceWarning')}</p>}
              <div className="mt-5 grid grid-cols-4 gap-2 lg:hidden">
                {[{ href: '/portal/courses', icon: BookOpen, label: t('qCourses') }, { href: '/portal/attendance', icon: CheckCircle2, label: t('qAttendance') }, { href: '/portal/lectures', icon: PlayCircle, label: t('qRecordings') }, { href: '/portal/payments', icon: Wallet, label: t('qFees') }].map((q) => (
                  <Link key={q.href} href={q.href} className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 text-[11px] font-semibold text-brand-900"><q.icon className="size-5 text-gold-600" />{q.label}</Link>
                ))}
              </div>
            </Panel>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={t('upcomingAssignments')} action={viewAll('/portal/assignments')}>
              {d.pendingAssignments.length ? (
                <ul className="divide-y divide-line">
                  {d.pendingAssignments.map((a) => (
                    <li key={a.id}>
                      <Link href={`/portal/assignments/${a.id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-100 text-brand-900"><FileText className="size-5" /></span>
                        <span className="min-w-0"><span className="block truncate font-semibold text-brand-900">{f.L(a)}</span><span className={cn('text-xs', new Date(a.dueAt).getTime() - now < 3 * 86_400_000 ? 'font-semibold text-danger' : 'text-muted')}>{t('due', { date: f.date(a.dueAt) })} · {a.course.code}</span></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <Empty text={t('noneDue')} />}
            </Panel>

            <Panel title={t('recentLectures')} action={viewAll('/portal/lectures')}>
              {d.recentLectures.length ? (
                <ul className="grid grid-cols-2 gap-3">
                  {d.recentLectures.map((l) => (
                    <li key={l.id}>
                      <Link href={`/portal/courses/${l.course.slug}?lesson=${l.id}`} className="group block">
                        <span className="relative block aspect-video overflow-hidden rounded-xl bg-brand-900">
                          {l.course.imagePath && <Image src={l.course.imagePath} alt="" fill sizes="240px" className="object-cover transition group-hover:scale-105" />}
                          <span className="absolute inset-0 grid place-items-center bg-brand-950/20"><span className="grid size-10 place-items-center rounded-full bg-white/90 text-brand-900"><PlayCircle className="size-6" /></span></span>
                        </span>
                        <span className="mt-1.5 block truncate text-sm font-semibold text-brand-900">{f.L(l)}</span>
                        <span className="text-xs text-muted">{l.course.code}{l.durationSec ? ` · ${t('minutes', { n: Math.round(l.durationSec / 60) })}` : ''}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <Empty text={t('noLectures')} />}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
