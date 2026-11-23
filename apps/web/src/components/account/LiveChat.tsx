'use client';

import { Send, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ChatMsg } from '@/lib/live-client';
import { cn } from '../ui/cn';

/** Live comments panel (shared by students and the teacher console). */
export function LiveChat({ messages, onSend, onDelete, myId, labels }: {
  messages: ChatMsg[]; onSend: (body: string) => Promise<void>; onDelete?: (id: string) => void; myId?: string;
  labels: { title: string; placeholder: string; send: string; teacher: string; you: string };
}) {
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' }); }, [messages.length]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    try { await onSend(body); setBody(''); setError(''); } catch (err) { setError((err as Error).message); }
  };
  return (
    <section aria-label={labels.title} className="flex h-full min-h-80 flex-col overflow-hidden rounded-[1.5rem] border border-white/80 bg-cream-50 shadow-[var(--shadow-card)]">
      <h2 className="border-b border-line px-4 py-3 font-display text-xl font-semibold text-brand-900">{labels.title}</h2>
      <ol ref={list} aria-live="polite" className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((m) => (
          <li key={m.id} className={cn('group rounded-2xl px-3 py-2 text-sm', m.isHost ? 'bg-brand-900 text-white' : m.userId === myId ? 'bg-gold-100' : 'bg-white')}>
            <p className="flex items-center justify-between gap-2 text-xs font-semibold">
              <span className={m.isHost ? 'text-gold-400' : 'text-brand-800'}>{m.name}{m.isHost ? ` · ${labels.teacher}` : m.userId === myId ? ` · ${labels.you}` : ''}</span>
              <span className="flex items-center gap-2 font-normal opacity-70">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {onDelete && !m.isHost && <button onClick={() => onDelete(m.id)} aria-label="Remove comment" className="opacity-0 transition group-hover:opacity-100 hover:text-danger"><Trash2 className="size-3.5" /></button>}</span>
            </p>
            <p className="mt-0.5 whitespace-pre-wrap break-words" dir="auto">{m.body}</p>
          </li>
        ))}
      </ol>
      {error && <p role="alert" className="px-3 text-xs text-danger">{error}</p>}
      <form onSubmit={submit} className="flex gap-2 border-t border-line p-3">
        <label className="sr-only" htmlFor="live-comment">{labels.placeholder}</label>
        <input id="live-comment" value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} placeholder={labels.placeholder} className="h-11 flex-1 rounded-full border border-line bg-white px-4 text-sm outline-none focus:border-gold-500" />
        <button className="grid size-11 place-items-center rounded-full bg-brand-900 text-white hover:bg-brand-800" aria-label={labels.send}><Send className="flip-rtl size-4" /></button>
      </form>
    </section>
  );
}
