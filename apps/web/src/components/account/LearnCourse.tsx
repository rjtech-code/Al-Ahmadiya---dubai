'use client';

import { ArrowLeft, ArrowRight, CalendarClock, CheckCircle2, ChevronDown, ChevronRight, Circle, ClipboardList, Download, FileText, ListTree, Loader2, PanelLeftClose, PanelLeftOpen, PlayCircle, Radio, SquarePlay, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { apiFetch, ApiError, apiUrl } from '@/lib/client-api';
import { Markdown } from '@/lib/markdown';
import { cn } from '../ui/cn';
import { useAuthed } from './useAuthed';
import { AssessmentResult, AssessmentRunner, dueLabel, KIND_LABEL, questionsFor, type AssessKind, type Assessment, type Attempt } from '../portal/course/assessment';

/** Saved progress lives in this browser only (frontend preview). */
function readLocal<T>(key: string): T {
  if (typeof window === 'undefined') return {} as T;
  try { return JSON.parse(localStorage.getItem(key) || '{}') as T; } catch { return {} as T; }
}

type Item = { kind: 'video'; id: string; title: string; lesson: Lesson } | { kind: AssessKind; id: string; title: string; a: Assessment };

/** A week's contents in order: each lecture followed by its activity question, then the practice and graded assignments. */
function weekItems(week: Week, weekNo: number, startMs: number, L: (o: { titleEn: string; titleAr: string }) => string): Item[] {
  // Deadline: 11:59 PM Dubai (19:59 UTC), one week apart starting today for week 1.
  const base = new Date(startMs);
  const dueAt = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + (weekNo - 1) * 7, 19, 59)).toISOString();
  const items: Item[] = [];
  week.lessons.forEach((lesson, j) => {
    items.push({ kind: 'video', id: lesson.id, title: L(lesson), lesson });
    const id = `aq:${lesson.id}`;
    const title = `AQ${weekNo}.${j + 1}: Activity question ${j + 1} – Not graded`;
    items.push({ kind: 'activity', id, title, a: { id, kind: 'activity', title, questions: questionsFor(id, 2), marksPerQuestion: 1, dueAt, weekNo } });
  });
  const pid = `pa:${week.id}`, ptitle = `Week ${weekNo} – Practice assignment ${weekNo}`;
  items.push({ kind: 'practice', id: pid, title: ptitle, a: { id: pid, kind: 'practice', title: ptitle, questions: questionsFor(pid, 5), marksPerQuestion: 1, dueAt, weekNo } });
  const gid = `ga:${week.id}`, gtitle = `Week ${weekNo} – Graded assignment ${weekNo}`;
  items.push({ kind: 'graded', id: gid, title: gtitle, a: { id: gid, kind: 'graded', title: gtitle, questions: questionsFor(gid, 10), marksPerQuestion: 2, dueAt, weekNo } });
  return items;
}

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
  const [section, setSection] = useState<'overview' | 'lecture' | 'practice' | 'graded' | 'assess'>('overview');
  const [assessId, setAssessId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Record<string, Attempt>>(() => readLocal<Record<string, Attempt>>(`lms.assess.${slug}`));
  const [retake, setRetake] = useState(false);
  const [navOpen, setNavOpen] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [navWeeks, setNavWeeks] = useState<Record<string, boolean>>({});
  const [startMs] = useState(() => Date.now());
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [reader, setReader] = useState<Note | null>(null);
  const [readerUrl, setReaderUrl] = useState<string | null>(null);
  const [practice, setPractice] = useState<PracticeState>(() => readLocal<PracticeState>(`lms.practice.${slug}`));
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    // Inside a week (lecture, its practice or graded work) the portal sidebar gives way to the week navigation.
    window.dispatchEvent(new CustomEvent('lms-course-view-mode', { detail: { lecture: section === 'lecture' || section === 'assess' } }));
    return () => { window.dispatchEvent(new CustomEvent('lms-course-view-mode', { detail: { lecture: false } })); };
  }, [section]);


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
      if (target) { setCurrent(target); setSection('lecture'); setPractice((prev) => { const next = { ...prev, [`video:${target.id}`]: { done: true, submittedAt: new Date().toISOString() } }; localStorage.setItem(`lms.practice.${slug}`, JSON.stringify(next)); return next; }); setActiveWeek(target.topicId ?? data.topics[0]?.id ?? 'week-1'); }
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
    setDrawer(false);
    setNavWeeks((w) => ({ ...w, [lesson.topicId ?? activeWeek]: true }));
    setPracticeItem(`video:${lesson.id}`, { done: true, submittedAt: new Date().toISOString() });
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

  if (error && !course) return <div className="rounded-3xl bg-red-50 p-6 text-danger">{error} <Link href="/portal/courses" className="ms-2 underline">{t('backToAccount')}</Link></div>;
  if (!course) return <p className="flex items-center gap-2 text-muted"><Loader2 className="size-4 animate-spin" />{t('loadingVideo')}</p>;

  const inWeek = section === 'lecture' || section === 'assess';
  const itemsByWeek = new Map(weeks.map((week, index) => [week.id, weekItems(week, index + 1, startMs, L)]));
  const allItems = weeks.flatMap((week) => itemsByWeek.get(week.id) ?? []);
  const currentItem = section === 'assess' ? allItems.find((item) => item.id === assessId) : section === 'lecture' && current ? allItems.find((item) => item.id === current.id) : undefined;
  const itemIndex = currentItem ? allItems.indexOf(currentItem) : -1;
  const isDone = (item: Item) => (item.kind === 'video' ? item.lesson.completed || !!practice[`video:${item.id}`]?.done : !!attempts[item.id]);
  const openItem = (item: Item) => {
    if (item.kind === 'video') { void play(item.lesson); return; }
    const week = weeks.find((w) => (itemsByWeek.get(w.id) ?? []).includes(item));
    if (week) { setActiveWeek(week.id); setNavWeeks((v) => ({ ...v, [week.id]: true })); }
    setCurrent(null); setAssessId(item.id); setRetake(false); setSection('assess'); setDrawer(false);
  };
  const saveAttempt = (a: Assessment, attempt: Attempt) => {
    const next = { ...attempts, [a.id]: attempt };
    setAttempts(next); setRetake(false);
    localStorage.setItem(`lms.assess.${slug}`, JSON.stringify(next));
    if (a.kind === 'graded') {
      const session = JSON.parse(localStorage.getItem('al-ahmadiya-demo-session') || '{}') as { fullName?: string; email?: string };
      const rows = (JSON.parse(localStorage.getItem('lms.graded.submissions') || '[]') as { id: string }[]).filter((r) => r.id !== `${slug}:${a.id}`);
      rows.unshift({ id: `${slug}:${a.id}`, student: session.fullName || 'Demo Student', email: session.email || 'student.demo@example.test', course: `${course?.code ?? ''} · ${course?.titleEn ?? ''}`, assignment: a.title, week: `Week ${a.weekNo}`, submittedAt: attempt.submittedAt.slice(0, 10), marks: attempt.score, maxMarks: a.questions.length * a.marksPerQuestion, feedback: '', status: 'GRADED' } as { id: string });
      localStorage.setItem('lms.graded.submissions', JSON.stringify(rows));
    }
  };

  // Left "Contents" navigation: every week collapsible; the current week opens with its lectures and assignments.
  const contents = (
    <nav aria-label="Course contents" className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-900"><ListTree className="size-4 text-gold-600" />Contents</p>
        <button type="button" onClick={() => { setNavOpen(false); setDrawer(false); }} aria-label="Hide contents" className="grid size-9 place-items-center rounded-lg text-brand-900 hover:bg-cream-200"><PanelLeftClose className="size-5" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {weeks.map((week, index) => {
          const items = itemsByWeek.get(week.id) ?? [];
          const open = navWeeks[week.id] ?? week.id === active?.id;
          return (
            <div key={week.id} className={cn(open && 'bg-white/60')}>
              <button type="button" onClick={() => setNavWeeks((v) => ({ ...v, [week.id]: !open }))} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-start hover:bg-cream-100">
                {open ? <ChevronDown className="size-4 shrink-0 text-gold-700" /> : <ChevronRight className="size-4 shrink-0 text-muted" />}
                <span className="flex-1 font-semibold text-brand-900">Week {index + 1}</span>
                <span className="text-xs text-muted">{items.filter(isDone).length}/{items.length}</span>
              </button>
              {open && <ul className="space-y-1 px-2 pb-3">
                {items.map((item) => {
                  const selected = currentItem?.id === item.id;
                  const done = isDone(item);
                  return (
                    <li key={item.id}>
                      <button type="button" onClick={() => openItem(item)} aria-current={selected ? 'page' : undefined} className={cn('flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-start transition-colors', selected ? 'bg-brand-900 text-white' : 'text-brand-900 hover:bg-cream-100')}>
                        {item.kind === 'video' ? <SquarePlay className={cn('mt-0.5 size-4 shrink-0', selected ? 'text-gold-300' : 'text-gold-700')} /> : <ClipboardList className={cn('mt-0.5 size-4 shrink-0', selected ? 'text-gold-300' : 'text-gold-700')} />}
                        <span className="min-w-0 flex-1"><span className="block text-sm font-medium leading-snug">{item.title}</span><span className={cn('text-xs', selected ? 'text-white/70' : 'text-muted')}>{item.kind === 'video' ? 'Video' : item.kind === 'graded' ? 'Graded assignment' : 'Assignment'}</span></span>
                        {done ? <CheckCircle2 className={cn('mt-0.5 size-5 shrink-0', selected ? 'text-gold-300' : 'text-success')} /> : <Circle className={cn('mt-0.5 size-5 shrink-0', selected ? 'text-white/60' : 'text-muted/60')} />}
                      </button>
                    </li>
                  );
                })}
              </ul>}
            </div>
          );
        })}
      </div>
    </nav>
  );

  const progress = allLectures.length ? Math.round((allLectures.filter((lesson) => lesson.completed || practice[`lecture:${lesson.id}`]?.done).length / allLectures.length) * 100) : 0;
  const assessItem = currentItem && currentItem.kind !== 'video' ? currentItem : null;
  const prevItem = itemIndex > 0 ? allItems[itemIndex - 1] : null;
  const nextItem = itemIndex >= 0 && itemIndex < allItems.length - 1 ? allItems[itemIndex + 1] : null;
  return (
    <div className="min-h-[60vh]">
      {inWeek ? (
        <div className="-mx-4 -mb-10 -mt-6 flex sm:-mx-8">
          {navOpen && <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-80 shrink-0 border-e border-line bg-cream-50 lg:block">{contents}</aside>}
          {drawer && <div className="fixed inset-0 z-50 lg:hidden"><button type="button" aria-label="Close contents" onClick={() => setDrawer(false)} className="absolute inset-0 bg-brand-950/50" /><div className="absolute inset-y-0 start-0 w-[86%] max-w-sm bg-cream-50 shadow-2xl"><button type="button" onClick={() => setDrawer(false)} aria-label="Close contents" className="absolute end-3 top-3 z-10 grid size-9 place-items-center rounded-lg bg-white text-brand-900 lg:hidden"><X className="size-5" /></button>{contents}</div></div>}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="sticky top-16 z-30 flex min-h-14 flex-wrap items-center gap-2 border-b border-line bg-cream-50/95 px-3 py-2 backdrop-blur sm:gap-3 sm:px-5">
              {!navOpen && <button type="button" onClick={() => setNavOpen(true)} aria-label="Show contents" className="hidden size-9 place-items-center rounded-lg text-brand-900 hover:bg-cream-200 lg:grid"><PanelLeftOpen className="size-5" /></button>}
              <button type="button" onClick={() => setDrawer(true)} aria-label="Show contents" className="grid size-9 place-items-center rounded-lg text-brand-900 hover:bg-cream-200 lg:hidden"><ListTree className="size-5" /></button>
              <button type="button" onClick={() => { setSection('overview'); setCurrent(null); setAssessId(null); }} aria-label="Back to course" className="grid size-9 place-items-center rounded-lg text-brand-900 hover:bg-cream-200"><ArrowLeft className="size-5 rtl:rotate-180" /></button>
              <p className="flex min-w-0 flex-1 items-center gap-2 font-semibold text-brand-900">{assessItem ? <ClipboardList className="size-5 shrink-0 text-gold-600" /> : <SquarePlay className="size-5 shrink-0 text-gold-600" />}<span className="truncate">{currentItem?.title ?? ''}</span></p>
              {assessItem && <span className="order-last inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-900 shadow-sm sm:order-none sm:w-auto sm:text-sm"><CalendarClock className="size-4 text-gold-600" />Due {dueLabel(assessItem.a.dueAt)}</span>}
            </div>
            <div className="flex-1 space-y-5 p-4 sm:p-6">
              {assessItem ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">{course.code} · {KIND_LABEL[assessItem.kind]}</p>
                  {attempts[assessItem.id] && !retake
                    ? <AssessmentResult a={assessItem.a} attempt={attempts[assessItem.id]} onRetake={() => setRetake(true)} />
                    : <AssessmentRunner key={assessItem.id} a={assessItem.a} onSubmit={(attempt) => saveAttempt(assessItem.a, attempt)} />}
                </>
              ) : current ? (
                <>
              <div><p className="text-xs font-semibold uppercase tracking-wider text-gold-700">{active?.titleEn}</p><h2 className="mt-1 font-display text-3xl font-semibold text-brand-900">{L(current)}</h2><p className="mt-1 text-sm text-muted">{current.descriptionEn}</p></div>
              <div className="overflow-hidden rounded-[1.5rem] bg-brand-950 shadow-[var(--shadow-card)]">
                {videoUrl ? <video key={videoUrl} src={videoUrl} controls className="aspect-video w-full bg-black" /> : <div className="grid aspect-video place-items-center text-white/70"><div className="text-center"><PlayCircle className="mx-auto size-12" /><p className="mt-2 text-sm">{current.hasVideo ? 'Loading lecture video…' : 'Lecture video placeholder — add video in Course Builder'}</p></div></div>}
              </div>
              <section className="rounded-2xl border border-line bg-white p-5">
                <h3 className="flex items-center gap-2 font-semibold text-brand-900"><FileText className="size-5 text-gold-600" />PDF Notes</h3>
                {notesForLecture.length || courseNotes.length ? <ul className="mt-3 space-y-2">{[...notesForLecture, ...courseNotes].map((note) => <li key={note.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream-50 p-3"><span className="text-sm font-semibold text-brand-900">{L(note)} {note.fileName && <span className="text-xs text-muted">· {note.fileName}</span>}</span><div className="flex gap-2"><button onClick={() => void openNote(note)} className="rounded-full border border-gold-400 px-3 py-1.5 text-xs font-semibold">Open notes</button>{note.hasFile && <button onClick={() => void downloadNote(note)} className="inline-flex items-center gap-1 rounded-full bg-brand-900 px-3 py-1.5 text-xs font-semibold text-white"><Download className="size-3.5" />Download</button>}</div></li>)}</ul> : <p className="mt-2 text-sm text-muted">No PDF notes have been added to this lecture yet.</p>}
              </section>
                </>
              ) : null}
              {(prevItem || nextItem) && (
                <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                  {prevItem ? <button type="button" onClick={() => openItem(prevItem)} className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-start hover:border-gold-400"><ArrowLeft className="size-5 shrink-0 text-gold-700 rtl:rotate-180" /><span className="min-w-0"><span className="block text-[11px] font-bold uppercase tracking-wider text-muted">Previous</span><span className="block truncate text-sm font-semibold text-brand-900">{prevItem.title}</span></span></button> : <span />}
                  {nextItem && <button type="button" onClick={() => openItem(nextItem)} className="flex items-center justify-end gap-3 rounded-2xl bg-brand-900 px-4 py-3 text-end text-white hover:bg-brand-800"><span className="min-w-0"><span className="block text-[11px] font-bold uppercase tracking-wider text-gold-300">Next</span><span className="block truncate text-sm font-semibold">{nextItem.title}</span></span><ArrowRight className="size-5 shrink-0 text-gold-300 rtl:rotate-180" /></button>}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
      <div className="flex min-w-0 items-start gap-5">
      <main className="mx-auto min-w-0 max-w-7xl flex-1 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-sm font-semibold text-gold-700">{course.code} · {course.deliveryMode}</p><h1 className="font-display text-4xl font-semibold text-brand-900 sm:text-5xl">{L(course)}</h1><p className="mt-2 text-sm text-muted">{weeks.length} weeks · {allLectures.length} lectures · {progress}% completed</p></div>
            {course.liveSessions.some((session) => session.status === 'LIVE') && <Link href={`/portal/live/${course.liveSessions.find((session) => session.status === 'LIVE')!.id}`} className="inline-flex items-center gap-2 rounded-full bg-danger px-5 py-2 text-sm font-semibold text-white"><Radio className="size-4" />{t('liveNow')} — {t('join')}</Link>}
          </div>
          {section === 'practice' ? (
            <section className="rounded-[1.5rem] border border-line bg-white p-5"><h2 className="font-display text-3xl font-semibold text-brand-900">Complete course practice</h2><p className="mt-1 text-sm text-muted">Revision activities covering all weeks. These are ungraded practice activities.</p><PracticeCard id="course:practice-1" title="Complete course revision assignment" state={practice['course:practice-1']} onDone={(value) => setPracticeItem('course:practice-1', value)} /></section>
          ) : section === 'graded' ? (
            <section className="rounded-[1.5rem] border border-line bg-white p-5"><h2 className="font-display text-3xl font-semibold text-brand-900">Graded assignments</h2><p className="mt-1 text-sm text-muted">Submit assessed work here. Marks and feedback will appear in Results after faculty evaluation.</p><div className="mt-4 rounded-xl bg-cream-50 p-4"><p className="font-semibold text-brand-900">Course assessment — Assignment 01</p><p className="mt-1 text-xs text-muted">Covers lectures and topics from the complete course · 100 marks</p><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={4} placeholder="Write your submission for this local demo…" className="mt-3 w-full rounded-xl border border-line bg-white p-3 text-sm" /><button onClick={submitGraded} disabled={!answer.trim()} className="mt-3 rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Submit graded assignment</button>{practice['graded:course-01']?.done && <p className="mt-2 text-sm font-semibold text-success">Submitted locally · {new Date(practice['graded:course-01'].submittedAt ?? '').toLocaleDateString()}</p>}</div></section>
          ) : (
            <section className="mx-auto w-full max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="font-display text-2xl font-semibold text-brand-900">Course weeks</h2><p className="mt-1 text-xs text-muted">Open a week to view its lectures and activities</p></div>
                <div className="flex gap-2">
                  <button onClick={() => { setSection('practice'); setCurrent(null); }} className="rounded-full border border-gold-500 px-3 py-2 text-xs font-semibold text-brand-900">Course practice</button>
                  <button onClick={() => { setSection('graded'); setCurrent(null); }} className="rounded-full bg-brand-900 px-3 py-2 text-xs font-semibold text-white">Graded work</button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {weeks.map((week, index) => {
                  const lectureDone = week.lessons.filter((lesson) => lesson.completed).length;
                  const lectureTotal = week.lessons.length;
                  const assessItems = (itemsByWeek.get(week.id) ?? []).filter((item) => item.kind === 'activity' || item.kind === 'practice');
                  const practiceTotal = assessItems.length;
                  const practiceDone = assessItems.filter(isDone).length;
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
                          {(itemsByWeek.get(week.id) ?? []).filter((item) => item.kind === 'practice' || item.kind === 'graded').map((item) => <button key={item.id} onClick={() => openItem(item)} className={cn('rounded-full px-3 py-1.5 text-[11px] font-semibold', item.kind === 'graded' ? 'bg-brand-900 text-white' : 'border border-gold-500 text-brand-900')}>{isDone(item) ? '✓ ' : ''}{item.kind === 'graded' ? 'Graded assignment' : 'Practice assignment'}</button>)}
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
      )}

      {reader && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-brand-950/60 p-4" onClick={() => setReader(null)}><div onClick={(event) => event.stopPropagation()} className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-cream-50"><div className="flex items-center justify-between border-b border-line p-4"><h2 className="font-display text-xl font-semibold text-brand-900">{L(reader)}</h2><button onClick={() => setReader(null)} className="rounded-full px-3 py-1 hover:bg-cream-200">Close</button></div><div className="flex-1 overflow-y-auto p-5">{readerUrl ? <iframe title={L(reader)} src={readerUrl} className="h-full min-h-[65vh] w-full rounded-xl border border-line" /> : reader.bodyEn || reader.bodyAr ? <Markdown source={locale === "ar" ? reader.bodyAr ?? reader.bodyEn ?? "" : reader.bodyEn ?? reader.bodyAr ?? ""} /> : <p className="text-sm text-muted">PDF preview is not available for this demo note.</p>}</div></div></div>}
    </div>
  );
}

function PracticeCard({ id, title, state, onDone }: { id: string; title: string; state?: PracticeState[string]; onDone: (value: PracticeState[string]) => void }) {
  return <div className="mt-3 rounded-xl bg-cream-50 p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-brand-900">{title}</p>{state?.done && <span className="text-xs font-semibold text-success">Completed</span>}</div><p className="mt-1 text-xs text-muted">Use this activity to revise and practise the learning material.</p><button onClick={() => onDone({ done: true, submittedAt: new Date().toISOString() })} disabled={!!state?.done} className="mt-3 rounded-full border border-gold-500 px-3 py-1.5 text-xs font-semibold text-brand-900 disabled:opacity-50">{state?.done ? 'Practice completed' : 'Mark practice complete'}</button></div>;
}
