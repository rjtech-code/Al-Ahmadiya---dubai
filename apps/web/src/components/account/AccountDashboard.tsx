'use client';

import { Bell, BookOpen, CheckCircle2, Clock, CreditCard, FileText, GraduationCap, LayoutDashboard, Loader2, LogOut, PlayCircle, Radio, Receipt } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { apiFetch, formatMoney } from '@/lib/client-api';
import { formatDate } from '@/lib/i18n-helpers';
import { cn } from '../ui/cn';
import { useAuthed } from './useAuthed';

type Tab = 'overview' | 'applications' | 'courses' | 'live' | 'payments' | 'notifications';
interface Pay { id: string; status: string; amountFils: number; currency: string; receiptNumber: string | null; paidAt: string | null }
interface App { id: string; reference: string; status: string; submittedAt: string | null; program: { nameEn: string; nameAr: string } | null; payments: Pay[] }
interface Enr { id: string; course: { slug: string; code: string; titleEn: string; titleAr: string; deliveryMode: string; _count: { lessons: number; notes: number; quizzes: number } } }
interface Live { id: string; titleEn: string; titleAr: string; scheduledAt: string; durationMin: number; status: string; course: { slug: string; titleEn: string; titleAr: string }; lesson: { id: string } | null; attendance: { totalSeconds: number }[] }
interface Payment { id: string; purpose: string; description: string; amountFils: number; currency: string; status: string; receiptNumber: string | null; paidAt: string | null; createdAt: string }
interface Notif { id: string; type: string; titleEn: string; titleAr: string; bodyEn: string | null; bodyAr: string | null; link: string | null; readAt: string | null; createdAt: string }

const Pill = ({ tone, children }: { tone: 'ok' | 'due' | 'muted' | 'live'; children: ReactNode }) => (
  <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', { ok: 'bg-emerald-50 text-success', due: 'bg-amber-50 text-warning', muted: 'bg-cream-200 text-muted', live: 'bg-red-50 text-danger' }[tone])}>{children}</span>
);
const Empty = ({ children, action }: { children: ReactNode; action?: ReactNode }) => (
  <div className="pattern-cream rounded-3xl border border-dashed border-gold-400/60 p-10 text-center text-muted"><p>{children}</p>{action && <div className="mt-4">{action}</div>}</div>
);

