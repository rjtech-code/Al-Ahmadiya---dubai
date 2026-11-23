'use client';

import { Check, Link2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const t = useTranslations('common');
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const links = [
    { label: 'X', href: `https://x.com/intent/post?url=${enc(url)}&text=${enc(title)}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
    { label: 'WhatsApp', href: `https://wa.me/?text=${enc(`${title} ${url}`)}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-brand-900">{t('share')}:</span>
      {links.map((l) => <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 hover:border-gold-500">{l.label}</a>)}
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard unavailable */ } }} className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 hover:border-gold-500">
        {copied ? <Check className="size-3.5 text-success" /> : <Link2 className="size-3.5" />}{copied ? t('copied') : t('copyLink')}
      </button>
    </div>
  );
}
