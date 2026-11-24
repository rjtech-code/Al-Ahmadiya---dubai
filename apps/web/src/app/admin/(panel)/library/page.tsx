'use client';

import { BookCopy, BookOpen, Database, FileText, Library, Newspaper, Plus, RotateCcw, Search, Trash2, TriangleAlert, Users } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { BarChart, DashPanel, IconStat, monthLabel, WelcomeBanner } from '@/components/admin/dash';
import { adminBtn, adminBtnOutline, adminInput, ErrorNote, Panel, Table } from '@/components/admin/ui';
import { cn } from '@/components/ui/cn';
import { apiFetch, ApiError } from '@/lib/client-api';

interface Overview {
  totals: { titles: number; copies: number; eResources: number; activeBorrowers: number; onLoan: number; overdue: number; thisMonth: number };
  byType: { ebooks: number; journals: number; databases: number; papers: number };
  monthly: { month: string; count: number }[];
  dueSoon: { id: string; title: string; borrower: string; dueAt: string; overdue: boolean }[];
  borrowers: { name: string; items: number; nextDue: string }[];
}
interface Item { id: string; type: string; title: string; author: string | null; isbn: string | null; subject: string | null; year: number | null; url: string | null; copies: number; isPublic: boolean; available: number | null; onLoan: number }
interface Loan { id: string; issuedAt: string; dueAt: string; returnedAt: string | null; renewals: number; item: { title: string }; user: { fullName: string; email: string } }
const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Dubai' });
const err = (e: unknown) => (e instanceof ApiError ? `${e.message}${Array.isArray(e.body.details) ? ` — ${(e.body.details as { message: string }[]).map((d) => d.message).join('; ')}` : ''}` : 'Something went wrong');
const TYPES = [['BOOK', 'Book'], ['EBOOK', 'E-book'], ['JOURNAL', 'E-journal'], ['DATABASE', 'Database'], ['PAPER', 'E-paper']] as const;

export default function LibraryAdmin() {
  const { user } = useAdmin();
  const [tab, setTab] = useState<'overview' | 'catalogue' | 'loans'>('overview');
  const [o, setO] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const loadO = useCallback(() => apiFetch<{ data: Overview }>('/admin/library/overview').then((r) => setO(r.data)).catch((e: unknown) => setError(err(e))), []);
  useEffect(() => { void loadO(); }, [loadO]);

  return (
    <>
      <WelcomeBanner title={`Welcome, ${user.fullName.split(' ')[0]}`} subtitle="Library management — catalogue, loans and digital resources." image="/images/campus/library.jpg" />
      <div role="tablist" className="mb-5 inline-flex gap-1 rounded-full bg-cream-200 p-1">
        {([['overview', 'Overview'], ['catalogue', 'Catalogue'], ['loans', 'Issue & return']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); if (k === 'overview') void loadO(); }} className={cn('rounded-full px-4 py-2 text-sm font-semibold', tab === k ? 'bg-brand-900 text-white' : 'text-brand-900')}>{l}</button>)}
      </div>
      <ErrorNote message={error} />
      {tab === 'overview' && (!o ? <p className="text-sm text-muted">Loading…</p> : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <IconStat icon={BookCopy} label="Books" value={o.totals.copies} hint={`${o.totals.titles} titles`} />
            <IconStat icon={Library} label="Digital resources" value={o.totals.eResources} />
            <IconStat icon={Users} label="Active borrowers" value={o.totals.activeBorrowers} hint={`${o.totals.onLoan} items on loan`} />
            <IconStat icon={BookOpen} label="Issued this month" value={o.totals.thisMonth} />
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <DashPanel title="Books issued per month" action={<span className="text-xs text-muted">Last 6 months</span>}>
              <BarChart label="Books issued per month" data={o.monthly.map((m) => ({ x: monthLabel(m.month), y: m.count }))} />
            </DashPanel>
            <DashPanel title="Overdue items">
              <p className={cn('flex items-center gap-2 font-[family-name:var(--font-cormorant)] text-5xl font-semibold', o.totals.overdue ? 'text-danger' : 'text-success')}>{o.totals.overdue}</p>
              <p className={cn('mt-1 flex items-center gap-1 text-sm font-semibold', o.totals.overdue ? 'text-danger' : 'text-muted')}>{o.totals.overdue ? <><TriangleAlert className="size-4" />Need attention</> : 'Nothing overdue'}</p>
              {o.totals.overdue > 0 && <button onClick={() => setTab('loans')} className={`${adminBtnOutline} mt-4`}>Open loans</button>}
            </DashPanel>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <DashPanel title="Due back soonest">
              {o.dueSoon.length ? <ul className="divide-y divide-line text-sm">{o.dueSoon.map((l) => <li key={l.id} className="flex justify-between gap-3 py-2"><span className="min-w-0"><span className="block truncate font-semibold text-brand-900">{l.title}</span><span className="text-xs text-muted">{l.borrower}</span></span><span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', l.overdue ? 'bg-red-50 text-danger' : 'bg-cream-200 text-brand-900')}>{l.overdue ? 'Overdue · ' : 'Due '}{day(l.dueAt)}</span></li>)}</ul> : <p className="text-sm text-muted">No books on loan.</p>}
            </DashPanel>
            <DashPanel title="Active borrowers">
              {o.borrowers.length ? <ul className="divide-y divide-line text-sm">{o.borrowers.map((b) => <li key={b.name} className="flex justify-between py-2"><span className="font-semibold text-brand-900">{b.name}</span><span className="text-xs text-muted">{b.items} item{b.items === 1 ? '' : 's'} · next due {day(b.nextDue)}</span></li>)}</ul> : <p className="text-sm text-muted">No active borrowers.</p>}
            </DashPanel>
          </div>
          <DashPanel title="Digital resources">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[[BookOpen, 'E-books', o.byType.ebooks], [Newspaper, 'E-journals', o.byType.journals], [Database, 'Databases', o.byType.databases], [FileText, 'E-papers', o.byType.papers]].map(([Icon, l, n]) => {
                const I = Icon as typeof BookOpen;
                return <button key={l as string} onClick={() => setTab('catalogue')} className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-white p-4 text-sm font-semibold text-brand-900 hover:border-gold-400"><I className="size-6 text-brand-700" />{l as string}<span className="text-xs font-normal text-muted">{n as number}</span></button>;
              })}
            </div>
          </DashPanel>
        </div>
      ))}
      {tab === 'catalogue' && <Catalogue onError={setError} />}
      {tab === 'loans' && <Loans onError={setError} />}
    </>
  );
}

