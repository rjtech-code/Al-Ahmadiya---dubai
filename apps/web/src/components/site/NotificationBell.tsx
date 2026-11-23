'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck, Radio } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { apiFetch } from '@/lib/client-api';
import { cn } from '../ui/cn';

interface N { id: string; type: string; titleEn: string; titleAr: string; bodyEn: string | null; bodyAr: string | null; link: string | null; readAt: string | null; createdAt: string }

/** In-app notification panel. Polls the unread count every 30 s (live-class alerts arrive here). */
export function NotificationBell() {
  const t = useTranslations('account');
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<N[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const poll = useCallback(() => apiFetch<{ data: { unread: number } }>('/me/notifications/unread-count').then((r) => setUnread(r.data.unread)).catch(() => undefined), []);
  useEffect(() => {
    void poll();
    const id = window.setInterval(() => void poll(), 30_000);
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('click', onClick);
    return () => { window.clearInterval(id); document.removeEventListener('click', onClick); };
  }, [poll]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      const r = await apiFetch<{ data: N[]; meta: { unread: number } }>('/me/notifications').catch(() => null);
      if (r) { setItems(r.data); setUnread(r.meta.unread); }
    }
  };
  const openItem = async (n: N) => {
    if (!n.readAt) await apiFetch(`/me/notifications/${n.id}/read`, { method: 'POST' }).catch(() => undefined);
    setOpen(false); void poll();
    if (n.link) router.push(n.link);
  };
  const readAll = async () => {
    await apiFetch('/me/notifications/read-all', { method: 'POST' }).catch(() => undefined);
    setItems((x) => x.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))); setUnread(0);
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => void toggle()} aria-expanded={open} aria-label={`${t('notifications')}${unread ? ` (${unread})` : ''}`} className="relative grid size-11 place-items-center rounded-full bg-white/70 text-brand-900 shadow-sm hover:bg-white">
        <Bell className="size-5" />
        {unread > 0 && <span className="absolute -end-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-gold-500 px-1 text-[11px] font-bold text-brand-950">{unread > 99 ? '99+' : unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="glass absolute end-0 top-14 z-50 w-[22rem] max-w-[calc(100vw-2rem)] rounded-3xl p-3">
            <div className="flex items-center justify-between px-2 pb-2">
              <p className="font-display text-xl font-semibold text-brand-900">{t('notifications')}</p>
              {unread > 0 && <button onClick={() => void readAll()} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"><CheckCheck className="size-3.5" />{t('markAllRead')}</button>}
            </div>
            <ul className="max-h-96 overflow-y-auto">
              {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">{t('noNotifications')}</li>}
              {items.map((n) => (
                <li key={n.id}>
                  <button onClick={() => void openItem(n)} className={cn('flex w-full gap-3 rounded-2xl px-3 py-2.5 text-start hover:bg-cream-200', !n.readAt && 'bg-gold-100/60')}>
                    {n.type === 'live-class' ? <Radio className="mt-0.5 size-4 shrink-0 text-danger" /> : <Bell className="mt-0.5 size-4 shrink-0 text-gold-600" />}
                    <span className="min-w-0">
                      <span className={cn('block text-sm text-brand-900', !n.readAt && 'font-semibold')}>{locale === 'ar' ? n.titleAr : n.titleEn}</span>
                      {(locale === 'ar' ? n.bodyAr : n.bodyEn) && <span className="block truncate text-xs text-muted">{locale === 'ar' ? n.bodyAr : n.bodyEn}</span>}
                      <span className="block text-[11px] text-muted">{new Date(n.createdAt).toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
