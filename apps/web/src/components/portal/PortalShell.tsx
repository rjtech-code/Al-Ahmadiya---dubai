'use client';

import {
  BarChart3, Bell, LibraryBig, BookOpen, CalendarDays, ChevronDown, FileText, Globe, Home, LayoutGrid, Loader2, LogOut, Menu,
  PlayCircle, Radio, Search, User, UserCheck, Wallet, X, type LucideIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { apiFetch } from '@/lib/client-api';
import { useAuthed } from '../account/useAuthed';
import { LogoMark } from '../site/Logo';
import { NotificationBell } from '../site/NotificationBell';
import { cn } from '../ui/cn';

type NavItem = { href: string; key: string; icon: LucideIcon };
const GROUPS: { key: string; items: NavItem[] }[] = [
  { key: 'groupLearn', items: [
    { href: '/portal', key: 'dashboard', icon: LayoutGrid },
    { href: '/portal/courses', key: 'courses', icon: BookOpen },
    { href: '/portal/live', key: 'live', icon: Radio },
    { href: '/portal/lectures', key: 'lectures', icon: PlayCircle },
    { href: '/portal/schedule', key: 'schedule', icon: CalendarDays },
  ] },
  { key: 'groupProgress', items: [
    { href: '/portal/attendance', key: 'attendance', icon: UserCheck },
    { href: '/portal/results', key: 'results', icon: BarChart3 },
  ] },
  { key: 'groupAccount', items: [
    { href: '/portal/payments', key: 'payments', icon: Wallet },
    { href: '/portal/documents', key: 'documents', icon: FileText },
    { href: '/portal/library', key: 'library', icon: LibraryBig },
    { href: '/portal/notifications', key: 'notifications', icon: Bell },
    { href: '/portal/profile', key: 'profile', icon: User },
  ] },
];
const NAV: NavItem[] = GROUPS.flatMap((g) => g.items);
const BOTTOM = [
  { href: '/portal', key: 'home', icon: Home },
  { href: '/portal/courses', key: 'courses', icon: BookOpen },
  { href: '/portal/live', key: 'live', icon: PlayCircle },
  { href: '/portal/schedule', key: 'schedule', icon: CalendarDays },
  { href: '/portal/profile', key: 'profile', icon: User },
] as const;

/** Authenticated student app: its own sidebar, top bar and mobile bottom navigation (separate from the public website). */
export function PortalShell({ children }: { children: ReactNode }) {
  const t = useTranslations('portal.nav');
  const tp = useTranslations('portal');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { state, signOut } = useAuthed();
  const [open, setOpen] = useState(false);
  const [courseLectureMode, setCourseLectureMode] = useState(false);
  const isCourseDetail = /^\/portal\/courses\/[^/]+/.test(pathname);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState('');
  const [unread, setUnread] = useState(0);
  const authed = state.status === 'authed';
  const active = (h: string) => (h === '/portal' ? pathname === '/portal' : pathname.startsWith(h));

  useEffect(() => {
    const handleCourseMode = (event: Event) => setCourseLectureMode(Boolean((event as CustomEvent<{ lecture?: boolean }>).detail?.lecture));
    window.addEventListener('lms-course-view-mode', handleCourseMode);
    return () => window.removeEventListener('lms-course-view-mode', handleCourseMode);
  }, []);

  useEffect(() => {
    if (!authed) return;
    const load = () => apiFetch<{ data: { unread: number } }>('/me/notifications/unread-count').then((r) => setUnread(r.data.unread)).catch(() => undefined);
    void load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [authed, pathname]);

  if (state.status !== 'authed') return <div className="grid min-h-dvh place-items-center text-muted"><Loader2 className="size-6 animate-spin" /></div>;
  const user = state.user;
  const initials = user.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const search = (e: FormEvent) => { e.preventDefault(); if (q.trim()) router.push(`/portal/lectures?q=${encodeURIComponent(q.trim())}`); };
  const exit = () => void signOut().then(() => router.replace('/'));

  const current = [...NAV].reverse().find((n) => active(n.href));
  const sidebar = (onClick?: () => void) => (
    <nav aria-label={tp('appName')} className="flex h-full flex-col">
      <Link href="/portal" onClick={onClick} className="flex h-16 shrink-0 items-center gap-3 border-b border-brand-900/[0.06] px-6">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-900 shadow-md"><LogoMark className="size-7 text-gold-400" /></span>
        <span className="leading-tight"><span className="block font-display text-xl font-semibold text-brand-900">{tp('university')}</span><span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-600">{tp('appName')}</span></span>
      </Link>
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {GROUPS.map((g) => (
          <div key={g.key}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted/80">{t(g.key)}</p>
            <ul className="space-y-0.5">
              {g.items.map((n) => {
                const on = active(n.href) && current?.href === n.href;
                return (
                  <li key={n.href}>
                    <Link href={n.href} onClick={onClick} aria-current={on ? 'page' : undefined}
                      className={cn('group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', on ? 'bg-brand-900 text-white shadow-[0_8px_20px_-10px_rgb(5_40_42/0.8)]' : 'text-ink/75 hover:bg-cream-100 hover:text-brand-900')}>
                      <n.icon className={cn('size-[18px]', on ? 'text-gold-300' : 'text-brand-700/70 group-hover:text-brand-900')} aria-hidden /><span className="flex-1">{t(n.key)}</span>
                      {n.key === 'notifications' && unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-gold-500 px-1.5 text-[11px] font-bold text-brand-950">{unread}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="m-4 flex items-center gap-3 rounded-2xl border border-brand-900/[0.06] bg-cream-50 p-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-400 text-sm font-bold text-brand-950">{initials}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-brand-900">{user.fullName}</span><span className="block truncate text-[11px] text-muted">{user.email}</span></span>
        <button type="button" onClick={exit} aria-label={t('signOut')} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-danger"><LogOut className="size-4" /></button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-[#f5f2ec]">
      {(!isCourseDetail || !courseLectureMode) && <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 border-e border-brand-900/[0.06] bg-white lg:block">{sidebar()}</aside>}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label={t('close')} className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 bg-white shadow-2xl">{sidebar(() => setOpen(false))}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-brand-900/[0.06] bg-white/85 px-4 backdrop-blur-xl sm:px-8">
          <button className="grid size-10 place-items-center rounded-full hover:bg-cream-200 lg:hidden" aria-label={t('menu')} onClick={() => setOpen(true)}><Menu className="size-5" /></button>
          <Link href="/portal" className="flex items-center gap-2 lg:hidden"><LogoMark className="size-8 text-brand-900" /><span className="font-display text-base font-semibold leading-none text-brand-900">{tp('university')}</span></Link>
          {current && <p className="hidden min-w-0 shrink-0 items-center gap-2 text-sm text-muted lg:flex"><span>{tp('university')}</span><span aria-hidden>/</span><span className="font-semibold text-brand-900">{t(current.key)}</span></p>}
          <form onSubmit={search} role="search" className="relative hidden max-w-sm flex-1 md:ms-6 md:block">
            <Search className="absolute start-4 top-3 size-4 text-muted" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tp('searchPlaceholder')} aria-label={tp('searchPlaceholder')} className="h-10 w-full rounded-xl border border-transparent bg-[#f5f2ec] ps-11 pe-4 text-sm outline-none focus:border-gold-500 focus:bg-white focus:ring-2 focus:ring-gold-200" />
          </form>
          <div className="ms-auto flex items-center gap-1 sm:gap-2">
            <button type="button" onClick={() => router.replace(pathname, { locale: locale === 'ar' ? 'en' : 'ar' })} className="hidden rounded-full px-3 py-2 text-xs font-semibold text-brand-900 hover:bg-cream-200 sm:block" lang={locale === 'ar' ? 'en' : 'ar'}>{locale === 'ar' ? 'EN' : 'العربية'}</button>
            <NotificationBell />
            <div className="relative">
              <button onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu" className="flex items-center gap-2 rounded-full p-1 pe-2 hover:bg-cream-200">
                <span className="grid size-9 place-items-center rounded-xl bg-brand-900 text-sm font-semibold text-gold-300">{initials}</span>
                <span className="hidden text-sm font-semibold text-brand-900 sm:block">{user.fullName}</span>
                <ChevronDown className="hidden size-4 text-muted sm:block" />
              </button>
              {menu && (
                <div role="menu" className="absolute end-0 top-12 w-56 overflow-hidden rounded-2xl border border-line bg-white py-1 shadow-xl" onClick={() => setMenu(false)}>
                  <Link role="menuitem" href="/portal/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-cream-100"><User className="size-4" />{t('profile')}</Link>
                  <Link role="menuitem" href="/" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-cream-100"><Globe className="size-4" />{t('website')}</Link>
                  <button role="menuitem" onClick={() => router.replace(pathname, { locale: locale === 'ar' ? 'en' : 'ar' })} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-cream-100 sm:hidden">{locale === 'ar' ? 'English' : 'العربية'}</button>
                  <button role="menuitem" onClick={exit} className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-sm text-danger hover:bg-red-50"><LogOut className="size-4" />{t('signOut')}</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className={cn("flex-1 px-4 pt-6 sm:px-8 lg:pb-10", isCourseDetail ? "pb-10" : "pb-28")}>{children}</main>
      </div>

      {/* Mobile app-style bottom navigation */}
      {!isCourseDetail && <nav aria-label={tp('appName')} className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-brand-900/[0.06] bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur lg:hidden">
        {BOTTOM.map((n) => (
          <Link key={n.href} href={n.href} aria-current={active(n.href) ? 'page' : undefined} className={cn('flex flex-col items-center gap-0.5 py-1 text-[11px] font-semibold', active(n.href) ? 'text-brand-900' : 'text-muted')}>
            <n.icon className={cn('size-5', active(n.href) && 'text-gold-600')} />{t(n.key)}
          </Link>
        ))}
      </nav>}
      {open && <button className="fixed end-4 top-4 z-[60] grid size-10 place-items-center rounded-full bg-white lg:hidden" aria-label={t('close')} onClick={() => setOpen(false)}><X className="size-5" /></button>}
    </div>
  );
}
