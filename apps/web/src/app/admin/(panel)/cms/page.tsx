'use client';

import Link from 'next/link';
import { CMS_FIELDS } from '@/components/admin/cmsFields';
import { PageHeader } from '@/components/admin/ui';

export default function CmsIndex() {
  return (
    <>
      <PageHeader title="Content management" crumbs={[{ label: 'Content' }]} description="Bilingual content for the public website. Content marked “Client confirmation required” should not be published as fact until approved." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(CMS_FIELDS).map(([key, d]) => (
          <Link key={key} href={`/admin/cms/${key}`} className="rounded-[1.5rem] border border-white/80 bg-cream-50 p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-gold-400">
            <p className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-brand-900">{d.title}</p>
            <p className="mt-1 text-xs text-muted">{d.fields.length} fields</p>
          </Link>
        ))}
      </div>
    </>
  );
}
