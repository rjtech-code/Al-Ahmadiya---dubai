import { ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export interface Crumb { label: string; href?: string }

export async function Breadcrumbs({ items, light = true }: { items: Crumb[]; light?: boolean }) {
  const t = await getTranslations('common');
  const all: Crumb[] = [{ label: t('home'), href: '/' }, ...items];
  return (
    <nav aria-label="Breadcrumb">
      <ol className={`flex flex-wrap items-center gap-1 text-xs sm:text-sm ${light ? 'text-white/75' : 'text-muted'}`}>
        {all.map((c, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="flip-rtl size-3.5 opacity-60" aria-hidden />}
            {c.href && i < all.length - 1 ? (
              <Link href={c.href} className={light ? 'hover:text-white' : 'hover:text-brand-900'}>{c.label}</Link>
            ) : (
              <span aria-current="page" className={light ? 'text-white' : 'text-brand-900'}>{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function breadcrumbJsonLd(base: string, locale: string, items: { label: string; href: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, item: `${base}/${locale}${c.href === '/' ? '' : c.href}` })),
  };
}
