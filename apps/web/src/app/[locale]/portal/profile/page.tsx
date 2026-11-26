'use client';

import {
  BellRing, BookOpen, CalendarDays, ChevronRight, Download, FileBadge, FileOutput, FileText, Files, FolderOpen, GraduationCap, Hash, Headset,
  IdCard, KeyRound, Layers, Library, ListFilter, Lock, Mail, MapPin, Pencil, Phone, Printer, Quote, Receipt, Search, Settings, ShieldCheck, Trophy,
  UserRound, Users, X, type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent, type ReactNode } from 'react';
import { ErrorBox, inputCls, Loading, surface, useApi, useFmt } from '@/components/portal/ui';
import { LogoMark } from '@/components/site/Logo';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import { apiFetch, ApiError } from '@/lib/client-api';
import { useSession } from '@/lib/session';

type J = Record<string, unknown> | null;
interface P {
  id: string; studentId: string; fullName: string; email: string; phone: string | null; locale: string; createdAt: string;
  enrolment?: { rollNumber: string; batch: string; section: string; semester: string; status: string };
  application: { reference: string; status: string; personal: J; contact: J; academic: J; program: { nameEn: string; nameAr: string; degreeLevel: string; department: { nameEn: string; nameAr: string } } | null } | null;
}
interface Course { id: string; slug: string; code: string; titleEn: string; titleAr: string; progress: number }
interface Res { cgpa: number | null; creditsEarned: number }

type Tab = 'personal' | 'academic' | 'documents' | 'settings';
type DocKey = 'marksheet' | 'idCard' | 'feeReceipt' | 'bonafide' | 'transfer' | 'others';
const DOCS: { key: DocKey; icon: LucideIcon; tone: string; kind: 'link' | 'id' | 'request'; href?: string }[] = [
  { key: 'marksheet', icon: FileText, tone: 'bg-emerald-50 text-emerald-700', kind: 'link', href: '/portal/results' },
  { key: 'idCard', icon: IdCard, tone: 'bg-sky-50 text-sky-700', kind: 'id' },
  { key: 'feeReceipt', icon: Receipt, tone: 'bg-amber-50 text-amber-700', kind: 'link', href: '/portal/payments' },
  { key: 'bonafide', icon: FileBadge, tone: 'bg-indigo-50 text-indigo-700', kind: 'request' },
  { key: 'transfer', icon: FileOutput, tone: 'bg-violet-50 text-violet-700', kind: 'request' },
  { key: 'others', icon: Files, tone: 'bg-orange-50 text-orange-700', kind: 'link', href: '/portal/documents' },
];
const readRequests = (): DocKey[] => { if (typeof window === 'undefined') return []; try { return JSON.parse(localStorage.getItem('profile.requests') || '[]') as DocKey[]; } catch { return []; } };

