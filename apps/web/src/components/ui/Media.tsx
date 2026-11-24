import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import { ImageIcon } from 'lucide-react';
import type { Media } from '@/lib/types';
import { cn } from './cn';

/** Placeholder for photography the client has not yet supplied. Clearly labelled; never a stock photo posing as the campus. */
export async function PendingImage({ className, label }: { className?: string; label?: string }) {
  const t = await getTranslations('tba');
  return (
    <div role="img" aria-label={label ?? t('imagePending')} className={cn('pattern-cream relative flex items-center justify-center overflow-hidden border-b border-line/60', className)}>
      <div className="flex flex-col items-center gap-2 px-3 text-center text-gold-700/80">
        <ImageIcon className="size-7" aria-hidden />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">{label ?? t('imagePending')}</span>
      </div>
    </div>
  );
}

const TITLES = /^(dr|prof|mr|mrs|ms|د|أ|م)\.?$/i;
/** "Dr. Layla Haddad" → "LH" (academic titles skipped). */
export function initials(name: string) {
  const words = name.replace(/[()]/g, ' ').split(/\s+/).filter((w) => w && !TITLES.test(w) && w !== 'أ.' && w !== 'د.');
  return (words.slice(0, 1).concat(words.length > 1 ? words.slice(-1) : [])).map((w) => w[0]).join('').toUpperCase();
}

/** Monogram shown for people without a photograph. */
export function InitialsAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <div role="img" aria-label={name} className={cn('pattern-girih flex items-center justify-center bg-brand-900 font-display font-semibold text-gold-300', className)}>
      <span className="text-[clamp(1.25rem,28cqi,4.5rem)] leading-none">{initials(name)}</span>
    </div>
  );
}

/** Image from CMS path; when absent, a monogram for people (`person`) or a labelled placeholder. */
export async function CmsImage({ src, alt, className, sizes = '(min-width: 1024px) 33vw, 100vw', priority = false, person = false }: { src: string | null | undefined; alt: string; className?: string; sizes?: string; priority?: boolean; person?: boolean }) {
  if (!src) return person && alt ? <InitialsAvatar name={alt} className={cn('@container', className)} /> : <PendingImage className={className} />;
  // Images uploaded without Cloudinary are served by the API itself.
  const fromApi = src.startsWith('/api/');
  const url = fromApi ? `${(process.env.NEXT_PUBLIC_API_ORIGIN ?? '').replace(/\/$/, '')}${src}` : src;
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Image src={url} alt={alt} fill sizes={sizes} priority={priority} unoptimized={fromApi} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
    </div>
  );
}

/** Licensed heritage photograph with visible CC BY-SA attribution (licence requirement). */
export async function HeritageFigure({ media, className, imgClassName, sizes = '(min-width: 1024px) 50vw, 100vw', priority = false, showCaption = true }: {
  media: Media; className?: string; imgClassName?: string; sizes?: string; priority?: boolean; showCaption?: boolean;
}) {
  const [locale, t] = [await getLocale(), await getTranslations('heritage')];
  const alt = locale === 'ar' ? media.altAr : media.altEn;
  const caption = locale === 'ar' ? media.captionAr : media.captionEn;
  return (
    <figure className={cn('group', className)}>
      <div className={cn('relative overflow-hidden rounded-[var(--radius-card)] bg-brand-900', imgClassName)}>
        <Image src={media.path} alt={alt} fill sizes={sizes} priority={priority} className="object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
      </div>
      <figcaption className="mt-2 text-xs leading-relaxed text-muted">
        {showCaption && caption && <span className="me-1">{caption}</span>}
        <span>
          {t('credit', { author: media.author ?? '—', license: media.license ?? '' })}
          {media.sourceUrl && (
            <>
              {' · '}
              <a href={media.sourceUrl} target="_blank" rel="noopener noreferrer license" className="underline hover:text-brand-700">{t('viewSource')}</a>
            </>
          )}
        </span>
      </figcaption>
    </figure>
  );
}
