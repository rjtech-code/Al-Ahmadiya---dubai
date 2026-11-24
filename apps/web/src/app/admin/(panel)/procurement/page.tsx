'use client';

import { Building, CheckCircle2, ClipboardList, PackageCheck, Plus, ShoppingCart, Trash2, Truck, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { DashPanel, IconStat, Ring, WelcomeBanner } from '@/components/admin/dash';
import { adminBtn, adminInput, ErrorNote, Panel, StatusPill, Table } from '@/components/admin/ui';
import { cn } from '@/components/ui/cn';
import { apiFetch, ApiError, formatMoney } from '@/lib/client-api';

interface Pr { id: string; number: string; title: string; category: string; vendor: string | null; amountFils: number; priority: 'LOW' | 'MEDIUM' | 'HIGH'; status: string; createdAt: string; updatedAt: string; requestedBy: { fullName: string }; approvedBy?: { fullName: string } | null }
interface Facility { id: string; name: string; status: 'OPERATIONAL' | 'MAINTENANCE' | 'CLOSED'; note: string | null; updatedAt: string }
interface Overview { totals: { requests: number; approved: number; orders: number; pending: number }; budget: { usedFils: number; totalFils: number | null }; pending: Pr[]; recent: { id: string; number: string; title: string; status: string; updatedAt: string }[]; facilities: Facility[] }
const err = (e: unknown) => (e instanceof ApiError ? `${e.message}${Array.isArray(e.body.details) ? ` — ${(e.body.details as { message: string }[]).map((d) => d.message).join('; ')}` : ''}` : 'Something went wrong');
const PRIORITY: Record<string, string> = { HIGH: 'bg-red-50 text-danger', MEDIUM: 'bg-amber-50 text-warning', LOW: 'bg-cream-200 text-brand-900' };
const FAC: Record<string, string> = { OPERATIONAL: 'bg-emerald-50 text-success', MAINTENANCE: 'bg-amber-50 text-warning', CLOSED: 'bg-red-50 text-danger' };
const NEXT: Record<string, { to: string; label: string }[]> = { SUBMITTED: [{ to: 'APPROVED', label: 'Approve' }, { to: 'REJECTED', label: 'Reject' }], APPROVED: [{ to: 'ORDERED', label: 'Mark ordered' }], ORDERED: [{ to: 'RECEIVED', label: 'Mark received' }] };
const ago = (d: string) => { const m = Math.round((Date.now() - new Date(d).getTime()) / 60_000); return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

export default function Procurement() {
  const { user } = useAdmin();
  const [tab, setTab] = useState<'overview' | 'requests' | 'facilities'>('overview');
  const [o, setO] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const loadO = useCallback(() => apiFetch<{ data: Overview }>('/admin/procurement/overview').then((r) => setO(r.data)).catch((e: unknown) => setError(err(e))), []);
  useEffect(() => { void loadO(); }, [loadO]);
  const move = async (id: string, to: string) => { try { await apiFetch(`/admin/procurement/requests/${id}/status`, { method: 'POST', json: { to } }); await loadO(); } catch (e) { setError(err(e)); } };
  const usedPct = o?.budget.totalFils ? Math.min(100, Math.round((o.budget.usedFils / o.budget.totalFils) * 100)) : null;

  return (
    <>
      <WelcomeBanner title={`Welcome, ${user.fullName.split(' ')[0]}`} subtitle="Procurement & campus operations." image="/images/campus/academic.jpg" />
      <div role="tablist" className="mb-5 inline-flex gap-1 rounded-full bg-cream-200 p-1">
        {([['overview', 'Overview'], ['requests', 'Purchase requests'], ['facilities', 'Facilities']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); if (k === 'overview') void loadO(); }} className={cn('rounded-full px-4 py-2 text-sm font-semibold', tab === k ? 'bg-brand-900 text-white' : 'text-brand-900')}>{l}</button>)}
      </div>
      <ErrorNote message={error} />
      {tab === 'overview' && (!o ? <p className="text-sm text-muted">Loading…</p> : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <IconStat icon={ShoppingCart} label="Purchase requests (this year)" value={o.totals.requests} hint={`${o.totals.pending} awaiting approval`} />
            <IconStat icon={CheckCircle2} label="Approved" value={o.totals.approved} />
            <IconStat icon={Truck} label="Orders placed" value={o.totals.orders} />
            <IconStat icon={Wallet} label="Budget committed" value={formatMoney(o.budget.usedFils)} hint={o.budget.totalFils ? `of ${formatMoney(o.budget.totalFils)}` : 'Set the budget in Site settings'} />
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <DashPanel title="Budget">
              {usedPct !== null ? (
                <div className="flex items-center gap-6">
                  <Ring value={usedPct} label="Budget committed" />
                  <ul className="space-y-2 text-sm"><li>Committed <strong className="ms-2">{formatMoney(o.budget.usedFils)}</strong></li><li>Remaining <strong className="ms-2">{formatMoney(Math.max(0, o.budget.totalFils! - o.budget.usedFils))}</strong></li><li>Total <strong className="ms-2">{formatMoney(o.budget.totalFils!)}</strong></li></ul>
                </div>
              ) : <p className="text-sm text-muted">No annual budget set. Add <code>procurement.budgetAed</code> in <Link href="/admin/settings" className="font-semibold underline">Site settings</Link>.</p>}
            </DashPanel>
            <DashPanel title="Pending approvals" action={<button onClick={() => setTab('requests')} className="text-xs font-semibold text-brand-700 hover:underline">View all →</button>}>
              {o.pending.length ? (
                <ul className="divide-y divide-line text-sm">{o.pending.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span><span className="block font-semibold text-brand-900">{p.number} · {p.title}</span><span className="text-xs text-muted">{p.category} · {formatMoney(p.amountFils)} · {p.requestedBy.fullName}</span></span>
                    <span className="flex items-center gap-2"><span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', PRIORITY[p.priority])}>{p.priority.toLowerCase()}</span><button onClick={() => void move(p.id, 'APPROVED')} className="text-xs font-semibold text-success">Approve</button><button onClick={() => void move(p.id, 'REJECTED')} className="text-xs font-semibold text-danger">Reject</button></span>
                  </li>
                ))}</ul>
              ) : <p className="text-sm text-muted">No requests waiting.</p>}
            </DashPanel>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <DashPanel title="Campus facilities" action={<button onClick={() => setTab('facilities')} className="text-xs font-semibold text-brand-700 hover:underline">Manage →</button>}>
              {o.facilities.length ? <ul className="space-y-2 text-sm">{o.facilities.map((f) => <li key={f.id} className="flex items-center justify-between"><span className="flex items-center gap-2"><Building className="size-4 text-gold-600" />{f.name}</span><span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', FAC[f.status])}>{f.status.toLowerCase()}</span></li>)}</ul> : <p className="text-sm text-muted">No facilities listed yet.</p>}
              {o.facilities.length > 0 && <p className={cn('mt-3 rounded-xl px-3 py-2 text-sm font-semibold', o.facilities.every((f) => f.status === 'OPERATIONAL') ? 'bg-emerald-50 text-success' : 'bg-amber-50 text-warning')}>{o.facilities.every((f) => f.status === 'OPERATIONAL') ? 'All facilities operational' : `${o.facilities.filter((f) => f.status !== 'OPERATIONAL').length} need attention`}</p>}
            </DashPanel>
            <DashPanel title="Recent activity">
              {o.recent.length ? <ul className="space-y-2 text-sm">{o.recent.map((r) => <li key={r.id} className="flex items-center justify-between gap-2"><span className="truncate">{r.number} · {r.title}</span><span className="flex shrink-0 items-center gap-2"><StatusPill status={r.status} /><span className="text-xs text-muted">{ago(r.updatedAt)}</span></span></li>)}</ul> : <p className="text-sm text-muted">No purchase requests yet.</p>}
            </DashPanel>
          </div>
        </div>
      ))}
      {tab === 'requests' && <Requests onError={setError} />}
      {tab === 'facilities' && <Facilities onError={setError} />}
    </>
  );
}

