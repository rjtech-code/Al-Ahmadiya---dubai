'use client';

import { ArrowLeft, ArrowRight, CalendarClock, CheckCircle2, Circle, ClipboardCheck, Flag, History, Info, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/components/ui/cn';

export type AssessKind = 'activity' | 'practice' | 'graded';
export interface Question { text: string; options: string[]; correct: number }
export interface Assessment { id: string; kind: AssessKind; title: string; questions: Question[]; marksPerQuestion: number; dueAt: string; weekNo: number }
export interface Attempt { answers: Record<number, number>; flagged: number[]; submittedAt: string; score: number; correct: number; incorrect: number; unattempted: number }

/** Local question bank for the frontend preview (computing fundamentals). */
const BANK: Question[] = [
  { text: 'Undesirable side effects can be avoided by suitably modifying the pseudocode.', options: ['True', 'False'], correct: 0 },
  { text: 'Which data type is best for storing a whole number such as 42?', options: ['Integer', 'String', 'Boolean', 'Float'], correct: 0 },
  { text: 'What does a loop do in a program?', options: ['Repeats a block of steps', 'Stores a value permanently', 'Ends the program', 'Draws a flowchart'], correct: 0 },
  { text: 'In a flowchart, which shape is used for a decision?', options: ['Rectangle', 'Diamond', 'Oval', 'Parallelogram'], correct: 1 },
  { text: 'A variable name can start with a digit in most programming languages.', options: ['True', 'False'], correct: 1 },
  { text: 'What is the value of 7 % 3?', options: ['1', '2', '3', '0'], correct: 0 },
  { text: 'Which structure stores key–value pairs?', options: ['List', 'Dictionary', 'Tuple', 'Set'], correct: 1 },
  { text: 'A function that calls itself is called…', options: ['Iterative', 'Recursive', 'Nested', 'Static'], correct: 1 },
  { text: 'Which of these is a Boolean value?', options: ['"yes"', '0.5', 'True', '[1, 2]'], correct: 2 },
  { text: 'What is the first step in solving a programming problem?', options: ['Write code immediately', 'Understand the problem', 'Test the program', 'Optimise speed'], correct: 1 },
  { text: 'An algorithm must finish after a finite number of steps.', options: ['True', 'False'], correct: 0 },
  { text: 'Which operator checks equality in Python?', options: ['=', '==', '!=', ':='], correct: 1 },
];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export function questionsFor(id: string, count: number): Question[] {
  const start = hash(id) % BANK.length;
  return Array.from({ length: count }, (_, i) => BANK[(start + i * 5) % BANK.length]);
}

export const KIND_LABEL: Record<AssessKind, string> = { activity: 'Activity question · Not graded', practice: 'Practice assignment · Not graded', graded: 'Graded assignment' };

export function dueLabel(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Dubai', hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()} GST`;
}

export function scoreAttempt(a: Assessment, answers: Record<number, number>, flagged: number[]): Attempt {
  let correct = 0, incorrect = 0, unattempted = 0;
  a.questions.forEach((q, i) => { const v = answers[i]; if (v === undefined) unattempted++; else if (v === q.correct) correct++; else incorrect++; });
  return { answers, flagged, submittedAt: new Date().toISOString(), score: correct * a.marksPerQuestion, correct, incorrect, unattempted };
}

/** Taking an assessment: question pills, note panel, question panel, previous / next. Arrow keys move between questions. */
export function AssessmentRunner({ a, onSubmit }: { a: Assessment; onSubmit: (attempt: Attempt) => void }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<number[]>([]);
  const n = a.questions.length;
  const q = a.questions[i];
  const answered = Object.keys(answers).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') setI((x) => Math.min(n - 1, x + 1));
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [n]);

  const submit = () => {
    if (answered < n && !window.confirm(`${n - answered} question(s) are unanswered. Submit anyway?`)) return;
    onSubmit(scoreAttempt(a, answers, flagged));
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-3 shadow-sm">
        <div className="flex flex-1 flex-wrap gap-2">
          {a.questions.map((_, k) => (
            <button key={k} type="button" onClick={() => setI(k)} aria-label={`Question ${k + 1}`} aria-current={k === i}
              className={cn('relative grid size-10 place-items-center rounded-full text-sm font-semibold transition-colors',
                k === i ? 'bg-brand-900 text-white ring-2 ring-gold-400 ring-offset-2' : answers[k] !== undefined ? 'bg-gold-100 text-brand-900' : 'bg-cream-100 text-brand-900 hover:bg-cream-200')}>
              {k + 1}
              {flagged.includes(k) && <span className="absolute -end-0.5 -top-0.5 size-3 rounded-full border-2 border-white bg-warning" />}
            </button>
          ))}
        </div>
        <span className="hidden h-8 w-px bg-line sm:block" />
        <button type="button" onClick={submit} disabled={!answered} className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-40"><ClipboardCheck className="size-4" />Submit assessment</button>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <section className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-sm text-brand-900"><Info className="size-4 text-gold-600" />The information below is common to questions <strong>1</strong> to <strong>{n}</strong></p>
          <p className="mt-4 font-semibold leading-relaxed text-brand-900">
            {a.kind === 'graded'
              ? `Note: This is a graded assignment worth ${n * a.marksPerQuestion} marks. Your most recent submission before the deadline is considered.`
              : 'Note: This activity is for practice only. Your score here will not count towards your final result.'}
          </p>
          <p className="mt-auto hidden items-center justify-center gap-2 pt-6 text-sm text-muted lg:flex">Use arrows <kbd className="rounded-md border border-line px-2 py-0.5">←</kbd> and <kbd className="rounded-md border border-line px-2 py-0.5">→</kbd> to navigate</p>
        </section>

        <div className="flex flex-col gap-4">
          <section className="flex-1 rounded-2xl border border-line bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-semibold text-brand-900">Question {i + 1} / {n}</h3>
              <button type="button" onClick={() => setFlagged((f) => (f.includes(i) ? f.filter((x) => x !== i) : [...f, i]))} aria-pressed={flagged.includes(i)}
                className={cn('inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold', flagged.includes(i) ? 'border-warning bg-amber-50 text-warning' : 'border-gold-400 text-brand-900 hover:bg-cream-100')}><Flag className="size-3.5" />{flagged.includes(i) ? 'Flagged' : 'Flag for review'}</button>
              <span className="h-px flex-1 bg-line" />
              <span className="text-sm font-semibold text-brand-900">{a.marksPerQuestion} mark{a.marksPerQuestion === 1 ? '' : 's'}</span>
            </div>
            <p className="mt-4 leading-relaxed text-ink">{q.text}</p>
            <p className="mt-5 flex items-center gap-3 text-sm font-semibold text-brand-900">Options <span className="h-px flex-1 bg-line" /></p>
            <ul className="mt-3 space-y-2.5" role="radiogroup" aria-label={`Question ${i + 1} options`}>
              {q.options.map((o, k) => {
                const on = answers[i] === k;
                return (
                  <li key={k}>
                    <button type="button" role="radio" aria-checked={on} onClick={() => setAnswers((x) => ({ ...x, [i]: k }))}
                      className={cn('flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-start transition-colors', on ? 'border-brand-900 bg-gold-100/60' : 'border-line bg-cream-50 hover:border-gold-400')}>
                      <span className={cn('grid size-5 shrink-0 place-items-center rounded-full border-2', on ? 'border-brand-900' : 'border-muted/60')}>{on && <span className="size-2.5 rounded-full bg-brand-900" />}</span>
                      <span className="font-semibold text-brand-900">{String.fromCharCode(65 + k)}.</span>
                      <span className="text-ink">{o}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {answers[i] !== undefined && <div className="mt-3 text-end"><button type="button" onClick={() => setAnswers((x) => Object.fromEntries(Object.entries(x).filter(([k]) => Number(k) !== i)))} className="text-xs font-semibold text-muted hover:text-brand-900">Clear selection</button></div>}
          </section>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-white font-semibold text-brand-900 hover:border-gold-400 disabled:opacity-40"><ArrowLeft className="size-4 rtl:rotate-180" />Previous</button>
            {i < n - 1
              ? <button type="button" onClick={() => setI((x) => x + 1)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-900 font-semibold text-white hover:bg-brand-800">Next<ArrowRight className="size-4 rtl:rotate-180" /></button>
              : <button type="button" onClick={submit} disabled={!answered} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gold-400 font-semibold text-brand-950 hover:bg-gold-300 disabled:opacity-40"><Send className="size-4" />Submit</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Result page after submission: banner, assignment details, submission overview. */
export function AssessmentResult({ a, attempt, onRetake }: { a: Assessment; attempt: Attempt; onRetake: () => void }) {
  const total = a.questions.length * a.marksPerQuestion;
  const pct = total ? Math.round((attempt.score / total) * 100) : 0;
  const n = a.questions.length;
  const seg = (v: number) => `${(v / n) * 100}%`;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-success" />
        <div><p className="font-semibold text-success">Assessment submitted</p><p className="text-sm text-ink/80">Your submission has been recorded on {new Date(attempt.submittedAt).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', dateStyle: 'medium', timeStyle: 'short' })}. You can review your answers or submit again before the deadline.</p></div>
      </div>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-900"><ClipboardCheck className="size-4 text-gold-600" />Assignment details</h3>
        <dl className="mt-3 divide-y divide-line text-sm">
          {[['Mode', a.kind === 'graded' ? 'Graded' : 'Not graded (practice)'], ['Submission', 'Multiple submissions allowed. Your most recent submission is considered.'], ['Total questions', String(n)], ['Deadline', dueLabel(a.dueAt)]].map(([k, v]) => (
            <div key={k} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]"><dt className="text-muted">{k}</dt><dd className="font-semibold text-brand-900">{v}</dd></div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-900"><History className="size-4 text-gold-600" />Submission overview</h3>
        <div className="mt-4 flex flex-wrap items-end gap-6">
          <p className="font-display text-5xl font-semibold text-brand-900">{attempt.score} / {total} <span className="text-2xl text-gold-700">{pct}%</span></p>
          <dl className="ms-auto grid grid-cols-4 gap-4 text-center sm:gap-8">
            {[['Correct', attempt.correct, 'text-success'], ['Partial', 0, 'text-warning'], ['Incorrect', attempt.incorrect, 'text-danger'], ['Unattempted', attempt.unattempted, 'text-muted']].map(([k, v, c]) => (
              <div key={k as string}><dt className={cn('text-[11px] font-bold uppercase tracking-wider', c as string)}>{k}</dt><dd className="font-display text-3xl font-semibold text-brand-900">{v}</dd></div>
            ))}
          </dl>
        </div>
        <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-cream-200" aria-hidden>
          <span className="bg-success" style={{ width: seg(attempt.correct) }} />
          <span className="bg-danger" style={{ width: seg(attempt.incorrect) }} />
          <span className="bg-muted/40" style={{ width: seg(attempt.unattempted) }} />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-brand-900">Your answers</h3>
        <ol className="mt-3 space-y-2 text-sm">
          {a.questions.map((q, k) => {
            const v = attempt.answers[k];
            const ok = v === q.correct;
            return (
              <li key={k} className="flex items-start gap-3 rounded-xl bg-cream-50 p-3">
                {v === undefined ? <Circle className="mt-0.5 size-4 shrink-0 text-muted" /> : ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-danger text-[10px] font-bold text-white">✕</span>}
                <span className="min-w-0"><span className="block text-brand-900">{k + 1}. {q.text}</span>
                  <span className="text-xs text-muted">Your answer: {v === undefined ? 'Not answered' : q.options[v]}{!ok && ` · Correct answer: ${q.options[q.correct]}`}</span></span>
              </li>
            );
          })}
        </ol>
        <button type="button" onClick={onRetake} className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold-400 px-4 py-2 text-sm font-semibold text-brand-900 hover:bg-cream-100"><CalendarClock className="size-4" />Submit again</button>
      </section>
    </div>
  );
}
