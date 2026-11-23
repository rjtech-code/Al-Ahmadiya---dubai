import { CheckCircle2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { AllProgrammesCheck } from '@/components/admissions/AllProgrammesCheck';
import { EligibilityForm } from '@/components/admissions/EligibilityForm';
import { Tabs } from '@/components/ui/Tabs';
import { PageHero } from '@/components/site/PageHero';
import { Card } from '@/components/ui/Card';
import { Section } from '@/components/ui/Section';
import { TbaPanel } from '@/components/ui/Tba';
import { admissionsConfig } from '@/lib/api';
import { initPage, sp, type SearchParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'eligibility' });
  return pageMetadata({ locale, path: '/admissions/eligibility', title: t('title'), description: t('subtitle') });
}

export default async function EligibilityPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  await initPage(params);
  const program = sp((await searchParams).program);
  const [t, tn, ta] = await Promise.all([getTranslations('eligibility'), getTranslations('nav'), getTranslations('eligibilityAll')]);
  const cfg = await admissionsConfig();
  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} crumbs={[{ label: tn('admissions'), href: '/admissions' }, { label: t('title') }]} />
      <Section>
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <Card className="h-fit p-5">
            <h2 className="font-display text-lg font-semibold text-brand-900">{t('criteriaTitle')}</h2>
            <ul className="mt-3 space-y-2">{[t('criteria1'), t('criteria2'), t('criteria3')].map((c) => <li key={c} className="flex gap-2 text-sm"><CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />{c}</li>)}</ul>
            <p id="elig-note" className="mt-4 text-xs text-muted">{t('criteriaNote')}</p>
          </Card>
          <Card className="p-5 sm:p-6">
            <h2 className="mb-5 font-display text-3xl font-semibold text-brand-900">{ta('title')}</h2>
            {cfg.programs.length ? (
              <Tabs label={t('formTitle')} tabs={[
                { label: ta('all'), content: <AllProgrammesCheck qualifications={cfg.qualifications} /> },
                { label: ta('single'), content: <EligibilityForm programs={cfg.programs} qualifications={cfg.qualifications} initialProgram={program} /> },
              ]} />
            ) : <TbaPanel compact message={t('noPrograms')} />}
          </Card>
        </div>
      </Section>
    </>
  );
}
