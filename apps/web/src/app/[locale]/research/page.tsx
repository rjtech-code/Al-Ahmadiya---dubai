import { BookOpen, GraduationCap, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PublicationCard } from '@/components/site/Cards';
import { CtaBand } from '@/components/site/CtaBand';
import { PageHero } from '@/components/site/PageHero';
import { FilterBar } from '@/components/forms/FilterBar';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { Section, SectionHeading } from '@/components/ui/Section';
import { TbaPanel } from '@/components/ui/Tba';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { pick } from '@/lib/i18n-helpers';
import { initPage, sp, type SearchParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';

const TYPES = ['journal-article', 'conference', 'book', 'report'] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'research' });
  return pageMetadata({ locale, path: '/research', title: t('title'), description: t('subtitle') });
}

export default async function ResearchPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const locale = await initPage(params);
  const s = await searchParams;
  const q = { q: sp(s.q), type: sp(s.type), year: sp(s.year), author: sp(s.author), page: sp(s.page) };
  const [t, tn] = await Promise.all([getTranslations('research'), getTranslations('nav')]);
  const [list, featured, stats] = await Promise.all([api.research({ ...q, pageSize: 9 }), api.research({ pageSize: 4 }), api.stats()]);
  const hasAny = featured.meta.total > 0;
  const years = Array.from({ length: 8 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} crumbs={[{ label: tn('research') }]} />
      <Section tone="white" className="!pb-6">
        {hasAny && (
          <FilterBar fields={[
            { name: 'q', type: 'search', label: t('searchPlaceholder'), placeholder: t('searchPlaceholder') },
            { name: 'type', type: 'select', label: t('type'), options: TYPES.map((x) => ({ value: x, label: t(`types.${x}`) })) },
            { name: 'year', type: 'select', label: t('year'), options: years.map((y) => ({ value: y, label: y })) },
          ]} />
        )}
      </Section>

      <Section tone="white" className="!pt-6" labelledBy="fr-h">
        <SectionHeading id="fr-h" title={t('featured')} />
        {featured.data.length ? (
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <PublicationCard p={featured.data[0]} />
            <ul className="space-y-3">{featured.data.slice(1).map((p) => <li key={p.id}><Card className="p-4"><Link href={`/research/${p.slug}`} className="font-semibold text-brand-900 hover:text-gold-700">{pick(p, 'title', locale)}</Link><p className="text-xs text-muted">{p.publishedOn?.slice(0, 4)}</p></Card></li>)}</ul>
          </div>
        ) : <TbaPanel message={t('empty')} />}
      </Section>

      <Section labelledBy="lp-h">
        <SectionHeading id="lp-h" title={t('latest')} />
        {list.data.length ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.data.map((p) => <PublicationCard key={p.id} p={p} />)}</div>
            <Pagination meta={list.meta} basePath="/research" params={{ q: q.q, type: q.type, year: q.year, author: q.author }} />
          </>
        ) : <TbaPanel compact message={hasAny ? t('noResults') : t('empty')} />}
      </Section>

      <Section tone="white" labelledBy="ri-h">
        <SectionHeading id="ri-h" title={t('impact')} />
        <ul className="grid gap-4 sm:grid-cols-3">
          {[{ icon: BookOpen, v: stats?.publications ?? 0, l: t('publications') }, { icon: Users, v: stats?.faculty ?? 0, l: t('faculty') }, { icon: GraduationCap, v: stats?.programs ?? 0, l: t('programs') }].map((x) => (
            <li key={x.l}><Card className="flex flex-col items-center gap-1 p-6 text-center"><x.icon className="size-7 text-gold-600" aria-hidden /><span className="font-display text-3xl font-semibold text-brand-900">{x.v}</span><span className="text-sm text-muted">{x.l}</span></Card></li>
          ))}
        </ul>
      </Section>

      <CtaBand title={t('submitTitle')} body={t('submitBody')}><ButtonLink href="/contact">{tn('contact')}</ButtonLink></CtaBand>
    </>
  );
}
