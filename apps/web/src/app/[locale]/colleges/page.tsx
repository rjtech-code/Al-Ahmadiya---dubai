import { Building2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { CollegeCard, IconTile } from '@/components/site/Cards';
import { CtaBand } from '@/components/site/CtaBand';
import { PageHero } from '@/components/site/PageHero';
import { FilterBar } from '@/components/forms/FilterBar';
import { ButtonLink } from '@/components/ui/Button';
import { Section, SectionHeading } from '@/components/ui/Section';
import { ProposedNotice, TbaPanel } from '@/components/ui/Tba';
import { api } from '@/lib/api';
import { pick } from '@/lib/i18n-helpers';
import { initPage, sp, type SearchParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'colleges' });
  return pageMetadata({ locale, path: '/colleges', title: t('title'), description: t('intro') });
}

export default async function CollegesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const locale = await initPage(params);
  const [t, tn] = await Promise.all([getTranslations('colleges'), getTranslations('nav')]);
  const q = (sp((await searchParams).q) ?? '').trim().toLowerCase();
  const all = await api.colleges();
  const matches = (s: string) => s.toLowerCase().includes(q);
  const colleges = q
    ? all.map((c) => ({ ...c, departments: c.departments.filter((d) => matches(d.nameEn) || matches(d.nameAr)) })).filter((c) => matches(c.nameEn) || matches(c.nameAr) || c.departments.length)
    : all;

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} crumbs={[{ label: tn('colleges') }]} />
      <Section tone="white">
        <p className="max-w-3xl text-lg text-brand-900">{t('intro')}</p>
        <ProposedNotice className="mt-4" />
        {all.length > 0 && <div className="mt-6"><FilterBar fields={[{ name: 'q', type: 'search', label: t('searchPlaceholder'), placeholder: t('searchPlaceholder') }]} /></div>}
      </Section>

      <Section labelledBy="oc-h">
        <SectionHeading id="oc-h" title={t('ourColleges')} />
        {all.length === 0 ? <TbaPanel message={t('empty')} /> : colleges.length === 0 ? <TbaPanel compact title={t('noResults')} message="" /> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{colleges.map((c) => <CollegeCard key={c.id} c={c} />)}</div>
        )}
      </Section>

      <Section tone="white" labelledBy="bc-h">
        <SectionHeading id="bc-h" title={t('byCollege')} />
        {colleges.length === 0 ? <TbaPanel compact message={t('empty')} /> : (
          <div className="space-y-8">
            {colleges.map((c) => (
              <div key={c.id}>
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-brand-900"><Building2 className="size-4 text-gold-600" aria-hidden />{pick(c, 'name', locale)}</h3>
                {c.departments.length ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{c.departments.map((d) => <IconTile key={d.id} label={pick(d, 'name', locale)} href={`/departments/${d.slug}`} />)}</div>
                ) : <p className="text-sm text-muted">{t('departments', { count: 0 })}</p>}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section labelledBy="ad-h">
        <SectionHeading id="ad-h" title={t('disciplines')} />
        {all.length ? (
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {all.flatMap((c) => c.departments).slice(0, 12).map((d) => <IconTile key={d.id} label={pick(d, 'name', locale)} href={`/departments/${d.slug}`} />)}
          </div>
        ) : <TbaPanel compact />}
      </Section>

      <CtaBand title={t('ctaTitle')} body={t('ctaBody')}><ButtonLink href="/programs">{tn('programs')}</ButtonLink></CtaBand>
    </>
  );
}
