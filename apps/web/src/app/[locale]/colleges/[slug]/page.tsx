import { Eye, Target } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { FacultyCard, IconTile, ProgramCard } from '@/components/site/Cards';
import { CtaBand } from '@/components/site/CtaBand';
import { PageHero } from '@/components/site/PageHero';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CmsImage } from '@/components/ui/Media';
import { Section, SectionHeading } from '@/components/ui/Section';
import { TbaBadge, TbaPanel } from '@/components/ui/Tba';
import { api } from '@/lib/api';
import { pick } from '@/lib/i18n-helpers';
import { initPage, type SlugParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: SlugParams) {
  const { locale, slug } = await params;
  const c = await api.college(slug);
  if (!c) return {};
  return pageMetadata({ locale, path: `/colleges/${slug}`, title: pick(c, 'name', locale), description: pick(c, 'summary', locale) || undefined, image: c.imagePath });
}

export default async function CollegePage({ params }: SlugParams) {
  const locale = await initPage(params);
  const { slug } = await params;
  const c = await api.college(slug);
  if (!c) notFound();
  const [t, tn] = await Promise.all([getTranslations('college'), getTranslations('nav')]);
  const name = pick(c, 'name', locale);
  const programs = c.departments.flatMap((d) => d.programs).slice(0, 6);
  const faculty = c.departments.flatMap((d) => d.faculty).filter((f, i, a) => a.findIndex((x) => x.id === f.id) === i).slice(0, 4);

  return (
    <>
      <PageHero title={name} crumbs={[{ label: tn('colleges'), href: '/colleges' }, { label: name }]} />
      <Section tone="white" labelledBy="about-h">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <SectionHeading id="about-h" title={t('about')} />
            {pick(c, 'overview', locale) ? <p className="whitespace-pre-line leading-relaxed text-muted">{pick(c, 'overview', locale)}</p> : <TbaPanel compact />}
          </div>
          <Card className="overflow-hidden">
            <CmsImage src={c.dean?.photoPath} alt={c.dean ? pick(c.dean, 'fullName', locale) : ''} className="aspect-[4/3]" person />
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">{t('dean')}</p>
              {c.dean ? <p className="mt-1 font-semibold text-brand-900">{pick(c.dean, 'fullName', locale)}</p> : <div className="mt-2"><TbaBadge /></div>}
            </div>
          </Card>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {[{ icon: Eye, title: t('vision'), body: pick(c, 'vision', locale) }, { icon: Target, title: t('mission'), body: pick(c, 'mission', locale) }].map((b) => (
            <Card key={b.title} className="flex flex-col items-center p-6 text-center">
              <b.icon className="size-7 text-gold-600" aria-hidden />
              <h3 className="mt-2 font-display text-lg font-semibold text-brand-900">{b.title}</h3>
              {b.body ? <p className="mt-1 text-sm text-muted">{b.body}</p> : <div className="mt-2"><TbaBadge /></div>}
            </Card>
          ))}
        </div>
      </Section>

      <Section labelledBy="dep-h">
        <SectionHeading id="dep-h" title={t('departments')} />
        {c.departments.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{c.departments.map((d) => <IconTile key={d.id} label={pick(d, 'name', locale)} href={`/departments/${d.slug}`} />)}</div> : <TbaPanel compact />}
      </Section>

      <Section tone="white" labelledBy="prog-h">
        <SectionHeading id="prog-h" title={t('programs')} action={programs.length ? { href: `/programs?college=${c.slug}`, label: tn('programs') } : undefined} />
        {programs.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{programs.map((p) => <ProgramCard key={p.id} p={p} />)}</div> : <TbaPanel compact />}
      </Section>

      <Section tone="brand" labelledBy="fac-h">
        <SectionHeading id="fac-h" title={t('faculty')} light action={faculty.length ? { href: `/faculty?college=${c.slug}`, label: t('viewFaculty') } : undefined} />
        {faculty.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{faculty.map((f) => <FacultyCard key={f.id} f={f} />)}</div> : <TbaPanel compact />}
      </Section>

      <Section labelledBy="facil-h">
        <div className="grid gap-5 lg:grid-cols-2">
          <div><SectionHeading id="facil-h" title={t('facilities')} /><TbaPanel compact /></div>
          <div><SectionHeading title={t('research')} /><TbaPanel compact /></div>
        </div>
      </Section>

      <CtaBand title={tn('admissions')}><ButtonLink href="/admissions">{tn('admissions')}</ButtonLink></CtaBand>
    </>
  );
}
