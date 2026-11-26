'use client';

import { ArrowRight, BookOpen, CalendarDays, Clock, GraduationCap, PlayCircle, Radio, Sparkles, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { AreaTrend, Ring, Spark } from '@/components/portal/charts';
import { LectureCarousel, type WatchedLecture } from '@/components/portal/LectureCarousel';
import { Card, Empty, ErrorBox, Loading, Progress, Stat, useApi, useFmt } from '@/components/portal/ui';
import { UpdatesPanel } from '@/components/portal/UpdatesPanel';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import { apiUrl } from '@/lib/client-api';
import { useSession } from '@/lib/session';

interface Dash {
  cgpa: number | null; attendance: number | null; upcomingCount: number;
  courses: { id: string }[];
  today: { kind: 'class' | 'deadline'; id: string; at: string; endsAt: string; titleEn: string; titleAr: string; code: string; status: string }[];
  nextClass: { id: string; scheduledAt: string; durationMin: number; status: string; course: { code: string; titleEn: string; titleAr: string; teacher: { fullName: string } | null } } | null;
}
interface MyCourse { id: string; slug: string; code: string; titleEn: string; titleAr: string; imagePath: string | null; progress: number; instructor: string | null; lecturesDone: number; lecturesTotal: number }
interface Analytics { studyWeeks: { label: string; value: number }[] }
interface Att { weekly: { week: number; percent: number | null }[] }
interface Res { terms: { gpa: number | null }[] }

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);
  return now;
}

