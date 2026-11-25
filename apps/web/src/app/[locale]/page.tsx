import { StudentCard } from '@/components/portal/StudentCard';
import { ArrowRight, BookOpenText, CalendarDays, ChevronRight, ClipboardList, CreditCard, GraduationCap, Landmark, Phone, Search, Star, Users } from 'lucide-react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { CollegeCard, EventRow, NewsCard } from '@/components/site/Cards';
import { FeaturedContent } from '@/components/site/FeaturedContent';
import { NewsletterForm } from '@/components/forms/NewsletterForm';
import { ButtonLink, buttonClass } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeading } from '@/components/ui/Section';
import { TbaPanel } from '@/components/ui/Tba';
import { Link } from '@/i18n/navigation';
import { admissionsConfig, api } from '@/lib/api';
import { heritageImage, initPage, type LocaleParams } from '@/lib/page';
import { JsonLd, pageMetadata, SITE_URL } from '@/lib/seo';

export async function generateMetadata({ params }: LocaleParams) {
  const { locale } = await params;
  return pageMetadata({ locale, path: '/' });
}

export default async function HomePage({ params }: LocaleParams) {
  const locale = await initPage(params);
  const [t, tn, th] = await Promise.all([getTranslations('home'), getTranslations('nav'), getTranslations('heritage')]);
  const [heritage, colleges, news, events, adm] = await Promise.all([
    api.heritage(), api.colleges(), api.news({ pageSize: 3 }), api.events({ when: 'upcoming', limit: 3 }), admissionsConfig(),
  ]);
  const facade = heritageImage(heritage.media, 'al-ahmadiya-school-front-2018-amin-alwan.jpg');
  const courtyard = heritageImage(heritage.media, 'al-ahmadiya-school-2013-culturearts.jpg');
  const street = heritageImage(heritage.media, 'al-ahmadiya-school-street-2018-amin-alwan.jpg');

  const quick = [
    { icon: ClipboardList, label: t('qaApply'), href: '/admissions/apply' },
    { icon: Search, label: t('qaTrack'), href: '/admissions/status' },
    { icon: CreditCard, label: t('qaFee'), href: '/portal/payments' },
    { icon: GraduationCap, label: t('qaPrograms'), href: '/programs' },
    { icon: CalendarDays, label: t('qaEvents'), href: '/events' },
    { icon: Phone, label: t('qaContact'), href: '/contact' },
  ];
  const pillars = [
    { icon: Star, title: t('p1t'), sub: t('p1s') },
    { icon: Landmark, title: t('p2t'), sub: t('p2s') },
    { icon: Users, title: t('p3t'), sub: t('p3s') },
    { icon: BookOpenText, title: t('p4t'), sub: t('p4s') },
  ];
  const journey = [
    { year: t('j1y'), title: t('j1t'), img: courtyard },
    { year: t('j2y'), title: t('j2t'), img: facade },
    { year: t('j3y'), title: t('j3t'), img: null },
  ];

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'EducationalOrganization', name: 'Al Ahmadiya School', alternateName: 'المدرسة الأحمدية', foundingDate: '1912', url: `${SITE_URL}/${locale}`, address: { '@type': 'PostalAddress', addressLocality: 'Al Ras, Deira, Dubai', addressCountry: 'AE' } }} />

      {/* ── Hero: tagline + arch-framed historic building + quick access ── */}
      <section className="relative -mt-[var(--header-h)] overflow-hidden pt-[var(--header-h)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -start-40 top-10 h-[34rem] w-[22rem] rounded-t-full border border-gold-200/70" />
          <div className="absolute end-[-6rem] top-0 h-[44rem] w-[34rem] rounded-t-full bg-white/40" />
        </div>
        <div className="container-site grid items-center gap-10 pb-10 pt-4 lg:grid-cols-[1fr_1.05fr] lg:pb-20 lg:pt-6">
          <Reveal>
            <p className="flex items-center gap-3 text-sm font-medium text-brand-900"><span className="h-0.5 w-16 bg-gold-500" aria-hidden />{t('tagline')}</p>
            <h1 className="mt-6 font-display text-6xl font-semibold leading-none text-brand-900 sm:text-7xl lg:text-[4.6rem] lg:whitespace-nowrap xl:text-[5.4rem]">
              {t('w1')} <span className="text-gold-500" aria-hidden>·</span> {t('w2')} <span className="text-gold-500" aria-hidden>·</span> {t('w3')}
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink/80">{t('heroLead')}</p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link href="/about" className={buttonClass('brand', 'lg')}>{t('exploreSchool')} <ArrowRight className="flip-rtl size-4" aria-hidden /></Link>
              <Link href="/campus-tour" className="inline-flex items-center gap-3 text-sm font-semibold text-brand-900 hover:text-gold-700">
                <span className="grid size-11 place-items-center rounded-full border-2 border-brand-900"><Landmark className="size-4" aria-hidden /></span>{t('virtualTour')}
              </Link>
            </div>
          </Reveal>

          <div className="relative">
            {facade && (
              <Reveal delay={0.1}>
                <figure className="arch relative mx-auto aspect-[4/5] max-w-md overflow-hidden border-[10px] border-cream-50 shadow-[0_30px_80px_-40px_rgb(60_40_10/0.6)] lg:me-12 lg:max-w-none lg:aspect-[1/1] rtl:lg:me-0 rtl:lg:ms-12">
                  <Image src={facade.path} alt={locale === 'ar' ? facade.altAr : facade.altEn} fill priority sizes="(min-width: 1024px) 45vw, 90vw" className="object-cover" />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-6 pb-3 pt-10 text-center text-[10px] text-white/85">
                    {locale === 'ar' ? facade.captionAr : facade.captionEn} {th('credit', { author: facade.author ?? '', license: facade.license ?? '' })} · <a href={facade.sourceUrl ?? '#'} target="_blank" rel="noopener noreferrer license" className="underline">Wikimedia Commons</a>
                  </figcaption>
                </figure>
              </Reveal>
            )}
            <nav aria-labelledby="qa-h" className="glass relative mx-auto mt-6 w-full max-w-sm rounded-3xl p-5 lg:absolute lg:-end-4 lg:top-16 lg:mt-0 lg:w-64 xl:-end-10">
              <h2 id="qa-h" className="mb-3 font-display text-2xl font-semibold text-brand-900">{t('quickAccess')}</h2>
              <ul>
                {quick.map((q) => (
                  <li key={q.href}>
                    <Link href={q.href} className="group flex items-center gap-3 rounded-xl px-1 py-2.5 text-sm text-brand-900 hover:bg-cream-200">
                      <q.icon className="size-5 text-brand-800" aria-hidden /><span className="flex-1">{q.label}</span><ChevronRight className="flip-rtl size-4 text-muted transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* Floating pillars bar (factual) */}
        <div className="container-site relative z-10 pb-6 lg:-mt-16">
          <ul className="glass grid grid-cols-1 gap-y-2 rounded-[2rem] px-4 py-5 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-gold-200 lg:px-8 rtl:lg:divide-x-reverse">
            {pillars.map((p) => (
              <li key={p.title} className="flex items-center gap-4 px-4 py-2">
                <p.icon className="size-9 shrink-0 text-gold-600" strokeWidth={1.4} aria-hidden />
                <div><p className="font-semibold text-brand-900">{p.title}</p><p className="text-xs text-muted">{p.sub}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Educational journey + admissions card ── */}
      <StudentCard />

      {/* ── Featured academic programmes and courses ── */}
      <FeaturedContent />

      <section aria-labelledby="journey-h" className="container-site grid gap-10 py-14 lg:grid-cols-[0.9fr_1.6fr_0.9fr] lg:items-center">
        <Reveal>
          <span className="block h-0.5 w-24 bg-gold-500" aria-hidden />
          <h2 id="journey-h" className="mt-4 font-display text-4xl font-semibold leading-[1.05] text-brand-900 xl:text-5xl">{t('journeyTitle')}</h2>
          <p className="mt-4 text-ink/80">{t('journeyBody')}</p>
          <Link href="/about" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full border border-gold-400 px-6 text-sm font-semibold text-brand-900 hover:bg-white">{t('ourHistory')} <ArrowRight className="flip-rtl size-4" aria-hidden /></Link>
        </Reveal>
        <ol className="grid grid-cols-3 gap-2 sm:gap-6">
          {journey.map((j, i) => (
            <li key={j.year} className="relative flex flex-col items-center text-center">
              {i < journey.length - 1 && <span aria-hidden className="absolute start-[calc(50%+3.5rem)] top-[4.5rem] hidden h-px w-[calc(100%-7rem)] bg-gold-300 sm:block" />}
              <div className="relative size-24 overflow-hidden rounded-full border-4 border-cream-50 shadow-[0_0_0_2px_var(--color-gold-400)] sm:size-36">
                {j.img ? <Image src={j.img.path} alt={locale === 'ar' ? j.img.altAr : j.img.altEn} fill sizes="144px" className="object-cover" />
                  : <div className="pattern-cream grid size-full place-items-center"><GraduationCap className="size-10 text-gold-600" strokeWidth={1.4} aria-hidden /></div>}
              </div>
              <p className="mt-4 text-lg font-semibold text-brand-900">{j.year}</p>
              <p className="text-sm text-ink/80">{j.title}</p>
            </li>
          ))}
        </ol>
        <Reveal delay={0.1}>
          <div className="pattern-girih relative overflow-hidden rounded-[2rem] p-8 text-center text-white shadow-[0_30px_60px_-30px_rgb(5_40_42/0.8)]">
            <GraduationCap className="mx-auto size-12 text-gold-400" strokeWidth={1.4} aria-hidden />
            <h2 className="mt-3 font-display text-4xl font-semibold">{adm.open ? t('admOpenTitle') : t('admSoonTitle')}</h2>
            <p className="mt-2 text-white/80">{adm.open ? t('admOpenBody') : t('admSoonBody')}</p>
            <ButtonLink href={adm.open ? '/admissions/apply' : '/admissions'} className="mt-6">{adm.open ? t('applyNow') : t('admInfo')} <ArrowRight className="flip-rtl size-4" aria-hidden /></ButtonLink>
          </div>
        </Reveal>
      </section>

      {/* ── Colleges ── */}
      <Section labelledBy="colleges-h">
        <SectionHeading id="colleges-h" title={t('collegesTitle')} subtitle={t('collegesSubtitle')} action={colleges.length ? { href: '/colleges', label: tn('colleges') } : undefined} />
        {colleges.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{colleges.slice(0, 4).map((c) => <CollegeCard key={c.id} c={c} />)}</div>
        ) : <TbaPanel message={t('collegesEmpty')} />}
      </Section>

      {/* ── News & events ── */}
      <Section labelledBy="news-h">
        <SectionHeading id="news-h" title={t('newsTitle')} action={news.data.length || events.length ? { href: '/news', label: tn('news') } : undefined} />
        {news.data.length || events.length ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="grid gap-5 sm:grid-cols-2 lg:col-span-2">{news.data.slice(0, 2).map((n) => <NewsCard key={n.id} n={n} />)}</div>
            <ul className="space-y-3">{events.map((e) => <EventRow key={e.id} e={e} />)}</ul>
          </div>
        ) : <TbaPanel compact message={t('newsEmpty')} />}
      </Section>

      {/* ── Historic school band ── */}
      {street && (
        <section aria-labelledby="tour-h" className="container-site py-6">
          <div className="pattern-girih relative isolate grid overflow-hidden rounded-[2rem] text-white lg:grid-cols-2">
            <div className="p-8 sm:p-12">
              <h2 id="tour-h" className="font-display text-4xl font-semibold">{t('tourTitle')}</h2>
              <span className="mt-4 block h-0.5 w-16 bg-gold-400" aria-hidden />
              <p className="mt-4 max-w-md text-white/80">{t('tourBody')}</p>
              <ButtonLink href="/campus-tour" className="mt-6">{t('tourCta')} <ArrowRight className="flip-rtl size-4" aria-hidden /></ButtonLink>
            </div>
            <figure className="relative min-h-64">
              <Image src={street.path} alt={locale === 'ar' ? street.altAr : street.altEn} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-[11px] text-white/80">{th('credit', { author: street.author ?? '', license: street.license ?? '' })}</figcaption>
            </figure>
          </div>
        </section>
      )}

      {/* ── Newsletter ── */}
      <Section className="!pt-10">
        <div className="glass flex flex-col items-start justify-between gap-6 rounded-[2rem] p-6 sm:p-10 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-3xl font-semibold text-brand-900">{t('newsletterTitle')}</h2>
            <p className="mt-1 text-sm text-muted">{t('newsletterBody')}</p>
          </div>
          <NewsletterForm />
        </div>
      </Section>
    </>
  );
}
