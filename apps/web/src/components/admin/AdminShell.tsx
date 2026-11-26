'use client';

import { BookOpen, Briefcase, LibraryBig, ScrollText, ShoppingCart, Building2, CalendarOff, Presentation, Wallet, FileText, GraduationCap, KeyRound, LayoutDashboard, Library, LogOut, Menu, MessageSquare, Radio, Settings, Shield, Users, X, ClipboardCheck, ExternalLink, Network } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { LogoMark } from '../site/Logo';
import { cn } from '../ui/cn';
import { useAdmin } from './AdminContext';

type Group = 'overview' | 'academics' | 'admissions' | 'operations' | 'website' | 'access';
type NavItem = { href: string; label: string; icon: typeof BookOpen; group: Group; show: (can: (p: string) => boolean) => boolean };
export const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, group: 'overview', show: (c) => c('dashboard.read') },
  { href: '/admin/department', label: 'My department', icon: Building2, group: 'overview', show: (c) => c('department.lead') },
  { href: '/admin/teach', label: 'My teaching', icon: Presentation, group: 'overview', show: (c) => c('teach.own') },
  { href: '/admin/assessment-results', label: 'Graded results', icon: ClipboardCheck, group: 'overview', show: (c) => c('teach.own') || c('department.lead') },
  { href: '/admin/admissions/overview', label: 'Admissions overview', icon: LayoutDashboard, group: 'admissions', show: (c) => c('admissions.read') && !c('dashboard.read') },
  { href: '/admin/admissions', label: 'Applications', icon: GraduationCap, group: 'admissions', show: (c) => c('admissions.read') },
  { href: '/admin/courses', label: 'Online courses', icon: BookOpen, group: 'academics', show: (c) => c('lms.manage') },
  { href: '/admin/live', label: 'Live classes', icon: Radio, group: 'academics', show: (c) => c('lms.manage') && c('live.host') },
  { href: '/admin/academics', label: 'Programmes & eligibility', icon: Library, group: 'academics', show: (c) => c('academics.manage') },
  { href: '/admin/colleges', label: 'Colleges', icon: Network, group: 'academics', show: (c) => c('users.read') },
  { href: '/admin/departments', label: 'Departments', icon: Building2, group: 'academics', show: (c) => c('users.read') },
  { href: '/admin/records', label: 'Registrar', icon: ScrollText, group: 'academics', show: (c) => c('records.manage') },
  { href: '/admin/finance', label: 'Finance', icon: Wallet, group: 'operations', show: (c) => c('payments.read') },
  { href: '/admin/hr', label: 'HR overview', icon: Briefcase, group: 'operations', show: (c) => c('hr.manage') },
  { href: '/admin/library', label: 'Library', icon: LibraryBig, group: 'operations', show: (c) => c('library.manage') },
  { href: '/admin/procurement', label: 'Procurement & campus', icon: ShoppingCart, group: 'operations', show: (c) => c('procurement.manage') },
  { href: '/admin/leave', label: 'My leave', icon: CalendarOff, group: 'operations', show: () => true },
  { href: '/admin/cms', label: 'Website content', icon: FileText, group: 'website', show: (c) => c('cms.read') },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare, group: 'website', show: (c) => c('engagement.read') },
  { href: '/admin/settings', label: 'Site settings', icon: Settings, group: 'website', show: (c) => c('settings.write') },
  { href: '/admin/users', label: 'Staff & users', icon: Users, group: 'access', show: (c) => c('users.read') },
  { href: '/admin/roles', label: 'Roles', icon: Shield, group: 'access', show: (c) => c('roles.read') },
  { href: '/admin/staff-logins', label: 'Staff logins', icon: KeyRound, group: 'access', show: (c) => c('security.read') },
];
const GROUPS: { key: Group; label: string }[] = [
  { key: 'overview', label: 'Overview' }, { key: 'admissions', label: 'Admissions' }, { key: 'academics', label: 'Academics' },
  { key: 'operations', label: 'Operations' }, { key: 'website', label: 'Website' }, { key: 'access', label: 'Access' },
];
const roleName = (r: string) => r.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, can, signOut } = useAdmin();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // The most specific matching entry is active (e.g. Admissions overview vs Applications).
  const currentItem = NAV.filter((n) => (n.href === '/admin' ? pathname === '/admin' : pathname === n.href || pathname.startsWith(`${n.href}/`))).sort((a, b) => b.href.length - a.href.length)[0];
  const visible = NAV.filter((n) => n.show(can));
  const initials = user.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const sidebar = (
    <nav aria-label="Administration" className="flex h-full flex-col">
      <Link href="/admin" className="flex h-16 shrink-0 items-center gap-3 border-b border-brand-900/[0.06] px-6">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-900 shadow-md"><LogoMark className="size-7 text-gold-400" /></span>
        <span className="leading-tight"><span className="block font-[family-name:var(--font-cormorant)] text-xl font-semibold text-brand-900">Al Ahmadiya</span><span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-600">Staff ERP</span></span>
      </Link>
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
        {GROUPS.map((g) => {
          const items = visible.filter((n) => n.group === g.key);
          if (!items.length) return null;
          return (
            <div key={g.key}>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted/80">{g.label}</p>
              <ul className="space-y-0.5">
                {items.map((n) => {
                  const on = currentItem?.href === n.href;
                  return (
                    <li key={n.href}>
                      <Link href={n.href} onClick={() => setOpen(false)} aria-current={on ? 'page' : undefined}
                        className={cn('group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', on ? 'bg-brand-900 text-white shadow-[0_8px_20px_-10px_rgb(5_40_42/0.8)]' : 'text-ink/75 hover:bg-cream-100 hover:text-brand-900')}>
                        <n.icon className={cn('size-[18px]', on ? 'text-gold-300' : 'text-brand-700/70 group-hover:text-brand-900')} aria-hidden />{n.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="m-4 flex items-center gap-3 rounded-2xl border border-brand-900/[0.06] bg-cream-50 p-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-400 text-sm font-bold text-brand-950">{initials}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-brand-900">{user.fullName}</span><span className="block truncate text-[11px] text-muted">{roleName(user.roles[0] ?? 'Staff')}</span></span>
        <button type="button" onClick={() => void signOut()} aria-label="Sign out" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-danger"><LogOut className="size-4" /></button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-[#f5f2ec]">
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 border-e border-brand-900/[0.06] bg-white lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 bg-white shadow-2xl">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-brand-900/[0.06] bg-white/85 px-4 backdrop-blur-xl sm:px-8">
          <button className="grid size-10 place-items-center rounded-xl hover:bg-cream-100 lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
          <p className="flex min-w-0 items-center gap-2 text-sm text-muted"><span className="hidden sm:inline">Staff ERP</span><span aria-hidden className="hidden sm:inline">/</span><span className="truncate font-semibold text-brand-900">{currentItem?.label ?? 'Administration'}</span></p>
          <div className="ms-auto flex items-center gap-2">
            <span className="hidden rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-700 md:inline">{roleName(user.roles[0] ?? 'Staff')}</span>
            <Link href="/en" target="_blank" className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-cream-100 sm:inline-flex"><ExternalLink className="size-3.5" />Website</Link>
            <span className="grid size-9 place-items-center rounded-xl bg-brand-900 text-sm font-semibold text-gold-300" title={user.fullName}>{initials}</span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
