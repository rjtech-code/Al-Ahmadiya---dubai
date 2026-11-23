'use client';

import { CheckCircle2, Download, Eye, FileText, Loader2, PlayCircle, Radio, XCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { apiFetch, ApiError } from '@/lib/client-api';
import { Markdown } from '@/lib/markdown';
import { cn } from '../ui/cn';
import { useAuthed } from './useAuthed';

interface Lesson { id: string; titleEn: string; titleAr: string; descriptionEn: string | null; descriptionAr: string | null; durationSec: number | null; hasVideo: boolean }
interface Note { id: string; titleEn: string; titleAr: string; bodyEn: string | null; bodyAr: string | null; fileName: string | null; hasFile: boolean }
interface Quiz { id: string; titleEn: string; titleAr: string; passPercent: number; questions: { textEn: string; textAr: string; options: { en: string; ar: string }[] }[]; lastAttempt: { score: number; total: number; passed: boolean } | null }
interface Course { slug: string; code: string; titleEn: string; titleAr: string; deliveryMode: string; lessons: Lesson[]; notes: Note[]; quizzes: Quiz[]; liveSessions: { id: string; titleEn: string; titleAr: string; scheduledAt: string; status: string }[] }

export function LearnCourse({ slug }: { slug: string }) {
  const t = useTranslations('account');
  const locale = useLocale();
  const L = <T extends { titleEn: string; titleAr: string }>(o: T) => (locale === 'ar' ? o.titleAr : o.titleEn);
  const { state } = useAuthed();
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'lectures' | 'notes' | 'quizzes'>('lectures');
  const [current, setCurrent] = useState<Lesson | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [reader, setReader] = useState<{ note: Note; url?: string } | null>(null);

  useEffect(() => {
    if (state.status !== 'authed') return;
    let c = false;
    apiFetch<{ data: Course }>(`/me/courses/${encodeURIComponent(slug)}`).then((r) => { if (!c) setCourse(r.data); }).catch((e: unknown) => { if (!c) setError(e instanceof ApiError ? e.message : 'Error'); });
    return () => { c = true; };
  }, [state.status, slug]);

  const play = async (l: Lesson) => {
    setCurrent(l); setVideoUrl(null);
    try { setVideoUrl((await apiFetch<{ data: { url: string } }>(`/me/lessons/${l.id}/url`)).data.url); } catch (e) { setError(e instanceof ApiError ? e.message : 'Error'); }
  };
  const noteUrl = async (n: Note, download: boolean) => (await apiFetch<{ data: { url: string } }>(`/me/notes/${n.id}/url${download ? '?download=1' : ''}`)).data.url;

  if (error) return <div className="rounded-3xl bg-red-50 p-6 text-danger">{error} <Link href="/account?tab=courses" className="ms-2 underline">{t('backToAccount')}</Link></div>;
  if (!course) return <p className="flex items-center gap-2 text-muted"><Loader2 className="size-4 animate-spin" />{t('loadingVideo')}</p>;

  return (
    <div>
      <p className="text-sm font-semibold text-gold-700" dir="ltr">{course.code}</p>
      <h1 className="font-display text-4xl font-semibold text-brand-900 sm:text-5xl">{L(course)}</h1>
      {course.liveSessions.some((s) => s.status === 'LIVE') && (
        <Link href={`/account/live/${course.liveSessions.find((s) => s.status === 'LIVE')!.id}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-danger px-5 py-2 text-sm font-semibold text-white"><Radio className="size-4" />{t('liveNow')} — {t('join')}</Link>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="overflow-hidden rounded-[2rem] bg-brand-950 shadow-[var(--shadow-card)]">
          {current && videoUrl ? (
            <video key={videoUrl} src={videoUrl} controls controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} className="aspect-video w-full bg-black" autoPlay />
          ) : (
            <div className="grid aspect-video place-items-center text-white/70">{current ? <Loader2 className="size-6 animate-spin" /> : <p className="flex items-center gap-2"><PlayCircle className="size-6" />{t('selectLecture')}</p>}</div>
          )}
          {current && (
            <div className="bg-cream-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">{t('nowPlaying')}</p>
              <p className="font-display text-2xl font-semibold text-brand-900">{L(current)}</p>
              {(locale === 'ar' ? current.descriptionAr : current.descriptionEn) && <p className="mt-1 text-sm text-muted">{locale === 'ar' ? current.descriptionAr : current.descriptionEn}</p>}
            </div>
          )}
        </div>

        <div className="glass rounded-[2rem] p-4">
          <div role="tablist" className="mb-3 flex gap-1 rounded-full bg-cream-200 p-1">
            {(['lectures', 'notes', 'quizzes'] as const).map((k) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn('flex-1 rounded-full py-2 text-xs font-semibold', tab === k ? 'bg-brand-900 text-white' : 'text-brand-900')}>{t(k)}</button>
            ))}
          </div>
          {tab === 'lectures' && (course.lessons.length ? (
            <ol className="space-y-1">
              {course.lessons.map((l, i) => (
                <li key={l.id}>
                  <button onClick={() => void play(l)} className={cn('flex w-full items-start gap-3 rounded-2xl p-3 text-start hover:bg-cream-200', current?.id === l.id && 'bg-gold-100')}>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-900 text-xs font-semibold text-white">{i + 1}</span>
                    <span className="min-w-0"><span className="block text-sm font-semibold text-brand-900">{L(l)}</span>{l.durationSec ? <span className="text-xs text-muted">{Math.round(l.durationSec / 60)} min</span> : null}</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : <p className="p-4 text-sm text-muted">{t('noLectures')}</p>)}

          {tab === 'notes' && (course.notes.length ? (
            <ul className="space-y-2">
              {course.notes.map((n) => (
                <li key={n.id} className="rounded-2xl bg-cream-50 p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-brand-900"><FileText className="size-4 text-gold-600" />{L(n)}</p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={async () => setReader({ note: n, url: n.hasFile ? await noteUrl(n, false) : undefined })} className="inline-flex items-center gap-1 rounded-full border border-gold-400 px-3 py-1 text-xs font-semibold"><Eye className="size-3.5" />{t('read')}</button>
                    {n.hasFile && <button onClick={async () => { window.location.href = await noteUrl(n, true); }} className="inline-flex items-center gap-1 rounded-full bg-brand-900 px-3 py-1 text-xs font-semibold text-white"><Download className="size-3.5" />{t('download')}</button>}
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="p-4 text-sm text-muted">{t('noNotes')}</p>)}

          {tab === 'quizzes' && (course.quizzes.length ? <div className="space-y-3">{course.quizzes.map((q) => <QuizCard key={q.id} quiz={q} />)}</div> : <p className="p-4 text-sm text-muted">{t('noQuizzes')}</p>)}
        </div>
      </div>

      {reader && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-brand-950/50 p-4" onClick={() => setReader(null)}>
          <div onClick={(e) => e.stopPropagation()} className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-cream-50">
            <div className="flex items-center justify-between border-b border-line p-4"><p className="font-display text-xl font-semibold text-brand-900">{L(reader.note)}</p><button onClick={() => setReader(null)} className="rounded-full px-3 py-1 text-sm hover:bg-cream-200">✕</button></div>
            <div className="flex-1 overflow-y-auto p-6">
              {(locale === 'ar' ? reader.note.bodyAr ?? reader.note.bodyEn : reader.note.bodyEn ?? reader.note.bodyAr) && <Markdown source={(locale === 'ar' ? reader.note.bodyAr ?? reader.note.bodyEn : reader.note.bodyEn ?? reader.note.bodyAr) ?? ''} />}
              {reader.url && <iframe title={L(reader.note)} src={reader.url} className="mt-4 h-[70vh] w-full rounded-xl border border-line" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuizCard({ quiz }: { quiz: Quiz }) {
  const t = useTranslations('account');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<number[]>(() => quiz.questions.map(() => -1));
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean; correct: number[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { setResult((await apiFetch<{ data: { score: number; total: number; passed: boolean; correct: number[] } }>(`/me/quizzes/${quiz.id}/attempts`, { method: 'POST', json: { answers } })).data); } finally { setBusy(false); }
  };
  const last = result ?? quiz.lastAttempt;
  return (
    <div className="rounded-2xl bg-cream-50 p-3">
      <p className="text-sm font-semibold text-brand-900">{locale === 'ar' ? quiz.titleAr : quiz.titleEn}</p>
      {last && <p className={cn('mt-1 flex items-center gap-1 text-xs font-semibold', last.passed ? 'text-success' : 'text-warning')}>{last.passed ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}{t('lastScore', { score: last.score, total: last.total })} · {last.passed ? t('passed') : t('notPassed')}</p>}
      {!open ? <button onClick={() => { setOpen(true); setResult(null); setAnswers(quiz.questions.map(() => -1)); }} className="mt-2 rounded-full bg-brand-900 px-3 py-1 text-xs font-semibold text-white">{last ? t('retake') : t('takeQuiz')}</button> : (
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="mt-3 space-y-4">
          {quiz.questions.map((q, i) => (
            <fieldset key={i}>
              <legend className="text-sm font-medium text-brand-900">{i + 1}. {locale === 'ar' ? q.textAr : q.textEn}</legend>
              <div className="mt-1 space-y-1">
                {q.options.map((o, j) => (
                  <label key={j} className={cn('flex items-center gap-2 rounded-xl px-2 py-1 text-sm', result && j === result.correct[i] && 'bg-emerald-50 text-success', result && answers[i] === j && j !== result.correct[i] && 'bg-red-50 text-danger')}>
                    <input type="radio" name={`${quiz.id}-${i}`} checked={answers[i] === j} disabled={!!result} onChange={() => setAnswers((a) => a.map((x, k) => (k === i ? j : x)))} />{locale === 'ar' ? o.ar : o.en}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {result ? <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-gold-400 px-3 py-1 text-xs font-semibold">{t('score', { score: result.score, total: result.total })} ✓</button>
            : <button disabled={busy || answers.includes(-1)} className="rounded-full bg-brand-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{t('submitQuiz')}</button>}
        </form>
      )}
    </div>
  );
}
