import { getTranslations } from 'next-intl/server';
import { api } from '@/lib/api';
import { CourseCard, ProgramCard } from './Cards';
import { Section, SectionHeading } from '@/components/ui/Section';

/** Shared featured programme and course rails, shown at the bottom of public pages. */
export async function FeaturedContent() {
  const [home, programsT, nav, programs, courses] = await Promise.all([
    getTranslations('home'),
    getTranslations('programs'),
    getTranslations('nav'),
    api.programs({ featured: 'true', pageSize: 8 }),
    api.courses({ featured: 'true', pageSize: 8 }),
  ]);

  return (
    <>
      {programs.data.length > 0 && (
        <Section tone="cream" labelledBy="featured-programmes-heading">
          <SectionHeading id="featured-programmes-heading" title={home('programsTitle')} subtitle={home('programsSubtitle')} action={{ href: '/programs', label: nav('programs') }} />
          <div className="-mx-2 flex snap-x snap-mandatory gap-5 overflow-x-auto px-2 pb-4">
            {programs.data.map((p) => (
              <div key={p.id} className="w-[min(84vw,23rem)] shrink-0 snap-start">
                <ProgramCard p={p} />
              </div>
            ))}
          </div>
        </Section>
      )}
      {courses.data.length > 0 && (
        <Section labelledBy="featured-courses-heading">
          <SectionHeading id="featured-courses-heading" title={programsT('featuredCourses')} action={{ href: '/courses', label: nav('programs') }} />
          <div className="-mx-2 flex snap-x snap-mandatory gap-5 overflow-x-auto px-2 pb-4">
            {courses.data.map((c) => (
              <div key={c.id} className="w-[min(84vw,23rem)] shrink-0 snap-start">
                <CourseCard c={c} />
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
