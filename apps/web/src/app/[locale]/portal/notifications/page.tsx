'use client';

import { Bell, BookOpen, CheckCheck, CreditCard, GraduationCap, Radio } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { NextClassCard } from '@/components/portal/NextClassCard';
import { Empty, ErrorBox, Loading, PageTitle, Segmented, surface, useApi, useFmt } from '@/components/portal/ui';
import { cn } from '@/components/ui/cn';
import { useRouter } from '@/i18n/navigation';
import { apiFetch } from '@/lib/client-api';

interface N { id: string; type: string; titleEn: string; titleAr: string; bodyEn: string | null; bodyAr: string | null; link: string | null; readAt: string | null; createdAt: string }

const ICON: Record<string, typeof Bell> = { 'live-class': Radio, payment: CreditCard, enrollment: BookOpen, ACADEMIC: GraduationCap, application: GraduationCap };

export default function Notifications() {
  const t = useTranslations('portal.notifications');
  const f = useFmt();
  const router = useRouter();
  const { data, error, reload } = useApi<N[]>('/me/notifications');
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const rows = (data ?? []).filter((n) => tab === 'all' || !n.readAt);
  const unread = (data ?? []).filter((n) => !n.readAt).length;
  const day = (d: string) => f.day(d);
  const groups = [...new Set(rows.map((n) => day(n.createdAt)))].map((d) => ({ d, items: rows.filter((n) => day(n.createdAt) === d) }));
  const open = async (n: N) => {
    if (!n.readAt) await apiFetch(`/me/notifications/${n.id}/read`, { method: 'POST' }).catch(() => undefined);
    if (n.link) router.push(n.link.replace(/^\/account\/live\//, '/portal/live/').replace(/^\/account\/courses\//, '/portal/courses/'));
    else reload();
  };
  return (
    <>
      <PageTitle eyebrow={t('eyebrow')} title={t('title')} actions={<button onClick={async () => { await apiFetch('/me/notifications/read-all', { method: 'POST' }); reload(); }} className="inline-flex items-center gap-2 rounded-full border border-gold-400 bg-white px-4 py-2 text-sm font-semibold text-brand-900 shadow-sm hover:bg-cream-100"><CheckCheck className="size-4" />{t('markAll')}</button>} />
      <div className="mb-6"><NextClassCard /></div>
      <div className="mb-5 flex items-center gap-3"><Segmented value={tab} onChange={setTab} options={[{ value: 'all', label: t('all') }, { value: 'unread', label: `${t('unread')}${unread ? ` · ${unread}` : ''}` }]} /></div>
      <ErrorBox message={error} />
      {!data ? <Loading /> : rows.length ? (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.d}>
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{g.d}</h2>
              <ul className={cn(surface, 'divide-y divide-line/70 overflow-hidden')}>
                {g.items.map((n) => {
                  const Icon = ICON[n.type] ?? Bell;
                  return (
                    <li key={n.id}>
                      <button onClick={() => void open(n)} className={cn('flex w-full items-start gap-4 p-4 text-start transition hover:bg-cream-50', !n.readAt && 'bg-gold-100/25')}>
                        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', n.readAt ? 'bg-cream-100 text-muted' : 'bg-brand-900 text-gold-300')}><Icon className="size-[18px]" /></span>
                        <span className="min-w-0 flex-1">
                          <span className={cn('block text-sm', n.readAt ? 'text-ink/80' : 'font-semibold text-brand-900')}>{f.L(n)}</span>
                          {(f.locale === 'ar' ? n.bodyAr : n.bodyEn) && <span className="mt-0.5 block text-sm text-muted">{f.locale === 'ar' ? n.bodyAr : n.bodyEn}</span>}
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-2"><span className="text-xs text-muted">{f.time(n.createdAt)}</span>{!n.readAt && <span className="size-2 rounded-full bg-gold-500" aria-label={t('unread')} />}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : <Empty text={t('empty')} />}
    </>
  );
}
