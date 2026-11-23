import { getTranslations } from 'next-intl/server';
import { ResetPasswordForm } from '@/components/admissions/LoginForm';
import { PageHero } from '@/components/site/PageHero';
import { Card } from '@/components/ui/Card';
import { Section } from '@/components/ui/Section';
import { initPage, sp, type SearchParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'login' });
  return pageMetadata({ locale, path: '/login/reset', title: t('resetTitle'), noindex: true });
}

export default async function ResetPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  await initPage(params);
  const token = sp((await searchParams).token) ?? '';
  const [t, tn] = await Promise.all([getTranslations('login'), getTranslations('nav')]);
  return (
    <>
      <PageHero title={t('resetTitle')} crumbs={[{ label: tn('login'), href: '/login' }, { label: t('resetTitle') }]} />
      <Section><Card className="mx-auto max-w-lg p-6"><ResetPasswordForm token={token} /></Card></Section>
    </>
  );
}