function Catalogue({ onError }: { onError: (m: string) => void }) {
  const [rows, setRows] = useState<Item[] | null>(null);
  const [q, setQ] = useState('');
  const empty = { type: 'BOOK', title: '', author: '', isbn: '', subject: '', year: '', url: '', copies: '1', isPublic: true };
  const [f, setF] = useState(empty);
  const load = useCallback((text = '') => apiFetch<{ data: Item[] }>(`/admin/library/items${text ? `?q=${encodeURIComponent(text)}` : ''}`).then((r) => setRows(r.data)).catch((e: unknown) => onError(err(e))), [onError]);
  useEffect(() => { void load(); }, [load]);
  const add = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/admin/library/items', { method: 'POST', json: { ...f, year: f.year ? Number(f.year) : null, copies: Number(f.copies || 0), author: f.author || null, isbn: f.isbn || null, subject: f.subject || null, url: f.url || null } });
      setF(empty); await load(q); onError('');
    } catch (x) { onError(err(x)); }
  };
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
      <div>
        <form onSubmit={(e) => { e.preventDefault(); void load(q); }} className="mb-3 flex max-w-md gap-2"><div className="relative flex-1"><Search className="absolute start-3 top-3 size-4 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, author, subject or ISBN" className={`${adminInput} ps-9`} /></div><button className={adminBtn}>Search</button></form>
        {rows && (
          <Table head={['Title', 'Type', 'Availability', 'Public', '']} empty={!rows.length}>
            {rows.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-2"><span className="font-semibold text-brand-900">{i.title}</span><span className="block text-xs text-muted">{[i.author, i.year, i.subject, i.isbn].filter(Boolean).join(' · ')}</span></td>
                <td className="px-4 py-2 text-xs">{TYPES.find((t) => t[0] === i.type)?.[1]}</td>
                <td className="px-4 py-2 text-xs">{i.type === 'BOOK' ? `${i.available}/${i.copies} available` : i.url ? <a href={i.url} target="_blank" rel="noreferrer" className="text-brand-700 underline">Open link</a> : '—'}</td>
                <td className="px-4 py-2 text-xs">{i.isPublic ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-end"><button aria-label="Delete" onClick={async () => { if (!window.confirm(`Delete "${i.title}"?`)) return; try { await apiFetch(`/admin/library/items/${i.id}`, { method: 'DELETE' }); await load(q); } catch (x) { onError(err(x)); } }} className="text-muted hover:text-danger"><Trash2 className="size-4" /></button></td>
              </tr>
            ))}
          </Table>
        )}
      </div>
      <Panel title="Add to catalogue">
        <form onSubmit={add} className="space-y-2">
          <select className={adminInput} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <input required minLength={2} className={adminInput} placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <input className={adminInput} placeholder="Author" value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} />
          <div className="grid grid-cols-2 gap-2"><input className={adminInput} placeholder="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /><input type="number" className={adminInput} placeholder="Year" value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} /></div>
          {f.type === 'BOOK' ? (
            <div className="grid grid-cols-2 gap-2"><input className={adminInput} placeholder="ISBN" value={f.isbn} onChange={(e) => setF({ ...f, isbn: e.target.value })} /><label className="text-xs font-semibold">Copies<input type="number" min={1} className={`${adminInput} mt-1`} value={f.copies} onChange={(e) => setF({ ...f, copies: e.target.value })} /></label></div>
          ) : <input required type="url" className={adminInput} placeholder="Link (https://…)" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={f.isPublic} onChange={(e) => setF({ ...f, isPublic: e.target.checked })} />Show in the student library</label>
          <button className={`${adminBtn} w-full`}><Plus className="size-4" />Add</button>
        </form>
      </Panel>
    </div>
  );
}

