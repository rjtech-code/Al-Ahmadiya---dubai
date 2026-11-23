import { Award, BookOpen, Briefcase, Building2, CheckCircle2, Clock, GraduationCap } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { IconTile, ProgramCard } from '@/components/site/Cards';
import { CtaBand } from '@/components/site/CtaBand';
import { FactsBar } from '@/components/site/FactsBar';
import { ProgramJoin } from '@/components/site/JoinForms';
import { PageHero } from '@/components/site/PageHero';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CmsImage } from '@/components/ui/Media';
import { Section, SectionHeading } from '@/components/ui/Section';
import { Tabs } from '@/components/ui/Tabs';
import { TbaBadge, TbaPanel } from '@/components/ui/Tba';
import { Link } from '@/i18n/navigation';
import { admissionsConfig, api } from '@/lib/api';
import { pick, pickArr } from '@/lib/i18n-helpers';
import { initPage, type SlugParams } from '@/lib/page';
import { JsonLd, pageMetadata, SITE_URL } from '@/lib/seo';

export async function generateMetadata({ params }: SlugParams) {
  const { locale, slug } = await params;
  const p = await api.program(slug);
  if (!p) return {};
  return pageMetadata({ locale, path: `/programs/${slug}`, title: pick(p, 'name', locale), description: pick(p, 'summary', locale) || undefined, image: p.imagePath });
}

export default async function ProgramPage({ params }: SlugParams) {
  const locale = await initPage(params);
  const { slug } = await params;
  const [p, cfg] = await Promise.all([api.program(slug), admissionsConfig()]);
  if (!p) notFound();
  const [t, tn, tp, tc] = await Promise.all([getTranslations('program'), getTranslations('nav'), getTranslations('programs'), getTranslations('common')]);
  const name = pick(p, 'name', locale);
  const years = [...new Set(p.curriculum.map((c) => c.year))].sort((a, b) => a - b);
  const list = (items: string[]) => items.length ? <ul className="space-y-2">{items.map((o) => <li key={o} className="flex gap-2 text-sm text-muted"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />{o}</li>)}</ul> : <TbaBadge />;

  const facts = [
    { icon: GraduationCap, label: t('degree'), value: tp(`levels.${p.degreeLevel}`) },
    { icon: Building2, label: t('college'), value: pick(p.department.college, 'name', locale) },
    { icon: Clock, label: t('duration'), value: p.durationYears ? tc('years', { count: Number(p.durationYears) }) : null },
    { icon: BookOpen, label: t('credits'), value: p.totalCredits ? String(p.totalCredits) : null },
  ];

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'EducationalOccupationalProgram', name, url: `${SITE_URL}/${locale}/programs/${p.slug}`, educationalCredentialAwarded: tp(`levels.${p.degreeLevel}`), ...(p.durationYears ? { timeToComplete: `P${p.durationYears}Y` } : {}) }} />
      <PageHero title={name} subtitle={pick(p, 'summary', locale) || undefined} crumbs={[{ label: tn('programs'), href: '/programs' }, { label: name }]} />

      <FactsBar items={facts.map((f) => ({ ...f, value: f.value ?? <TbaBadge /> }))} />

      <Section tone="plain" labelledBy="ov-h">
        <div className="grid items-start gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="overflow-hidden rounded-[2rem] border-8 border-cream-50 shadow-[var(--shadow-card)]">
              <CmsImage src={p.imagePath} alt={name} className="aspect-[16/9]" sizes="(min-width: 1024px) 60vw, 100vw" priority />
            </div>
            <div className="mt-10">
              <SectionHeading id="ov-h" title={t('overview')} />
              {pick(p, 'overview', locale) ? <p className="whitespace-pre-line leading-relaxed text-muted">{pick(p, 'overview', locale)}</p> : <TbaPanel compact />}
              <h3 className="mb-3 mt-8 font-display text-xl font-semibold text-brand-900">{t('outcomes')}</h3>
              {list(pickArr(p, 'outcomes', locale))}
            </div>
          </div>
          <div className="lg:sticky lg:top-28">
            <ProgramJoin slug={p.slug} name={name} admissionsOpen={cfg.open} />
          </div>
        </div>
      </Section>

      <Section tone="white" labelledBy="cur-h">
        <SectionHeading id="cur-h" title={t('curriculum')} />
        {years.length ? (
          <Tabs label={t('curriculum')} tabs={years.map((y) => ({
            label: t('year', { n: y }),
            content: (
              <ul className="grid gap-3 sm:grid-cols-2">
                {p.curriculum.filter((c) => c.year === y).map((c) => (
                  <li key={c.course.slug} className="flex items-center justify-between gap-3 rounded-md border border-line bg-cream-100 p-3 text-sm">
                    <Link href={`/courses/${c.course.slug}`} className="font-medium text-brand-900 hover:text-gold-700"><span className="me-2 text-xs text-gold-700" dir="ltr">{c.course.code}</span>{pick(c.course, 'title', locale)}</Link>
                    <span className="shrink-0 text-xs text-muted">{tc('credits', { count: c.course.creditHours })}</span>
                  </li>
                ))}
              </ul>
            ),
          }))} />
        ) : <TbaPanel compact message={t('curriculumEmpty')} />}
      </Section>

      <Section labelledBy="req-h">
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <Card className="p-6">
            <h2 id="req-h" className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-brand-900"><Award className="size-5 text-gold-600" aria-hidden />{t('requirements')}</h2>
            {list(pickArr(p, 'requirements', locale))}
          </Card>
          <div>
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-brand-900"><Briefcase className="size-5 text-gold-600" aria-hidden />{t('careers')}</h2>
            {pickArr(p, 'careers', locale).length ? <div className="grid gap-3 sm:grid-cols-2">{pickArr(p, 'careers', locale).map((c) => <IconTile key={c} icon={Briefcase} label={c} />)}</div> : <TbaPanel compact />}
          </div>
        </div>
      </Section>

      {p.related.length > 0 && (
        <Section tone="white" labelledBy="rel-h">
          <SectionHeading id="rel-h" title={t('related')} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{p.related.map((r) => <ProgramCard key={r.id} p={r} />)}</div>
        </Section>
      )}

      <CtaBand title={t('applyTitle')} body={t('applyBody')}>
        <ButtonLink href={`/admissions/eligibility?program=${p.slug}`}>{tn('admissions')}</ButtonLink>
      </CtaBand>
    </>
  );
}
