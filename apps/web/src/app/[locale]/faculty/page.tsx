import { getTranslations } from 'next-intl/server';
import { FacultyCard } from '@/components/site/Cards';
import { CtaBand } from '@/components/site/CtaBand';
import { PageHero } from '@/components/site/PageHero';
import { FilterBar } from '@/components/forms/FilterBar';
import { ButtonLink } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Section } from '@/components/ui/Section';
import { TbaPanel } from '@/components/ui/Tba';
import { api } from '@/lib/api';
import { pick } from '@/lib/i18n-helpers';
import { initPage, sp, type SearchParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'faculty' });
  return pageMetadata({ locale, path: '/faculty', title: t('title'), description: t('subtitle') });
}

export default async function FacultyDirectory({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const locale = await initPage(params);
  const s = await searchParams;
  const q = { q: sp(s.q), college: sp(s.college), department: sp(s.department), specialization: sp(s.specialization), page: sp(s.page) };
  const [t, tn] = await Promise.all([getTranslations('faculty'), getTranslations('nav')]);
  const [faculty, any, colleges] = await Promise.all([api.faculty({ ...q, pageSize: 12 }), api.faculty({ pageSize: 1 }), api.colleges()]);
  const departments = colleges.flatMap((c) => c.departments);
  const filtered = Object.values(q).some(Boolean);

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} crumbs={[{ label: tn('faculty') }]} />
      <Section tone="white" className="!pb-6">
        {any.meta.total > 0 && (
          <FilterBar fields={[
            { name: 'q', type: 'search', label: t('searchPlaceholder'), placeholder: t('searchPlaceholder') },
            { name: 'college', type: 'select', label: t('college'), options: colleges.map((c) => ({ value: c.slug, label: pick(c, 'name', locale) })) },
            { name: 'department', type: 'select', label: t('department'), options: departments.map((d) => ({ value: d.slug, label: pick(d, 'name', locale) })) },
          ]} />
        )}
      </Section>
      <Section tone="white" className="!pt-6" labelledBy="fd-h">
        <h2 id="fd-h" className="sr-only">{t('title')}</h2>
        {faculty.data.length ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{faculty.data.map((f) => <FacultyCard key={f.id} f={f} />)}</div>
            <Pagination meta={faculty.meta} basePath="/faculty" params={{ q: q.q, college: q.college, department: q.department }} />
          </>
        ) : <TbaPanel message={filtered && any.meta.total ? t('noResults') : t('empty')} />}
      </Section>
      <CtaBand title={t('joinTitle')} body={t('joinBody')}><ButtonLink href="/news">{tn('news')}</ButtonLink></CtaBand>
    </>
  );
}
