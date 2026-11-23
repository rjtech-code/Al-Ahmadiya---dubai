import { BookOpen, Building2, Dumbbell, ExternalLink, FlaskConical, Landmark, PlayCircle, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PageHero } from '@/components/site/PageHero';
import { buttonClass } from '@/components/ui/Button';
import { HoverCard } from '@/components/ui/Card';
import { CmsImage, HeritageFigure } from '@/components/ui/Media';
import { Section, SectionHeading } from '@/components/ui/Section';
import { TbaPanel } from '@/components/ui/Tba';
import { api } from '@/lib/api';
import { pick, setting } from '@/lib/i18n-helpers';
import { heritageImage, initPage, type LocaleParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';

const KIND_ICON = { academic: Building2, library: BookOpen, research: FlaskConical, sports: Dumbbell, 'student-life': Users, heritage: Landmark } as const;

export async function generateMetadata({ params }: LocaleParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tour' });
  return pageMetadata({ locale, path: '/campus-tour', title: t('title'), description: t('heritageBody') });
}

export default async function TourPage({ params }: LocaleParams) {
  const locale = await initPage(params);
  const [t, tn] = await Promise.all([getTranslations('tour'), getTranslations('nav')]);
  const [stops, heritage, settings] = await Promise.all([api.tour(), api.heritage(), api.settings()]);
  const tourUrl = setting(settings, 'university.tourUrl', locale);
  const campusStops = stops.filter((s) => !s.isHeritage);
  const street = heritageImage(heritage.media, 'al-ahmadiya-school-street-2018-amin-alwan.jpg');

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} crumbs={[{ label: tn('tour') }]}>
        <div className="mt-6">
          {tourUrl ? (
            <a href={tourUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('gold', 'lg')}><PlayCircle className="size-5" aria-hidden />{t('start')}</a>
          ) : <p className="inline-flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm text-white/85"><PlayCircle className="size-5 text-gold-400" aria-hidden />{t('tourPending')}</p>}
        </div>
      </PageHero>

      <Section tone="white" labelledBy="ex-h">
        <SectionHeading id="ex-h" title={t('explore')} subtitle={t('exploreBody')} center />
        {campusStops.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {campusStops.map((s) => {
              const Icon = KIND_ICON[s.kind as keyof typeof KIND_ICON] ?? Building2;
              return (
                <HoverCard key={s.id}>
                  <CmsImage src={s.imagePath} alt="" className="aspect-[4/3]" sizes="20vw" />
                  <div className="flex items-center justify-between gap-2 p-3">
                    <span className="text-sm font-semibold text-brand-900">{pick(s, 'title', locale)}</span>
                    {s.panoramaUrl ? <a href={s.panoramaUrl} target="_blank" rel="noopener noreferrer" className="after:absolute after:inset-0" aria-label={pick(s, 'title', locale)}><Icon className="size-5 text-gold-600" /></a> : <Icon className="size-5 text-gold-600" aria-hidden />}
                  </div>
                </HoverCard>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {(['academic', 'library', 'research', 'sports', 'student-life'] as const).map((k) => {
              const Icon = KIND_ICON[k];
              return (
                <div key={k} className="overflow-hidden rounded-[var(--radius-card)] border border-dashed border-gold-400/60 bg-white">
                  <CmsImage src={null} alt="" className="aspect-[4/3]" />
                  <div className="flex items-center justify-between p-3"><span className="text-sm font-semibold text-brand-900">{t(`kinds.${k}`)}</span><Icon className="size-5 text-gold-600" aria-hidden /></div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section labelledBy="hs-h">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <SectionHeading id="hs-h" title={t('heritageTitle')} subtitle={t('heritageBody')} />
            <p className="rounded-md border border-gold-200 bg-gold-100/60 p-4 text-sm text-brand-900">{t('visitNote')}</p>
            <a href="https://dubaiculture.gov.ae/ar/attractions/heritage-sites/al-ahmadiya-school" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 underline">{t('visitLink')} <ExternalLink className="size-3.5" aria-hidden /></a>
          </div>
          {street && <HeritageFigure media={street} imgClassName="aspect-[16/10]" />}
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {heritage.media.filter((m) => m.id !== street?.id).map((m) => <HeritageFigure key={m.id} media={m} imgClassName="aspect-[4/3]" sizes="33vw" />)}
        </div>
      </Section>
      {!campusStops.length && <div className="container-site pb-12"><TbaPanel compact message={t('tourPending')} /></div>}
    </>
  );
}
