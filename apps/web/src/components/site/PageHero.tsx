import Image from 'next/image';
import type { ReactNode } from 'react';
import type { Media } from '@/lib/types';
import { Breadcrumbs, type Crumb } from './Breadcrumbs';
import { Enter, ZoomIn } from '../motion';
import { DubaiLearningArt } from '../motion/Illustrations';

/**
 * Inner-page hero in the new design language: warm sand band, gold rule, large serif title,
 * breadcrumb, and an arch-framed image on the right. Only licensed heritage images (on heritage
 * pages) or CMS images are used; otherwise an arch outline stands in.
 */
export async function PageHero({ title, subtitle, crumbs, image, children, eyebrow, aside }: {
  title: string; subtitle?: string; crumbs: Crumb[]; image?: Media | null; children?: ReactNode; eyebrow?: ReactNode;
  /** Optional right-hand media (e.g. a faculty portrait). Overrides `image`. */
  aside?: ReactNode;
}) {
  const right = aside ?? (image ? (
    <ZoomIn className="arch relative hidden aspect-[4/5] w-72 overflow-hidden border-8 border-cream-50 shadow-[0_30px_60px_-30px_rgb(60_40_10/0.6)] md:block lg:w-80">
      <Image src={image.path} alt="" fill priority sizes="320px" className="object-cover" />
    </ZoomIn>
  ) : (
    <DubaiLearningArt className="hidden h-80 w-72 md:grid lg:w-80" />
  ));
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden className="absolute -end-24 -top-40 -z-10 h-[30rem] w-[24rem] rounded-t-full bg-white/45" />
      <div className="container-site grid items-center gap-8 pb-12 pt-6 sm:pb-16 md:grid-cols-[1fr_auto] md:pt-10">
        <Enter>
          <Breadcrumbs items={crumbs} light={false} />
          <span className="mt-6 block h-0.5 w-20 bg-gold-500" aria-hidden />
          {eyebrow}
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.05] text-brand-900 sm:text-6xl">{title}</h1>
          {subtitle && <p className="mt-4 max-w-2xl text-lg text-ink/75">{subtitle}</p>}
          {children}
        </Enter>
        {right}
      </div>
    </section>
  );
}