export function AccountDashboard() {
  const t = useTranslations('account');
  const ts = useTranslations('status.statuses');
  const locale = useLocale();
  const router = useRouter();
  const { state, signOut } = useAuthed();
  const tab = (useSearchParams().get('tab') as Tab) || 'overview';
  const [overview, setOverview] = useState<{ applications: number; activeCourses: number; pendingPayments: number; unreadNotifications: number; liveNow: number } | null>(null);
  const [apps, setApps] = useState<{ data: App[]; fee: number | null } | null>(null);
  const [courses, setCourses] = useState<Enr[] | null>(null);
  const [live, setLive] = useState<Live[] | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [notifs, setNotifs] = useState<Notif[] | null>(null);
  const pick = (o: { titleEn: string; titleAr: string }) => (locale === 'ar' ? o.titleAr : o.titleEn);

  useEffect(() => {
    if (state.status !== 'authed') return;
    let c = false;
    const ok = <T,>(set: (v: T) => void) => (v: T) => { if (!c) set(v); };
    void apiFetch<{ data: typeof overview }>('/me/overview').then((r) => ok(setOverview)(r.data)).catch(() => undefined);
    void apiFetch<{ data: App[]; meta: { applicationFeeFils: number | null } }>('/applications/mine').then((r) => ok(setApps)({ data: r.data, fee: r.meta.applicationFeeFils })).catch(() => ok(setApps)({ data: [], fee: null }));
    void apiFetch<{ data: Enr[] }>('/me/courses').then((r) => ok(setCourses)(r.data)).catch(() => ok(setCourses)([]));
    void apiFetch<{ data: Live[] }>('/me/live').then((r) => ok(setLive)(r.data)).catch(() => ok(setLive)([]));
    void apiFetch<{ data: Payment[] }>('/me/payments').then((r) => ok(setPayments)(r.data)).catch(() => ok(setPayments)([]));
    void apiFetch<{ data: Notif[] }>('/me/notifications').then((r) => ok(setNotifs)(r.data)).catch(() => ok(setNotifs)([]));
    return () => { c = true; };
  }, [state.status]);

  if (state.status !== 'authed') return <p className="flex items-center gap-2 py-20 text-muted"><Loader2 className="size-4 animate-spin" />{t('signInRequired')}</p>;

  const tabs: { key: Tab; label: string; icon: typeof Bell; badge?: number }[] = [
    { key: 'overview', label: t('overview'), icon: LayoutDashboard },
    { key: 'applications', label: t('applications'), icon: FileText },
    { key: 'courses', label: t('courses'), icon: BookOpen },
    { key: 'live', label: t('live'), icon: Radio, badge: overview?.liveNow },
    { key: 'payments', label: t('payments'), icon: CreditCard, badge: overview?.pendingPayments },
    { key: 'notifications', label: t('notifications'), icon: Bell, badge: overview?.unreadNotifications },
  ];
  const go = (k: Tab) => router.replace(`/account?tab=${k}`, { scroll: false });
  const liveNow = live?.filter((l) => l.status === 'LIVE') ?? [];
  const appPayment = (a: App) => {
    const paid = a.payments.find((p) => p.status === 'SUCCEEDED');
    if (paid) return <span className="flex flex-wrap items-center gap-2"><Pill tone="ok"><CheckCircle2 className="size-3.5" />{t('paid')}</Pill><Link href={`/account/receipts/${paid.id}`} className="text-xs font-semibold text-brand-700 underline">{t('viewReceipt')}</Link></span>;
    if (['DRAFT', 'RETURNED_FOR_CORRECTION'].includes(a.status) && apps?.fee) return <span className="flex flex-wrap items-center gap-2"><Pill tone="due">{t('feeDue', { amount: formatMoney(apps.fee, 'AED', locale) })}</Pill><Link href="/admissions/apply" className="rounded-full bg-brand-900 px-4 py-1.5 text-xs font-semibold text-white">{t('payNow')}</Link></span>;
    return null;
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
      <aside>
        <div className="glass rounded-3xl p-5">
          <p className="font-display text-2xl font-semibold text-brand-900">{t('welcome', { name: state.user.fullName.split(' ')[0] })}</p>
          <p className="truncate text-xs text-muted">{state.user.email}</p>
          <nav aria-label={t('title')} className="mt-4">
            <ul className="space-y-1">
              {tabs.map((x) => (
                <li key={x.key}>
                  <button onClick={() => go(x.key)} aria-current={tab === x.key ? 'page' : undefined} className={cn('flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-colors', tab === x.key ? 'bg-brand-900 font-semibold text-white' : 'text-brand-900 hover:bg-cream-200')}>
                    <x.icon className="size-4" />{x.label}{!!x.badge && <span className={cn('ms-auto rounded-full px-2 text-[11px] font-bold', tab === x.key ? 'bg-gold-400 text-brand-950' : 'bg-gold-200 text-brand-900')}>{x.badge}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <button onClick={() => void signOut().then(() => router.replace('/'))} className="mt-4 inline-flex items-center gap-2 px-4 text-sm font-semibold text-muted hover:text-danger"><LogOut className="size-4" />{t('signOut')}</button>
        </div>
      </aside>

      <section aria-live="polite">
        {liveNow.length > 0 && (
          <div className="pattern-girih mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5 text-white">
            <p className="flex items-center gap-3"><span className="relative flex size-3"><span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex size-3 rounded-full bg-red-500" /></span><span className="font-semibold">{t('liveNow')}: {pick(liveNow[0])}</span></p>
            <Link href={`/account/live/${liveNow[0].id}`} className="rounded-full bg-gold-400 px-5 py-2 text-sm font-semibold text-brand-950">{t('join')}</Link>
          </div>
        )}

        {tab === 'overview' && (
          <div className="space-y-6">
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[{ l: t('statApplications'), v: overview?.applications, i: FileText, k: 'applications' }, { l: t('statCourses'), v: overview?.activeCourses, i: BookOpen, k: 'courses' }, { l: t('statPayments'), v: overview?.pendingPayments, i: CreditCard, k: 'payments' }, { l: t('statUnread'), v: overview?.unreadNotifications, i: Bell, k: 'notifications' }].map((s) => (
                <li key={s.l}><button onClick={() => go(s.k as Tab)} className="glass w-full rounded-3xl p-5 text-start transition hover:-translate-y-0.5"><s.i className="size-6 text-gold-600" strokeWidth={1.5} /><p className="mt-3 font-display text-4xl font-semibold text-brand-900">{s.v ?? '—'}</p><p className="text-sm text-muted">{s.l}</p></button></li>
              ))}
            </ul>
            <div className="grid gap-4 md:grid-cols-2">
              <Link href="/admissions/apply" className="glass flex items-center gap-4 rounded-3xl p-5 hover:bg-white"><GraduationCap className="size-8 text-brand-800" strokeWidth={1.4} /><span className="font-semibold text-brand-900">{apps?.data.length ? t('continueApplication') : t('startApplication')}</span></Link>
              <Link href="/programs" className="glass flex items-center gap-4 rounded-3xl p-5 hover:bg-white"><BookOpen className="size-8 text-brand-800" strokeWidth={1.4} /><span className="font-semibold text-brand-900">{t('browseCourses')}</span></Link>
            </div>
          </div>
        )}

        {tab === 'applications' && (
          !apps ? <Loader2 className="size-5 animate-spin text-muted" /> : apps.data.length === 0 ? <Empty action={<Link href="/admissions/apply" className="rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white">{t('startApplication')}</Link>}>{t('noApplications')}</Empty> : (
            <ul className="space-y-4">
              {apps.data.map((a) => (
                <li key={a.id} className="glass flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5">
                  <div>
                    <p className="font-mono text-sm font-semibold text-brand-900" dir="ltr">{a.reference}</p>
                    <p className="text-sm text-muted">{a.program ? pick({ titleEn: a.program.nameEn, titleAr: a.program.nameAr }) : '—'}</p>
                    <div className="mt-2 flex flex-wrap gap-2"><Pill tone={a.status === 'APPROVED' ? 'ok' : a.status === 'DRAFT' ? 'muted' : 'due'}>{ts(a.status as 'DRAFT')}</Pill>{appPayment(a)}</div>
                  </div>
                  <div className="flex gap-2">
                    {['DRAFT', 'RETURNED_FOR_CORRECTION'].includes(a.status) ? <Link href="/admissions/apply" className="rounded-full border border-gold-400 px-4 py-2 text-sm font-semibold text-brand-900">{t('continueApplication')}</Link>
                      : <Link href={`/admissions/status?reference=${a.reference}`} className="rounded-full border border-gold-400 px-4 py-2 text-sm font-semibold text-brand-900">{ts(a.status as 'DRAFT')}</Link>}
                  </div>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === 'courses' && (
          !courses ? <Loader2 className="size-5 animate-spin text-muted" /> : courses.length === 0 ? <Empty action={<Link href="/programs" className="rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white">{t('browseCourses')}</Link>}>{t('noCourses')}</Empty> : (
            <ul className="grid gap-5 md:grid-cols-2">
              {courses.map((e) => (
                <li key={e.id} className="glass flex flex-col rounded-3xl p-6">
                  <p className="text-xs font-semibold text-gold-700" dir="ltr">{e.course.code}</p>
                  <p className="mt-1 font-display text-2xl font-semibold text-brand-900">{pick(e.course)}</p>
                  <p className="mt-2 flex flex-wrap gap-3 text-xs text-muted"><span className="flex items-center gap-1"><PlayCircle className="size-3.5" />{e.course._count.lessons} {t('lectures')}</span><span className="flex items-center gap-1"><FileText className="size-3.5" />{e.course._count.notes} {t('notes')}</span><span>{e.course._count.quizzes} {t('quizzes')}</span>{e.course.deliveryMode === 'LIVE' && <Pill tone="live"><Radio className="size-3" />{t('live')}</Pill>}</p>
                  <Link href={`/account/courses/${e.course.slug}`} className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white">{t('goToCourse')}</Link>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === 'live' && (
          !live ? <Loader2 className="size-5 animate-spin text-muted" /> : live.length === 0 ? <Empty>{t('noLive')}</Empty> : (
            <ul className="space-y-3">
              {live.map((l) => (
                <li key={l.id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-3xl p-5">
                  <div>
                    <p className="font-semibold text-brand-900">{pick(l)}</p>
                    <p className="text-sm text-muted">{pick(l.course)} · <Clock className="inline size-3.5" /> {formatDate(l.scheduledAt, locale, { dateStyle: 'medium', timeStyle: 'short' } as Intl.DateTimeFormatOptions)}</p>
                    {l.status === 'ENDED' && l.attendance[0] && <p className="mt-1 text-xs font-semibold text-success">{t('myAttendance', { minutes: Math.round(l.attendance[0].totalSeconds / 60) })}</p>}
                  </div>
                  {l.status === 'LIVE' ? <Link href={`/account/live/${l.id}`} className="inline-flex items-center gap-2 rounded-full bg-danger px-5 py-2 text-sm font-semibold text-white"><Radio className="size-4" />{t('join')}</Link>
                    : l.status === 'ENDED' ? (l.lesson ? <Link href={`/account/courses/${l.course.slug}`} className="text-sm font-semibold text-brand-700 underline">{t('watchRecording')}</Link> : <Pill tone="muted">{t('recent')}</Pill>)
                    : <Pill tone="due">{t('upcoming')}</Pill>}
                </li>
              ))}
            </ul>
          )
        )}

        {tab === 'payments' && (
          !payments ? <Loader2 className="size-5 animate-spin text-muted" /> : payments.length === 0 ? <Empty>{t('noPayments')}</Empty> : (
            <ul className="space-y-3">
              {payments.map((p) => (
                <li key={p.id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-3xl p-5">
                  <div>
                    <p className="font-semibold text-brand-900">{p.description}</p>
                    <p className="text-sm text-muted">{formatMoney(p.amountFils, p.currency, locale)} · {formatDate(p.paidAt ?? p.createdAt, locale)}</p>
                  </div>
                  {p.status === 'SUCCEEDED' ? <Link href={`/account/receipts/${p.id}`} className="inline-flex items-center gap-2 rounded-full border border-gold-400 px-4 py-2 text-sm font-semibold text-brand-900"><Receipt className="size-4" />{t('receipt')} {p.receiptNumber}</Link>
                    : <Pill tone={p.status === 'FAILED' ? 'muted' : 'due'}>{p.status === 'FAILED' ? t('failed') : t('pending')}</Pill>}
                </li>
              ))}
            </ul>
          )
        )}

        {tab === 'notifications' && (
          !notifs ? <Loader2 className="size-5 animate-spin text-muted" /> : notifs.length === 0 ? <Empty>{t('noNotifications')}</Empty> : (
            <ul className="space-y-2">
              {notifs.map((n) => (
                <li key={n.id} className={cn('glass rounded-3xl p-4', !n.readAt && 'ring-2 ring-gold-300')}>
                  <p className="font-semibold text-brand-900">{locale === 'ar' ? n.titleAr : n.titleEn}</p>
                  {(locale === 'ar' ? n.bodyAr : n.bodyEn) && <p className="text-sm text-muted">{locale === 'ar' ? n.bodyAr : n.bodyEn}</p>}
                  <p className="mt-1 flex items-center justify-between text-xs text-muted">{new Date(n.createdAt).toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-GB')}{n.link && <Link href={n.link} className="font-semibold text-brand-700 underline">→</Link>}</p>
                </li>
              ))}
            </ul>
          )
        )}
      </section>
    </div>
  );
}
