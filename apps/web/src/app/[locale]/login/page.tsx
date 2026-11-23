import { ArrowRight } from 'lucide-react';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { LoginForm } from '@/components/admissions/LoginForm';
import { PageHero } from '@/components/site/PageHero';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Section } from '@/components/ui/Section';
import { Link } from '@/i18n/navigation';
import { initPage, type LocaleParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: LocaleParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'login' });
  return pageMetadata({ locale, path: '/login', title: t('title'), noindex: true });
}

export default async function LoginPage({ params }: LocaleParams) {
  await initPage(params);
  const [t, tn, ta] = await Promise.all([getTranslations('login'), getTranslations('nav'), getTranslations('admissions.links')]);
  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} crumbs={[{ label: tn('login') }]} />
      <Section>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="p-6"><h2 className="mb-5 font-display text-xl font-semibold text-brand-900">{t('formTitle')}</h2><Suspense><LoginForm /></Suspense></Card>
          <div className="space-y-5">
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold text-brand-900">{t('newStudent')}</h2>
              <Link href="/register" className={buttonClass('brand', 'md', 'mt-3 w-full')}>{t('createAccount')}</Link>
            </Card>
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold text-brand-900">{t('quickLinks')}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {([['/admissions', tn('admissions')], ['/admissions/status', ta('status')], ['/contact', tn('contact')]] as const).map(([href, label]) => (
                  <li key={href}><Link href={href} className="flex items-center gap-1 text-brand-800 hover:text-gold-700"><ArrowRight className="flip-rtl size-3.5" aria-hidden />{label}</Link></li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </Section>
    </>
  );
}
