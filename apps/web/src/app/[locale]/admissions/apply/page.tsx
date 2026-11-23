import { getTranslations } from 'next-intl/server';
import { ApplicationWizard } from '@/components/admissions/ApplicationWizard';
import { PageHero } from '@/components/site/PageHero';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Section } from '@/components/ui/Section';
import { admissionsConfig } from '@/lib/api';
import { initPage, type LocaleParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: LocaleParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'apply' });
  return pageMetadata({ locale, path: '/admissions/apply', title: t('title'), noindex: true });
}

export default async function ApplyPage({ params, searchParams }: LocaleParams & { searchParams: Promise<{ program?: string | string[] }> }) {
  await initPage(params);
  const { program } = await searchParams;
  const [t, tn] = await Promise.all([getTranslations('apply'), getTranslations('nav')]);
  const cfg = await admissionsConfig();
  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} crumbs={[{ label: tn('admissions'), href: '/admissions' }, { label: t('title') }]} />
      <Section>
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <ApplicationWizard open={cfg.open} programs={cfg.programs} qualifications={cfg.qualifications} initialProgram={typeof program === 'string' ? program : undefined} />
          <Card className="h-fit p-5">
            <h2 className="font-display text-lg font-semibold text-brand-900">{t('needHelp')}</h2>
            <p className="mt-1 text-sm text-muted">{t('needHelpBody')}</p>
            <ButtonLink href="/contact" variant="outline" size="sm" className="mt-3">{tn('contact')}</ButtonLink>
          </Card>
        </div>
      </Section>
    </>
  );
}