function Requests({ onError }: { onError: (m: string) => void }) {
  const [rows, setRows] = useState<Pr[] | null>(null);
  const empty = { title: '', category: '', vendor: '', amountAed: '', priority: 'MEDIUM', notes: '' };
  const [f, setF] = useState(empty);
  const load = useCallback(() => apiFetch<{ data: Pr[] }>('/admin/procurement/requests').then((r) => setRows(r.data)).catch((e: unknown) => onError(err(e))), [onError]);
  useEffect(() => { void load(); }, [load]);
  const create = async (e: FormEvent) => {
    e.preventDefault();
    try { await apiFetch('/admin/procurement/requests', { method: 'POST', json: { ...f, amountAed: Number(f.amountAed), vendor: f.vendor || null, notes: f.notes || null } }); setF(empty); await load(); onError(''); } catch (x) { onError(err(x)); }
  };
  const move = async (id: string, to: string) => { try { await apiFetch(`/admin/procurement/requests/${id}/status`, { method: 'POST', json: { to } }); await load(); } catch (x) { onError(err(x)); } };
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
      <div>{rows && (
        <Table head={['Request', 'Amount', 'Priority', 'Status', 'Next step']} empty={!rows.length}>
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-2"><span className="font-semibold text-brand-900">{p.number} · {p.title}</span><span className="block text-xs text-muted">{p.category}{p.vendor ? ` · ${p.vendor}` : ''} · {p.requestedBy.fullName}{p.approvedBy ? ` · decided by ${p.approvedBy.fullName}` : ''}</span></td>
              <td className="px-4 py-2">{formatMoney(p.amountFils)}</td>
              <td className="px-4 py-2"><span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', PRIORITY[p.priority])}>{p.priority.toLowerCase()}</span></td>
              <td className="px-4 py-2"><StatusPill status={p.status} /></td>
              <td className="px-4 py-2">{(NEXT[p.status] ?? []).map((n) => <button key={n.to} onClick={() => void move(p.id, n.to)} className={cn('me-3 text-xs font-semibold', n.to === 'REJECTED' ? 'text-danger' : 'text-brand-700')}>{n.label}</button>)}</td>
            </tr>
          ))}
        </Table>
      )}</div>
      <Panel title="New purchase request">
        <form onSubmit={create} className="space-y-2">
          <input required minLength={2} className={adminInput} placeholder="What is needed" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <input required minLength={2} list="pr-cats" className={adminInput} placeholder="Category (e.g. IT equipment)" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
          <datalist id="pr-cats"><option value="IT equipment" /><option value="Lab supplies" /><option value="Office furniture" /><option value="Library books" /><option value="Maintenance" /><option value="Services" /></datalist>
          <input className={adminInput} placeholder="Vendor (optional)" value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold">Amount (AED)<input required type="number" min={0} step="0.01" className={`${adminInput} mt-1`} value={f.amountAed} onChange={(e) => setF({ ...f, amountAed: e.target.value })} /></label>
            <label className="text-xs font-semibold">Priority<select className={`${adminInput} mt-1`} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></label>
          </div>
          <textarea rows={2} className={`${adminInput} h-auto py-2`} placeholder="Notes (optional)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          <button className={`${adminBtn} w-full`}><Plus className="size-4" />Submit request</button>
        </form>
        <p className="mt-2 flex items-center gap-1 text-xs text-muted"><ClipboardList className="size-3.5" />Submitted → approved → ordered → <PackageCheck className="size-3.5" />received</p>
      </Panel>
    </div>
  );
}

