'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Card, ErrorBox, inputCls, Loading, PageTitle, Pill, useApi, useFmt } from '@/components/portal/ui';
import { apiFetch, ApiError } from '@/lib/client-api';
import { useSession } from '@/lib/session';

type J = Record<string, unknown> | null;
interface P { id: string; studentId: string; fullName: string; email: string; phone: string | null; locale: string; createdAt: string; application: { reference: string; status: string; personal: J; contact: J; academic: J; program: { nameEn: string; nameAr: string; degreeLevel: string; department: { nameEn: string; nameAr: string } } | null } | null }

export default function Profile() {
  const t = useTranslations('portal.profile');
  const f = useFmt();
  const { reload: reloadSession } = useSession();
  const { data, error, reload } = useApi<P>('/me/portal/profile');
  const [form, setForm] = useState<{ fullName: string; phone: string } | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const v = form ?? (data ? { fullName: data.fullName, phone: data.phone ?? '' } : null);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!v) return;
    setMsg(''); setErr('');
    try { await apiFetch('/me/portal/profile', { method: 'PUT', json: v }); setMsg(t('saved')); setForm(null); reload(); void reloadSession(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : t('failed')); }
  };
  const row = (k: string, val: unknown) => (val === undefined || val === null || val === '' ? null : <div key={k} className="flex justify-between gap-3 border-b border-line py-2 text-sm last:border-0"><dt className="text-muted">{k}</dt><dd className="text-end font-medium text-brand-900">{String(val)}</dd></div>);
  const app = data?.application;
  const p = (app?.personal ?? {}) as Record<string, unknown>;
  const c = (app?.contact ?? {}) as Record<string, unknown>;
  const a = (app?.academic ?? {}) as Record<string, unknown>;

  return (
    <>
      <PageTitle title={t('title')} />
      <ErrorBox message={error} />
      {!data || !v ? <Loading /> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title={t('account')}>
            <dl className="mb-4">{row(t('studentId'), data.studentId)}{row(t('email'), data.email)}{row(t('memberSince'), f.date(data.createdAt))}</dl>
            <form onSubmit={save} className="space-y-3">
              <label className="block text-xs font-semibold">{t('fullName')}<input required minLength={2} className={`${inputCls} mt-1 w-full`} value={v.fullName} onChange={(e) => setForm({ ...v, fullName: e.target.value })} /></label>
              <label className="block text-xs font-semibold">{t('phone')}<input dir="ltr" className={`${inputCls} mt-1 w-full`} value={v.phone} onChange={(e) => setForm({ ...v, phone: e.target.value })} /></label>
              {err && <p role="alert" className="text-sm text-danger">{err}</p>}
              {msg && <p role="status" className="text-sm text-success">{msg}</p>}
              <button className="rounded-full bg-brand-900 px-5 py-2 text-sm font-semibold text-white">{t('save')}</button>
            </form>
          </Card>
          <Card title={t('programme')}>
            {app ? (
              <dl>
                {row(t('programmeName'), app.program ? f.L({ titleEn: app.program.nameEn, titleAr: app.program.nameAr }) : null)}
                {row(t('department'), app.program ? f.L({ titleEn: app.program.department.nameEn, titleAr: app.program.department.nameAr }) : null)}
                {row(t('application'), app.reference)}
                <div className="flex justify-between py-2 text-sm"><span className="text-muted">{t('status')}</span><Pill status={app.status} /></div>
              </dl>
            ) : <p className="text-sm text-muted">{t('noApplication')}</p>}
          </Card>
          {app && (
            <>
              <Card title={t('personal')}><dl>{row(t('dob'), p.dateOfBirth)}{row(t('gender'), p.gender)}{row(t('nationality'), p.nationality)}{row(t('emiratesId'), p.emiratesId)}{row(t('passport'), p.passportNumber)}</dl></Card>
              <Card title={t('contactAcademic')}><dl>{row(t('phone'), c.phone)}{row(t('city'), c.city)}{row(t('country'), c.country)}{row(t('qualification'), a.qualification)}{row(t('school'), a.institution)}{row(t('gradYear'), a.graduationYear)}{row(t('overall'), a.overallPercent ? `${String(a.overallPercent)}%` : null)}</dl></Card>
            </>
          )}
        </div>
      )}
    </>
  );
}
