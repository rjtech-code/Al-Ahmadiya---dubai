'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useSession } from '@/lib/session';
import { useApi, useFmt } from './ui';

/** Shown on the public homepage to a signed-in student; the homepage itself stays the same for everyone. */
export function StudentCard() {
  const t = useTranslations('portal.card');
  const f = useFmt();
  const { state } = useSession();
  const authed = state.status === 'authed';
  const profile = useApi<{ studentId: string; fullName: string; application: { status: string; program: { nameEn: string; nameAr: string } | null } | null }>(authed ? '/me/portal/profile' : null);
  const results = useApi<{ cgpa: number | null }>(authed ? '/me/portal/results' : null);
  if (!authed || !profile.data) return null;
  const p = profile.data;
  return (
    <div className="container-site relative z-10 -mt-6 mb-4">
      <div className="pattern-girih flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] bg-brand-900 p-5 text-white shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-gold-400 font-display text-xl font-semibold text-brand-950">{p.fullName.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>
          <div>
            <p className="text-xs uppercase tracking-wider text-gold-300">{t('welcomeBack')}</p>
            <p className="font-display text-2xl font-semibold">{p.fullName}</p>
            <p className="text-sm text-white/75">{p.studentId}{p.application?.program && ` · ${f.L({ titleEn: p.application.program.nameEn, titleAr: p.application.program.nameAr })}`}{results.data?.cgpa != null && ` · ${t('cgpa')} ${results.data.cgpa}`}</p>
          </div>
        </div>
        <Link href="/portal" className="inline-flex items-center gap-2 rounded-full bg-gold-400 px-6 py-3 text-sm font-semibold text-brand-950 hover:bg-gold-300">{t('continue')}<ArrowRight className="size-4 rtl:rotate-180" /></Link>
      </div>
    </div>
  );
}