function Facilities({ onError }: { onError: (m: string) => void }) {
  const [rows, setRows] = useState<Facility[] | null>(null);
  const [f, setF] = useState({ name: '', status: 'OPERATIONAL', note: '' });
  const load = useCallback(() => apiFetch<{ data: Facility[] }>('/admin/facilities').then((r) => setRows(r.data)).catch((e: unknown) => onError(err(e))), [onError]);
  useEffect(() => { void load(); }, [load]);
  const save = async (b: { name: string; status: string; note: string | null }) => { try { await apiFetch('/admin/facilities', { method: 'PUT', json: b }); await load(); onError(''); } catch (x) { onError(err(x)); } };
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
      <div>{rows && (
        <Table head={['Facility', 'Status', 'Note', '']} empty={!rows.length}>
          {rows.map((x) => (
            <tr key={x.id}>
              <td className="px-4 py-2 font-semibold text-brand-900">{x.name}</td>
              <td className="px-4 py-2"><select aria-label={`Status of ${x.name}`} className={`${adminInput} h-8 w-40 text-xs`} value={x.status} onChange={(e) => void save({ name: x.name, status: e.target.value, note: x.note })}><option value="OPERATIONAL">Operational</option><option value="MAINTENANCE">Maintenance</option><option value="CLOSED">Closed</option></select></td>
              <td className="px-4 py-2 text-xs">{x.note ?? '—'}</td>
              <td className="px-4 py-2 text-end"><button aria-label="Delete" onClick={async () => { if (!window.confirm(`Remove ${x.name}?`)) return; await apiFetch(`/admin/facilities/${x.id}`, { method: 'DELETE' }); await load(); }} className="text-muted hover:text-danger"><Trash2 className="size-4" /></button></td>
            </tr>
          ))}
        </Table>
      )}</div>
      <Panel title="Add a facility">
        <form onSubmit={(e) => { e.preventDefault(); void save({ name: f.name, status: f.status, note: f.note || null }).then(() => setF({ name: '', status: 'OPERATIONAL', note: '' })); }} className="space-y-2">
          <input required minLength={2} className={adminInput} placeholder="Name (e.g. Library, Labs, Hostel)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <select className={adminInput} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="OPERATIONAL">Operational</option><option value="MAINTENANCE">Maintenance</option><option value="CLOSED">Closed</option></select>
          <input className={adminInput} placeholder="Note (optional)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <button className={`${adminBtn} w-full`}><Plus className="size-4" />Save</button>
        </form>
      </Panel>
    </div>
  );
}
