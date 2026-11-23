'use client';

import { CheckCircle2, Loader2, Lock, PlayCircle, Radio } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useCheckout, type Checkout } from '@/lib/checkout';
import { apiFetch, ApiError, formatMoney } from '@/lib/client-api';
import { useSession } from '@/lib/session';
import type { Course } from '@/lib/types';
import { AuthInline } from './JoinForms';

/** Course purchase: login required; the course activates only after the server verifies payment. No "payment due" is shown here. */
export function EnrollPanel({ course }: { course: Pick<Course, 'slug' | 'priceFils' | 'currency' | 'deliveryMode' | 'lessons' | '_count'> }) {
  const t = useTranslations('enroll');
  const tk = useTranslations('checkout');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { state } = useSession();
  const { pay, dialog } = useCheckout();
  const [status, setStatus] = useState<'NONE' | 'PENDING_PAYMENT' | 'ACTIVE' | 'CANCELLED' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (state.status !== 'authed') return;
    apiFetch<{ data: { status: 'NONE' } }>(`/me/enrollments/${course.slug}`).then((r) => setStatus(r.data.status)).catch(() => setStatus('NONE'));
  }, [state.status, course.slug]);

  const tj = useTranslations('join');
  /** `signedIn` is passed right after the inline form signs the visitor in (the session state is not yet re-rendered). */
  const enroll = async (signedIn = false) => {
    if (!signedIn && state.status !== 'authed') return router.push(`/login?next=${encodeURIComponent(pathname)}`);
    setBusy(true); setError('');
    try {
      const { data } = await apiFetch<{ data: { completed: true } | { completed: false; checkout: Checkout } }>(`/payments/course/${course.slug}`, { method: 'POST' });
      if (!data.completed) await pay(data.checkout);
      setStatus('ACTIVE');
      router.push(`/account/courses/${course.slug}`);
    } catch (e) {
      if (e instanceof ApiError && e.body.code === 'ALREADY_ENROLLED') { setStatus('ACTIVE'); router.push(`/account/courses/${course.slug}`); }
      else if (e instanceof ApiError) setError(e.body.code === 'PAYMENTS_NOT_CONFIGURED' ? tk('notConfigured') : e.message);
      else if ((e as Error).message !== 'cancelled') setError(tk('failed'));
    } finally { setBusy(false); }
  };

  const free = !course.priceFils;
  return (
    <aside className="glass rounded-[2rem] p-6" aria-labelledby="enroll-h">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-700">{course.deliveryMode === 'LIVE' ? <><Radio className="size-4" />{t('liveMode')}</> : <><PlayCircle className="size-4" />{t('recorded')}</>}</p>
      <h2 id="enroll-h" className="mt-2 font-display text-2xl font-semibold text-brand-900">{t('onlineTitle')}</h2>
      <p className="mt-4 text-sm text-muted">{t('price')}</p>
      <p className="font-display text-5xl font-semibold text-brand-900">{free ? t('free') : formatMoney(course.priceFils!, course.currency, locale)}</p>
      <ul className="mt-4 space-y-1 text-sm text-ink/80">
        <li>{t('lectures', { count: course.lessons.length })}</li>
        <li>{t('notes', { count: course._count.notes })}</li>
        <li>{t('quizzes', { count: course._count.quizzes })}</li>
        {course._count.liveSessions > 0 && <li>{t('liveSessions', { count: course._count.liveSessions })}</li>}
      </ul>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-5">
        {status === 'ACTIVE' ? (
          <>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-success"><CheckCircle2 className="size-4" />{t('enrolled')}</p>
            <Link href={`/account/courses/${course.slug}`} className="inline-flex h-12 w-full items-center justify-center rounded-full bg-brand-900 font-semibold text-white">{t('goToCourse')}</Link>
          </>
        ) : state.status === 'anon' ? (
          <div className="border-t border-line/70 pt-4">
            <p className="mb-3 text-sm font-medium text-brand-900">{tj('courseIntro')}</p>
            <AuthInline idPrefix="cj" submitRegister={free ? tj('registerAndJoinFree') : tj('registerAndJoin')} submitLogin={tj('loginAndJoin')} onAuthed={() => enroll(true)} />
          </div>
        ) : (
          <button onClick={() => void enroll()} disabled={busy || state.status === 'loading'} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-900 font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60">
            {busy && <Loader2 className="size-4 animate-spin" />}{busy ? t('processing') : state.status === 'authed' ? (free ? t('enrollFree') : t('enroll')) : t('signInToEnroll')}
          </button>
        )}
      </div>
      {dialog}
    </aside>
  );
}

export function LessonOutline({ lessons, topics = [] }: { lessons: Course['lessons']; topics?: NonNullable<Course['topics']> }) {
  const t = useTranslations('enroll');
  const locale = useLocale();
  if (!lessons.length) return null;
  const L = (o: { titleEn: string; titleAr: string }) => (locale === 'ar' ? o.titleAr : o.titleEn);
  const groups = [
    ...topics.map((tp) => ({ key: tp.id, title: L(tp), items: lessons.filter((l) => l.topicId === tp.id) })),
    { key: 'other', title: '', items: lessons.filter((l) => !l.topicId || !topics.some((tp) => tp.id === l.topicId)) },
  ].filter((g) => g.items.length);
  let n = 0;
  return (
    <div>
      <h3 className="mb-3 font-display text-2xl font-semibold text-brand-900">{t('contentTitle')}</h3>
      <div className="overflow-hidden rounded-[1.5rem] border border-white/80 bg-cream-50 shadow-[var(--shadow-card)]">
        {groups.map((g) => (
          <div key={g.key}>
            {g.title && <p className="border-b border-line bg-cream-200/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gold-700">{g.title}</p>}
            <ol className="divide-y divide-line">
              {g.items.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-cream-200 text-xs font-semibold text-brand-900">{++n}</span>
                  <span className="flex-1 text-brand-900">{L(l)}</span>
                  {l.durationSec ? <span className="text-xs text-muted">{Math.round(l.durationSec / 60)} min</span> : null}
                  <Lock className="size-3.5 text-muted" aria-label={t('locked')} />
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{t('locked')}</p>
    </div>
  );
}
