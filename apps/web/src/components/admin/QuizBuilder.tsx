'use client';

import { Plus, Trash2 } from 'lucide-react';
import { adminBtnOutline, adminInput } from './ui';

export interface QuizQ { textEn: string; textAr: string; options: { en: string; ar: string }[]; correct: number }
export const emptyQ = (): QuizQ => ({ textEn: '', textAr: '', options: [{ en: '', ar: '' }, { en: '', ar: '' }], correct: 0 });

/** Bilingual multiple-choice question editor (used for course quizzes and post-class quizzes). */
export function QuizBuilder({ questions, onChange }: { questions: QuizQ[]; onChange: (q: QuizQ[]) => void }) {
  const upd = (i: number, patch: Partial<QuizQ>) => onChange(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={i} className="rounded-2xl border border-line bg-white p-3">
          <div className="flex items-center justify-between"><p className="text-xs font-semibold">Question {i + 1}</p><button type="button" onClick={() => onChange(questions.filter((_, j) => j !== i))} className="text-muted hover:text-danger" aria-label="Remove question"><Trash2 className="size-4" /></button></div>
          <input required className={`${adminInput} mt-2`} placeholder="Question (English)" value={q.textEn} onChange={(e) => upd(i, { textEn: e.target.value })} />
          <input required dir="rtl" className={`${adminInput} mt-2`} placeholder="السؤال (عربي)" value={q.textAr} onChange={(e) => upd(i, { textAr: e.target.value })} />
          {q.options.map((o, k) => (
            <div key={k} className="mt-2 grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2">
              <input type="radio" name={`correct-${i}`} checked={q.correct === k} onChange={() => upd(i, { correct: k })} aria-label={`Option ${k + 1} is correct`} />
              <input required className={adminInput} placeholder={`Option ${k + 1} (EN)`} value={o.en} onChange={(e) => upd(i, { options: q.options.map((x, m) => (m === k ? { ...x, en: e.target.value } : x)) })} />
              <input required dir="rtl" className={adminInput} placeholder="الخيار (عربي)" value={o.ar} onChange={(e) => upd(i, { options: q.options.map((x, m) => (m === k ? { ...x, ar: e.target.value } : x)) })} />
              <button type="button" disabled={q.options.length <= 2} onClick={() => upd(i, { options: q.options.filter((_, m) => m !== k), correct: q.correct >= k && q.correct > 0 ? q.correct - 1 : q.correct })} className="text-muted hover:text-danger disabled:opacity-30" aria-label="Remove option">×</button>
            </div>
          ))}
          {q.options.length < 6 && <button type="button" onClick={() => upd(i, { options: [...q.options, { en: '', ar: '' }] })} className="mt-2 text-xs font-semibold text-brand-700">+ Add option</button>}
          <p className="mt-1 text-[11px] text-muted">Select the radio button next to the correct answer.</p>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...questions, emptyQ()])} className={adminBtnOutline}><Plus className="size-4" />Add question</button>
    </div>
  );
}

