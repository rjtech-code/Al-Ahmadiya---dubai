import { CalendarDays, CalendarPlus, Clock, MapPin } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CtaBand } from '@/components/site/CtaBand';
import { PageHero } from '@/components/site/PageHero';
import { Accordion } from '@/components/ui/Accordion';
import { Badge } from '@/components/ui/Badge';
import { buttonClass, ButtonLink } from '@/components/ui/Button';
import { Card, HoverCard } from '@/components/ui/Card';
import { CmsImage } from '@/components/ui/Media';
import { Section, SectionHeading } from '@/components/ui/Section';
import { TbaPanel } from '@/components/ui/Tba';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { formatDate, formatTime, pick } from '@/lib/i18n-helpers';
import { initPage, type SlugParams } from '@/lib/page';
import { JsonLd, pageMetadata, SITE_URL } from '@/lib/seo';

export async function generateMetadata({ params }: SlugParams) {
  const { locale, slug } = await params;
  const e = await api.event(slug);
  if (!e) return {};
  return pageMetadata({ locale, path: `/events/${slug}`, title: pick(e, 'title', locale), description: pick(e, 'summary', locale), image: e.imagePath });
}

export default async function EventPage({ params }: SlugParams) {
  const locale = await initPage(params);
  const { slug } = await params;
  const e = await api.event(slug);
  if (!e) notFound();
  const [t, tn, te] = await Promise.all([getTranslations('event'), getTranslations('nav'), getTranslations('events')]);
  const title = pick(e, 'title', locale);
  const venue = pick(e, 'venue', locale);
  const upcoming = new Date(e.endsAt) > new Date();

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Event', name: title, startDate: e.startsAt, endDate: e.endsAt, eventStatus: 'https://schema.org/EventScheduled', ...(venue ? { location: { '@type': 'Place', name: venue } } : {}), url: `${SITE_URL}/${locale}/events/${e.slug}` }} />
      <PageHero title={title} crumbs={[{ label: tn('events'), href: '/events' }, { label: title }]} />
      <Section tone="white">
        <div className="grid gap-8 lg:grid-cols-2">
          <CmsImage src={e.imagePath} alt="" className="aspect-[16/10] rounded-[var(--radius-card)]" priority />
          <div>
            <Badge>{te(`cat.${e.category}` as 'cat.academic')}</Badge>
            <h2 className="mt-3 font-display text-3xl font-semibold text-brand-900">{title}</h2>
            <ul className="mt-4 space-y-2 text-sm text-ink">
              <li className="flex items-center gap-2"><CalendarDays className="size-4 text-gold-600" aria-hidden /><time dateTime={e.startsAt}>{formatDate(e.startsAt, locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></li>
              <li className="flex items-center gap-2"><Clock className="size-4 text-gold-600" aria-hidden /><span dir="ltr">{formatTime(e.startsAt, locale)} – {formatTime(e.endsAt, locale)}</span></li>
              {venue && <li className="flex items-center gap-2"><MapPin className="size-4 text-gold-600" aria-hidden />{venue}</li>}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              {upcoming && e.registrationUrl ? <a href={e.registrationUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('gold')}>{t('register')}</a> : upcoming && <p className="text-sm text-muted">{t('registrationClosed')}</p>}
              <a href={`/${locale}/events/${e.slug}/calendar.ics`} className={buttonClass('outline')} download><CalendarPlus className="size-4" aria-hidden />{t('addToCalendar')}</a>
            </div>
          </div>
        </div>
      </Section>

      <Section labelledBy="ov-h">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <SectionHeading id="ov-h" title={t('overview')} />
            <p className="whitespace-pre-line leading-relaxed text-muted">{pick(e, 'overview', locale) || pick(e, 'summary', locale)}</p>
          </div>
          <div>
            <SectionHeading title={t('agenda')} />
            {e.agenda.length ? (
              <ol className="space-y-3 border-s-2 border-gold-200 ps-5">
                {e.agenda.map((a) => <li key={a.id}><p className="text-xs font-semibold text-gold-700" dir="ltr">{formatTime(a.startsAt, locale)} – {formatTime(a.endsAt, locale)}</p><p className="text-sm font-medium text-brand-900">{pick(a, 'title', locale)}</p></li>)}
              </ol>
            ) : <TbaPanel compact />}
          </div>
        </div>
      </Section>

      <Section tone="white" labelledBy="sp-h">
        <SectionHeading id="sp-h" title={t('speakers')} />
        {e.speakers.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {e.speakers.map((s) => <Card key={s.id} className="overflow-hidden text-center"><CmsImage src={s.photoPath} alt={pick(s, 'name', locale)} className="aspect-[4/3]" sizes="25vw" person /><div className="p-4"><p className="font-semibold text-brand-900">{pick(s, 'name', locale)}</p><p className="text-xs text-muted">{pick(s, 'role', locale)}</p></div></Card>)}
          </div>
        ) : <TbaPanel compact />}
      </Section>

      <Section labelledBy="vn-h">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHeading id="vn-h" title={t('venue')} />
            {venue ? <Card className="flex items-start gap-3 p-5"><MapPin className="size-5 shrink-0 text-gold-600" aria-hidden /><div><p className="font-semibold text-brand-900">{venue}</p>{e.mapUrl && <a href={e.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-brand-700 underline">{t('viewMap')}</a>}</div></Card> : <TbaPanel compact />}
          </div>
          <div>
            <SectionHeading title={t('faq')} />
            {e.faqs.length ? <Accordion items={e.faqs.map((f) => ({ q: pick(f, 'question', locale), a: pick(f, 'answer', locale) }))} /> : <TbaPanel compact />}
          </div>
        </div>
      </Section>

      {e.related.length > 0 && (
        <Section tone="white" labelledBy="rel-h">
          <SectionHeading id="rel-h" title={t('related')} />
          <div className="grid gap-5 sm:grid-cols-3">
            {e.related.map((r) => <HoverCard key={r.id}><CmsImage src={r.imagePath} alt="" className="aspect-[16/10]" /><div className="p-4"><p className="text-xs text-muted">{formatDate(r.startsAt, locale)}</p><h3 className="mt-1 font-semibold text-brand-900"><Link href={`/events/${r.slug}`} className="after:absolute after:inset-0">{pick(r, 'title', locale)}</Link></h3></div></HoverCard>)}
          </div>
        </Section>
      )}

      <CtaBand title={te('questionsTitle')} body={te('questionsBody')}><ButtonLink href="/contact">{tn('contact')}</ButtonLink></CtaBand>
    </>
  );
}
