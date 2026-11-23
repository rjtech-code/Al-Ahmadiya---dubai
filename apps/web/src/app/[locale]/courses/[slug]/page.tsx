import { BookOpen, CheckCircle2, Hash, Layers, Mail } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CourseCard } from '@/components/site/Cards';
import { CtaBand } from '@/components/site/CtaBand';
import { EnrollPanel, LessonOutline } from '@/components/site/EnrollPanel';
import { InterestForm } from '@/components/site/JoinForms';
import { FactsBar } from '@/components/site/FactsBar';
import { PageHero } from '@/components/site/PageHero';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CmsImage } from '@/components/ui/Media';
import { Section, SectionHeading } from '@/components/ui/Section';
import { Tabs } from '@/components/ui/Tabs';
import { TbaBadge, TbaPanel } from '@/components/ui/Tba';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { pick, pickArr } from '@/lib/i18n-helpers';
import { initPage, type SlugParams } from '@/lib/page';
import { JsonLd, pageMetadata, SITE_URL } from '@/lib/seo';

export async function generateMetadata({ params }: SlugParams) {
  const { locale, slug } = await params;
  const c = await api.course(slug);
  if (!c) return {};
  return pageMetadata({ locale, path: `/courses/${slug}`, title: `${c.code} ${pick(c, 'title', locale)}`, description: pick(c, 'description', locale).slice(0, 160) || undefined });
}

/** Simple SVG ring for assessment weightings. */
function Ring({ value }: { value: number }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 64 64" className="size-20" aria-hidden>
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-cream-300)" strokeWidth="6" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-gold-500)" strokeWidth="6" strokeDasharray={`${(value / 100) * c} ${c}`} strokeLinecap="round" transform="rotate(-90 32 32)" />
      <text x="32" y="36" textAnchor="middle" className="fill-brand-900 text-[13px] font-semibold">{value}%</text>
    </svg>
  );
}

export default async function CoursePage({ params }: SlugParams) {
  const locale = await initPage(params);
  const { slug } = await params;
  const c = await api.course(slug);
  if (!c) notFound();
  const [t, tn, tc, tj] = await Promise.all([getTranslations('course'), getTranslations('nav'), getTranslations('common'), getTranslations('join')]);
  const title = pick(c, 'title', locale);
  const outcomes = pickArr(c, 'outcomes', locale);

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Course', courseCode: c.code, name: title, description: pick(c, 'description', locale), url: `${SITE_URL}/${locale}/courses/${c.slug}`, provider: { '@type': 'EducationalOrganization', name: 'Al Ahmadiya' } }} />
      <PageHero title={title} crumbs={[{ label: tn('programs'), href: '/programs' }, { label: title }]} />

      <FactsBar items={[{ icon: Hash, label: t('code'), value: <span dir="ltr">{c.code}</span> }, { icon: BookOpen, label: t('credits'), value: c.creditHours }, { icon: Layers, label: t('type'), value: c.courseType ?? <TbaBadge /> }]} />

      <Section labelledBy="desc-h">
        <div className="grid items-start gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="overflow-hidden rounded-[2rem] border-8 border-cream-50 shadow-[var(--shadow-card)]">
              <CmsImage src={c.imagePath} alt={title} className="aspect-[16/9]" sizes="(min-width: 1024px) 60vw, 100vw" priority />
            </div>
            <div className="mt-10">
              <SectionHeading id="desc-h" title={t('description')} />
              {pick(c, 'description', locale) ? <p className="whitespace-pre-line leading-relaxed text-muted">{pick(c, 'description', locale)}</p> : <TbaPanel compact />}
              <h3 className="mb-3 mt-8 font-display text-xl font-semibold text-brand-900">{t('outcomes')}</h3>
              {outcomes.length ? <ul className="grid gap-2 sm:grid-cols-2">{outcomes.map((o) => <li key={o} className="flex gap-2 text-sm text-muted"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />{o}</li>)}</ul> : <TbaBadge />}
            </div>
            {c.onlineEnabled && c.lessons.length > 0 && <div className="mt-10"><LessonOutline lessons={c.lessons} topics={c.topics} /></div>}
          </div>
          <div className="lg:sticky lg:top-28">
            {c.onlineEnabled ? <EnrollPanel course={c} /> : (
              <aside className="glass rounded-[2rem] p-6" aria-labelledby="join-h">
                <h2 id="join-h" className="font-display text-2xl font-semibold text-brand-900">{tj('courseInterestTitle')}</h2>
                <InterestForm subject={`Course interest: ${c.code} ${c.titleEn}`} intro={tj('courseInterestIntro')} />
              </aside>
            )}
          </div>
        </div>
      </Section>

      <Section tone="white" labelledBy="syl-h">
        <SectionHeading id="syl-h" title={t('syllabus')} />
        {c.syllabus?.length ? (
          <Tabs label={t('syllabus')} tabs={c.syllabus.map((m) => ({
            label: locale === 'ar' && m.moduleAr ? m.moduleAr : m.module,
            content: <ul className="grid gap-2 sm:grid-cols-2">{(locale === 'ar' && m.topicsAr.length ? m.topicsAr : m.topicsEn).map((tp) => <li key={tp} className="flex gap-2 rounded-md border border-line bg-cream-100 p-3 text-sm"><CheckCircle2 className="size-4 shrink-0 text-gold-600" aria-hidden />{tp}</li>)}</ul>,
          }))} />
        ) : <TbaPanel compact />}
      </Section>

      <Section labelledBy="as-h">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <SectionHeading id="as-h" title={t('assessment')} />
            {c.assessment?.length ? (
              <ul className="flex flex-wrap gap-6">{c.assessment.map((a) => <li key={a.labelEn} className="flex flex-col items-center gap-1"><Ring value={a.weight} /><span className="text-sm font-medium text-brand-900">{pick(a, 'label', locale)}</span></li>)}</ul>
            ) : <TbaPanel compact />}
          </div>
          <div>
            <SectionHeading title={t('instructor')} />
            {c.instructor ? (
              <Card className="flex items-center gap-4 p-4">
                <CmsImage src={c.instructor.photoPath} alt={pick(c.instructor, 'fullName', locale)} className="size-20 shrink-0 rounded-full shadow-[0_0_0_2px_var(--color-gold-400)]" sizes="80px" person />
                <div>
                  <Link href={`/faculty/${c.instructor.slug}`} className="font-semibold text-brand-900 hover:text-gold-700">{pick(c.instructor, 'fullName', locale)}</Link>
                  <p className="text-sm text-muted">{pick(c.instructor, 'title', locale)}</p>
                  {c.instructor.email && <a href={`mailto:${c.instructor.email}`} className="mt-1 inline-flex items-center gap-1 text-xs text-brand-700 hover:underline"><Mail className="size-3.5" aria-hidden />{c.instructor.email}</a>}
                </div>
              </Card>
            ) : <TbaPanel compact />}
          </div>
        </div>
      </Section>

      {c.related.length > 0 && (
        <Section tone="white" labelledBy="rc-h">
          <SectionHeading id="rc-h" title={t('related')} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{c.related.map((r) => <CourseCard key={r.id} c={r} />)}</div>
        </Section>
      )}

      <CtaBand title={t('questionsTitle')} body={t('questionsBody')}><ButtonLink href="/contact">{tc('contactUs')}</ButtonLink></CtaBand>
    </>
  );
}
