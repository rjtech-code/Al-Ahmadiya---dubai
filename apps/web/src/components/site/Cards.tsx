import { ArrowRight, BookOpen, Calendar, Clock, GraduationCap, MapPin, User } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { formatDate, formatTime, pick } from '@/lib/i18n-helpers';
import type { CollegeSummary, CourseSummary, EventSummary, FacultySummary, NewsSummary, ProgramSummary, PublicationSummary } from '@/lib/types';
import { Badge } from '../ui/Badge';
import { HoverCard } from '../ui/Card';
import { cn } from '../ui/cn';
import { CmsImage } from '../ui/Media';

const stretched = 'after:absolute after:inset-0 after:content-[""]';

/** Arch-topped image window — the design's signature frame. */
async function ArchWindow({ src, className }: { src: string | null; className?: string }) {
  return (
    <div className={cn('px-4 pt-4', className)}>
      <div className="arch overflow-hidden border-4 border-white shadow-sm">
        <CmsImage src={src} alt="" className="aspect-[4/3.4] transition-transform" />
      </div>
    </div>
  );
}

const More = ({ label }: { label: string }) => (
  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-gold-700">{label}<ArrowRight className="flip-rtl size-3.5 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" aria-hidden /></span>
);

export async function CollegeCard({ c }: { c: CollegeSummary }) {
  const [locale, t, tc] = [await getLocale(), await getTranslations('colleges'), await getTranslations('common')];
  return (
    <HoverCard className="text-center">
      <ArchWindow src={c.imagePath} />
      <div className="px-5 pb-6 pt-4">
        <h3 className="font-display text-2xl font-semibold leading-tight text-brand-900"><Link href={`/colleges/${c.slug}`} className={stretched}>{pick(c, 'name', locale)}</Link></h3>
        <p className="mt-1 text-xs text-muted">{t('departments', { count: c.departments.length })}</p>
        <More label={tc('explore')} />
      </div>
    </HoverCard>
  );
}

export async function ProgramCard({ p }: { p: ProgramSummary }) {
  const [locale, t, tc] = [await getLocale(), await getTranslations('programs'), await getTranslations('common')];
  return (
    <HoverCard>
      <ArchWindow src={p.imagePath} />
      <div className="px-5 pb-6 pt-4">
        <Badge tone="brand">{t(`levels.${p.degreeLevel}`)}</Badge>
        <h3 className="mt-2 font-display text-2xl font-semibold leading-tight text-brand-900"><Link href={`/programs/${p.slug}`} className={stretched}>{pick(p, 'name', locale)}</Link></h3>
        {p.department && <p className="mt-1 text-xs text-muted">{pick(p.department.college, 'name', locale)}</p>}
        <Link href={`/programs/${p.slug}#join-h`} className="relative z-10 mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500">
          {locale === 'ar' ? 'قدّم الآن' : 'Apply now'} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
        <More label={tc('learnMore')} />
      </div>
    </HoverCard>
  );
}

export async function CourseCard({ c }: { c: CourseSummary }) {
  const [locale, t] = [await getLocale(), await getTranslations('common')];
  return (
    <HoverCard className="flex items-center gap-4 p-4">
      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-900 text-gold-400"><BookOpen className="size-6" strokeWidth={1.5} aria-hidden /></span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gold-700" dir="ltr">{c.code}</p>
        <h3 className="font-semibold leading-snug text-brand-900"><Link href={`/courses/${c.slug}`} className={stretched}>{pick(c, 'title', locale)}</Link></h3>
        <p className="mt-0.5 text-xs text-muted">{t('credits', { count: c.creditHours })}</p>
        <Link href={`/courses/${c.slug}`} className="relative z-10 mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500">
          {c.onlineEnabled ? (locale === 'ar' ? 'سجّل الآن' : 'Enroll now') : (locale === 'ar' ? 'عرض المقرر' : 'View course')} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </HoverCard>
  );
}

/** Circular gold-ringed portrait, echoing the journey medallions. */
export async function Portrait({ src, alt, size = 'md' }: { src: string | null; alt: string; size?: 'md' | 'lg' }) {
  return (
    <div className={cn('relative mx-auto overflow-hidden rounded-full border-4 border-cream-50 shadow-[0_0_0_2px_var(--color-gold-400)]', size === 'lg' ? 'size-44 sm:size-56' : 'size-32')}>
      <CmsImage src={src} alt={alt} className="size-full" sizes="224px" person />
    </div>
  );
}

