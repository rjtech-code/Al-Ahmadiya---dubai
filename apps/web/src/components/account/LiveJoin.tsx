'use client';

import { Eye, Loader2, Radio, Volume2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { LiveClient, LiveError, type ChatMsg, type JoinInfo } from '@/lib/live-client';
import { LiveChat } from './LiveChat';
import { useAuthed } from './useAuthed';

/** Students watch the class on our site (own media server); attendance is recorded by the server while connected. */
export function LiveJoin({ id }: { id: string }) {
  const t = useTranslations('account');
  const locale = useLocale();
  const { state } = useAuthed();
  const [info, setInfo] = useState<JoinInfo | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [viewers, setViewers] = useState(0);
  const [hasVideo, setHasVideo] = useState(false);
  const [muted, setMuted] = useState(true);
  const [phase, setPhase] = useState<'live' | 'ended' | 'lost'>('live');
  const [attempt, setAttempt] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  // Created in the browser only (MediaStream does not exist during server rendering).
  const stream = useRef<MediaStream | null>(null);
  const media = () => (stream.current ??= new MediaStream());
  const client = useRef<LiveClient | null>(null);

  useEffect(() => {
    if (state.status !== 'authed') return;
    const c = new LiveClient(id, {
      onTrack: (track) => {
        const ms = media();
        ms.getTracks().filter((x) => x.kind === track.kind).forEach((x) => ms.removeTrack(x));
        ms.addTrack(track);
        if (video.current) { video.current.srcObject = ms; void video.current.play().catch(() => undefined); }
        if (track.kind === 'video') setHasVideo(true);
      },
      onTrackEnded: (kind) => { if (kind === 'video') setHasVideo(false); },
      onChat: (m) => setChat((x) => [...x, m]),
      onChatDeleted: (cid) => setChat((x) => x.filter((m) => m.id !== cid)),
      onPresence: setViewers,
      onEnded: () => setPhase('ended'),
      onDisconnect: () => setPhase((p) => (p === 'ended' ? p : 'lost')),
    });
    client.current = c;
    c.connect().then((i) => { setInfo(i); setChat(i.chat); setViewers(i.viewers); setPhase('live'); })
      .catch((e: unknown) => setError(e instanceof LiveError ? { code: e.code, message: e.message } : { code: 'ERROR', message: String(e) }));
    return () => c.close();
  }, [state.status, id, attempt]);

  // Tracks can arrive before the <video> element mounts — attach whenever the player appears or tracks change.
  useEffect(() => {
    const v = video.current;
    if (!v || !info) return;
    if (v.srcObject !== media()) v.srcObject = media();
    void v.play().catch(() => undefined);
  }, [info, hasVideo]);

  const unmute = () => { if (video.current) { video.current.muted = false; void video.current.play(); setMuted(false); } };

  if (error) return (
    <div className="glass mx-auto max-w-xl rounded-[2rem] p-8 text-center">
      <Radio className="mx-auto size-10 text-gold-600" />
      <p className="mt-3 font-display text-2xl font-semibold text-brand-900">{error.code === 'NOT_LIVE' ? (error.message.includes('not started') ? t('notStarted') : t('ended')) : error.message}</p>
      <Link href="/account?tab=live" className="mt-5 inline-block rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white">{t('backToAccount')}</Link>
    </div>
  );
  if (!info) return <p className="flex items-center gap-2 text-muted"><Loader2 className="size-4 animate-spin" />{t('joining')}</p>;
  const title = locale === 'ar' ? info.session.titleAr : info.session.titleEn;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-3 text-sm font-semibold">
            {phase === 'live' ? <span className="inline-flex items-center gap-1.5 rounded-full bg-danger px-3 py-1 text-white"><span className="size-2 animate-pulse rounded-full bg-white" />LIVE</span> : <span className="rounded-full bg-cream-200 px-3 py-1 text-muted">{t('ended')}</span>}
            <span className="inline-flex items-center gap-1 text-brand-800"><Eye className="size-4" />{t('viewers', { count: viewers })}</span>
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-brand-900 sm:text-4xl">{title}</h1>
          <p className="text-sm text-muted">{locale === 'ar' ? info.session.course.titleAr : info.session.course.titleEn}</p>
        </div>
        <p className="text-xs text-muted">{t('attendanceNote')}</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="relative overflow-hidden rounded-[2rem] bg-brand-950 shadow-[var(--shadow-card)]">
          <video ref={video} autoPlay playsInline muted className="aspect-video w-full bg-black" controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} />
          {!hasVideo && phase === 'live' && <p className="absolute inset-0 grid place-items-center text-white/70"><span className="flex items-center gap-2"><Loader2 className="size-5 animate-spin" />{t('waitingTeacher')}</span></p>}
          {hasVideo && muted && phase === 'live' && <button onClick={unmute} className="absolute bottom-4 start-4 inline-flex items-center gap-2 rounded-full bg-gold-400 px-4 py-2 text-sm font-semibold text-brand-950 shadow-lg"><Volume2 className="size-4" />{t('tapForSound')}</button>}
          {phase !== 'live' && (
            <div className="absolute inset-0 grid place-items-center bg-brand-950/85 p-6 text-center text-white">
              <div>
                <p className="font-display text-2xl">{phase === 'ended' ? t('classEnded') : t('reconnecting')}</p>
                {phase === 'lost' ? <button onClick={() => { setInfo(null); setAttempt((n) => n + 1); }} className="mt-4 rounded-full bg-gold-400 px-5 py-2 text-sm font-semibold text-brand-950">{t('rejoin')}</button>
                  : <Link href={`/account/courses/${info.session.course.slug}`} className="mt-4 inline-block rounded-full bg-gold-400 px-5 py-2 text-sm font-semibold text-brand-950">{t('goToCourse')}</Link>}
              </div>
            </div>
          )}
        </div>
        <LiveChat messages={chat} myId={state.status === 'authed' ? state.user.id : undefined} onSend={async (b) => { await client.current!.chat(b); }}
          labels={{ title: t('comments'), placeholder: t('writeComment'), send: t('send'), teacher: t('teacher'), you: t('you') }} />
      </div>
    </div>
  );
}