function Loans({ onError }: { onError: (m: string) => void }) {
  const [rows, setRows] = useState<Loan[] | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [f, setF] = useState({ itemId: '', email: '', days: '14' });
  const load = useCallback(() => Promise.all([
    apiFetch<{ data: Loan[] }>('/admin/library/loans').then((r) => setRows(r.data)),
    apiFetch<{ data: Item[] }>('/admin/library/items?type=BOOK').then((r) => setItems(r.data)),
  ]).catch((e: unknown) => onError(err(e))), [onError]);
  useEffect(() => { void load(); }, [load]);
  const act = async (path: string) => { try { await apiFetch(path, { method: 'POST' }); await load(); } catch (x) { onError(err(x)); } };
  const issue = async (e: FormEvent) => {
    e.preventDefault();
    try { await apiFetch('/admin/library/loans', { method: 'POST', json: { ...f, days: Number(f.days) } }); setF({ itemId: '', email: '', days: '14' }); await load(); onError(''); } catch (x) { onError(err(x)); }
  };
  const now = new Date().toISOString();
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
      <div>{rows && (
        <Table head={['Book', 'Borrower', 'Due', '']} empty={!rows.length}>
          {rows.map((l) => (
            <tr key={l.id}>
              <td className="px-4 py-2 font-semibold text-brand-900">{l.item.title}</td>
              <td className="px-4 py-2"><span>{l.user.fullName}</span><span className="block text-xs text-muted">{l.user.email}</span></td>
              <td className={cn('px-4 py-2 text-xs font-semibold', l.dueAt < now ? 'text-danger' : 'text-brand-900')}>{day(l.dueAt)}{l.dueAt < now && ' · overdue'}{l.renewals ? ` · renewed ${l.renewals}×` : ''}</td>
              <td className="px-4 py-2 text-end"><button onClick={() => void act(`/admin/library/loans/${l.id}/renew`)} className="me-3 text-xs font-semibold text-brand-700">Renew</button><button onClick={() => void act(`/admin/library/loans/${l.id}/return`)} className="inline-flex items-center gap-1 text-xs font-semibold text-success"><RotateCcw className="size-3.5" />Return</button></td>
            </tr>
          ))}
        </Table>
      )}</div>
      <Panel title="Issue a book">
        <form onSubmit={issue} className="space-y-2">
          <select required className={adminInput} value={f.itemId} onChange={(e) => setF({ ...f, itemId: e.target.value })}><option value="">Choose a book…</option>{items.map((i) => <option key={i.id} value={i.id} disabled={!i.available}>{i.title} ({i.available}/{i.copies})</option>)}</select>
          <input required type="email" className={adminInput} placeholder="Borrower's email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <label className="block text-xs font-semibold">Loan period (days)<input type="number" min={1} max={120} className={`${adminInput} mt-1`} value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })} /></label>
          <button className={`${adminBtn} w-full`}>Issue</button>
        </form>
        <p className="mt-2 text-xs text-muted">The borrower gets a notification with the due date. Up to two renewals per loan.</p>
      </Panel>
    </div>
  );
}