export default function Profile() {
  const t = useTranslations('portal.profile');
  const f = useFmt();
  const { reload: reloadSession } = useSession();
  const { data, error, reload } = useApi<P>('/me/portal/profile');
  const { data: courses } = useApi<Course[]>('/me/portal/courses');
  const { data: res } = useApi<Res>('/me/portal/results');
  const [tab, setTab] = useState<Tab>('personal');
  const [form, setForm] = useState<{ fullName: string; phone: string } | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [idOpen, setIdOpen] = useState(false);
  const [requests, setRequests] = useState<DocKey[]>(readRequests);
  const [docQ, setDocQ] = useState('');
  const v = form ?? (data ? { fullName: data.fullName, phone: data.phone ?? '' } : null);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!v) return;
    setMsg(''); setErr('');
    try { await apiFetch('/me/portal/profile', { method: 'PUT', json: v }); setMsg(t('saved')); setForm(null); reload(); void reloadSession(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : t('failed')); }
  };
  const request = (k: DocKey) => { const next = [...new Set([...requests, k])]; setRequests(next); localStorage.setItem('profile.requests', JSON.stringify(next)); };

  if (!data || !v) return <><ErrorBox message={error} /><Loading /></>;
  const app = data.application;
  const p = (app?.personal ?? {}) as Record<string, string | undefined>;
  const c = (app?.contact ?? {}) as Record<string, string | undefined>;
  const en = data.enrolment;
  const initials = data.fullName.split(' ').map((x) => x[0]).slice(0, 2).join('');
  const programme = app?.program ? f.L({ titleEn: app.program.nameEn, titleAr: app.program.nameAr }) : '—';
  const firstCourse = courses?.[0];
  const done = courses?.filter((x) => x.progress >= 100).length ?? 0;
  const docLabel = (k: DocKey) => t(`doc.${k}`);

  const tabs: { key: Tab; label: string; icon: LucideIcon }[] = [
    { key: 'personal', label: t('tabPersonal'), icon: UserRound },
    { key: 'academic', label: t('tabAcademic'), icon: GraduationCap },
    { key: 'documents', label: t('tabDocuments'), icon: FolderOpen },
    { key: 'settings', label: t('tabSettings'), icon: Settings },
  ];

  const docAction = (d: (typeof DOCS)[number], children: ReactNode, className: string) => d.kind === 'link'
    ? <Link href={d.href!} className={className}>{children}</Link>
    : <button type="button" onClick={() => (d.kind === 'id' ? setIdOpen(true) : request(d.key))} className={className}>{children}</button>;

  const profileCard = (
    <section className={cn(surface, 'overflow-hidden')}>
      <div className="pattern-girih relative h-28 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700"><span aria-hidden className="absolute -end-10 -top-10 size-40 rounded-full bg-gold-400/20 blur-2xl" /></div>
      <div className="-mt-16 px-5 pb-5 text-center">
        <div className="relative mx-auto size-28">
          <span className="grid size-28 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-500 font-display text-4xl font-semibold text-brand-950 ring-4 ring-white shadow-lg">{initials}</span>
          <button type="button" onClick={() => setTab('settings')} aria-label={t('editProfile')} className="absolute bottom-1 end-1 grid size-9 place-items-center rounded-full bg-brand-900 text-white ring-4 ring-white hover:bg-brand-800"><Pencil className="size-4" /></button>
        </div>
        <h2 className="mt-3 font-display text-2xl font-semibold text-brand-900">{data.fullName}</h2>
        <p className="text-sm text-muted">{firstCourse ? `${firstCourse.code} · ${f.L(firstCourse)}` : programme}</p>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-success"><span className="size-2 rounded-full bg-success" />{t('activeStudent')}</span>
      </div>
      <dl className="pattern-girih mx-4 mb-4 space-y-2.5 rounded-2xl bg-brand-900 p-4 text-sm text-white">
        {[[Hash, t('studentId'), data.studentId], [IdCard, t('rollNumber'), en?.rollNumber ?? '—'], [Users, t('batch'), en?.batch ?? '—'], [GraduationCap, t('programme'), programme]].map(([Icon, k, val]) => {
          const I = Icon as LucideIcon;
          return <div key={k as string} className="flex items-center gap-3"><I className="size-4 shrink-0 text-gold-300" /><dt className="text-white/70">{k as string}</dt><dd className="ms-auto max-w-[55%] truncate text-end font-semibold">{val as string}</dd></div>;
        })}
      </dl>
      <div className="mx-4 mb-4 hidden items-center gap-4 rounded-2xl bg-gradient-to-br from-cream-100 to-gold-100/60 p-4 lg:flex">
        <span className="relative grid size-16 shrink-0 place-items-center rounded-2xl bg-white shadow-sm"><GraduationCap className="size-9 text-brand-900" /><BookOpen className="absolute -bottom-1.5 -end-1.5 size-6 rounded-md bg-gold-400 p-1 text-brand-950" /></span>
        <p className="text-xs text-muted">{t('memberSince')} <strong className="block text-sm text-brand-900">{f.date(data.createdAt)}</strong></p>
      </div>
    </section>
  );

  const info = (icon: LucideIcon, label: string, value: ReactNode) => {
    const I = icon;
    return (
      <div className="flex items-start gap-3 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><I className="size-[18px]" /></span>
        <div className="min-w-0"><p className="text-xs text-muted">{label}</p><p className="break-words font-semibold text-brand-900 [overflow-wrap:anywhere]">{value || '—'}</p></div>
      </div>
    );
  };

  const cgpaCard = (
    <div className="pattern-girih relative flex items-center gap-4 overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-brand-900 to-brand-700 p-5 text-white shadow-[0_14px_30px_-20px_rgb(5_40_42/0.9)]">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gold-400/20"><Trophy className="size-7 text-gold-300" /></span>
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-300">CGPA</p><p className="font-display text-3xl font-semibold">{res?.cgpa?.toFixed(2) ?? '—'} <span className="text-base text-white/60">/ 4.0</span></p></div>
    </div>
  );

  const docsGrid = (limit?: number) => (
    <ul className="grid grid-cols-3 gap-2 sm:gap-3">
      {DOCS.slice(0, limit).map((d) => (
        <li key={d.key}>{docAction(d, <><span className={cn('grid size-12 place-items-center rounded-2xl', d.tone)}><d.icon className="size-6" /></span><span className="text-center text-xs font-semibold leading-tight text-brand-900">{docLabel(d.key)}</span></>, 'flex w-full flex-col items-center gap-2 rounded-2xl p-2 transition hover:bg-cream-50')}</li>
      ))}
    </ul>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <ErrorBox message={error} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-22 lg:self-start">{profileCard}</aside>

        <div className="min-w-0 space-y-6">
          {/* Header */}
          <header className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-r from-cream-50 via-cream-50 to-cream-100 p-6 sm:p-8">
            <Image src="/images/campus/student-life.jpg" alt="" fill sizes="50vw" className="object-cover object-center opacity-25 [mask-image:linear-gradient(to_right,transparent_35%,black_85%)] rtl:[mask-image:linear-gradient(to_left,transparent_35%,black_85%)]" />
            <div className="relative">
              <h1 className="font-display text-4xl font-semibold text-brand-900">{t('myProfile')}</h1>
              <p className="mt-1 text-muted">{t('manage')}</p>
              <div role="tablist" className="mt-6 grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">
                {tabs.map((x) => (
                  <button key={x.key} role="tab" aria-selected={tab === x.key} onClick={() => setTab(x.key)}
                    className={cn('flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-semibold transition sm:flex-row sm:gap-2 sm:rounded-full sm:px-5 sm:text-sm', tab === x.key ? 'bg-brand-900 text-white shadow-[0_8px_20px_-10px_rgb(5_40_42/0.8)]' : 'bg-white/80 text-brand-900 shadow-sm hover:bg-white')}>
                    <x.icon className={cn('size-5 sm:size-4', tab === x.key && 'text-gold-300')} />{x.label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {tab === 'personal' && (
            <>
              <section className={cn(surface, 'p-5 sm:p-6')}>
                <div className="mb-2 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold text-brand-900"><UserRound className="size-5 text-gold-600" />{t('personalInfo')}</h2><button type="button" onClick={() => setTab('settings')} className="inline-flex items-center gap-2 rounded-full border border-gold-300 bg-white px-4 py-2 text-sm font-semibold text-brand-900 hover:bg-cream-100"><Pencil className="size-4" />{t('editProfile')}</button></div>
                <div className="grid sm:grid-cols-2 sm:gap-x-8 2xl:grid-cols-3">
                  <div className="divide-y divide-line/70">{info(UserRound, t('fullName'), data.fullName)}{info(Users, t('gender'), p.gender ? p.gender[0].toUpperCase() + p.gender.slice(1) : '')}{info(Library, t('nationality'), p.nationality)}</div>
                  <div className="divide-y divide-line/70">{info(Users, t('fatherName'), p.fatherName)}{info(Mail, t('email'), data.email)}{info(MapPin, t('address'), [c.addressLine, c.city, c.country === 'United Arab Emirates' ? 'UAE' : c.country].filter(Boolean).join(', '))}</div>
                  <div className="divide-y divide-line/70">{info(CalendarDays, t('dob'), p.dateOfBirth ? f.date(p.dateOfBirth) : '')}{info(Phone, t('phone'), c.phone ?? data.phone)}</div>
                </div>
              </section>

              <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
                <section className={cn(surface, 'p-5')}>
                  <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold text-brand-900"><GraduationCap className="size-5 text-gold-600" />{t('academicDetails')}</h2><button type="button" onClick={() => setTab('academic')} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">{t('viewDetails')}<ChevronRight className="size-3.5 rtl:rotate-180" /></button></div>
                  <div className="flex gap-4">
                    <span className="relative hidden size-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cream-100 to-gold-100 sm:grid"><GraduationCap className="size-10 text-brand-900" /></span>
                    <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-3 text-sm [&>div:first-child]:col-span-2">
                      {[[t('programme'), programme], [t('batch'), en?.batch], [t('section'), en?.section], [t('semester'), en?.semester]].map(([k, val]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-semibold text-brand-900">{val ?? '—'}</dd></div>)}
                    </dl>
                  </div>
                </section>
                <section className={cn(surface, 'p-5')}>
                  <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold text-brand-900"><FolderOpen className="size-5 text-gold-600" />{t('myDocuments')}</h2><button type="button" onClick={() => setTab('documents')} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">{t('viewAll')}<ChevronRight className="size-3.5 rtl:rotate-180" /></button></div>
                  {docsGrid()}
                </section>
                <div className="grid gap-4 md:col-span-2 md:grid-cols-2 2xl:col-span-1 2xl:grid-cols-1">
                  <section className={cn(surface, 'p-5')}>
                    <h2 className="mb-3 flex items-center gap-2 font-semibold text-brand-900"><Layers className="size-5 text-gold-600" />{t('accountSummary')}</h2>
                    <dl className="space-y-2.5 text-sm">
                      {[[t('totalCourses'), courses?.length ?? 0], [t('completed'), done], [t('inProgress'), (courses?.length ?? 0) - done]].map(([k, val]) => <div key={k as string} className="flex justify-between"><dt className="text-muted">{k}</dt><dd className="font-semibold text-brand-900">{val}</dd></div>)}
                    </dl>
                  </section>
                  {cgpaCard}
                </div>
              </div>

              <div className="grid gap-6 2xl:grid-cols-[1.7fr_1fr]">
                <section className={cn(surface, 'p-5')}>
                  <h2 className="mb-4 font-semibold text-brand-900">{t('quickActions')}</h2>
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:divide-x sm:divide-line/70">
                    {[
                      { icon: Pencil, label: t('updateProfile'), on: () => setTab('settings') },
                      { icon: IdCard, label: t('downloadId'), on: () => setIdOpen(true) },
                      { icon: FileBadge, label: t('doc.bonafide'), on: () => request('bonafide') },
                      { icon: Search, label: t('viewResults'), href: '/portal/results' },
                      { icon: Headset, label: t('contactSupport'), href: '/contact' },
                    ].map((a) => {
                      const body = <><span className="grid size-11 place-items-center rounded-full bg-cream-100 text-brand-900 transition group-hover:bg-gold-100"><a.icon className="size-5" /></span><span className="text-center text-xs font-semibold text-brand-900">{a.label}</span></>;
                      return <li key={a.label}>{a.href ? <Link href={a.href} className="group flex flex-col items-center gap-2 p-2">{body}</Link> : <button type="button" onClick={a.on} className="group flex w-full flex-col items-center gap-2 p-2">{body}</button>}</li>;
                    })}
                  </ul>
                </section>
                <section className="pattern-girih relative overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-brand-900 to-brand-700 p-6 text-white">
                  <Image src="/images/campus/library.jpg" alt="" fill sizes="30vw" className="object-cover opacity-20 mix-blend-luminosity" />
                  <Quote className="relative size-7 text-gold-300" />
                  <p className="relative mt-2 font-display text-2xl italic leading-snug">{t('quote')}</p>
                </section>
              </div>
            </>
          )}

          {tab === 'academic' && (
            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <section className={cn(surface, 'p-5 sm:p-6')}>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-brand-900"><GraduationCap className="size-5 text-gold-600" />{t('academicDetails')}</h2>
                <dl className="grid gap-x-6 sm:grid-cols-2">
                  {[[t('programme'), programme], [t('department'), app?.program ? f.L({ titleEn: app.program.department.nameEn, titleAr: app.program.department.nameAr }) : '—'], [t('batch'), en?.batch], [t('section'), en?.section], [t('semester'), en?.semester], [t('rollNumber'), en?.rollNumber], [t('studentId'), data.studentId], [t('application'), app?.reference]].map(([k, val]) => <div key={k} className="border-b border-dashed border-line py-3"><dt className="text-xs text-muted">{k}</dt><dd className="font-semibold text-brand-900">{val ?? '—'}</dd></div>)}
                </dl>
                <h3 className="mb-3 mt-6 font-semibold text-brand-900">{t('currentCourses')}</h3>
                <ul className="space-y-3">{courses?.map((x) => <li key={x.id}><Link href={`/portal/courses/${x.slug}`} className="block rounded-2xl border border-line/70 p-3 hover:border-gold-400"><p className="flex justify-between text-sm"><span><strong className="text-gold-700">{x.code}</strong> <span className="font-semibold text-brand-900">{f.L(x)}</span></span><span className="text-muted">{x.progress}%</span></p><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-cream-200"><span className="block h-full rounded-full bg-brand-700" style={{ width: `${x.progress}%` }} /></span></Link></li>)}</ul>
              </section>
              <div className="space-y-4">{cgpaCard}<section className={cn(surface, 'p-5')}><dl className="space-y-2.5 text-sm">{[[t('creditsEarned'), res?.creditsEarned ?? 0], [t('totalCourses'), courses?.length ?? 0], [t('completed'), done]].map(([k, val]) => <div key={k as string} className="flex justify-between"><dt className="text-muted">{k}</dt><dd className="font-semibold text-brand-900">{val}</dd></div>)}</dl><Link href="/portal/results" className="mt-4 flex h-10 items-center justify-center rounded-full bg-brand-900 text-sm font-semibold text-white hover:bg-brand-800">{t('viewResults')}</Link></section></div>
            </div>
          )}

          {tab === 'documents' && (
            <section className={cn(surface, 'p-5 sm:p-6')}>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div><h2 className="font-display text-2xl font-semibold text-brand-900">{t('docsTitle')}</h2><p className="text-sm text-muted">{t('docsSubtitle')}</p></div>
                <div className="flex gap-2"><label className="relative"><Search className="absolute start-3.5 top-3 size-4 text-muted" /><input value={docQ} onChange={(e) => setDocQ(e.target.value)} placeholder={t('searchDocs')} aria-label={t('searchDocs')} className={`${inputCls} w-56 ps-10`} /></label><span className="inline-flex h-10 items-center gap-1.5 rounded-full border border-brand-900/10 bg-white px-4 text-sm font-semibold text-brand-900 shadow-sm"><ListFilter className="size-4" />{DOCS.length}</span></div>
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {DOCS.filter((d) => !docQ || docLabel(d.key).toLowerCase().includes(docQ.toLowerCase())).map((d) => {
                  const requested = requests.includes(d.key);
                  return (
                    <li key={d.key} className="flex flex-col items-center rounded-2xl border border-line/70 bg-cream-50/40 p-4 text-center">
                      <span className={cn('grid size-12 place-items-center rounded-2xl', d.tone)}><d.icon className="size-6" /></span>
                      <p className="mt-3 text-sm font-semibold text-brand-900">{docLabel(d.key)}</p>
                      <p className="mt-0.5 text-[11px] text-muted">{t(`docHint.${d.key}`)}</p>
                      {d.kind === 'request' && requested
                        ? <span className="mt-3 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-warning">{t('requested')}</span>
                        : docAction(d, <>{d.kind === 'request' ? <FileBadge className="size-3.5" /> : <Download className="size-3.5" />}{d.kind === 'request' ? t('request') : d.kind === 'id' ? t('download') : t('open')}</>, 'mt-3 inline-flex items-center gap-1.5 rounded-full border border-gold-400 bg-white px-3 py-1 text-[11px] font-semibold text-brand-900 hover:bg-cream-100')}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {tab === 'settings' && (
            <div className="grid gap-6 xl:grid-cols-2">
              <section className={cn(surface, 'p-5 sm:p-6')}>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-brand-900"><Pencil className="size-5 text-gold-600" />{t('updateContact')}</h2>
                <form onSubmit={save} className="space-y-4">
                  <label className="block text-xs font-semibold text-brand-900">{t('fullName')}<input required minLength={2} className={`${inputCls} mt-1.5 w-full`} value={v.fullName} onChange={(e) => setForm({ ...v, fullName: e.target.value })} /></label>
                  <label className="block text-xs font-semibold text-brand-900">{t('phone')}<input dir="ltr" className={`${inputCls} mt-1.5 w-full`} value={v.phone} onChange={(e) => setForm({ ...v, phone: e.target.value })} placeholder="+971 5x xxx xxxx" /></label>
                  {err && <p role="alert" className="text-sm text-danger">{err}</p>}
                  {msg && <p role="status" className="text-sm text-success">{msg}</p>}
                  <button className="h-11 rounded-full bg-brand-900 px-6 text-sm font-semibold text-white hover:bg-brand-800">{t('save')}</button>
                </form>
                <p className="mt-4 text-xs text-muted">{t('contactHint')}</p>
              </section>
              <section className={cn(surface, 'relative overflow-hidden p-5 sm:p-6')}>
                <ShieldCheck aria-hidden className="absolute -bottom-6 -end-6 size-40 text-brand-50" />
                <h2 className="relative font-display text-2xl font-semibold text-brand-900">{t('settingsTitle')}</h2>
                <p className="relative text-sm text-muted">{t('settingsSubtitle')}</p>
                <ul className="relative mt-4 divide-y divide-line/70 rounded-2xl border border-line/70 bg-white">
                  {[{ icon: Lock, label: t('changePassword'), href: '/login/reset' }, { icon: Phone, label: t('updateContact') }, { icon: BellRing, label: t('notificationPrefs'), href: '/portal/notifications' }, { icon: KeyRound, label: t('privacy'), href: '/privacy' }].map((x) => {
                    const body = <><x.icon className="size-[18px] text-brand-700" /><span className="flex-1 text-sm font-medium text-brand-900">{x.label}</span><ChevronRight className="size-4 text-muted rtl:rotate-180" /></>;
                    return <li key={x.label}>{x.href ? <Link href={x.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-cream-50">{body}</Link> : <span className="flex items-center gap-3 px-4 py-3.5">{body}</span>}</li>;
                  })}
                </ul>
              </section>
            </div>
          )}

          <div className="lg:hidden"><button type="button" onClick={() => window.print()} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-900 text-sm font-semibold text-white"><Download className="size-4" />{t('downloadSummary')}</button></div>
        </div>
      </div>

      {/* Printable student ID */}
      {idOpen && (
        <div role="dialog" aria-modal="true" aria-label={t('doc.idCard')} className="fixed inset-0 z-50 grid place-items-center bg-brand-950/60 p-4" onClick={() => setIdOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
            <section className="pattern-girih relative aspect-[1.6] overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 p-6 text-white shadow-2xl">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2"><LogoMark className="size-8 text-gold-400" /><span className="font-display text-lg font-semibold">Al Ahmadiya</span></span><span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-300">{t('studentCard')}</span></div>
              <div className="mt-5 flex items-center gap-4"><span className="grid size-16 place-items-center rounded-2xl bg-gold-400 font-display text-2xl font-semibold text-brand-950">{initials}</span><div><p className="font-display text-2xl font-semibold">{data.fullName}</p><p className="text-sm text-white/70">{programme}</p></div></div>
              <div className="absolute inset-x-6 bottom-5 flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[0.16em] text-gold-300">{t('studentId')}</p><p className="font-mono text-lg font-semibold">{data.studentId}</p></div><div className="text-end"><p className="text-[10px] uppercase tracking-[0.16em] text-gold-300">{t('batch')}</p><p className="font-semibold">{en?.batch}</p></div></div>
            </section>
            <div className="mt-4 flex justify-center gap-2"><button type="button" onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-brand-900"><Printer className="size-4" />{t('print')}</button><button type="button" onClick={() => setIdOpen(false)} className="inline-flex h-11 items-center gap-2 rounded-full bg-white/15 px-5 text-sm font-semibold text-white"><X className="size-4" />{t('close')}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
