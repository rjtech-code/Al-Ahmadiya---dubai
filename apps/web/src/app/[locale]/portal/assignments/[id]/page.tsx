'use client';

import { CheckCircle2, FileText, Loader2, Upload } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Card, ErrorBox, Loading, PageTitle, Pill, useApi, useFmt } from '@/components/portal/ui';
import { Link } from '@/i18n/navigation';
import { ApiError, uploadWithProgress } from '@/lib/client-api';

interface A {
  id: string; titleEn: string; titleAr: string; instructionsEn: string | null; instructionsAr: string | null; dueAt: string; maxMarks: number; allowResubmit: boolean;
  course: { code: string; titleEn: string; titleAr: string };
  submission: { text: string | null; fileName: string | null; submittedAt: string; attempts: number; marks: number | null; feedback: string | null; gradedAt: string | null } | null;
}

export default function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('portal.assignments');
  const f = useFmt();
  const { data: a, error, reload } = useApi<A>(`/me/portal/assignments/${id}`);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(''); setMsg('');
    const fd = new FormData();
    if (text.trim()) fd.append('text', text);
    if (file) fd.append('file', file);
    try { await uploadWithProgress(`/me/portal/assignments/${id}/submission`, fd, () => undefined); setMsg(t('submittedOk')); setFile(null); reload(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : t('failed')); } finally { setBusy(false); }
  };

  if (!a) return <>{error ? <ErrorBox message={error} /> : <Loading />}</>;
  const s = a.submission;
  const closed = new Date(a.dueAt) < new Date();
  const canSubmit = !closed && !s?.gradedAt && (!s || a.allowResubmit);
  const instructions = f.locale === 'ar' ? a.instructionsAr ?? a.instructionsEn : a.instructionsEn ?? a.instructionsAr;

  return (
    <>
      <Link href="/portal/assignments" className="mb-3 inline-block text-sm font-semibold text-brand-700">← {t('title')}</Link>
      <PageTitle title={f.L(a)} subtitle={`${a.course.code} · ${f.L(a.course)}`} />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title={t('instructions')}>
          <p className="mb-4 flex flex-wrap gap-3 text-sm"><span className="font-semibold text-brand-900">{t('due', { date: f.dateTime(a.dueAt) })}</span><span className="text-muted">{t('marks', { n: a.maxMarks })}</span>{closed && <Pill status="OVERDUE" label={t('closed')} />}</p>
          {instructions ? <p className="whitespace-pre-line text-sm leading-relaxed text-ink/90">{instructions}</p> : <p className="text-sm text-muted">{t('noInstructions')}</p>}
        </Card>
        <div className="space-y-4">
          {s && (
            <Card title={t('yourSubmission')}>
              <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="size-4" />{t('submittedAt', { date: f.dateTime(s.submittedAt) })}{s.attempts > 1 && ` · ${t('attempts', { n: s.attempts })}`}</p>
              {s.fileName && <p className="mt-2 flex items-center gap-2 text-sm"><FileText className="size-4 text-gold-600" />{s.fileName}</p>}
              {s.text && <p className="mt-2 whitespace-pre-line rounded-xl bg-white p-3 text-sm">{s.text}</p>}
              {s.gradedAt && (
                <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
                  <p className="font-display text-3xl font-semibold text-success">{s.marks}/{a.maxMarks}</p>
                  {s.feedback && <p className="mt-1 text-sm text-ink/90"><strong>{t('feedback')}:</strong> {s.feedback}</p>}
                </div>
              )}
            </Card>
          )}
          {canSubmit ? (
            <Card title={s ? t('resubmit') : t('submit')}>
              <form onSubmit={submit} className="space-y-3">
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder={t('answerPlaceholder')} className="w-full rounded-xl border border-line bg-white p-3 text-sm" />
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-gold-300 bg-white p-3 text-sm"><Upload className="size-4 text-gold-600" />{file ? file.name : t('attachPdf')}<input type="file" accept="application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
                {err && <p role="alert" className="text-sm text-danger">{err}</p>}
                {msg && <p role="status" className="text-sm text-success">{msg}</p>}
                <button disabled={busy || (!text.trim() && !file)} className="inline-flex items-center gap-2 rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy && <Loader2 className="size-4 animate-spin" />}{t('submitBtn')}</button>
              </form>
            </Card>
          ) : !s && <Card><p className="text-sm text-danger">{t('missed')}</p></Card>}
        </div>
      </div>
    </>
  );
}
