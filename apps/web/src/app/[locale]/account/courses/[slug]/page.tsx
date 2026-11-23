import { LearnCourse } from '@/components/account/LearnCourse';
import { Section } from '@/components/ui/Section';
import { pageMetadata } from '@/lib/seo';
import { setRequestLocale } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata({ locale, path: '/account', title: 'Account', noindex: true });
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const p = await params;
  setRequestLocale(p.locale);
  return <Section className="!pt-6"><LearnCourse slug={p.slug} /></Section>;
}
