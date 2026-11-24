import { redirect } from '@/i18n/navigation';

const TABS: Record<string, string> = { courses: '/portal/courses', live: '/portal/live', payments: '/portal/payments' };

/** The old account page now lives in the student portal. */
export default async function AccountRedirect({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ locale }, { tab }] = await Promise.all([params, searchParams]);
  redirect({ href: (tab && TABS[tab]) || '/portal', locale });
}
