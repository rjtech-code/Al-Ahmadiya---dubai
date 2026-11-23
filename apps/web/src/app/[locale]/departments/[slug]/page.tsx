import { CheckCircle2, FlaskConical, Mail } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CourseCard, FacultyCard, IconTile } from '@/components/site/Cards';
import { CtaBand } from '@/components/site/CtaBand';
import { PageHero } from '@/components/site/PageHero';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CmsImage } from '@/components/ui/Media';
import { Section, SectionHeading } from '@/components/ui/Section';
import { TbaBadge, TbaPanel } from '@/components/ui/Tba';
import { api } from '@/lib/api';
import { pick, pickArr } from '@/lib/i18n-helpers';
import { initPage, type SlugParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: SlugParams) {
  const { locale, slug } = await params;
  const d = await api.department(slug);
  if (!d) return {};
  return pageMetadata({ locale, path: `/departments/${slug}`, title: pick(d, 'name', locale), description: pick(d, 'overview', locale).slice(0, 160) || undefined });
}

export default async function DepartmentPage({ params }: SlugParams) {
  const locale = await initPage(params);
  const { slug } = await params;
  const d = await api.department(slug);
  if (!d) notFound();
  const [t, tn, tp] = await Promise.all([getTranslations('department'), getTranslations('nav'), getTranslations('programs')]);
  const name = pick(d, 'name', locale);
  const objectives = pickArr(d, 'objectives', locale);
  const research = pickArr(d, 'researchAreas', locale);
  const careers = [...new Set(d.programs.flatMap((p) => pickArr(p, 'careers', locale)))];

  return (
    <>
      <PageHero title={name} crumbs={[{ label: tn('colleges'), href: '/colleges' }, { label: pick(d.college, 'name', locale), href: `/colleges/${d.college.slug}` }, { label: name }]} />
      <Section tone="white" labelledBy="about-h">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <SectionHeading id="about-h" title={t('about')} />
            {pick(d, 'overview', locale) ? <p className="whitespace-pre-line leading-relaxed text-muted">{pick(d, 'overview', locale)}</p> : <TbaPanel compact />}
            <h3 className="mt-8 font-display text-xl font-semibold text-brand-900">{t('objectives')}</h3>
            {objectives.length ? (
              <ul className="mt-3 space-y-2">{objectives.map((o) => <li key={o} className="flex gap-2 text-sm text-muted"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />{o}</li>)}</ul>
            ) : <div className="mt-3"><TbaBadge /></div>}
          </div>
          <Card className="h-fit overflow-hidden">
            <CmsImage src={d.head?.photoPath} alt={d.head ? pick(d.head, 'fullName', locale) : ''} className="aspect-[4/3]" person />
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">{t('head')}</p>
              {d.head ? (
                <>
                  <p className="mt-1 font-semibold text-brand-900">{pick(d.head, 'fullName', locale)}</p>
                  <p className="text-sm text-muted">{pick(d.head, 'title', locale)}</p>
                  {d.head.email && <a href={`mailto:${d.head.email}`} className="mt-2 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"><Mail className="size-4" aria-hidden />{d.head.email}</a>}
                </>
              ) : <div className="mt-2"><TbaBadge /></div>}
            </div>
          </Card>
        </div>
      </Section>

      <Section labelledBy="po-h">
        <SectionHeading id="po-h" title={t('programs')} />
        {d.programs.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{d.programs.map((p) => <IconTile key={p.id} label={`${pick(p, 'name', locale)} · ${tp(`levels.${p.degreeLevel}`)}`} href={`/programs/${p.slug}`} />)}</div>
        ) : <TbaPanel compact />}
      </Section>

      <Section tone="white" labelledBy="ra-h">
        <SectionHeading id="ra-h" title={t('research')} />
        {research.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{research.map((r) => <IconTile key={r} icon={FlaskConical} label={r} />)}</div> : <TbaPanel compact />}
      </Section>

      <Section labelledBy="co-h">
        <SectionHeading id="co-h" title={t('courses')} />
        {d.courses.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{d.courses.map((c) => <CourseCard key={c.id} c={c} />)}</div> : <TbaPanel compact />}
      </Section>

      <Section tone="white" labelledBy="fa-h">
        <SectionHeading id="fa-h" title={t('faculty')} action={d.faculty.length ? { href: `/faculty?department=${d.slug}`, label: tn('faculty') } : undefined} />
        {d.faculty.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{d.faculty.map((f) => <FacultyCard key={f.id} f={f} />)}</div> : <TbaPanel compact />}
      </Section>

      <Section labelledBy="lab-h">
        <div className="grid gap-5 lg:grid-cols-2">
          <div><SectionHeading id="lab-h" title={t('facilities')} /><TbaPanel compact /></div>
          <div>
            <SectionHeading title={t('careers')} />
            {careers.length ? <ul className="grid gap-2 sm:grid-cols-2">{careers.map((c) => <li key={c} className="flex gap-2 rounded-md border border-line bg-white p-3 text-sm"><CheckCircle2 className="size-4 shrink-0 text-gold-600" aria-hidden />{c}</li>)}</ul> : <TbaPanel compact />}
          </div>
        </div>
      </Section>

      <CtaBand title={t('apply')}>
        <ButtonLink href="/admissions">{tn('admissions')}</ButtonLink>
        {d.contactEmail && <a href={`mailto:${d.contactEmail}`} className="inline-flex h-11 items-center rounded-md border border-white/40 px-5 text-sm font-semibold text-white hover:bg-white/10">{tn('contact')}</a>}
      </CtaBand>
    </>
  );
}
