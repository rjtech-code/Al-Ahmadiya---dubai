import { Eye, Info, Landmark, ShieldCheck, Target } from 'lucide-react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { CtaBand } from '@/components/site/CtaBand';
import { PageHero } from '@/components/site/PageHero';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DubaiLearningArt } from '@/components/motion/Illustrations';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeading } from '@/components/ui/Section';
import { ProposedNotice, TbaBadge, TbaPanel } from '@/components/ui/Tba';
import { cn } from '@/components/ui/cn';
import { api } from '@/lib/api';
import { pick, setting } from '@/lib/i18n-helpers';
import { heritageImage, initPage, type LocaleParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';
import type { Media } from '@/lib/types';

export async function generateMetadata({ params }: LocaleParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return pageMetadata({ locale, path: '/about', title: t('title'), description: t('overview1') });
}

const YEAR_AR: Record<string, string> = { 'Early years': 'السنوات الأولى', 'Next chapter': 'الفصل التالي' };

export default async function AboutPage({ params }: LocaleParams) {
  const locale = await initPage(params);
  const [t, tc, tn, th] = await Promise.all([getTranslations('about'), getTranslations('common'), getTranslations('nav'), getTranslations('heritage')]);
  const [heritage, settings] = await Promise.all([api.heritage(), api.settings()]);
  const facade = heritageImage(heritage.media, 'al-ahmadiya-school-front-2018-amin-alwan.jpg');
  const courtyard = heritageImage(heritage.media, 'al-ahmadiya-school-2013-culturearts.jpg');
  const vision = setting(settings, 'university.vision', locale);
  const mission = setting(settings, 'university.mission', locale);
  const values = setting(settings, 'university.values', locale);
  const leadership = setting(settings, 'university.leadershipMessage', locale);
  const accreditation = setting(settings, 'university.accreditation', locale);
  const alt = (m: Media) => (locale === 'ar' ? m.altAr : m.altEn);
  const credit = (m: Media) => th('credit', { author: m.author ?? '', license: m.license ?? '' });

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} crumbs={[{ label: tn('about') }]} image={facade} />

      {/* Overview with arch-framed courtyard */}
      <Section labelledBy="ov-h">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          {courtyard ? (
            <Reveal>
              <figure>
                <div className="arch relative aspect-[4/5] overflow-hidden border-[10px] border-cream-50 shadow-[0_30px_70px_-40px_rgb(60_40_10/0.6)]">
                  <Image src={courtyard.path} alt={alt(courtyard)} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
                </div>
                <figcaption className="mt-3 text-center text-xs text-muted">{locale === 'ar' ? courtyard.captionAr : courtyard.captionEn} {credit(courtyard)} · <a href={courtyard.sourceUrl ?? '#'} target="_blank" rel="noopener noreferrer license" className="underline">{th('viewSource')}</a></figcaption>
              </figure>
            </Reveal>
          ) : <DubaiLearningArt className="h-[26rem] w-full" />}
          <Reveal delay={0.1}>
            <SectionHeading id="ov-h" title={t('overviewTitle')} />
            <div className="space-y-4 text-lg leading-relaxed text-ink/80">
              <p>{t('overview1')}</p>
              <p>{t('overview2')}</p>
              <p>{t('overview3')}</p>
            </div>
            <ProposedNotice className="mt-6" />
          </Reveal>
        </div>
      </Section>

      {/* Vision & mission — arch-topped cards */}
      <Section tone="cream" labelledBy="vm-h">
        <h2 id="vm-h" className="sr-only">{t('visionTitle')} / {t('missionTitle')}</h2>
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          {[{ icon: Eye, title: t('visionTitle'), body: vision }, { icon: Target, title: t('missionTitle'), body: mission }].map((b) => (
            <div key={b.title} className="arch glass flex flex-col items-center px-8 pb-10 pt-16 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-brand-900 text-gold-400 shadow-[0_0_0_4px_var(--color-cream-50),0_0_0_5px_var(--color-gold-400)]"><b.icon className="size-7" strokeWidth={1.5} aria-hidden /></span>
              <h3 className="mt-5 font-display text-3xl font-semibold text-brand-900">{b.title}</h3>
              {b.body ? <p className="mt-3 leading-relaxed text-ink/80">{b.body}</p> : <div className="mt-4"><TbaBadge /></div>}
            </div>
          ))}
        </div>
      </Section>

      {/* History — centre-line journey with circular year medallions */}
      <Section labelledBy="hist-h">
        <SectionHeading id="hist-h" title={t('historyTitle')} subtitle={t('historySubtitle')} center />
        <ol className="relative mx-auto max-w-5xl">
          <span aria-hidden className="absolute inset-y-0 start-8 w-px bg-gold-300 md:start-1/2" />
          {heritage.milestones.map((m, i) => {
            const right = i % 2 === 1;
            const confirmed = m.confirmation === 'CONFIRMED';
            return (
              <li key={m.id} className="relative mb-10 grid grid-cols-[4rem_1fr] gap-4 last:mb-0 md:grid-cols-[1fr_6rem_1fr] md:gap-0">
                <div className={cn('hidden md:block', right && 'md:order-3')} />
                <div className="relative z-10 flex justify-center md:order-2">
                  <span className={cn('grid size-16 place-items-center rounded-full text-center font-display font-semibold leading-none shadow-[0_0_0_4px_var(--color-cream-100),0_0_0_5px_var(--color-gold-400)] md:size-20',
                    confirmed ? 'bg-brand-900 text-gold-400' : 'pattern-cream text-brand-900', m.yearLabel.length > 6 ? 'text-xs md:text-sm' : 'text-lg md:text-xl')}>
                    <bdi>{locale === 'ar' ? YEAR_AR[m.yearLabel] ?? m.yearLabel : m.yearLabel}</bdi>
                  </span>
                </div>
                <div className={cn(right ? 'md:order-1 md:pe-8 md:text-end' : 'md:order-3 md:ps-8')}>
                  <Card className="p-6">
                    <h3 className="font-display text-2xl font-semibold text-brand-900">{pick(m, 'title', locale)} {!confirmed && <TbaBadge className="ms-1 align-middle" />}</h3>
                    <p className="mt-2 leading-relaxed text-ink/80">{pick(m, 'body', locale)}</p>
                    {pick(m, 'caveat', locale) && (
                      <p className="mt-3 flex items-start gap-2 text-start text-xs text-warning"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden /><span><strong>{t('disputed')}:</strong> {pick(m, 'caveat', locale)}</span></p>
                    )}
                    {m.sourceUrls.length > 0 && (
                      <p className="mt-3 text-xs text-muted">
                        {tc('sources')}:{' '}
                        {m.sourceUrls.map((u, j) => <span key={u}>{j > 0 && ' · '}<a href={u} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-700">{new URL(u).hostname.replace(/^www\./, '')}</a></span>)}
                      </p>
                    )}
                  </Card>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      {/* Values & leadership */}
      <Section tone="cream" labelledBy="val-h">
        <div className="grid gap-6 lg:grid-cols-2">
          {[{ id: 'val-h', title: t('valuesTitle'), body: values }, { id: 'lead-h', title: t('leadershipTitle'), body: leadership }].map((b) => (
            <Card key={b.id} className="p-8">
              <span className="block h-0.5 w-16 bg-gold-500" aria-hidden />
              <h2 id={b.id} className="mt-4 font-display text-3xl font-semibold text-brand-900">{b.title}</h2>
              {b.body ? <p className="mt-4 whitespace-pre-line leading-relaxed text-ink/80">{b.body}</p> : <div className="mt-4"><TbaBadge /></div>}
            </Card>
          ))}
        </div>
      </Section>

      {/* Historic building gallery — arch frames */}
      <Section labelledBy="bld-h">
        <SectionHeading id="bld-h" title={t('heritageTitle')} subtitle={t('heritageBody')} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {heritage.media.map((m) => (
            <figure key={m.id} className="group">
              <div className="arch relative aspect-[3/4] overflow-hidden border-[6px] border-cream-50 shadow-[var(--shadow-card)]">
                <Image src={m.path} alt={alt(m)} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <figcaption className="mt-3 text-xs leading-relaxed text-muted">{locale === 'ar' ? m.captionAr : m.captionEn} {credit(m)} · <a href={m.sourceUrl ?? '#'} target="_blank" rel="noopener noreferrer license" className="underline">{th('viewSource')}</a></figcaption>
            </figure>
          ))}
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Card className="p-8">
            <h3 className="flex items-center gap-3 font-display text-2xl font-semibold text-brand-900"><Landmark className="size-6 text-gold-600" strokeWidth={1.5} aria-hidden />{t('campusTitle')}</h3>
            <TbaPanel compact className="mt-4" />
          </Card>
          <Card className="p-8">
            <h3 className="flex items-center gap-3 font-display text-2xl font-semibold text-brand-900"><ShieldCheck className="size-6 text-gold-600" strokeWidth={1.5} aria-hidden />{t('accreditationTitle')}</h3>
            {accreditation ? <p className="mt-4 text-ink/80">{accreditation}</p> : <TbaPanel compact className="mt-4" message={t('accreditationBody')} />}
          </Card>
        </div>
      </Section>

      <CtaBand title={tn('admissions')} body={t('overview3')}>
        <ButtonLink href="/admissions">{tn('admissions')}</ButtonLink>
        <ButtonLink href="/contact" variant="outline-light">{tn('contact')}</ButtonLink>
      </CtaBand>
    </>
  );
}