export default function Dashboard() {
  const t = useTranslations('portal.dash');
  const f = useFmt();
  const now = useNow();
  const { state } = useSession();
  const { data: d, error } = useApi<Dash>('/me/portal/dashboard');
  const { data: courses } = useApi<MyCourse[]>('/me/portal/courses');
  const { data: lectures } = useApi<{ lectures: WatchedLecture[] }>('/me/portal/lectures');
  const { data: an } = useApi<Analytics>('/me/portal/analytics');
  const { data: att } = useApi<Att>('/me/portal/attendance');
  const { data: res } = useApi<Res>('/me/portal/results');
  const first = state.status === 'authed' ? state.user.fullName.split(' ')[0] : '';
  const hour = Number(new Date(now).toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Dubai' }));
  const greeting = hour < 12 ? t('morning', { name: first }) : hour < 17 ? t('afternoon', { name: first }) : t('evening', { name: first });
  const viewAll = (href: string, label = t('viewAll')) => <Link href={href} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-cream-100">{label}<ArrowRight className="size-3.5 rtl:rotate-180" /></Link>;

  const watched = [...(lectures?.lectures ?? [])].filter((l) => l.watchedAt).sort((a, b) => b.watchedAt!.localeCompare(a.watchedAt!)).slice(0, 3);
  const completion = courses?.length ? Math.round(courses.reduce((n, c) => n + c.progress, 0) / courses.length) : 0;
  const classes = d?.today ?? [];
  const next = d?.nextClass;
  const mins = next ? Math.round((new Date(next.scheduledAt).getTime() - now) / 60_000) : 0;
  const resume = courses?.slice().sort((a, b) => b.progress - a.progress).find((c) => c.progress < 100);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ErrorBox message={error} />
      {/* Welcome */}
      <section className="pattern-girih relative overflow-hidden rounded-[1.75rem] bg-brand-900 text-white shadow-[0_24px_50px_-28px_rgb(5_40_42/0.9)]">
        <span aria-hidden className="pointer-events-none absolute -start-24 -top-24 size-72 rounded-full bg-gold-400/15 blur-3xl" />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold-300">{f.day(now)}</p>
            <h1 className="mt-2 font-display text-4xl font-semibold leading-tight sm:text-5xl">{greeting}</h1>
            <p className="mt-2 max-w-md text-white/70">{t('overview')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {resume && <Link href={`/portal/courses/${resume.slug}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-gold-400 px-5 text-sm font-semibold text-brand-950 hover:bg-gold-300"><PlayCircle className="size-4" />{t('continueLearning')}</Link>}
              <Link href="/portal/schedule" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/25 px-5 text-sm font-semibold hover:bg-white/10"><CalendarDays className="size-4" />{t('viewSchedule')}</Link>
            </div>
          </div>
          {next ? (
            <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur">
              <p className="flex items-center justify-between text-xs"><span className="inline-flex items-center gap-1.5 font-semibold text-gold-300"><Radio className="size-3.5" />{next.status === 'LIVE' ? t('liveNow') : t('nextClass')}</span>{next.status !== 'LIVE' && mins > 0 && <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/80">{mins < 60 ? t('startsInMin', { n: mins }) : t('startsInHours', { n: Math.round(mins / 60) })}</span>}</p>
              <p className="mt-3 text-xs font-bold text-gold-300">{next.course.code}</p>
              <p className="font-display text-2xl font-semibold leading-tight">{f.L(next.course)}</p>
              <p className="mt-1 text-sm text-white/70">{f.dateTime(next.scheduledAt)}{next.course.teacher && ` · ${next.course.teacher.fullName}`}</p>
              <Link href={next.status === 'LIVE' ? `/portal/live/${next.id}` : '/portal/live'} className="mt-4 flex h-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-brand-900 hover:bg-cream-100">{next.status === 'LIVE' ? t('joinClass') : t('opensAuto', { time: f.time(next.scheduledAt) })}</Link>
            </div>
          ) : <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 text-sm text-white/70">{t('noUpcoming')}</div>}
        </div>
      </section>

      {!d ? <Loading /> : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat icon={CalendarDays} label={t('attendance')} value={d.attendance === null ? '—' : `${d.attendance}%`} hint={t('allClasses')} trend={<Spark values={(att?.weekly ?? []).map((w) => w.percent ?? 0)} />} />
            <Stat tone="brand" icon={GraduationCap} label={t('cgpa')} value={d.cgpa?.toFixed(2) ?? '—'} hint={t('outOf4')} trend={<Spark values={(res?.terms ?? []).map((x) => x.gpa ?? 0)} />} />
            <Stat icon={BookOpen} label={t('activeCourses')} value={d.courses.length} hint={t('completeAvg', { n: completion })} />
            <Stat icon={Clock} label={t('upcomingClasses')} value={d.upcomingCount} hint={t('next7')} />
          </div>

          {/* Courses + updates */}
          <div className="grid gap-6 xl:grid-cols-3">
            <Card icon={BookOpen} eyebrow={t('enrolled')} title={t('myCourses')} action={viewAll('/portal/courses')} className="min-w-0 xl:col-span-2">
              {courses?.length ? (
                <ul className="grid grid-cols-2 gap-3 sm:gap-4">
                  {courses.slice(0, 4).map((c) => (
                    <li key={c.id}>
                      <Link href={`/portal/courses/${c.slug}`} className="group relative block overflow-hidden rounded-2xl">
                        <span className="relative block aspect-[4/3] bg-brand-900 sm:aspect-[16/10]">
                          {c.imagePath && <Image src={apiUrl(c.imagePath)} unoptimized={c.imagePath.startsWith('/api/')} alt="" fill sizes="(min-width:1280px) 380px, 50vw" className="object-cover transition duration-500 group-hover:scale-105" />}
                          <span className="absolute inset-0 bg-gradient-to-t from-brand-950/95 via-brand-950/40 to-transparent" />
                          <span className="absolute start-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-brand-900">{c.code}</span>
                          <span className="absolute inset-x-3 bottom-3 text-white sm:inset-x-4 sm:bottom-4">
                            <span className="line-clamp-2 font-display text-lg font-semibold leading-tight sm:text-xl">{f.L(c)}</span>
                            <span className="mt-2 flex items-center gap-2"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25"><span className="block h-full rounded-full bg-gold-400" style={{ width: `${c.progress}%` }} /></span><span className="text-[11px] font-semibold">{c.progress}%</span></span>
                            <span className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-semibold text-brand-900 transition group-hover:bg-gold-300"><BookOpen className="size-3.5" />{t('read')}</span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <Empty text={t('noCourses')} />}
            </Card>
            <div className="relative min-h-80 min-w-0 xl:min-h-0"><UpdatesPanel className="xl:absolute xl:inset-0 xl:h-auto" /></div>
          </div>

          {/* Progress + today */}
          <div className="grid gap-6 xl:grid-cols-3">
            <Card icon={TrendingUp} eyebrow={t('thisTerm')} title={t('academicProgress')} className="min-w-0 xl:col-span-2">
              <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
                <div className="flex justify-around gap-4 md:flex-col md:justify-start">
                  {[{ v: d.attendance ?? 0, l: t('attendance'), tone: 'brand' as const }, { v: completion, l: t('courseCompletion'), tone: 'gold' as const }, { v: ((d.cgpa ?? 0) / 4) * 100, l: t('cgpa'), tone: 'brand' as const, label: d.cgpa?.toFixed(2) }].map((r) => (
                    <div key={r.l} className="flex flex-col items-center gap-1.5 md:flex-row md:gap-3"><Ring value={r.v} size={72} stroke={8} tone={r.tone} label={<span className="text-base">{r.label ?? `${Math.round(r.v)}%`}</span>} /><span className="text-center text-xs font-semibold text-brand-900 md:text-start">{r.l}</span></div>
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="mb-3 flex items-center justify-between text-sm"><span className="font-semibold text-brand-900">{t('studyHours')}</span><span className="text-xs text-muted">{t('last8Weeks')}</span></p>
                  {an ? <AreaTrend data={an.studyWeeks} height={150} format={(v) => `${Math.round(v / 60)}h`} label={t('studyHours')} /> : <Loading />}
                </div>
              </div>
            </Card>
            <Card icon={Sparkles} eyebrow={f.date(now)} title={t('todayTimetable')} action={viewAll('/portal/schedule', t('fullSchedule'))}>
              {classes.length ? (
                <ol className="relative space-y-4 border-s-2 border-gold-200 ps-5">
                  {classes.map((e) => (
                    <li key={e.id} className="relative">
                      <span className={cn('absolute -start-[1.6rem] top-1.5 size-3 rounded-full border-2 border-white', e.status === 'LIVE' ? 'bg-danger' : e.kind === 'deadline' ? 'bg-gold-500' : 'bg-brand-700')} />
                      <p className="text-xs font-bold text-gold-700">{f.time(e.at)}{e.kind === 'class' && ` – ${f.time(e.endsAt)}`}</p>
                      <p className="font-semibold text-brand-900">{f.L(e)}</p>
                      <p className="text-xs text-muted">{e.code} · {e.kind === 'class' ? t('liveClass') : t('deadline')}</p>
                    </li>
                  ))}
                </ol>
              ) : <p className="rounded-2xl bg-cream-50 p-4 text-sm text-muted">{t('noClassesToday')}</p>}
              <div className="mt-5 rounded-2xl bg-cream-50 p-4">
                <p className="flex justify-between text-xs"><span className="font-semibold text-brand-900">{t('courseCompletion')}</span><span className="text-muted">{completion}%</span></p>
                <Progress value={completion} tone="gold" className="mt-2" />
              </div>
            </Card>
          </div>

          <Card icon={PlayCircle} eyebrow={t('pickUp')} title={t('recentlyWatched')} action={viewAll('/portal/lectures')}>
            {watched.length ? <LectureCarousel items={watched} /> : <Empty text={t('noLectures')} />}
          </Card>
        </>
      )}
    </div>
  );
}
