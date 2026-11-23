import { Mail, MapPin, Phone } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { FactsBar } from '@/components/site/FactsBar';
import { PageHero } from '@/components/site/PageHero';
import { ContactForm } from '@/components/forms/ContactForm';
import { Card } from '@/components/ui/Card';
import { Section, SectionHeading } from '@/components/ui/Section';
import { TbaBadge, TbaPanel } from '@/components/ui/Tba';
import { api } from '@/lib/api';
import { setting } from '@/lib/i18n-helpers';
import { initPage, type LocaleParams } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: LocaleParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });
  return pageMetadata({ locale, path: '/contact', title: t('title'), description: t('subtitle') });
}

export default async function ContactPage({ params }: LocaleParams) {
  const locale = await initPage(params);
  const [t, tn] = await Promise.all([getTranslations('contact'), getTranslations('nav')]);
  const settings = await api.settings();
  const address = setting(settings, 'contact.address', locale);
  const phone = setting(settings, 'contact.phone', locale);
  const email = setting(settings, 'contact.email', locale);
  const mapUrl = setting(settings, 'contact.mapUrl', locale);
  const cards = [
    { icon: MapPin, label: t('address'), value: address },
    { icon: Phone, label: t('phone'), value: phone, href: phone ? `tel:${phone.replace(/\s/g, '')}` : undefined, ltr: true },
    { icon: Mail, label: t('email'), value: email, href: email ? `mailto:${email}` : undefined },
  ];

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} crumbs={[{ label: tn('contact') }]} />
      <FactsBar items={cards.map((c) => ({ icon: c.icon, label: c.label, value: c.value ? (c.href ? <a href={c.href} dir={c.ltr ? 'ltr' : undefined} className="hover:underline">{c.value}</a> : c.value) : <TbaBadge /> }))} />
      <Section>
        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="p-6">
            <SectionHeading title={t('formTitle')} />
            <ContactForm />
          </Card>
          <div>
            <SectionHeading title={t('location')} />
            {mapUrl ? (
              <iframe title={t('location')} src={mapUrl} className="aspect-[4/3] w-full rounded-[var(--radius-card)] border border-line" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            ) : <TbaPanel message={t('locationPending')} className="aspect-[4/3]" />}
          </div>
        </div>
      </Section>
    </>
  );
}
