import { redirect } from '@/i18n/navigation';

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  redirect({ href: `/portal/courses/${slug}`, locale });
}
