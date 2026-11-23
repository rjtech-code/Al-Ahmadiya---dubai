import { CheckCircle2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { RegisterForm } from '@/components/admissions/RegisterForm';
import { PageHero } from '@/components/site/PageHero';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Section } from '@/components/ui/Section';
import { Link } from '@/i18n/navigation';
import { initPage, type LocaleParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: LocaleParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'register' });
  return pageMetadata({ locale, path: '/register', title: t('title'), noindex: true });
}

export default async function RegisterPage({ params }: LocaleParams) {
  await initPage(params);
  const [t, tn] = await Promise.all([getTranslations('register'), getTranslations('nav')]);
  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} crumbs={[{ label: tn('admissions'), href: '/admissions' }, { label: t('title') }]} />
      <Section>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="p-6"><h2 className="mb-5 font-display text-xl font-semibold text-brand-900">{t('formTitle')}</h2><RegisterForm /></Card>
          <div className="space-y-5">
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold text-brand-900">{t('haveAccount')}</h2>
              <Link href="/login" className={buttonClass('brand', 'md', 'mt-3 w-full')}>{t('loginHere')}</Link>
            </Card>
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold text-brand-900">{t('benefitsTitle')}</h2>
              <ul className="mt-3 space-y-2">{[t('benefit1'), t('benefit2'), t('benefit3')].map((b) => <li key={b} className="flex gap-2 text-sm"><CheckCircle2 className="size-4 shrink-0 text-gold-600" aria-hidden />{b}</li>)}</ul>
            </Card>
          </div>
        </div>
      </Section>
    </>
  );
}
