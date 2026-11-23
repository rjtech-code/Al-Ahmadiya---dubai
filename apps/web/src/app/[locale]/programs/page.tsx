import { CheckCircle2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { CourseCard, ProgramCard } from '@/components/site/Cards';
import { CtaBand } from '@/components/site/CtaBand';
import { PageHero } from '@/components/site/PageHero';
import { FilterBar } from '@/components/forms/FilterBar';
import { Accordion } from '@/components/ui/Accordion';
import { ButtonLink } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Section, SectionHeading } from '@/components/ui/Section';
import { ProposedNotice, TbaPanel } from '@/components/ui/Tba';
import { api } from '@/lib/api';
import { pick } from '@/lib/i18n-helpers';
import { initPage, sp, type SearchParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';

const LEVELS = ['FOUNDATION', 'DIPLOMA', 'BACHELOR', 'MASTER', 'DOCTORATE', 'PROFESSIONAL'] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'programs' });
  return pageMetadata({ locale, path: '/programs', title: t('title'), description: t('subtitle') });
}

export default async function ProgramsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const locale = await initPage(params);
  const s = await searchParams;
  const q = { q: sp(s.q), level: sp(s.level), category: sp(s.category), college: sp(s.college), page: sp(s.page) };
  const [t, tn, th] = await Promise.all([getTranslations('programs'), getTranslations('nav'), getTranslations('home')]);
  const [programs, any, colleges, courses, faqs] = await Promise.all([
    api.programs({ ...q, pageSize: 12 }), api.programs({ pageSize: 1 }), api.colleges(), api.courses({ featured: 'true', pageSize: 4 }), api.faqs('programs'),
  ]);
  const filtered = Object.values(q).some(Boolean);
  const hasAny = any.meta.total > 0;

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} crumbs={[{ label: tn('programs') }]} />
      <Section tone="white" className="!pb-6">
        <ProposedNotice className="mb-5" />
        {hasAny && (
          <FilterBar
            fields={[
              { name: 'q', type: 'search', label: t('searchPlaceholder'), placeholder: t('searchPlaceholder') },
              { name: 'level', type: 'select', label: t('degreeLevel'), options: LEVELS.map((l) => ({ value: l, label: t(`levels.${l}`) })) },
              { name: 'college', type: 'select', label: t('college'), options: colleges.map((c) => ({ value: c.slug, label: pick(c, 'name', locale) })) },
            ]}
          />
        )}
      </Section>

      <Section tone="white" className="!pt-6" labelledBy="op-h">
        <SectionHeading id="op-h" title={t('ourPrograms')} />
        {programs.data.length ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{programs.data.map((p) => <ProgramCard key={p.id} p={p} />)}</div>
            <Pagination meta={programs.meta} basePath="/programs" params={{ q: q.q, level: q.level, college: q.college, category: q.category }} />
          </>
        ) : <TbaPanel message={filtered && hasAny ? t('noResults') : t('empty')} />}
      </Section>

      <Section labelledBy="fc-h">
        <SectionHeading id="fc-h" title={t('featuredCourses')} />
        {courses.data.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{courses.data.map((c) => <CourseCard key={c.id} c={c} />)}</div> : <TbaPanel compact message={t('coursesEmpty')} />}
      </Section>

      <Section tone="brand" labelledBy="why-h">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHeading id="why-h" title={t('whyTitle')} light />
            <ul className="space-y-3">{[th('why1'), th('why2'), th('why3')].map((w) => <li key={w} className="flex gap-3 text-white/85"><CheckCircle2 className="size-5 shrink-0 text-gold-400" aria-hidden />{w}</li>)}</ul>
          </div>
          <div>
            <SectionHeading title={t('faqTitle')} light />
            {faqs.length ? <Accordion items={faqs.map((f) => ({ q: pick(f, 'question', locale), a: pick(f, 'answer', locale) }))} /> : <TbaPanel compact message={t('faqEmpty')} />}
          </div>
        </div>
      </Section>

      <CtaBand title={t('ctaTitle')} body={t('ctaBody')}><ButtonLink href="/admissions">{tn('admissions')}</ButtonLink></CtaBand>
    </>
  );
}
