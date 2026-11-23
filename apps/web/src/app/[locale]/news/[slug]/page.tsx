import { Calendar, ExternalLink, Quote } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { NewsCard } from '@/components/site/Cards';
import { CtaBand } from '@/components/site/CtaBand';
import { PageHero } from '@/components/site/PageHero';
import { ShareButtons } from '@/components/site/ShareButtons';
import { NewsletterForm } from '@/components/forms/NewsletterForm';
import { Badge } from '@/components/ui/Badge';
import { CmsImage } from '@/components/ui/Media';
import { Section, SectionHeading } from '@/components/ui/Section';
import { api } from '@/lib/api';
import { formatDate, pick } from '@/lib/i18n-helpers';
import { Markdown } from '@/lib/markdown';
import { initPage, type SlugParams } from '@/lib/page';
import { JsonLd, pageMetadata, SITE_URL } from '@/lib/seo';

export async function generateMetadata({ params }: SlugParams) {
  const { locale, slug } = await params;
  const a = await api.article(slug);
  if (!a) return {};
  return pageMetadata({ locale, path: `/news/${slug}`, title: pick(a, 'title', locale), description: pick(a, 'excerpt', locale), image: a.imagePath });
}

export default async function ArticlePage({ params }: SlugParams) {
  const locale = await initPage(params);
  const { slug } = await params;
  const a = await api.article(slug);
  if (!a) notFound();
  const [t, tn, tnews] = await Promise.all([getTranslations('article'), getTranslations('nav'), getTranslations('news')]);
  const title = pick(a, 'title', locale);
  const url = `${SITE_URL}/${locale}/news/${a.slug}`;

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'NewsArticle', headline: title, datePublished: a.publishedAt, url, ...(a.imagePath ? { image: `${SITE_URL}${a.imagePath}` } : {}), publisher: { '@type': 'Organization', name: 'Al Ahmadiya' } }} />
      <PageHero title={title} crumbs={[{ label: tn('news'), href: '/news' }, { label: title }]} />
      <Section tone="white">
        <article className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <Badge>{tnews(`cat.${a.category}` as 'cat.university')}</Badge>
            {a.publishedAt && <span className="flex items-center gap-1"><Calendar className="size-4" aria-hidden /><time dateTime={a.publishedAt}>{formatDate(a.publishedAt, locale)}</time></span>}
          </div>
          <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-brand-900 sm:text-4xl">{title}</h2>
          <p className="mt-3 text-lg text-muted">{pick(a, 'excerpt', locale)}</p>
          {a.imagePath && <CmsImage src={a.imagePath} alt="" className="mt-6 aspect-[16/9] rounded-[var(--radius-card)]" sizes="(min-width: 768px) 768px, 100vw" priority />}
          <div className="mt-8"><Markdown source={pick(a, 'body', locale)} /></div>
          {pick(a, 'quote', locale) && (
            <blockquote className="my-8 flex gap-4 rounded-md border-s-4 border-gold-500 bg-cream-100 p-5">
              <Quote className="size-8 shrink-0 text-gold-500" aria-hidden />
              <div>
                <p className="font-display text-lg italic text-brand-900">“{pick(a, 'quote', locale)}”</p>
                {pick(a, 'quoteBy', locale) && <footer className="mt-2 text-sm font-semibold text-muted">— {pick(a, 'quoteBy', locale)}</footer>}
              </div>
            </blockquote>
          )}
          {a.sourceUrl && <p className="mt-6 text-sm"><a href={a.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-700 underline">{t('sourceLink')} <ExternalLink className="size-3.5" aria-hidden /></a></p>}
          <div className="mt-8 border-t border-line pt-6"><ShareButtons url={url} title={title} /></div>
        </article>
      </Section>

      {a.related.length > 0 && (
        <Section labelledBy="rel-h">
          <SectionHeading id="rel-h" title={t('related')} action={{ href: '/news', label: tn('news') }} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{a.related.map((r) => <NewsCard key={r.id} n={r} />)}</div>
        </Section>
      )}

      <CtaBand title={t('joinTitle')} body={t('joinBody')}><div className="w-full max-w-md"><NewsletterForm /></div></CtaBand>
    </>
  );
}
