import { getLocale, getTranslations } from 'next-intl/server';
import { api } from '@/lib/api';
import { CourseCard, ProgramCard } from './Cards';
import { Section, SectionHeading } from '@/components/ui/Section';

/** Homepage highlights: prefer admin-featured items, with published-content fallback. */
export async function FeaturedContent() {
  const [locale, home, programsT, nav, featuredPrograms, allPrograms, featuredCourses, allCourses] = await Promise.all([
    getLocale(),
    getTranslations('home'),
    getTranslations('programs'),
    getTranslations('nav'),
    api.programs({ featured: 'true', pageSize: 3 }),
    api.programs({ pageSize: 3 }),
    api.courses({ featured: 'true', pageSize: 3 }),
    api.courses({ pageSize: 3 }),
  ]);
  const programs = featuredPrograms.data.length ? featuredPrograms.data : allPrograms.data;
  const courses = featuredCourses.data.length ? featuredCourses.data : allCourses.data;

  return (
    <>
      {programs.length > 0 && (
        <Section tone="cream" labelledBy="featured-programmes-heading">
          <SectionHeading id="featured-programmes-heading" eyebrow={locale === 'ar' ? 'اكتشف مسارك' : 'FIND YOUR PATH'} title={home('programsTitle')} subtitle={home('programsSubtitle')} action={{ href: '/programs', label: nav('programs') }} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p) => <ProgramCard key={p.id} p={p} />)}
          </div>
        </Section>
      )}
      {courses.length > 0 && (
        <Section labelledBy="featured-courses-heading">
          <SectionHeading id="featured-courses-heading" eyebrow={locale === 'ar' ? 'التعلم والتطوير' : 'LEARN AND GROW'} title={programsT('featuredCourses')} subtitle={locale === 'ar' ? 'استكشف المقررات المتاحة وتفاصيل التسجيل.' : 'Explore our published courses and find the right next step for your learning.'} action={{ href: '/courses', label: locale === 'ar' ? 'جميع المقررات' : 'View all courses' }} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => <CourseCard key={c.id} c={c} />)}
          </div>
        </Section>
      )}
    </>
  );
}
