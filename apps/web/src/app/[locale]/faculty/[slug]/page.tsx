import { Award, BookOpen, Building2, GraduationCap, Mail, Phone } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Portrait } from '@/components/site/Cards';
import { CtaBand } from '@/components/site/CtaBand';
import { FactsBar } from '@/components/site/FactsBar';
import { PageHero } from '@/components/site/PageHero';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Section, SectionHeading } from '@/components/ui/Section';
import { TbaPanel } from '@/components/ui/Tba';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { formatDate, pick, pickArr } from '@/lib/i18n-helpers';
import { initPage, type SlugParams } from '@/lib/page';
import { JsonLd, pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: SlugParams) {
  const { locale, slug } = await params;
  const f = await api.facultyMember(slug);
  if (!f) return {};
  return pageMetadata({ locale, path: `/faculty/${slug}`, title: pick(f, 'fullName', locale), description: `${pick(f, 'title', locale)}${f.departments?.[0] ? ` — ${pick(f.departments[0], 'name', locale)}` : ''}`, image: f.photoPath });
}

export default async function FacultyProfile({ params }: SlugParams) {
  const locale = await initPage(params);
  const { slug } = await params;
  const f = await api.facultyMember(slug);
  if (!f) notFound();
  const [t, tn] = await Promise.all([getTranslations('profile'), getTranslations('nav')]);
  const name = pick(f, 'fullName', locale);
  const interests = pickArr(f, 'researchInterests', locale);

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Person', name, jobTitle: pick(f, 'title', locale), ...(f.email ? { email: f.email } : {}), affiliation: { '@type': 'EducationalOrganization', name: 'Al Ahmadiya' } }} />
      <PageHero
        title={name}
        subtitle={pick(f, 'title', locale)}
        crumbs={[{ label: tn('faculty'), href: '/faculty' }, { label: name }]}
        aside={<Portrait src={f.photoPath} alt={name} size="lg" />}
      />

      <FactsBar items={[
        { icon: Building2, label: t('department'), value: f.departments?.length ? f.departments.map((d) => pick(d, 'name', locale)).join(' · ') : '—' },
        { icon: Mail, label: t('email'), value: f.email ? <a href={`mailto:${f.email}`} className="break-all hover:underline">{f.email}</a> : '—' },
        { icon: Phone, label: t('phone'), value: f.phone ? <a href={`tel:${f.phone}`} dir="ltr">{f.phone}</a> : '—' },
      ]} />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-10">
            <section aria-labelledby="bio-h">
              <SectionHeading id="bio-h" title={t('biography')} />
              {pick(f, 'bio', locale) ? <p className="whitespace-pre-line leading-relaxed text-muted">{pick(f, 'bio', locale)}</p> : <TbaPanel compact />}
            </section>
            <section aria-labelledby="edu-h">
              <SectionHeading id="edu-h" title={t('education')} />
              {f.education?.length ? (
                <ol className="ms-2 space-y-4 border-s-2 border-gold-200">
                  {f.education.map((e, i) => (
                    <li key={i} className="relative ps-6">
                      <GraduationCap className="absolute -start-[11px] top-0 size-5 rounded-full bg-cream-100 text-gold-600" aria-hidden />
                      <p className="font-semibold text-brand-900">{pick(e, 'degree', locale)}</p>
                      <p className="text-sm text-muted">{e.institution}{e.year ? `, ${e.year}` : ''}</p>
                    </li>
                  ))}
                </ol>
              ) : <TbaPanel compact />}
            </section>
            <section aria-labelledby="pub-h">
              <SectionHeading id="pub-h" title={t('publications')} />
              {f.publications.length ? (
                <ul className="space-y-3">
                  {f.publications.map(({ publication: p }) => (
                    <li key={p.slug}><Card className="flex gap-3 p-4"><BookOpen className="size-5 shrink-0 text-gold-600" aria-hidden /><div><Link href={`/research/${p.slug}`} className="font-semibold text-brand-900 hover:text-gold-700">{pick(p, 'title', locale)}</Link><p className="text-xs text-muted">{[p.journal, p.publishedOn && formatDate(p.publishedOn, locale, { year: 'numeric' })].filter(Boolean).join(' | ')}</p></div></Card></li>
                  ))}
                </ul>
              ) : <TbaPanel compact />}
            </section>
          </div>
          <aside className="space-y-8">
            <Card className="p-5">
              <h2 className="font-display text-lg font-semibold text-brand-900">{t('research')}</h2>
              <span className="gold-rule mt-2" aria-hidden />
              {interests.length ? <div className="mt-4 flex flex-wrap gap-2">{interests.map((r) => <Badge key={r} tone="brand">{r}</Badge>)}</div> : <div className="mt-4"><TbaPanel compact /></div>}
            </Card>
            <Card className="p-5">
              <h2 className="font-display text-lg font-semibold text-brand-900">{t('courses')}</h2>
              <span className="gold-rule mt-2" aria-hidden />
              {f.courses.length ? <div className="mt-4 flex flex-wrap gap-2">{f.courses.map((c) => <Link key={c.slug} href={`/courses/${c.slug}`} className="rounded-md border border-line bg-cream-100 px-3 py-1.5 text-sm hover:border-gold-500">{pick(c, 'title', locale)}</Link>)}</div> : <div className="mt-4"><TbaPanel compact /></div>}
            </Card>
            <Card className="p-5">
              <h2 className="font-display text-lg font-semibold text-brand-900">{t('awards')}</h2>
              <span className="gold-rule mt-2" aria-hidden />
              {f.awards?.length ? <ul className="mt-4 space-y-2">{f.awards.map((a, i) => <li key={i} className="flex gap-2 text-sm"><Award className="size-5 shrink-0 text-gold-600" aria-hidden />{pick(a, 'title', locale)}{a.year ? `, ${a.year}` : ''}</li>)}</ul> : <div className="mt-4"><TbaPanel compact /></div>}
            </Card>
          </aside>
        </div>
      </Section>

      <CtaBand title={t('contactTitle', { name })} body={t('contactBody')}>
        {f.email ? <a href={`mailto:${f.email}`} className={buttonClass('gold')}>{t('getInTouch')}</a> : <Link href="/contact" className={buttonClass('gold')}>{t('getInTouch')}</Link>}
      </CtaBand>
    </>
  );
}
