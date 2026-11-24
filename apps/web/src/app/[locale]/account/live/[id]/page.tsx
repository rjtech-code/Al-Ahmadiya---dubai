import { redirect } from '@/i18n/navigation';

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  redirect({ href: `/portal/live/${id}`, locale });
}
