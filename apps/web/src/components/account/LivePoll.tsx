'use client';

import { BarChart3 } from 'lucide-react';
import { useState } from 'react';
import type { PollState } from '@/lib/live-client';
import { cn } from '../ui/cn';

/** Poll card for students (vote, then see results) and teachers (results only). */
export function LivePollCard({ poll, canVote, onVote, labels }: {
  poll: PollState; canVote: boolean; onVote?: (option: number) => Promise<void>;
  labels: { title: string; votes: (n: number) => string; closed: string; voted: string };
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const showResults = !canVote || poll.myVote !== null || poll.closed;
  const vote = async (i: number) => {
    if (!onVote) return;
    setBusy(true); setError('');
    try { await onVote(i); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="rounded-[1.5rem] border border-gold-300 bg-cream-50 p-4 shadow-[var(--shadow-card)]">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-700"><BarChart3 className="size-4" />{labels.title}{poll.closed && <span className="rounded-full bg-cream-200 px-2 text-[10px] text-muted">{labels.closed}</span>}</p>
      <p className="mt-1 font-semibold text-brand-900">{poll.question}</p>
      <ul className="mt-3 space-y-2">
        {poll.options.map((o, i) => {
          const pct = poll.total ? Math.round((poll.counts[i] / poll.total) * 100) : 0;
          return (
            <li key={i}>
              {showResults ? (
                <div className={cn('relative overflow-hidden rounded-xl border px-3 py-2 text-sm', poll.myVote === i ? 'border-brand-700' : 'border-line')}>
                  <div className="absolute inset-y-0 start-0 bg-gold-200/70" style={{ width: `${pct}%` }} aria-hidden />
                  <span className="relative flex justify-between gap-2"><span>{o}{poll.myVote === i && ' ✓'}</span><strong>{pct}%</strong></span>
                </div>
              ) : (
                <button disabled={busy} onClick={() => void vote(i)} className="w-full rounded-xl border border-line bg-white px-3 py-2 text-start text-sm font-medium hover:border-brand-700 disabled:opacity-50">{o}</button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted">{labels.votes(poll.total)}{poll.myVote !== null && canVote ? ` · ${labels.voted}` : ''}</p>
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
