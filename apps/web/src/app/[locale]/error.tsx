'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('errors');
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="container-site flex flex-col items-center py-24 text-center">
      <h1 className="font-display text-3xl font-semibold text-brand-900">{t('unavailableTitle')}</h1>
      <p className="mt-2 max-w-md text-muted">{t('unavailableBody')}</p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>{t('retry')}</Button>
        <ButtonLink href="/" variant="outline">{t('goHome')}</ButtonLink>
      </div>
    </div>
  );
}
