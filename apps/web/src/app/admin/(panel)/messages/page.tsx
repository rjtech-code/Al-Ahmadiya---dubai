'use client';

import { useEffect, useState } from 'react';
import { ErrorNote, PageHeader, Pager, Panel } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

interface M { id: string; fullName: string; email: string; phone: string | null; subject: string | null; message: string; locale: string; createdAt: string }
interface S { id: string; email: string; locale: string; createdAt: string }

export default function MessagesPage() {
  const [rows, setRows] = useState<M[]>([]);
  const [subs, setSubs] = useState<{ data: S[]; total: number }>({ data: [], total: 0 });
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  useEffect(() => {
    let c = false;
    apiFetch<{ data: M[]; meta: { page: number; totalPages: number } }>(`/admin/contact-messages?page=${page}&pageSize=20`).then((r) => { if (!c) { setRows(r.data); setMeta(r.meta); } }).catch((e: unknown) => { if (!c) setError(e instanceof ApiError ? e.message : 'Failed'); });
    apiFetch<{ data: S[]; meta: { total: number } }>('/admin/newsletter-subscribers?pageSize=10').then((r) => { if (!c) setSubs({ data: r.data, total: r.meta.total }); }).catch(() => undefined);
    return () => { c = true; };
  }, [page]);
  return (
    <>
      <PageHeader title="Messages & subscribers" crumbs={[{ label: 'Messages' }]} />
      <ErrorNote message={error} />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {rows.length ? rows.map((m) => (
            <Panel key={m.id} title={`${m.subject || '(no subject)'} — ${m.fullName}`}>
              <p className="text-xs text-muted"><a href={`mailto:${m.email}`} className="underline">{m.email}</a>{m.phone && ` · ${m.phone}`} · {m.locale.toUpperCase()} · {new Date(m.createdAt).toLocaleString('en-GB')}</p>
              <p className="mt-2 whitespace-pre-line text-sm" dir="auto">{m.message}</p>
            </Panel>
          )) : <p className="rounded-lg border border-line bg-white p-8 text-center text-sm text-muted">No messages.</p>}
          <Pager page={meta.page} totalPages={meta.totalPages} onPage={setPage} />
        </div>
        <Panel title={`Newsletter subscribers (${subs.total})`}>
          <ul className="space-y-1 text-sm">{subs.data.map((s) => <li key={s.id} className="flex justify-between gap-2"><span className="truncate">{s.email}</span><span className="text-xs text-muted">{s.locale}</span></li>)}</ul>
        </Panel>
      </div>
    </>
  );
}
