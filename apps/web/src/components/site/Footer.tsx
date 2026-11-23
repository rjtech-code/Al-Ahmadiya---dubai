import { Mail, MapPin, Phone } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { setting } from '@/lib/i18n-helpers';
import type { Settings } from '@/lib/types';
import { Logo } from './Logo';

export async function Footer({ settings, nameEn, nameAr }: { settings: Settings; nameEn: string; nameAr: string }) {
  const [t, tn, tt, tb, locale] = await Promise.all([getTranslations('footer'), getTranslations('nav'), getTranslations('tba'), getTranslations('brand'), getLocale()]);
  const email = setting(settings, 'contact.email', locale);
  const phone = setting(settings, 'contact.phone', locale);
  const address = setting(settings, 'contact.address', locale);
  const socials = (['instagram', 'x', 'linkedin', 'youtube'] as const)
    .map((k) => ({ k, url: setting(settings, `social.${k}`, locale) }))
    .filter((s): s is { k: typeof s.k; url: string } => !!s.url);

  const quick = [['/', 'home'], ['/about', 'about'], ['/colleges', 'colleges'], ['/programs', 'programs'], ['/research', 'research']] as const;
  const useful = [['/news', 'news'], ['/events', 'events'], ['/admissions', 'admissions'], ['/faculty', 'faculty'], ['/campus-tour', 'tour'], ['/contact', 'contact']] as const;

  return (
    <footer className="pattern-girih mt-auto rounded-t-[2.5rem] text-white">
      <div className="container-site grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        <div>
          <Logo light nameEn={nameEn} nameAr={nameAr} line1={tb('line1')} since={tb('since')} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">{t('tagline')}</p>
        </div>
        <nav aria-labelledby="f-quick">
          <h2 id="f-quick" className="mb-3 text-sm font-semibold text-gold-400">{t('quickLinks')}</h2>
          <ul className="space-y-2 text-sm text-white/75">
            {quick.map(([href, key]) => <li key={href}><Link href={href} className="hover:text-white">{tn(key)}</Link></li>)}
          </ul>
        </nav>
        <nav aria-labelledby="f-useful">
          <h2 id="f-useful" className="mb-3 text-sm font-semibold text-gold-400">{t('usefulLinks')}</h2>
          <ul className="space-y-2 text-sm text-white/75">
            {useful.map(([href, key]) => <li key={href}><Link href={href} className="hover:text-white">{tn(key)}</Link></li>)}
          </ul>
        </nav>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gold-400">{t('contact')}</h2>
          <ul className="space-y-2.5 text-sm text-white/75">
            <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-gold-400" aria-hidden />{address ?? <span className="italic text-white/50">{tt('badge')}</span>}</li>
            <li className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-gold-400" aria-hidden />{phone ? <a href={`tel:${phone.replace(/\s/g, '')}`} dir="ltr" className="hover:text-white">{phone}</a> : <span className="italic text-white/50">{tt('badge')}</span>}</li>
            <li className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0 text-gold-400" aria-hidden />{email ? <a href={`mailto:${email}`} className="hover:text-white">{email}</a> : <span className="italic text-white/50">{tt('badge')}</span>}</li>
          </ul>
          {socials.length > 0 && (
            <ul className="mt-4 flex gap-3">
              {socials.map((s) => <li key={s.k}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm capitalize text-white/75 hover:text-white">{s.k}</a></li>)}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-site flex flex-col gap-2 py-5 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>{t('rights', { year: new Date().getFullYear() })}</p>
          <p className="max-w-xl">{t('heritageCredit')}</p>
        </div>
      </div>
    </footer>
  );
}
