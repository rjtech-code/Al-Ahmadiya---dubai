import Image from 'next/image';
import {
  ArrowRight, BadgeCheck, BookOpen, CalendarDays, CheckCircle2, ClipboardList, Clock3, GraduationCap, Landmark, Languages,
  LibraryBig, MonitorPlay, PlayCircle, Radio, Sparkles, UserRound, Users,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { api, courseMeta } from '@/lib/api';
import { initPage, type LocaleParams } from '@/lib/page';
import { CountUp, Enter, FadeUp, Float, Lift, Parallax, Stagger, WordsReveal } from '@/components/motion';
import { BookStack3D, SectionArt } from '@/components/motion/Illustrations';
import { JsonLd, pageMetadata, SITE_URL } from '@/lib/seo';

export async function generateMetadata({ params }: LocaleParams) {
  const { locale } = await params;
  return pageMetadata({ locale, path: '/' });
}

const LEVEL: Record<string, { en: string; ar: string }> = {
  BACHELOR: { en: 'Bachelor’s', ar: 'بكالوريوس' }, MASTER: { en: 'Master’s', ar: 'ماجستير' }, DIPLOMA: { en: 'Diploma', ar: 'دبلوم' },
  FOUNDATION: { en: 'Foundation', ar: 'تأسيسي' }, DOCTORATE: { en: 'Doctorate', ar: 'دكتوراه' }, PROFESSIONAL: { en: 'Professional', ar: 'مهني' },
};
const money = (fils: number, ar: boolean) => (fils ? `${ar ? 'د.إ' : 'AED'} ${(fils / 100).toLocaleString('en')}` : ar ? 'مجاني' : 'Free');

export default async function HomePage({ params }: LocaleParams) {
  const locale = await initPage(params);
  const ar = locale === 'ar';
  const t = (en: string, arText: string) => (ar ? arText : en);
  const [programs, courses, colleges, faculty, news, events, faqs, heritage] = await Promise.all([
    api.programs({ pageSize: 6 }), api.courses({ pageSize: 9 }), api.colleges(), api.faculty({ pageSize: 4 }),
    api.news({ pageSize: 3 }), api.events({ when: 'upcoming', limit: 3 }), api.faqs('programs'), api.heritage(),
  ]);
  const L = (o: { titleEn?: string; titleAr?: string; nameEn?: string; nameAr?: string }) => (ar ? o.titleAr ?? o.nameAr : o.titleEn ?? o.nameEn) ?? '';
  const featured = courses.data.filter((c) => courseMeta(c.slug)?.featured).slice(0, 3);
  const live = courses.data.find((c) => courseMeta(c.slug)?.live);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString(ar ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Dubai' });

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'EducationalOrganization', name: 'Al Ahmadiya School', alternateName: 'المدرسة الأحمدية', foundingDate: '1912', url: `${SITE_URL}/${locale}`, address: { '@type': 'PostalAddress', addressLocality: 'Al Ras, Deira, Dubai', addressCountry: 'AE' } }} />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-brand-950 text-white">
        <Parallax className="absolute inset-0 -z-20"><Image src="/images/campus/academic.jpg" alt="" fill priority sizes="100vw" className="object-cover opacity-30" /></Parallax>
        <SectionArt variant={0} dark />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-950 via-brand-950/90 to-brand-950/40 rtl:bg-gradient-to-l" />
        <div className="container-site relative z-10 grid min-h-[620px] items-center gap-12 py-16 lg:grid-cols-[1.15fr_.85fr] lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[.18em] text-gold-300"><Landmark className="size-4" />{t('Since 1912 · Al Ras, Dubai', 'منذ 1912 · الراس، دبي')}</p>
            <h1 className="mt-7 max-w-3xl font-display text-5xl font-semibold leading-[1.02] sm:text-6xl xl:text-7xl"><WordsReveal text={t('Learn where Dubai first learned.', 'تعلّم حيث بدأ تعليم دبي.')} /></h1>
            <Enter delay={0.45}><p className="mt-6 max-w-2xl text-base leading-8 text-white/75 sm:text-lg">{t('From the city’s first semi-formal school to a proposed university: study online with live classes, recorded lectures and teachers who know you by name — in English and Arabic.', 'من أول مدرسة شبه نظامية في المدينة إلى جامعة مقترحة: ادرس عبر الإنترنت بحصص مباشرة ومحاضرات مسجلة ومعلمين يعرفونك بالاسم — بالعربية والإنجليزية.')}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/courses" className="inline-flex h-12 items-center gap-2 rounded-full bg-gold-400 px-6 text-sm font-bold text-brand-950 transition hover:bg-gold-300">{t('Browse courses', 'تصفح المقررات')}<ArrowRight className="size-4 rtl:rotate-180" /></Link>
              <Link href="/programs" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/30 px-6 text-sm font-semibold transition hover:border-gold-300 hover:bg-white/10">{t('Explore programmes', 'استكشف البرامج')}</Link>
            </div>
            <dl className="mt-12 grid max-w-xl grid-cols-3 gap-4 border-t border-white/15 pt-6">
              {([[programs.meta.total, t('Programmes', 'برامج')], [courses.meta.total, t('Online courses', 'مقرر إلكتروني')], [2, t('Languages', 'لغتان')]] as const).map(([n, l]) => <div key={l}><dt className="sr-only">{l}</dt><dd><CountUp to={n} className="block font-display text-4xl font-semibold text-gold-300" /><p className="mt-1 text-xs text-white/60">{l}</p></dd></div>)}
            </dl>
            </Enter>
          </div>
          {live && (
            <Float className="relative hidden lg:block" amount={12} duration={7}><aside className="relative">
              <div className="absolute -inset-4 rounded-[2.5rem] border border-gold-300/25" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.06] p-5 shadow-2xl backdrop-blur">
                <div className="relative aspect-video overflow-hidden rounded-2xl">
                  {live.imagePath && <Image src={live.imagePath} alt="" fill sizes="40vw" className="object-cover" />}
                  <span className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-danger px-3 py-1 text-xs font-semibold"><Radio className="size-3.5" />{t('Live course', 'مقرر مباشر')}</span>
                  <span className="absolute inset-0 grid place-items-center"><span className="grid size-14 place-items-center rounded-full bg-white/90 text-brand-900"><PlayCircle className="size-8" /></span></span>
                </div>
                <p className="mt-4 text-xs font-bold text-gold-300">{live.code}</p>
                <p className="font-display text-2xl font-semibold">{L(live)}</p>
                <ul className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/75">
                  {[[MonitorPlay, t('Twice-weekly live classes', 'حصتان مباشرتان أسبوعياً')], [PlayCircle, t('Every class recorded', 'كل حصة مسجلة')], [ClipboardList, t('Quizzes after lessons', 'اختبارات بعد الدروس')], [BadgeCheck, t('Attendance tracked', 'حضور يُسجَّل تلقائياً')]].map(([I, s]) => { const Icon = I as typeof Radio; return <li key={s as string} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2"><Icon className="size-4 text-gold-300" />{s as string}</li>; })}
                </ul>
                <Link href={`/courses/${live.slug}`} className="mt-4 flex h-11 items-center justify-center rounded-full bg-white text-sm font-semibold text-brand-900 hover:bg-cream-100">{t('See course', 'عرض المقرر')} · {money(courseMeta(live.slug)?.priceFils ?? 0, ar)}</Link>
              </div>
            </aside></Float>
          )}
        </div>
      </section>

      {/* Heritage timeline */}
      <section className="border-b border-line bg-cream-50">
        <div className="container-site grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {heritage.milestones.map((m) => (
            <div key={m.id} className="flex gap-4">
              <p className="font-display text-3xl font-semibold text-gold-600">{m.yearLabel === 'Next' ? t('Next', 'التالي') : m.yearLabel}</p>
              <div><p className="font-semibold text-brand-900">{ar ? m.titleAr : m.titleEn}</p><p className="mt-1 text-xs leading-5 text-muted">{ar ? m.bodyAr : m.bodyEn}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* How online learning works */}
      <section className="relative isolate">
      <SectionArt variant={1} />
      <div className="container-site relative z-10 py-20 sm:py-24">
        <FadeUp className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-gold-700">{t('Study online', 'ادرس عبر الإنترنت')}</p>
          <h2 className="mt-3 font-display text-4xl font-semibold text-brand-900 sm:text-5xl">{t('A real classroom — wherever you are.', 'صف حقيقي — أينما كنت.')}</h2>
          <p className="mt-4 leading-7 text-muted">{t('Every course follows a clear weekly rhythm, so you always know what to watch, practise and submit next.', 'يسير كل مقرر وفق إيقاع أسبوعي واضح، فتعرف دائماً ما الذي تشاهده وتتدرب عليه وتسلّمه.')}</p>
        </FadeUp>
        <Stagger className="relative mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            [UserRound, t('Create your account', 'أنشئ حسابك'), t('Sign up in a minute and choose a single course or a full programme.', 'سجّل في دقيقة واختر مقرراً واحداً أو برنامجاً كاملاً.')],
            [MonitorPlay, t('Join live classes', 'احضر الحصص المباشرة'), t('Ask questions and answer polls in real time; your attendance is recorded automatically.', 'اطرح الأسئلة وشارك في الاستطلاعات مباشرة، ويُسجَّل حضورك تلقائياً.')],
            [PlayCircle, t('Learn week by week', 'تعلّم أسبوعاً بأسبوع'), t('Recorded lectures, PDF notes, activity questions and a practice assignment for every week.', 'محاضرات مسجلة وملاحظات PDF وأسئلة نشاط وواجب تدريبي لكل أسبوع.')],
            [GraduationCap, t('Get graded & progress', 'احصل على التقييم وتقدّم'), t('Graded assignments, published results and your CGPA — all in your student portal.', 'واجبات مقيّمة ونتائج منشورة ومعدلك التراكمي — كلها في بوابة الطالب.')],
          ].map(([I, h, b], i) => { const Icon = I as typeof Radio; return (
            <Lift key={h as string} className="relative h-full rounded-[1.5rem] border border-line bg-white p-6 shadow-[var(--shadow-card)]">
              <span className="absolute end-5 top-4 font-display text-4xl text-gold-500/40">{String(i + 1).padStart(2, '0')}</span>
              <span className="grid size-12 place-items-center rounded-2xl bg-brand-900 text-gold-300"><Icon className="size-6" /></span>
              <h3 className="mt-5 font-display text-2xl font-semibold text-brand-900">{h as string}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{b as string}</p>
            </Lift>
          ); })}
        </Stagger>
      </div>
      </section>

      {/* Featured courses */}
      <section className="relative isolate bg-cream-200/50 py-20 sm:py-24">
        <SectionArt variant={2} />
        <div className="container-site relative z-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-gold-700">{t('Start this week', 'ابدأ هذا الأسبوع')}</p><h2 className="mt-3 font-display text-4xl font-semibold text-brand-900 sm:text-5xl">{t('Popular online courses', 'مقررات إلكترونية مميزة')}</h2></div>
            <Link href="/courses" className="inline-flex h-11 items-center gap-2 rounded-full border border-gold-400 bg-white px-5 text-sm font-semibold text-brand-900 hover:bg-cream-100">{t(`All ${courses.meta.total} courses`, `جميع المقررات (${courses.meta.total})`)}<ArrowRight className="size-4 rtl:rotate-180" /></Link>
          </div>
          <Stagger className="mt-10 grid gap-5 md:grid-cols-3">
            {featured.map((c) => { const m = courseMeta(c.slug)!; return (
              <Link key={c.id} href={`/courses/${c.slug}`} className="group flex flex-col overflow-hidden rounded-[1.5rem] border border-white bg-white shadow-[var(--shadow-card)] transition hover:-translate-y-1">
                <span className="relative block aspect-[16/10] overflow-hidden">
                  {c.imagePath && <Image src={c.imagePath} alt="" fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />}
                  <span className="absolute start-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-brand-900">{c.code}</span>
                  <span className={`absolute end-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white ${m.live ? 'bg-danger' : 'bg-brand-900/85'}`}>{m.live ? t('Live', 'مباشر') : t('Self-paced', 'ذاتي')}</span>
                </span>
                <span className="flex flex-1 flex-col p-5">
                  <span className="font-display text-2xl font-semibold leading-tight text-brand-900">{L(c)}</span>
                  <span className="mt-2 line-clamp-2 text-sm text-muted">{ar ? c.descriptionAr : c.descriptionEn}</span>
                  <span className="mt-4 flex flex-wrap gap-3 text-xs text-muted"><span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" />{c.creditHours} {t('credits', 'ساعات')}</span>{m.instructor && <span className="inline-flex items-center gap-1"><UserRound className="size-3.5" />{ar ? m.instructor.fullNameAr : m.instructor.fullNameEn}</span>}</span>
                  <span className="mt-auto flex items-center justify-between pt-5"><span className="font-display text-2xl font-semibold text-brand-900">{money(m.priceFils, ar)}</span><span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">{t('View course', 'عرض المقرر')}<ArrowRight className="size-4 rtl:rotate-180" /></span></span>
                </span>
              </Link>
            ); })}
          </Stagger>
        </div>
      </section>

      {/* Programmes */}
      <section className="relative isolate">
      <SectionArt variant={4} />
      <div className="container-site relative z-10 py-20 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-gold-700">{t('Find your path', 'اختر مسارك')}</p><h2 className="mt-3 font-display text-4xl font-semibold text-brand-900 sm:text-5xl">{t('Programmes of the proposed university', 'برامج الجامعة المقترحة')}</h2><p className="mt-3 text-sm text-muted">{t('Programmes are subject to official approval before admissions open.', 'البرامج رهن الموافقة الرسمية قبل فتح باب القبول.')}</p></div>
          <Link href="/programs" className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-800">{t('All programmes', 'جميع البرامج')}<ArrowRight className="size-4 rtl:rotate-180" /></Link>
        </div>
        <Stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {programs.data.map((p) => (
            <Link key={p.id} href={`/programs/${p.slug}`} className={`group relative isolate flex min-h-72 flex-col justify-end overflow-hidden rounded-[1.5rem] p-6 text-white shadow-[var(--shadow-card)]`}>
              {p.imagePath && <Image src={p.imagePath} alt="" fill sizes="(min-width:1024px) 40vw, 100vw" className="-z-10 object-cover transition duration-500 group-hover:scale-105" />}
              <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-950/95 via-brand-950/55 to-brand-950/10" />
              <span className="mb-auto self-start rounded-full bg-gold-400 px-3 py-1 text-[11px] font-bold text-brand-950">{ar ? LEVEL[p.degreeLevel]?.ar : LEVEL[p.degreeLevel]?.en}</span>
              <span className="text-xs text-gold-300">{p.department && L(p.department)}</span>
              <span className="mt-1 font-display text-3xl font-semibold leading-tight">{L(p)}</span>
              <span className="mt-2 line-clamp-2 max-w-xl text-sm text-white/75">{ar ? p.summaryAr : p.summaryEn}</span>
              <span className="mt-4 flex gap-4 text-xs text-white/80"><span>{p.durationYears} {t('years', 'سنوات')}</span><span>{p.totalCredits} {t('credits', 'ساعة')}</span></span>
            </Link>
          ))}
        </Stagger>
      </div>
      </section>

      {/* Colleges */}
      <section className="relative isolate bg-brand-950 py-20 text-white sm:py-24">
        <SectionArt variant={5} dark />
        <div className="container-site relative z-10">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-gold-300">{t('Academic structure', 'الهيكل الأكاديمي')}</p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold sm:text-5xl">{t('Three colleges, one tradition of learning.', 'ثلاث كليات، وتقليد واحد للتعلّم.')}</h2>
          <Stagger className="mt-10 grid gap-5 md:grid-cols-3">
            {colleges.map((c) => (
              <Link key={c.id} href={`/colleges/${c.slug}`} className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04] transition hover:border-gold-400/60">
                <span className="relative block aspect-[16/9]">{c.imagePath && <Image src={c.imagePath} alt="" fill sizes="33vw" className="object-cover opacity-80 transition group-hover:opacity-100" />}</span>
                <span className="block p-6">
                  <span className="font-display text-2xl font-semibold">{L(c)}</span>
                  <span className="mt-2 block text-sm text-white/65">{ar ? c.summaryAr : c.summaryEn}</span>
                  <span className="mt-4 flex flex-wrap gap-2">{c.departments.map((d) => <span key={d.id} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/85">{L(d)}</span>)}</span>
                </span>
              </Link>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Student portal + faculty */}
      <section className="container-site grid gap-12 py-20 sm:py-24 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-gold-700">{t('Your student portal', 'بوابة الطالب')}</p>
          <h2 className="mt-3 font-display text-4xl font-semibold text-brand-900">{t('Everything for your studies, in one place.', 'كل ما تحتاجه لدراستك في مكان واحد.')}</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {[[BookOpen, t('Courses & weekly lectures', 'المقررات والمحاضرات الأسبوعية')], [CalendarDays, t('Timetable & live classes', 'الجدول والحصص المباشرة')], [ClipboardList, t('Assignments & instant quiz results', 'الواجبات ونتائج الاختبارات الفورية')], [GraduationCap, t('Results, CGPA & transcript', 'النتائج والمعدل وكشف الدرجات')], [LibraryBig, t('Library & documents', 'المكتبة والمستندات')], [Languages, t('English & Arabic', 'العربية والإنجليزية')]].map(([I, s]) => { const Icon = I as typeof Radio; return <li key={s as string} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 text-sm font-semibold text-brand-900"><span className="grid size-10 place-items-center rounded-xl bg-gold-100 text-gold-700"><Icon className="size-5" /></span>{s as string}</li>; })}
          </ul>
          <Link href="/register" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-brand-900 px-6 text-sm font-semibold text-white hover:bg-brand-800">{t('Create a free account', 'أنشئ حساباً مجانياً')}<ArrowRight className="size-4 rtl:rotate-180" /></Link>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-gold-700">{t('Faculty', 'هيئة التدريس')}</p>
          <h2 className="mt-3 font-display text-4xl font-semibold text-brand-900">{t('Taught by subject specialists.', 'يدرّسك متخصصون في مجالاتهم.')}</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {faculty.data.map((f) => (
              <li key={f.id}><Link href={`/faculty/${f.slug}`} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 hover:border-gold-400"><span className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-500 font-display text-lg font-semibold text-brand-950">{f.fullNameEn.replace(/^(Dr|Prof)\.\s*/, '').split(' ').map((x) => x[0]).slice(0, 2).join('')}</span><span className="min-w-0"><span className="block truncate font-semibold text-brand-900">{ar ? f.fullNameAr : f.fullNameEn}</span><span className="block truncate text-xs text-muted">{ar ? f.titleAr : f.titleEn} · {ar ? f.specializationAr : f.specializationEn}</span></span></Link></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">{t('Profiles are illustrative until faculty appointments are confirmed.', 'الملفات توضيحية حتى تأكيد تعيينات هيئة التدريس.')}</p>
        </div>
      </section>

      {/* News & events */}
      <section className="relative isolate bg-cream-200/50 py-20 sm:py-24">
        <SectionArt variant={6} />
        <div className="container-site relative z-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex items-end justify-between"><h2 className="font-display text-4xl font-semibold text-brand-900">{t('Latest news', 'آخر الأخبار')}</h2><Link href="/news" className="text-sm font-semibold text-brand-700 hover:underline">{t('All news', 'كل الأخبار')}</Link></div>
            <ul className="mt-6 space-y-4">
              {news.data.map((n) => (
                <li key={n.id}><Link href={`/news/${n.slug}`} className="group flex gap-4 rounded-2xl bg-white p-3 shadow-sm hover:shadow-md"><span className="relative size-24 shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-36">{n.imagePath && <Image src={n.imagePath} alt="" fill sizes="144px" className="object-cover" />}</span><span className="min-w-0 py-1"><span className="text-xs text-gold-700">{n.publishedAt && fmtDate(n.publishedAt)}</span><span className="block font-semibold leading-snug text-brand-900 group-hover:underline">{ar ? n.titleAr : n.titleEn}</span><span className="mt-1 line-clamp-2 text-sm text-muted">{ar ? n.excerptAr : n.excerptEn}</span></span></Link></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-end justify-between"><h2 className="font-display text-4xl font-semibold text-brand-900">{t('Upcoming events', 'الفعاليات القادمة')}</h2><Link href="/events" className="text-sm font-semibold text-brand-700 hover:underline">{t('Calendar', 'التقويم')}</Link></div>
            <ul className="mt-6 space-y-3">
              {events.map((e) => { const d = new Date(e.startsAt); return (
                <li key={e.id}><Link href={`/events/${e.slug}`} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm hover:shadow-md"><span className="grid w-16 shrink-0 place-items-center rounded-xl bg-brand-900 py-2 text-center text-white"><span className="text-[10px] font-bold uppercase text-gold-300">{d.toLocaleDateString(ar ? 'ar-AE' : 'en-GB', { month: 'short', timeZone: 'Asia/Dubai' })}</span><span className="font-display text-2xl font-semibold leading-none">{d.toLocaleDateString('en-GB', { day: 'numeric', timeZone: 'Asia/Dubai' })}</span></span><span className="min-w-0"><span className="block font-semibold text-brand-900">{ar ? e.titleAr : e.titleEn}</span><span className="line-clamp-2 text-sm text-muted">{ar ? e.summaryAr : e.summaryEn}</span></span></Link></li>
              ); })}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ + CTA */}
      <section className="container-site grid gap-10 py-20 sm:py-24 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-gold-700">{t('Questions', 'أسئلة')}</p>
          <h2 className="mt-3 font-display text-4xl font-semibold text-brand-900">{t('Frequently asked', 'الأسئلة الشائعة')}</h2>
          <div className="mt-6 divide-y divide-line rounded-[1.5rem] border border-line bg-white">
            {faqs.map((q) => <details key={q.id} className="group p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-brand-900">{ar ? q.questionAr : q.questionEn}<Sparkles className="size-4 shrink-0 text-gold-500 transition group-open:rotate-45" /></summary><p className="mt-3 text-sm leading-6 text-muted">{ar ? q.answerAr : q.answerEn}</p></details>)}
          </div>
        </div>
        <div className="pattern-girih relative overflow-hidden rounded-[2rem] bg-brand-900 p-8 text-white sm:p-12">
          <Image src="/images/campus/library.jpg" alt="" fill sizes="50vw" className="object-cover opacity-20 mix-blend-luminosity" />
          <BookStack3D className="absolute -bottom-4 end-4 hidden sm:block" scale={0.85} />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-gold-300">{t('Ready when you are', 'نحن جاهزون متى كنت مستعداً')}</p>
            <h2 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">{t('Begin your next chapter at Al Ahmadiya.', 'ابدأ فصلك القادم في الأحمدية.')}</h2>
            <ul className="mt-6 space-y-2 text-sm text-white/80">{[t('Free account — no card needed', 'حساب مجاني دون بطاقة'), t('Join single courses any time', 'التحق بمقررات منفردة في أي وقت'), t('Apply to programmes when admissions open', 'قدّم على البرامج عند فتح القبول')].map((s) => <li key={s} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-gold-300" />{s}</li>)}</ul>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className="inline-flex h-12 items-center gap-2 rounded-full bg-gold-400 px-6 text-sm font-bold text-brand-950 hover:bg-gold-300">{t('Get started', 'ابدأ الآن')}<ArrowRight className="size-4 rtl:rotate-180" /></Link><Link href="/admissions" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/30 px-6 text-sm font-semibold hover:bg-white/10"><Users className="size-4" />{t('Admissions', 'القبول')}</Link></div>
          </div>
        </div>
      </section>
    </>
  );
}
