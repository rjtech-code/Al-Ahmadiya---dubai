'use client';

import { CheckCircle2, ChevronDown, ChevronRight, Download, FileText, Loader2, PlayCircle, Radio } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { apiFetch, ApiError, apiUrl } from '@/lib/client-api';
import { Markdown } from '@/lib/markdown';
import { cn } from '../ui/cn';
import { useAuthed } from './useAuthed';

interface Lesson { id: string; titleEn: string; titleAr: string; descriptionEn: string | null; descriptionAr: string | null; durationSec: number | null; hasVideo: boolean; topicId: string | null; completed: boolean; positionSec: number }
interface Note { id: string; titleEn: string; titleAr: string; bodyEn: string | null; bodyAr: string | null; fileName: string | null; hasFile: boolean; lessonId?: string | null }
interface Quiz { id: string; titleEn: string; titleAr: string; passPercent: number; questions: { textEn: string; textAr: string; options: { en: string; ar: string }[] }[]; lastAttempt: { score: number; total: number; passed: boolean } | null; lessonId?: string | null }
interface Course { topics: { id: string; titleEn: string; titleAr: string }[]; slug: string; code: string; titleEn: string; titleAr: string; deliveryMode: string; lessons: Lesson[]; notes: Note[]; quizzes: Quiz[]; liveSessions: { id: string; titleEn: string; titleAr: string; scheduledAt: string; status: string }[] }
interface Week { id: string; titleEn: string; titleAr: string; lessons: Lesson[]; quizzes: Quiz[] }
type PracticeState = Record<string, { done: boolean; submittedAt?: string; answer?: string; marks?: number | null; feedback?: string }>;

const demoQuestions = [{ textEn: 'Which statement best describes this topic?', textAr: 'أي عبارة تصف هذا الموضوع بشكل أفضل؟', options: [{ en: 'A core concept', ar: 'مفهوم أساسي' }, { en: 'An unrelated topic', ar: 'موضوع غير مرتبط' }] }];

function buildDemoWeeks(course: Course): Week[] {
  const topics = course.topics.length ? course.topics : [{ id: 'week-1', titleEn: 'Week 1', titleAr: 'الأسبوع 1' }];
  const lessons = course.lessons.length ? course.lessons : [];
  const weeks = topics.map((topic, index) => ({ id: topic.id, titleEn: /^week\s*\d+/i.test(topic.titleEn) ? topic.titleEn : `Week ${index + 1} — ${topic.titleEn}`, titleAr: topic.titleAr, lessons: lessons.filter((lesson) => lesson.topicId === topic.id), quizzes: [] as Quiz[] }));
  const unassigned = lessons.filter((lesson) => !lesson.topicId || !topics.some((topic) => topic.id === lesson.topicId));
  const firstWeek = weeks[0];
  if (unassigned.length && firstWeek) firstWeek.lessons.push(...unassigned);
  // Give the local preview a complete week-based course structure when the seed course is still minimal.
  if (course.slug === 'intro-to-computing' && weeks.length === 1 && firstWeek && firstWeek.lessons.length <= 1) {
    const first = firstWeek.lessons[0];
    const titles = ['Variables and Data Types', 'Algorithms and Flowcharts', 'Introduction to Programming', 'Operators and Expressions', 'Conditional Statements', 'Loops and Iteration', 'Functions and Methods', 'Arrays and Collections', 'Debugging Fundamentals', 'Introduction to Problem Solving'];
    firstWeek.titleEn = 'Week 1';
    firstWeek.lessons = titles.map((title, index) => ({ id: index === 0 && first ? first.id : `demo-week-1-lecture-${index + 1}`, titleEn: index === 0 && first ? first.titleEn : `Lecture ${String(index + 1).padStart(2, '0')} — ${title}`, titleAr: index === 0 && first ? first.titleAr : `المحاضرة ${index + 1}`, descriptionEn: index === 0 && first ? first.descriptionEn : 'Course lecture and learning objectives.', descriptionAr: null, durationSec: 900, hasVideo: index === 0 && !!first?.hasVideo, topicId: topics[0]?.id ?? 'week-1', completed: false, positionSec: 0 }));
    for (let i = 2; i <= 10; i++) weeks.push({ id: `demo-week-${i}`, titleEn: `Week ${i}`, titleAr: `الأسبوع ${i}`, lessons: Array.from({ length: i === 2 ? 6 : 5 }, (_, j) => ({ id: `demo-week-${i}-lecture-${j + 1}`, titleEn: `Lecture ${String(j + 1).padStart(2, '0')} — Week ${i} topic ${j + 1}`, titleAr: `المحاضرة ${j + 1}`, descriptionEn: 'Course lecture and learning objectives.', descriptionAr: null, durationSec: 900, hasVideo: false, topicId: `demo-week-${i}`, completed: false, positionSec: 0 })), quizzes: [] });
  }
  weeks.forEach((week, index) => {
    week.quizzes = course.quizzes.filter((quiz) => {
      const lesson = course.lessons.find((item) => item.id === quiz.lessonId);
      return lesson ? lesson.topicId === week.id : index === 0;
    });
    if (!week.quizzes.length) week.quizzes = [{ id: `demo-quiz-${week.id}`, titleEn: `Week ${index + 1} Quiz`, titleAr: `اختبار الأسبوع ${index + 1}`, passPercent: 60, questions: demoQuestions, lastAttempt: null }];
  });
  return weeks;
}

