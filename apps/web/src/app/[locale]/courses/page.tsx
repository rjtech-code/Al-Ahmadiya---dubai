import { CourseCard } from '@/components/site/Cards';
import { PageHero } from '@/components/site/PageHero';
import { Pagination } from '@/components/ui/Pagination';
import { Section, SectionHeading } from '@/components/ui/Section';
import { TbaPanel } from '@/components/ui/Tba';
import { api } from '@/lib/api';
import { initPage, sp, type SearchParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const title = locale === 'ar' ? 'المقررات الدراسية' : 'Courses';
  return pageMetadata({ locale, path: '/courses', title, description: locale === 'ar' ? 'استعرض جميع المقررات الدراسية المنشورة.' : 'Browse all published courses and enrol online.' });
}

export default async function CoursesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const locale = await initPage(params);
  const s = await searchParams;
  const result = await api.courses({ page: sp(s.page), pageSize: 12 });
  const title = locale === 'ar' ? 'جميع المقررات الدراسية' : 'All Courses';

  return (
    <>
      <PageHero title={title} subtitle={locale === 'ar' ? 'استكشف المقررات المتاحة وتفاصيل التسجيل.' : 'Explore published courses, view course details and enrol online.'} crumbs={[{ label: title }]} />
      <Section tone="white" labelledBy="all-courses-heading">
        <SectionHeading id="all-courses-heading" title={title} />
        {result.data.length ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{result.data.map((c) => <CourseCard key={c.id} c={c} />)}</div>
            <Pagination meta={result.meta} basePath="/courses" />
          </>
        ) : <TbaPanel message={locale === 'ar' ? 'لا توجد مقررات منشورة حالياً.' : 'No published courses are available yet.'} />}
      </Section>
    </>
  );
}
