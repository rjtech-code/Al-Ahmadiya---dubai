import { CalendarDays, CheckCircle2, ExternalLink, FileText, Fingerprint, User } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PublicationCard } from '@/components/site/Cards';
import { CtaBand } from '@/components/site/CtaBand';
import { PageHero } from '@/components/site/PageHero';
import { Badge } from '@/components/ui/Badge';
import { buttonClass, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CmsImage } from '@/components/ui/Media';
import { Section, SectionHeading } from '@/components/ui/Section';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { formatDate, pick, pickArr } from '@/lib/i18n-helpers';
import { initPage, type SlugParams } from '@/lib/page';
import { JsonLd, pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: SlugParams) {
  const { locale, slug } = await params;
  const p = await api.publication(slug);
  if (!p) return {};
  return pageMetadata({ locale, path: `/research/${slug}`, title: pick(p, 'title', locale), description: pick(p, 'abstract', locale).slice(0, 160) });
}

export default async function PublicationPage({ params }: SlugParams) {
  const locale = await initPage(params);
  const { slug } = await params;
  const p = await api.publication(slug);
  if (!p) notFound();
  const [t, tn, tr] = await Promise.all([getTranslations('publication'), getTranslations('nav'), getTranslations('research')]);
  const title = pick(p, 'title', locale);
  const affiliations = [...new Set(p.authors.map((a) => a.affiliation).filter(Boolean))] as string[];
  const findings = pickArr(p, 'findings', locale);

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ScholarlyArticle', headline: title, author: p.authors.map((a) => ({ '@type': 'Person', name: a.name })), datePublished: p.publishedOn, ...(p.doi ? { identifier: `https://doi.org/${p.doi}` } : {}), keywords: p.keywords.join(', ') }} />
      <PageHero title={title} crumbs={[{ label: tn('research'), href: '/research' }, { label: title }]} />
      <Section tone="white">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <CmsImage src={p.coverPath} alt="" className="aspect-[3/4] rounded-[var(--radius-card)]" sizes="260px" />
          <div>
            <Badge tone="brand">{tr(`types.${p.type}` as 'types.book')}</Badge>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-brand-900">{title}</h2>
            <p className="mt-3 flex flex-wrap items-start gap-2 text-sm text-ink"><User className="size-4 text-gold-600" aria-hidden />{p.authors.map((a) => <span key={a.position}>{a.name}{a.affiliation ? <sup>{affiliations.indexOf(a.affiliation) + 1}</sup> : null}{a.position < p.authors.length ? ',' : ''}</span>)}</p>
            {affiliations.length > 0 && <ol className="mt-2 space-y-0.5 text-xs text-muted">{affiliations.map((af, i) => <li key={af}><sup>{i + 1}</sup> {af}</li>)}</ol>}
            <Card className="mt-5 grid gap-3 p-4 text-sm sm:grid-cols-3">
              <div className="flex items-center gap-2"><CalendarDays className="size-4 text-gold-600" aria-hidden /><span><span className="block text-xs text-muted">{t('published')}</span>{p.publishedOn ? formatDate(p.publishedOn, locale) : '—'}</span></div>
              <div className="flex items-center gap-2"><FileText className="size-4 text-gold-600" aria-hidden /><span><span className="block text-xs text-muted">{t('journal')}</span>{p.journal ?? '—'}</span></div>
              <div className="flex items-center gap-2"><Fingerprint className="size-4 text-gold-600" aria-hidden /><span><span className="block text-xs text-muted">{t('doi')}</span>{p.doi ? <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noopener noreferrer" className="break-all underline" dir="ltr">{p.doi}</a> : '—'}</span></div>
            </Card>
            {p.fullTextUrl && <a href={p.fullTextUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('brand', 'md', 'mt-5')}>{t('fullPaper')} <ExternalLink className="size-4" aria-hidden /></a>}
          </div>
        </div>
      </Section>

      <Section labelledBy="ab-h">
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <SectionHeading id="ab-h" title={t('abstract')} />
            <p className="whitespace-pre-line leading-relaxed text-muted">{pick(p, 'abstract', locale)}</p>
            {p.keywords.length > 0 && (
              <>
                <h3 className="mb-2 mt-6 font-semibold text-brand-900">{t('keywords')}</h3>
                <div className="flex flex-wrap gap-2">{p.keywords.map((k) => <Link key={k} href={`/research?q=${encodeURIComponent(k)}`} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 hover:bg-brand-100">{k}</Link>)}</div>
              </>
            )}
          </div>
          {findings.length > 0 && (
            <Card className="h-fit p-5">
              <h2 className="font-display text-xl font-semibold text-brand-900">{t('findings')}</h2>
              <ul className="mt-3 space-y-2">{findings.map((f) => <li key={f} className="flex gap-2 text-sm text-muted"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{f}</li>)}</ul>
            </Card>
          )}
        </div>
      </Section>

      {p.related.length > 0 && (
        <Section tone="white" labelledBy="rp-h">
          <SectionHeading id="rp-h" title={t('related')} />
          <div className="grid gap-5 sm:grid-cols-3">{p.related.map((r) => <PublicationCard key={r.id} p={r} />)}</div>
        </Section>
      )}
      <CtaBand title={t('exploreTitle')} body={t('exploreBody')}><ButtonLink href="/research">{tn('research')}</ButtonLink></CtaBand>
    </>
  );
}
