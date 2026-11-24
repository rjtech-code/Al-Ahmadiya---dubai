'use client';

import { Bell, CheckCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Empty, ErrorBox, Loading, PageTitle, Segmented, useApi, useFmt } from '@/components/portal/ui';
import { cn } from '@/components/ui/cn';
import { useRouter } from '@/i18n/navigation';
import { apiFetch } from '@/lib/client-api';

interface N { id: string; type: string; titleEn: string; titleAr: string; bodyEn: string | null; bodyAr: string | null; link: string | null; readAt: string | null; createdAt: string }

export default function Notifications() {
  const t = useTranslations('portal.notifications');
  const f = useFmt();
  const router = useRouter();
  const { data, error, reload } = useApi<N[]>('/me/notifications');
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const rows = (data ?? []).filter((n) => tab === 'all' || !n.readAt);
  const open = async (n: N) => {
    if (!n.readAt) await apiFetch(`/me/notifications/${n.id}/read`, { method: 'POST' }).catch(() => undefined);
    if (n.link) router.push(n.link.replace(/^\/account\/live\//, '/portal/live/').replace(/^\/account\/courses\//, '/portal/courses/'));
    else reload();
  };
  return (
    <>
      <PageTitle title={t('title')} actions={<button onClick={async () => { await apiFetch('/me/notifications/read-all', { method: 'POST' }); reload(); }} className="inline-flex items-center gap-2 rounded-full border border-gold-400 px-4 py-2 text-sm font-semibold text-brand-900 hover:bg-cream-200"><CheckCheck className="size-4" />{t('markAll')}</button>} />
      <div className="mb-5"><Segmented value={tab} onChange={setTab} options={[{ value: 'all', label: t('all') }, { value: 'unread', label: t('unread') }]} /></div>
      <ErrorBox message={error} />
      {!data ? <Loading /> : rows.length ? (
        <ul className="space-y-2">
          {rows.map((n) => (
            <li key={n.id}>
              <button onClick={() => void open(n)} className={cn('flex w-full items-start gap-3 rounded-2xl border p-4 text-start transition hover:bg-white', n.readAt ? 'border-transparent bg-cream-50' : 'border-gold-300 bg-white shadow-sm')}>
                <span className={cn('mt-0.5 grid size-9 shrink-0 place-items-center rounded-full', n.readAt ? 'bg-cream-200 text-muted' : 'bg-brand-900 text-gold-300')}><Bell className="size-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-sm', n.readAt ? 'text-ink/80' : 'font-semibold text-brand-900')}>{f.L(n)}</span>
                  {(f.locale === 'ar' ? n.bodyAr : n.bodyEn) && <span className="block text-sm text-muted">{f.locale === 'ar' ? n.bodyAr : n.bodyEn}</span>}
                  <span className="text-xs text-muted">{f.dateTime(n.createdAt)}</span>
                </span>
                {!n.readAt && <span className="mt-2 size-2 rounded-full bg-danger" aria-label={t('unread')} />}
              </button>
            </li>
          ))}
        </ul>
      ) : <Empty text={t('empty')} />}
    </>
  );
}
