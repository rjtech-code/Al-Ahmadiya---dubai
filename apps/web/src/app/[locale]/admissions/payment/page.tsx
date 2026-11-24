import { redirect } from '@/i18n/navigation';
import { initPage, type LocaleParams } from '@/lib/page';

/** Payments now live in the student's account (application fee = last step of the application). */
export default async function PaymentRedirect({ params }: LocaleParams) {
  const locale = await initPage(params);
  redirect({ href: '/portal/payments', locale });
}
