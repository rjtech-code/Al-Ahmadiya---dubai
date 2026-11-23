import { getTranslations } from 'next-intl/server';
import { StatusForm } from '@/components/admissions/StatusForm';
import { PageHero } from '@/components/site/PageHero';
import { Card } from '@/components/ui/Card';
import { Section } from '@/components/ui/Section';
import { initPage, sp, type SearchParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'status' });
  return pageMetadata({ locale, path: '/admissions/status', title: t('title'), noindex: true });
}

export default async function StatusPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  await initPage(params);
  const reference = sp((await searchParams).reference);
  const [t, tn] = await Promise.all([getTranslations('status'), getTranslations('nav')]);
  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} crumbs={[{ label: tn('admissions'), href: '/admissions' }, { label: t('title') }]} />
      <Section><Card className="mx-auto max-w-4xl p-6"><StatusForm initialReference={reference} /></Card></Section>
    </>
  );
}
