'use client';

import { BookOpen, Briefcase, LibraryBig, ScrollText, ShoppingCart, Building2, CalendarOff, Presentation, Wallet, FileText, GraduationCap, KeyRound, LayoutDashboard, Library, LogOut, Menu, MessageSquare, Radio, Settings, Shield, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { LogoMark } from '../site/Logo';
import { cn } from '../ui/cn';
import { useAdmin } from './AdminContext';

type NavItem = { href: string; label: string; icon: typeof BookOpen; show: (can: (p: string) => boolean) => boolean };
export const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, show: (c) => c('dashboard.read') },
  { href: '/admin/department', label: 'My department', icon: Building2, show: (c) => c('department.lead') },
  { href: '/admin/teach', label: 'My teaching', icon: Presentation, show: (c) => c('teach.own') },
  { href: '/admin/courses', label: 'Online courses', icon: BookOpen, show: (c) => c('lms.manage') },
  { href: '/admin/live', label: 'All live classes', icon: Radio, show: (c) => c('lms.manage') && c('live.host') },
  { href: '/admin/admissions/overview', label: 'Admissions overview', icon: LayoutDashboard, show: (c) => c('admissions.read') && !c('dashboard.read') },
  { href: '/admin/admissions', label: 'Applications', icon: GraduationCap, show: (c) => c('admissions.read') },
  { href: '/admin/academics', label: 'Programmes & eligibility', icon: Library, show: (c) => c('academics.manage') },
  { href: '/admin/records', label: 'Registrar', icon: ScrollText, show: (c) => c('records.manage') },
  { href: '/admin/finance', label: 'Finance', icon: Wallet, show: (c) => c('payments.read') },
  { href: '/admin/library', label: 'Library', icon: LibraryBig, show: (c) => c('library.manage') },
  { href: '/admin/procurement', label: 'Procurement & campus', icon: ShoppingCart, show: (c) => c('procurement.manage') },
  { href: '/admin/cms', label: 'Website content', icon: FileText, show: (c) => c('cms.read') },
  { href: '/admin/settings', label: 'Site settings', icon: Settings, show: (c) => c('settings.write') },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare, show: (c) => c('engagement.read') },
  { href: '/admin/hr', label: 'HR overview', icon: Briefcase, show: (c) => c('hr.manage') },
  { href: '/admin/users', label: 'Staff & users', icon: Users, show: (c) => c('users.read') },
  { href: '/admin/roles', label: 'Roles', icon: Shield, show: (c) => c('roles.read') },
  { href: '/admin/staff-logins', label: 'Staff logins', icon: KeyRound, show: (c) => c('security.read') },
  { href: '/admin/leave', label: 'My leave', icon: CalendarOff, show: () => true },
];
const UPCOMING = ['Payroll', 'Recruitment'];

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, can, signOut } = useAdmin();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // The most specific matching entry is active (e.g. Admissions overview vs Applications).
  const current = NAV.filter((n) => (n.href === '/admin' ? pathname === '/admin' : pathname === n.href || pathname.startsWith(`${n.href}/`))).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const active = (h: string) => h === current;

  const sidebar = (
    <nav aria-label="Administration" className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-3 px-6 py-6 text-white">
        <LogoMark className="size-10 text-gold-400" />
        <span className="leading-tight"><span className="block font-[family-name:var(--font-cormorant)] text-xl font-semibold uppercase tracking-wide">Al Ahmadiya</span><span className="text-[11px] uppercase tracking-[0.2em] text-white/60">Administration</span></span>
      </Link>
      <ul className="flex-1 space-y-0.5 px-3">
        {NAV.filter((n) => n.show(can)).map((n) => (
          <li key={n.href}>
            <Link href={n.href} onClick={() => setOpen(false)} aria-current={active(n.href) ? 'page' : undefined} className={cn('flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-colors', active(n.href) ? 'bg-gold-400 font-semibold text-brand-950 shadow' : 'text-white/75 hover:bg-white/10 hover:text-white')}>
              <n.icon className="size-4" aria-hidden />{n.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="px-5 pb-3 pt-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">ERP modules — next phases</p>
        <ul className="flex flex-wrap gap-1">{UPCOMING.map((u) => <li key={u} className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-white/50">{u}</li>)}</ul>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="pattern-girih sticky top-0 hidden h-dvh w-68 shrink-0 overflow-y-auto rounded-e-[2rem] lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="pattern-girih absolute inset-y-0 start-0 w-68 overflow-y-auto">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 mx-4 mt-3 flex h-16 items-center justify-between rounded-full border border-white/80 bg-cream-50/90 px-5 shadow-[var(--shadow-card)] backdrop-blur sm:mx-6">
          <button className="grid size-9 place-items-center rounded-md hover:bg-brand-50 lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
          <span className="hidden text-xs text-muted lg:block">Signed in as <strong className="text-brand-900">{user.fullName}</strong> · {user.roles.join(', ')}</span>
          <div className="flex items-center gap-3">
            <Link href="/en" className="text-xs font-semibold text-brand-700 hover:underline" target="_blank">View website</Link>
            <button onClick={() => void signOut()} className="inline-flex items-center gap-1 rounded-full bg-brand-900 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800"><LogOut className="size-3.5" />Sign out</button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