export function LearnCourse({ slug, initialLesson, initialTab }: { slug: string; initialLesson?: string; initialTab?: 'lectures' | 'notes' | 'quizzes' }) {
  const t = useTranslations('account');
  const locale = useLocale();
  const L = <T extends { titleEn: string; titleAr: string }>(o: T) => (locale === 'ar' ? o.titleAr : o.titleEn);
  const { state } = useAuthed();
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState<Lesson | null>(null);
  const [activeWeek, setActiveWeek] = useState('week-1');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [section, setSection] = useState<'overview' | 'lecture' | 'practice' | 'graded'>('overview');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [reader, setReader] = useState<Note | null>(null);
  const [readerUrl, setReaderUrl] = useState<string | null>(null);
  const [practice, setPractice] = useState<PracticeState>({});
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('lms-course-view-mode', { detail: { lecture: section === 'lecture' } }));
    return () => window.dispatchEvent(new CustomEvent('lms-course-view-mode', { detail: { lecture: false } }));
  }, [section]);

  useEffect(() => {
    try { setPractice(JSON.parse(localStorage.getItem(`lms.practice.${slug}`) || '{}') as PracticeState); } catch { setPractice({}); }
  }, [slug]);

  useEffect(() => {
    if (state.status !== 'authed') return;
    let cancelled = false;
    apiFetch<{ data: Course }>(`/me/courses/${encodeURIComponent(slug)}`).then((response) => {
      if (cancelled) return;
      const data = response.data;
      setCourse(data);
      const firstWeekId = data.topics[0]?.id ?? 'week-1';
      setActiveWeek(firstWeekId);
      setExpanded({});
      const target = data.lessons.find((lesson) => lesson.id === initialLesson);
      if (target) { setCurrent(target); setSection('lecture'); setActiveWeek(target.topicId ?? data.topics[0]?.id ?? 'week-1'); }
    }).catch((e: unknown) => { if (!cancelled) setError(e instanceof ApiError ? e.message : 'Unable to load course'); });
    return () => { cancelled = true; };
  }, [state.status, slug, initialLesson]);

  const weeks = useMemo(() => course ? buildDemoWeeks(course) : [], [course]);
  const active = weeks.find((week) => week.id === activeWeek) ?? weeks[0];
  const allLectures = weeks.flatMap((week) => week.lessons);
  const notesForLecture = current ? course?.notes.filter((note) => note.lessonId === current.id) ?? [] : [];
  const courseNotes = course?.notes.filter((note) => !note.lessonId) ?? [];
  const setPracticeItem = (key: string, value: PracticeState[string]) => setPractice((previous) => {
    const next = { ...previous, [key]: value };
    localStorage.setItem(`lms.practice.${slug}`, JSON.stringify(next));
    return next;
  });

  const openNote = async (note: Note) => {
    setReader(note);
    setReaderUrl(null);
    if (note.hasFile) {
      try { setReaderUrl(apiUrl((await apiFetch<{ data: { url: string } }>('/me/notes/' + note.id + '/url')).data.url)); } catch { setReaderUrl(null); }
    }
  };
  const downloadNote = async (note: Note) => {
    try { window.location.href = apiUrl((await apiFetch<{ data: { url: string } }>('/me/notes/' + note.id + '/url?download=1')).data.url); } catch { setError('The PDF is not available in this local demo yet.'); }
  };

  const play = async (lesson: Lesson) => {
    setCurrent(lesson);
    setActiveWeek(lesson.topicId ?? activeWeek);
    setSection('lecture');
    setVideoUrl(null);
    if (!lesson.hasVideo) return;
    try { setVideoUrl(apiUrl((await apiFetch<{ data: { url: string } }>(`/me/lessons/${lesson.id}/url`)).data.url)); }
    catch { setError('This demo lecture does not have a video file yet.'); }
  };

  const submitGraded = () => {
    const submittedAt = new Date().toISOString();
    const localKey = 'lms.graded.submissions';
    const session = JSON.parse(localStorage.getItem('al-ahmadiya-demo-session') || '{}') as { fullName?: string; email?: string };
    const rows = JSON.parse(localStorage.getItem(localKey) || '[]') as Record<string, unknown>[];
    rows.unshift({ id: `local-submission-${Date.now()}`, student: session.fullName || 'Demo Student', email: session.email || 'student.demo@example.test', course: `${course?.code ?? ''} · ${course?.titleEn ?? ''}`, assignment: 'Course Assessment 01', week: 'Whole course', submittedAt: submittedAt.slice(0, 10), marks: null, maxMarks: 100, feedback: '', status: 'PENDING', answer });
    localStorage.setItem(localKey, JSON.stringify(rows));
    setPracticeItem('graded:course-01', { done: true, submittedAt, answer });
    setAnswer('');
  };

  const submitQuiz = async (quiz: Quiz) => {
    try {
      const result = await apiFetch<{ data: { score: number; total: number; passed: boolean } }>(`/me/quizzes/${quiz.id}/attempts`, { method: 'POST', json: { answers: [0] } });
      setPracticeItem(`quiz:${quiz.id}`, { done: true, submittedAt: new Date().toISOString(), marks: result.data.score });
    } catch {
      setPracticeItem(`quiz:${quiz.id}`, { done: true, submittedAt: new Date().toISOString(), marks: 1 });
    }
  };

  if (error && !course) return <div className="rounded-3xl bg-red-50 p-6 text-danger">{error} <Link href="/portal/courses" className="ms-2 underline">{t('backToAccount')}</Link></div>;
  if (!course) return <p className="flex items-center gap-2 text-muted"><Loader2 className="size-4 animate-spin" />{t('loadingVideo')}</p>;

  const progress = allLectures.length ? Math.round((allLectures.filter((lesson) => lesson.completed || practice[`lecture:${lesson.id}`]?.done).length / allLectures.length) * 100) : 0;
  return (
    <div className="min-h-[60vh]">
      <div className="flex min-w-0 items-start gap-5">
        {section === 'lecture' && active && <aside className="hidden w-64 shrink-0 self-stretch rounded-2xl border border-line bg-white p-3 shadow-sm xl:block"><p className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-gold-700">{active.titleEn}</p><div className="max-h-[calc(100vh-11rem)] space-y-1 overflow-y-auto">{active.lessons.map((lesson, index) => <button key={lesson.id} type="button" onClick={() => void play(lesson)} aria-current={current?.id === lesson.id ? 'page' : undefined} className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-start text-xs transition-colors', current?.id === lesson.id ? 'bg-brand-900 font-semibold text-white' : 'text-brand-900 hover:bg-cream-100')}><PlayCircle className="size-4 shrink-0" /><span className="min-w-0 flex-1">Lecture {String(index + 1).padStart(2, '0')} · {L(lesson)}</span>{lesson.completed && <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />}</button>)}</div></aside>}
      <main className="mx-auto min-w-0 max-w-7xl flex-1 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-sm font-semibold text-gold-700">{course.code} · {course.deliveryMode}</p><h1 className="font-display text-4xl font-semibold text-brand-900 sm:text-5xl">{L(course)}</h1><p className="mt-2 text-sm text-muted">{weeks.length} weeks · {allLectures.length} lectures · {progress}% completed</p></div>
            {course.liveSessions.some((session) => session.status === 'LIVE') && <Link href={`/portal/live/${course.liveSessions.find((session) => session.status === 'LIVE')!.id}`} className="inline-flex items-center gap-2 rounded-full bg-danger px-5 py-2 text-sm font-semibold text-white"><Radio className="size-4" />{t('liveNow')} — {t('join')}</Link>}
          </div>
          {section === 'lecture' && current ? (
            <>
              <div><p className="text-xs font-semibold uppercase tracking-wider text-gold-700">{active?.titleEn}</p><h2 className="mt-1 font-display text-3xl font-semibold text-brand-900">{L(current)}</h2><p className="mt-1 text-sm text-muted">{current.descriptionEn}</p></div>
              <div className="overflow-hidden rounded-[1.5rem] bg-brand-950 shadow-[var(--shadow-card)]">
                {videoUrl ? <video key={videoUrl} src={videoUrl} controls className="aspect-video w-full bg-black" /> : <div className="grid aspect-video place-items-center text-white/70"><div className="text-center"><PlayCircle className="mx-auto size-12" /><p className="mt-2 text-sm">{current.hasVideo ? 'Loading lecture video…' : 'Lecture video placeholder — add video in Course Builder'}</p></div></div>}
              </div>
              <section className="rounded-2xl border border-line bg-white p-5">
                <h3 className="flex items-center gap-2 font-semibold text-brand-900"><FileText className="size-5 text-gold-600" />PDF Notes</h3>
                {notesForLecture.length || courseNotes.length ? <ul className="mt-3 space-y-2">{[...notesForLecture, ...courseNotes].map((note) => <li key={note.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream-50 p-3"><span className="text-sm font-semibold text-brand-900">{L(note)} {note.fileName && <span className="text-xs text-muted">· {note.fileName}</span>}</span><div className="flex gap-2"><button onClick={() => void openNote(note)} className="rounded-full border border-gold-400 px-3 py-1.5 text-xs font-semibold">Open notes</button>{note.hasFile && <button onClick={() => void downloadNote(note)} className="inline-flex items-center gap-1 rounded-full bg-brand-900 px-3 py-1.5 text-xs font-semibold text-white"><Download className="size-3.5" />Download</button>}</div></li>)}</ul> : <p className="mt-2 text-sm text-muted">No PDF notes have been added to this lecture yet.</p>}
              </section>
              <section className="rounded-2xl border border-line bg-white p-5">
                <h3 className="font-semibold text-brand-900">Lecture practice assignment</h3><p className="mt-1 text-xs text-muted">For practice only — this does not affect your graded results.</p>
                <PracticeCard id={`lecture:${current.id}`} title={`Practice — ${L(current)}`} state={practice[`lecture:${current.id}`]} onDone={(value) => setPracticeItem(`lecture:${current.id}`, value)} />
              </section>
              <div className="flex justify-between gap-3"><button disabled={allLectures.findIndex((item) => item.id === current.id) <= 0} onClick={() => { const i = allLectures.findIndex((item) => item.id === current.id); void play(allLectures[i - 1]); }} className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-40">Previous lecture</button><button onClick={() => { const i = allLectures.findIndex((item) => item.id === current.id); if (i < allLectures.length - 1) void play(allLectures[i + 1]); }} className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white">Next lecture</button></div>
            </>
          ) : section === 'practice' ? (
            <section className="rounded-[1.5rem] border border-line bg-white p-5"><h2 className="font-display text-3xl font-semibold text-brand-900">Complete course practice</h2><p className="mt-1 text-sm text-muted">Revision activities covering all weeks. These are ungraded practice activities.</p><PracticeCard id="course:practice-1" title="Complete course revision assignment" state={practice['course:practice-1']} onDone={(value) => setPracticeItem('course:practice-1', value)} /></section>
          ) : section === 'graded' ? (
            <section className="rounded-[1.5rem] border border-line bg-white p-5"><h2 className="font-display text-3xl font-semibold text-brand-900">Graded assignments</h2><p className="mt-1 text-sm text-muted">Submit assessed work here. Marks and feedback will appear in Results after faculty evaluation.</p><div className="mt-4 rounded-xl bg-cream-50 p-4"><p className="font-semibold text-brand-900">Course assessment — Assignment 01</p><p className="mt-1 text-xs text-muted">Covers lectures and topics from the complete course · 100 marks</p><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={4} placeholder="Write your submission for this local demo…" className="mt-3 w-full rounded-xl border border-line bg-white p-3 text-sm" /><button onClick={submitGraded} disabled={!answer.trim()} className="mt-3 rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Submit graded assignment</button>{practice['graded:course-01']?.done && <p className="mt-2 text-sm font-semibold text-success">Submitted locally · {new Date(practice['graded:course-01'].submittedAt ?? '').toLocaleDateString()}</p>}</div></section>
          ) : (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="font-display text-2xl font-semibold text-brand-900">Course weeks</h2><p className="mt-1 text-xs text-muted">Open a week to view its lectures and activities</p></div>
                <div className="flex gap-2">
                  <button onClick={() => { setSection('practice'); setCurrent(null); }} className="rounded-full border border-gold-500 px-3 py-2 text-xs font-semibold text-brand-900">Course practice</button>
                  <button onClick={() => { setSection('graded'); setCurrent(null); }} className="rounded-full bg-brand-900 px-3 py-2 text-xs font-semibold text-white">Graded work</button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                {weeks.map((week, index) => {
                  const lectureDone = week.lessons.filter((lesson) => lesson.completed).length;
                  const lectureTotal = week.lessons.length;
                  const practiceTotal = week.lessons.length + 1;
                  const practiceDone = (practice[`week:${week.id}`]?.done ? 1 : 0) + week.lessons.filter((lesson) => practice[`lecture:${lesson.id}`]?.done).length;
                  const lecturePercent = lectureTotal ? Math.round((lectureDone / lectureTotal) * 100) : 0;
                  const practicePercent = practiceTotal ? Math.round((practiceDone / practiceTotal) * 100) : 0;
                  const isExpanded = !!expanded[week.id];
                  return (
                    <article key={week.id} className="min-w-0 self-start overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
                      <button type="button" onClick={() => { setActiveWeek(week.id); setExpanded((value) => ({ ...value, [week.id]: !value[week.id] })); }} aria-expanded={isExpanded} className="w-full px-3 py-2.5 text-start hover:bg-cream-50">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="size-4 shrink-0 text-gold-700" /> : <ChevronRight className="size-4 shrink-0 text-muted" />}
                          <span className="min-w-0 flex-1 truncate text-sm font-bold text-brand-900">{week.titleEn || `Week ${index + 1}`}</span>
                          <span className="text-[11px] text-muted">{lectureDone}/{lectureTotal} lectures</span>
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <div><div className="mb-1 flex justify-between text-[10px] text-muted"><span>Lecture progress</span><span>{lectureDone}/{lectureTotal}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-cream-200"><div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${lecturePercent}%` }} /></div></div>
                          <div><div className="mb-1 flex justify-between text-[10px] text-muted"><span>Practice assignments</span><span>{practiceDone}/{practiceTotal}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-cream-200"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${practicePercent}%` }} /></div></div>
                        </div>
                      </button>
                      {isExpanded && <div className="max-h-24 space-y-1 overflow-y-auto border-t border-line bg-cream-50/70 p-2">
                        {week.lessons.map((lesson, lessonIndex) => <button key={lesson.id} onClick={() => void play(lesson)} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2 py-2 text-start hover:bg-white"><PlayCircle className="size-4 shrink-0 text-gold-700" /><span className="min-w-0 flex-1 truncate text-xs font-medium text-brand-900">Lecture {String(lessonIndex + 1).padStart(2, '0')} · {L(lesson)}</span>{lesson.completed && <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />}</button>)}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-2 pt-2">
                          <button onClick={() => setPracticeItem(`week:${week.id}`, { done: true, submittedAt: new Date().toISOString() })} disabled={!!practice[`week:${week.id}`]?.done} className="rounded-full border border-gold-500 px-3 py-1.5 text-[11px] font-semibold text-brand-900 disabled:opacity-50">{practice[`week:${week.id}`]?.done ? 'Practice completed' : 'Complete weekly practice'}</button>
                          {(week.quizzes ?? []).map((quiz) => <button key={quiz.id} onClick={() => void submitQuiz(quiz)} className="rounded-full bg-brand-900 px-3 py-1.5 text-[11px] font-semibold text-white">{practice[`quiz:${quiz.id}`]?.done ? 'Quiz completed' : 'Open weekly quiz'}</button>)}
                        </div>
                      </div>}
                    </article>
                  );
                })}
              </div>
            </section>
          )}
      </main>
      </div>

      {reader && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-brand-950/60 p-4" onClick={() => setReader(null)}><div onClick={(event) => event.stopPropagation()} className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-cream-50"><div className="flex items-center justify-between border-b border-line p-4"><h2 className="font-display text-xl font-semibold text-brand-900">{L(reader)}</h2><button onClick={() => setReader(null)} className="rounded-full px-3 py-1 hover:bg-cream-200">Close</button></div><div className="flex-1 overflow-y-auto p-5">{readerUrl ? <iframe title={L(reader)} src={readerUrl} className="h-full min-h-[65vh] w-full rounded-xl border border-line" /> : reader.bodyEn || reader.bodyAr ? <Markdown source={locale === "ar" ? reader.bodyAr ?? reader.bodyEn ?? "" : reader.bodyEn ?? reader.bodyAr ?? ""} /> : <p className="text-sm text-muted">PDF preview is not available for this demo note.</p>}</div></div></div>}
    </div>
  );
}

function PracticeCard({ id, title, state, onDone }: { id: string; title: string; state?: PracticeState[string]; onDone: (value: PracticeState[string]) => void }) {
  return <div className="mt-3 rounded-xl bg-cream-50 p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-brand-900">{title}</p>{state?.done && <span className="text-xs font-semibold text-success">Completed</span>}</div><p className="mt-1 text-xs text-muted">Use this activity to revise and practise the learning material.</p><button onClick={() => onDone({ done: true, submittedAt: new Date().toISOString() })} disabled={!!state?.done} className="mt-3 rounded-full border border-gold-500 px-3 py-1.5 text-xs font-semibold text-brand-900 disabled:opacity-50">{state?.done ? 'Practice completed' : 'Mark practice complete'}</button></div>;
}
