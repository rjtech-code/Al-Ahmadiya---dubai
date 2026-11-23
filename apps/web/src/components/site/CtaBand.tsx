import type { ReactNode } from 'react';
import { LogoMark } from './Logo';

/** Navy call-to-action band that closes most pages in the collages. */
export function CtaBand({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <section className="container-site my-12 sm:my-16">
      <div className="pattern-girih relative isolate flex flex-col items-start justify-between gap-6 overflow-hidden rounded-[2rem] px-6 py-8 text-white sm:flex-row sm:items-center sm:px-10 sm:py-10">
        <LogoMark className="absolute -end-6 -bottom-8 -z-10 size-48 text-gold-500/10" />
        <div>
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h2>
          {body && <p className="mt-2 max-w-xl text-sm text-white/75 sm:text-base">{body}</p>}
        </div>
        {children && <div className="flex shrink-0 flex-wrap gap-3">{children}</div>}
      </div>
    </section>
  );
}
