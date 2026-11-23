import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { AccountDashboard } from '@/components/account/AccountDashboard';
import { Section } from '@/components/ui/Section';
import { initPage, type LocaleParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: LocaleParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'account' });
  return pageMetadata({ locale, path: '/account', title: t('title'), noindex: true });
}

export default async function AccountPage({ params }: LocaleParams) {
  await initPage(params);
  const t = await getTranslations('account');
  return (
    <Section className="!pt-6">
      <h1 className="mb-8 font-display text-5xl font-semibold text-brand-900">{t('title')}</h1>
      <Suspense><AccountDashboard /></Suspense>
    </Section>
  );
}
