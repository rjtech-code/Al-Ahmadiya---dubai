'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronDown, Menu, Search, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useSession } from '@/lib/session';
import { cn } from '../ui/cn';
import { NotificationBell } from './NotificationBell';
import { Logo } from './Logo';

type Item = { href: string; label: string };
type Group = { key: string; label: string; href?: string; items?: Item[] };

export function Header() {
  const t = useTranslations('nav');
  const tb = useTranslations('brand');
  const tc = useTranslations('common');
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const { state } = useSession();
  const authed = state.status === 'authed';

  const groups: Group[] = [
    { key: 'home', label: t('home'), href: '/' },
    { key: 'academics', label: t('academics'), items: [{ href: '/colleges', label: t('colleges') }, { href: '/programs', label: t('programs') }, { href: '/courses', label: locale === 'ar' ? 'المقررات' : 'Courses' }, { href: '/faculty', label: t('faculty') }, { href: '/research', label: t('research') }] },
    { key: 'admissions', label: t('admissions'), items: [{ href: '/admissions', label: t('admissions') }, { href: '/admissions/eligibility', label: t('eligibility') }, { href: '/admissions/apply', label: t('apply') }, { href: '/admissions/status', label: t('track') }, { href: '/account', label: t('myPayments') }] },
    { key: 'studentLife', label: t('studentLife'), items: [{ href: '/news', label: t('news') }, { href: '/events', label: t('events') }, { href: '/campus-tour', label: t('tour') }] },
    { key: 'about', label: t('aboutUs'), items: [{ href: '/about', label: t('about') }, { href: '/contact', label: t('contact') }] },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenu(null); setSearchOpen(false); } };
    const onClick = (e: MouseEvent) => { if (navRef.current && !navRef.current.contains(e.target as Node)) setMenu(null); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('keydown', onKey); document.removeEventListener('click', onClick); };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open || searchOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open, searchOpen]);

  const isActive = (g: Group) => (g.href === '/' ? pathname === '/' : !!g.items?.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`)));
  const switchTo = (l: 'en' | 'ar') => { if (l !== locale) router.replace(`${pathname}${window.location.search}`, { locale: l }); };
  const close = () => { setOpen(false); setMenu(null); };

  return (
    <header className={cn('sticky top-0 z-40 transition-all', scrolled ? 'bg-cream-50/90 shadow-[0_8px_30px_-20px_rgb(60_40_10/0.4)] backdrop-blur' : 'bg-transparent')}>
      <div className="container-site flex h-[var(--header-h)] items-center justify-between gap-4">
        <Link href="/" aria-label={tc('home')} onClick={close}>
          <Logo nameEn="Al Ahmadiya" line1={tb('line1')} since={tb('since')} compact={scrolled} />
        </Link>

        <nav ref={navRef} aria-label={t('primary')} className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {groups.map((g) => (
              <li key={g.key} className="relative">
                {g.href ? (
                  <Link href={g.href} aria-current={isActive(g) ? 'page' : undefined} className={cn('inline-flex h-10 items-center rounded-full px-5 text-sm font-medium transition-colors', isActive(g) ? 'bg-brand-900 text-white shadow-md' : 'text-brand-900 hover:bg-white/70')}>
                    {g.label}
                  </Link>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-expanded={menu === g.key}
                      aria-haspopup="true"
                      onClick={() => setMenu(menu === g.key ? null : g.key)}
                      className={cn('inline-flex h-10 items-center gap-1 rounded-full px-4 text-sm font-medium transition-colors', isActive(g) ? 'bg-brand-900 text-white shadow-md' : 'text-brand-900 hover:bg-white/70')}
                    >
                      {g.label}<ChevronDown className={cn('size-3.5 transition-transform', menu === g.key && 'rotate-180')} aria-hidden />
                    </button>
                    <AnimatePresence>
                      {menu === g.key && (
                        <motion.ul initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="glass absolute start-0 top-12 min-w-56 rounded-2xl p-2">
                          {g.items!.map((i) => (
                            <li key={i.href}>
                              <Link href={i.href} onClick={close} aria-current={pathname === i.href ? 'page' : undefined} className={cn('flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm', pathname === i.href ? 'bg-brand-50 font-semibold text-brand-900' : 'text-brand-900 hover:bg-cream-200')}>
                                {i.label}<ArrowRight className="flip-rtl size-3.5 text-gold-600" aria-hidden />
                              </Link>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button type="button" onClick={() => setSearchOpen(true)} aria-label={t('search')} className="grid size-11 place-items-center rounded-full bg-white/70 text-brand-900 shadow-sm hover:bg-white"><Search className="size-5" /></button>
          <div className="hidden items-center gap-1.5 text-sm sm:flex" role="group" aria-label={tc('languageLabel')}>
            <button type="button" lang="ar" onClick={() => switchTo('ar')} aria-pressed={locale === 'ar'} className={cn('px-1', locale === 'ar' ? 'font-bold text-brand-900' : 'text-muted hover:text-brand-900')}>العربية</button>
            <span className="text-line" aria-hidden>|</span>
            <button type="button" lang="en" onClick={() => switchTo('en')} aria-pressed={locale === 'en'} className={cn('px-1', locale === 'en' ? 'font-bold text-brand-900' : 'text-muted hover:text-brand-900')}>EN</button>
          </div>
          {authed && <NotificationBell />}
          <Link href={authed ? '/portal' : '/login'} className="hidden h-11 items-center gap-2 rounded-full bg-brand-900 px-5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-px hover:bg-brand-800 md:inline-flex">
            {authed ? t('account') : t('portal')}<ArrowRight className="flip-rtl size-4" aria-hidden />
          </Link>
          <button type="button" className="grid size-11 place-items-center rounded-full text-brand-900 hover:bg-white/70 xl:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={t('openMenu')} onClick={() => setOpen((o) => !o)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div id="mobile-nav" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="fixed inset-x-0 bottom-0 top-[var(--header-h)] overflow-y-auto bg-cream-50 xl:hidden">
            <nav aria-label={t('primary')} className="container-site space-y-5 py-5">
              {groups.map((g) => (
                <div key={g.key}>
                  {g.href ? (
                    <Link href={g.href} onClick={close} className="block rounded-2xl bg-white px-4 py-3 font-semibold text-brand-900 shadow-sm">{g.label}</Link>
                  ) : (
                    <>
                      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gold-700">{g.label}</p>
                      <ul className="overflow-hidden rounded-2xl bg-white shadow-sm">
                        {g.items!.map((i) => <li key={i.href} className="border-b border-line last:border-0"><Link href={i.href} onClick={close} aria-current={pathname === i.href ? 'page' : undefined} className={cn('flex items-center justify-between px-4 py-3', pathname === i.href ? 'font-semibold text-gold-700' : 'text-brand-900')}>{i.label}<ArrowRight className="flip-rtl size-4 text-gold-600" aria-hidden /></Link></li>)}
                      </ul>
                    </>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-3">
                <Link href={authed ? '/portal' : '/login'} onClick={close} className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-brand-900 text-sm font-semibold text-white">{authed ? t('account') : t('portal')}</Link>
                <button type="button" onClick={() => { close(); switchTo(locale === 'en' ? 'ar' : 'en'); }} className="h-11 rounded-full border border-line bg-white px-5 text-sm font-semibold text-brand-900" lang={locale === 'en' ? 'ar' : 'en'}>{tc('language')}</button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const router = useRouter();
  const [q, setQ] = useState('');
  const [scope, setScope] = useState('/programs');
  const submit = (e: FormEvent) => { e.preventDefault(); if (!q.trim()) return; onClose(); router.push(`${scope}?q=${encodeURIComponent(q.trim())}`); };
  return (
    <AnimatePresence>
      {open && (
        <motion.div role="dialog" aria-modal="true" aria-label={t('searchTitle')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-start bg-brand-950/50 px-4 pt-28 backdrop-blur-sm" onClick={onClose}>
          <motion.form initial={{ y: -12 }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} onSubmit={submit} className="glass mx-auto w-full max-w-2xl rounded-3xl p-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-2xl font-semibold text-brand-900">{t('searchTitle')}</h2><button type="button" onClick={onClose} aria-label={tc('close')} className="grid size-9 place-items-center rounded-full hover:bg-cream-200"><X className="size-5" /></button></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative flex-1"><span className="sr-only">{t('search')}</span><Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
                <input autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} maxLength={100} placeholder={tc('searchPlaceholder')} className="h-12 w-full rounded-full border border-line bg-white ps-12 pe-4 outline-none focus:border-gold-500" />
              </label>
              <label className="sr-only" htmlFor="search-scope">{t('searchIn')}</label>
              <select id="search-scope" value={scope} onChange={(e) => setScope(e.target.value)} className="h-12 rounded-full border border-line bg-white px-4 text-sm"><option value="/programs">{t('programs')}</option><option value="/faculty">{t('faculty')}</option><option value="/research">{t('research')}</option><option value="/colleges">{t('colleges')}</option></select>
              <button type="submit" className="h-12 rounded-full bg-brand-900 px-6 text-sm font-semibold text-white hover:bg-brand-800">{t('search')}</button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