export async function FacultyCard({ f }: { f: FacultySummary }) {
  const [locale, t] = [await getLocale(), await getTranslations('faculty')];
  return (
    <HoverCard className="px-5 pb-6 pt-7 text-center">
      <Portrait src={f.photoPath} alt={pick(f, 'fullName', locale)} />
      <h3 className="mt-4 font-display text-xl font-semibold text-brand-900"><Link href={`/faculty/${f.slug}`} className={stretched}>{pick(f, 'fullName', locale)}</Link></h3>
      <p className="mt-0.5 text-xs font-medium text-gold-700">{pick(f, 'title', locale)}</p>
      {f.departments?.[0] && <p className="mt-0.5 text-xs text-muted">{pick(f.departments[0], 'name', locale)}</p>}
      <More label={t('viewProfile')} />
    </HoverCard>
  );
}

export async function NewsCard({ n, featured = false }: { n: NewsSummary; featured?: boolean }) {
  const [locale, t] = [await getLocale(), await getTranslations()];
  return (
    <HoverCard className={featured ? 'lg:col-span-2' : ''}>
      <div className="p-3 pb-0"><CmsImage src={n.imagePath} alt="" className={cn('rounded-[1rem]', featured ? 'aspect-[16/8]' : 'aspect-[16/10]')} /></div>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{t(`news.cat.${n.category}` as 'news.cat.university')}</Badge>
          {n.publishedAt && <span className="flex items-center gap-1 text-xs text-muted"><Calendar className="size-3.5" aria-hidden />{formatDate(n.publishedAt, locale)}</span>}
        </div>
        <h3 className={cn('mt-3 font-display font-semibold leading-tight text-brand-900', featured ? 'text-3xl' : 'text-2xl')}><Link href={`/news/${n.slug}`} className={stretched}>{pick(n, 'title', locale)}</Link></h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted">{pick(n, 'excerpt', locale)}</p>
        <More label={t('common.readMore')} />
      </div>
    </HoverCard>
  );
}

export async function EventRow({ e }: { e: EventSummary }) {
  const locale = await getLocale();
  const d = new Date(e.startsAt);
  return (
    <HoverCard as="li" className="flex items-center gap-4 p-3">
      <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-full bg-brand-900 text-white shadow-[0_0_0_3px_var(--color-cream-50),0_0_0_4px_var(--color-gold-400)]">
        <span className="font-display text-2xl font-semibold leading-none">{formatDate(d, locale, { day: 'numeric' })}</span>
        <span className="text-[10px] uppercase text-gold-400">{formatDate(d, locale, { month: 'short' })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold leading-snug text-brand-900"><Link href={`/events/${e.slug}`} className={stretched}>{pick(e, 'title', locale)}</Link></h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1"><Clock className="size-3.5" aria-hidden /><span dir="ltr">{formatTime(e.startsAt, locale)} – {formatTime(e.endsAt, locale)}</span></span>
          {pick(e, 'venue', locale) && <span className="flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{pick(e, 'venue', locale)}</span>}
        </p>
      </div>
    </HoverCard>
  );
}

export async function PublicationCard({ p }: { p: PublicationSummary }) {
  const [locale, t, tc] = [await getLocale(), await getTranslations('research'), await getTranslations('common')];
  return (
    <HoverCard className="flex flex-col p-6">
      <div className="flex items-center justify-between gap-2">
        <Badge tone="brand">{t(`types.${p.type}` as 'types.book')}</Badge>
        {p.publishedOn && <span className="font-display text-xl font-semibold text-gold-600">{formatDate(p.publishedOn, locale, { year: 'numeric' })}</span>}
      </div>
      <h3 className="mt-4 font-display text-2xl font-semibold leading-tight text-brand-900"><Link href={`/research/${p.slug}`} className={stretched}>{pick(p, 'title', locale)}</Link></h3>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted"><User className="mt-0.5 size-3.5 shrink-0" aria-hidden />{(p.authors ?? []).map((a) => a.name).join(', ')}</p>
      {p.journal && <p className="mt-1 text-xs italic text-muted">{p.journal}</p>}
      <More label={tc('readMore')} />
    </HoverCard>
  );
}

export function IconTile({ icon: Icon = GraduationCap, label, href }: { icon?: typeof GraduationCap; label: string; href?: string }) {
  const inner = (
    <>
      <span className="grid size-14 place-items-center rounded-full border border-gold-300 bg-cream-100 text-gold-700 transition-colors group-hover:border-brand-900 group-hover:bg-brand-900 group-hover:text-gold-400"><Icon className="size-6" strokeWidth={1.5} aria-hidden /></span>
      <span className="text-sm font-semibold text-brand-900">{label}</span>
    </>
  );
  return (
    <HoverCard className="flex flex-col items-center gap-3 px-4 py-6 text-center">
      {href ? <Link href={href} className={`flex flex-col items-center gap-3 ${stretched}`}>{inner}</Link> : inner}
    </HoverCard>
  );
}
