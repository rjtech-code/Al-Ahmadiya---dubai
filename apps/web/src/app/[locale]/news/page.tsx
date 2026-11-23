import { ChevronRight, Megaphone } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EventRow, NewsCard } from '@/components/site/Cards';
import { PageHero } from '@/components/site/PageHero';
import { NewsletterForm } from '@/components/forms/NewsletterForm';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { Section, SectionHeading } from '@/components/ui/Section';
import { TbaPanel } from '@/components/ui/Tba';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { pick } from '@/lib/i18n-helpers';
import { initPage, sp, type SearchParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';

const CATS = ['university', 'academic', 'research', 'student-life', 'heritage', 'announcement'] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'news' });
  return pageMetadata({ locale, path: '/news', title: t('title'), description: t('subtitle') });
}

export default async function NewsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const locale = await initPage(params);
  const s = await searchParams;
  const category = sp(s.category);
  const page = sp(s.page);
  const [t, tn, th] = await Promise.all([getTranslations('news'), getTranslations('nav'), getTranslations('home')]);
  const [featured, latest, announcements, events] = await Promise.all([
    api.news({ featured: 'true', pageSize: 1 }), api.news({ category, page, pageSize: 6 }), api.news({ category: 'announcement', pageSize: 3 }), api.events({ when: 'upcoming', limit: 3 }),
  ]);
  const lead = featured.data[0] ?? latest.data[0];

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} crumbs={[{ label: tn('news') }]} />
      <Section tone="white" labelledBy="feat-h">
        <h2 id="feat-h" className="sr-only">{t('featured')}</h2>
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {lead ? <NewsCard n={lead} featured /> : <TbaPanel message={t('empty')} />}
          <Card className="h-fit p-5">
            <h2 className="font-display text-lg font-semibold text-brand-900">{t('categories')}</h2>
            <span className="gold-rule mt-2" aria-hidden />
            <ul className="mt-3 divide-y divide-line">
              <li><Link href="/news" className={cn('flex items-center justify-between py-2.5 text-sm', !category ? 'font-semibold text-gold-700' : 'text-brand-800 hover:text-gold-700')}>{th('newsTitle')}<ChevronRight className="flip-rtl size-4" aria-hidden /></Link></li>
              {CATS.map((c) => (
                <li key={c}><Link href={`/news?category=${c}`} aria-current={category === c ? 'page' : undefined} className={cn('flex items-center justify-between py-2.5 text-sm', category === c ? 'font-semibold text-gold-700' : 'text-brand-800 hover:text-gold-700')}>{t(`cat.${c}`)}<ChevronRight className="flip-rtl size-4" aria-hidden /></Link></li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      <Section labelledBy="latest-h">
        <SectionHeading id="latest-h" title={category ? t(`cat.${category as (typeof CATS)[number]}`) : t('latest')} />
        {latest.data.length ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{latest.data.map((n) => <NewsCard key={n.id} n={n} />)}</div>
            <Pagination meta={latest.meta} basePath="/news" params={{ category }} />
          </>
        ) : <TbaPanel compact message={t('empty')} />}
      </Section>

      <section aria-labelledby="ann-h" className="container-site">
        <div className="pattern-girih flex flex-col gap-4 rounded-xl p-6 text-white sm:flex-row sm:items-center">
          <Megaphone className="size-10 shrink-0 text-gold-400" aria-hidden />
          <div className="flex-1">
            <h2 id="ann-h" className="font-display text-xl font-semibold">{t('announcements')}</h2>
            {announcements.data.length ? (
              <ul className="mt-1 space-y-1 text-sm text-white/80">{announcements.data.map((a) => <li key={a.id}><Link href={`/news/${a.slug}`} className="hover:text-white hover:underline">{pick(a, 'title', locale)}</Link></li>)}</ul>
            ) : <p className="mt-1 text-sm text-white/70">{t('announcementsEmpty')}</p>}
          </div>
        </div>
      </section>

      <Section labelledBy="up-h">
        <SectionHeading id="up-h" title={t('upcoming')} action={events.length ? { href: '/events', label: tn('events') } : undefined} />
        {events.length ? <ul className="grid gap-3 md:grid-cols-3">{events.map((e) => <EventRow key={e.id} e={e} />)}</ul> : <TbaPanel compact message={t('eventsEmpty')} />}
      </Section>

      <Section tone="white" className="!pt-0">
        <div className="flex flex-col justify-between gap-6 rounded-xl border border-line bg-cream-100 p-6 sm:p-8 lg:flex-row lg:items-center">
          <div><h2 className="font-display text-2xl font-semibold text-brand-900">{th('newsletterTitle')}</h2><p className="mt-1 text-sm text-muted">{th('newsletterBody')}</p></div>
          <NewsletterForm />
        </div>
      </Section>
    </>
  );
}
