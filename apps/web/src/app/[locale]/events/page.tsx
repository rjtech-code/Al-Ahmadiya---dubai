import { CalendarDays, Clock, MapPin } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EventRow } from '@/components/site/Cards';
import { CtaBand } from '@/components/site/CtaBand';
import { EventCalendar } from '@/components/site/EventCalendar';
import { PageHero } from '@/components/site/PageHero';
import { ButtonLink } from '@/components/ui/Button';
import { Card, HoverCard } from '@/components/ui/Card';
import { CmsImage } from '@/components/ui/Media';
import { Section, SectionHeading } from '@/components/ui/Section';
import { TbaPanel } from '@/components/ui/Tba';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { formatDate, formatTime, pick } from '@/lib/i18n-helpers';
import { initPage, sp, type SearchParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';

const CATS = ['academic', 'research', 'cultural', 'sports', 'workshop', 'heritage'] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'events' });
  return pageMetadata({ locale, path: '/events', title: t('title'), description: t('subtitle') });
}

export default async function EventsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const locale = await initPage(params);
  const s = await searchParams;
  const category = sp(s.category);
  const now = new Date();
  const m = /^(\d{4})-(\d{2})$/.exec(sp(s.month) ?? '');
  const year = m ? Number(m[1]) : now.getFullYear();
  const month = m && Number(m[2]) >= 1 && Number(m[2]) <= 12 ? Number(m[2]) : now.getMonth() + 1;
  const from = new Date(Date.UTC(year, month - 1, 1, -4)); // Dubai is UTC+4
  const to = new Date(Date.UTC(year, month, 1, -4));
  const [t, tn] = await Promise.all([getTranslations('events'), getTranslations('nav')]);
  const [monthEvents, upcoming, past] = await Promise.all([
    api.events({ from: from.toISOString(), to: to.toISOString(), category, limit: 100 }),
    api.events({ when: 'upcoming', category, limit: 6 }),
    api.events({ when: 'past', category, limit: 3 }),
  ]);
  const featured = upcoming.find((e) => e.isFeatured) ?? upcoming[0];
  const catHref = (c?: string) => `/events?month=${year}-${String(month).padStart(2, '0')}${c ? `&category=${c}` : ''}`;

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} crumbs={[{ label: tn('events') }]} />
      <Section tone="white">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <EventCalendar year={year} month={month} events={monthEvents} category={category} />
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-brand-900">{t('categories')}</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                <li><Link href={catHref()} scroll={false} className={cn('inline-block rounded-full px-4 py-1.5 text-sm font-semibold', !category ? 'bg-brand-900 text-white' : 'bg-brand-50 text-brand-800 hover:bg-brand-100')}>{tn('events')}</Link></li>
                {CATS.map((c) => <li key={c}><Link href={catHref(c)} scroll={false} aria-current={category === c ? 'true' : undefined} className={cn('inline-block rounded-full px-4 py-1.5 text-sm font-semibold', category === c ? 'bg-brand-900 text-white' : 'bg-brand-50 text-brand-800 hover:bg-brand-100')}>{t(`cat.${c}`)}</Link></li>)}
              </ul>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-brand-900">{t('upcoming')}</h2>
              {upcoming.length ? <ul className="mt-3 space-y-3">{upcoming.slice(0, 3).map((e) => <EventRow key={e.id} e={e} />)}</ul> : <TbaPanel compact className="mt-3" message={t('empty')} />}
            </div>
          </div>
        </div>
      </Section>

      <Section labelledBy="fe-h">
        <SectionHeading id="fe-h" title={t('featured')} />
        {featured ? (
          <Card className="grid overflow-hidden md:grid-cols-2">
            <CmsImage src={featured.imagePath} alt="" className="aspect-[16/10] md:aspect-auto md:min-h-72" />
            <div className="p-6">
              <h3 className="font-display text-2xl font-semibold text-brand-900">{pick(featured, 'title', locale)}</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-muted">
                <li className="flex items-center gap-2"><CalendarDays className="size-4 text-gold-600" aria-hidden />{formatDate(featured.startsAt, locale)}</li>
                <li className="flex items-center gap-2"><Clock className="size-4 text-gold-600" aria-hidden /><span dir="ltr">{formatTime(featured.startsAt, locale)} – {formatTime(featured.endsAt, locale)}</span></li>
                {pick(featured, 'venue', locale) && <li className="flex items-center gap-2"><MapPin className="size-4 text-gold-600" aria-hidden />{pick(featured, 'venue', locale)}</li>}
              </ul>
              <p className="mt-3 text-sm text-muted">{pick(featured, 'summary', locale)}</p>
              <ButtonLink href={`/events/${featured.slug}`} className="mt-5">{t('register')}</ButtonLink>
            </div>
          </Card>
        ) : <TbaPanel compact message={t('empty')} />}
      </Section>

      <Section tone="white" labelledBy="pe-h">
        <SectionHeading id="pe-h" title={t('past')} />
        {past.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((e) => (
              <HoverCard key={e.id}>
                <CmsImage src={e.imagePath} alt="" className="aspect-[16/10]" />
                <div className="p-4"><p className="text-xs text-muted">{formatDate(e.startsAt, locale)}</p><h3 className="mt-1 font-semibold text-brand-900"><Link href={`/events/${e.slug}`} className="after:absolute after:inset-0">{pick(e, 'title', locale)}</Link></h3></div>
              </HoverCard>
            ))}
          </div>
        ) : <TbaPanel compact message={t('pastEmpty')} />}
      </Section>

      <CtaBand title={t('questionsTitle')} body={t('questionsBody')}><ButtonLink href="/contact">{tn('contact')}</ButtonLink></CtaBand>
    </>
  );
}
