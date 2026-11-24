import { ArrowRight, CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, CreditCard, FileUp, GraduationCap, LineChart, LogIn, MonitorSmartphone, Receipt, Search, UserPlus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { FactsBar } from '@/components/site/FactsBar';
import { PageHero } from '@/components/site/PageHero';
import { NewsletterForm } from '@/components/forms/NewsletterForm';
import { Accordion } from '@/components/ui/Accordion';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Section, SectionHeading } from '@/components/ui/Section';
import { TbaBadge, TbaPanel } from '@/components/ui/Tba';
import { Link } from '@/i18n/navigation';
import { admissionsConfig, api } from '@/lib/api';
import { pick, setting } from '@/lib/i18n-helpers';
import { initPage, type LocaleParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: LocaleParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admissions' });
  return pageMetadata({ locale, path: '/admissions', title: t('title'), description: t('closedBody') });
}

export default async function AdmissionsPage({ params }: LocaleParams) {
  const locale = await initPage(params);
  const [t, th, tn] = await Promise.all([getTranslations('admissions'), getTranslations('home'), getTranslations('nav')]);
  const [cfg, settings, faqs] = await Promise.all([admissionsConfig(), api.settings(), api.faqs('admissions')]);
  const fee = setting(settings, 'admissions.applicationFeeAed', locale);
  const steps = [
    { icon: ClipboardCheck, label: t('step1') }, { icon: UserPlus, label: t('step2') }, { icon: MonitorSmartphone, label: t('step3') },
    { icon: FileUp, label: t('step4') }, { icon: LineChart, label: t('step5') },
  ];
  const links = [
    { icon: ClipboardCheck, label: t('links.eligibility'), href: '/admissions/eligibility' },
    { icon: UserPlus, label: t('links.register'), href: '/register' },
    { icon: LogIn, label: t('links.login'), href: '/login' },
    { icon: MonitorSmartphone, label: t('links.apply'), href: '/admissions/apply' },
    { icon: CreditCard, label: t('links.payment'), href: '/portal/payments' },
    { icon: Search, label: t('links.status'), href: '/admissions/status' },
  ];

  return (
    <>
      <PageHero
        title={t('title')}
        subtitle={t('subtitle')}
        crumbs={[{ label: tn('admissions') }]}
        aside={
          <div className="pattern-girih hidden w-80 rounded-[2rem] p-8 text-center text-white shadow-[0_30px_60px_-30px_rgb(5_40_42/0.8)] md:block">
            <GraduationCap className="mx-auto size-12 text-gold-400" strokeWidth={1.4} aria-hidden />
            <p className="mt-3 font-display text-4xl font-semibold">{cfg.open ? th('admOpenTitle') : th('admSoonTitle')}</p>
            <p className="mt-2 text-sm text-white/80">{cfg.open ? th('admOpenBody') : th('admSoonBody')}</p>
            <ButtonLink href="/admissions/eligibility" className="mt-6">{t('links.eligibility')} <ArrowRight className="flip-rtl size-4" aria-hidden /></ButtonLink>
          </div>
        }
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/admissions/eligibility" variant="brand" size="lg">{t('links.eligibility')}</ButtonLink>
          <ButtonLink href="/admissions/status" variant="outline" size="lg">{t('links.status')}</ButtonLink>
        </div>
      </PageHero>

      <FactsBar items={[
        { icon: CalendarDays, label: t('intake'), value: setting(settings, 'admissions.intake', locale) ?? <TbaBadge /> },
        { icon: CalendarDays, label: t('deadline'), value: setting(settings, 'admissions.applicationDeadline', locale) ?? <TbaBadge /> },
        { icon: Receipt, label: t('fee'), value: fee ? `AED ${fee}` : <TbaBadge /> },
      ]} />

      <Section>
        {cfg.open ? (
          <div className="flex items-center gap-3 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-success"><CheckCircle2 className="size-6" aria-hidden /><p className="font-semibold">{t('openTitle')}</p></div>
        ) : (
          <TbaPanel title={t('closedTitle')} message={t('closedBody')}><div className="mt-2 w-full max-w-md"><NewsletterForm /></div></TbaPanel>
        )}
      </Section>

      {/* Process — connected medallions (same motif as the home journey) */}
      <Section tone="cream" labelledBy="proc-h">
        <SectionHeading id="proc-h" title={t('processTitle')} center />
        <ol className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {steps.map((s, i) => (
            <li key={s.label} className="relative flex flex-col items-center text-center">
              {i < steps.length - 1 && <span aria-hidden className="absolute start-[calc(50%+3rem)] top-12 hidden h-px w-[calc(100%-6rem+2rem)] bg-gold-300 lg:block" />}
              <span className="relative grid size-24 place-items-center rounded-full bg-cream-50 text-brand-900 shadow-[0_0_0_2px_var(--color-gold-400)]">
                <s.icon className="size-9" strokeWidth={1.3} aria-hidden />
                <span className="absolute -top-1 -end-1 grid size-8 place-items-center rounded-full bg-brand-900 text-sm font-semibold text-white">{i + 1}</span>
              </span>
              <span className="mt-4 font-semibold text-brand-900">{s.label}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section labelledBy="why-h">
        <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-12">
            <div>
              <SectionHeading id="why-h" title={t('whyTitle')} />
              <ul className="grid gap-4 sm:grid-cols-3">
                {[th('why1'), th('why2'), th('why3')].map((w) => (
                  <li key={w}><Card className="h-full p-6"><CheckCircle2 className="size-7 text-gold-600" strokeWidth={1.5} aria-hidden /><p className="mt-3 text-ink/85">{w}</p></Card></li>
                ))}
              </ul>
            </div>
            <div>
              <SectionHeading title={t('faqTitle')} />
              {faqs.length ? <Accordion items={faqs.map((f) => ({ q: pick(f, 'question', locale), a: pick(f, 'answer', locale) }))} /> : <TbaPanel compact />}
            </div>
          </div>
          <aside className="space-y-6">
            <nav aria-labelledby="links-h" className="glass rounded-3xl p-5">
              <h2 id="links-h" className="mb-3 font-display text-2xl font-semibold text-brand-900">{th('quickAccess')}</h2>
              <ul>
                {links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="group flex items-center gap-3 rounded-xl px-1 py-2.5 text-sm text-brand-900 hover:bg-cream-200">
                      <l.icon className="size-5 text-brand-800" aria-hidden /><span className="flex-1">{l.label}</span><ChevronRight className="flip-rtl size-4 text-muted" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="pattern-girih rounded-3xl p-6 text-white">
              <h2 className="font-display text-2xl font-semibold">{t('supportTitle')}</h2>
              <p className="mt-1 text-sm text-white/80">{t('supportBody')}</p>
              <ButtonLink href="/contact" className="mt-5">{tn('contact')}</ButtonLink>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
