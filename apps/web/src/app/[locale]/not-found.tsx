import { useTranslations } from 'next-intl';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  const t = useTranslations('errors');
  return (
    <div className="container-site flex flex-col items-center py-24 text-center">
      <p className="font-display text-6xl font-semibold text-gold-500">404</p>
      <h1 className="mt-4 font-display text-3xl font-semibold text-brand-900">{t('notFoundTitle')}</h1>
      <p className="mt-2 max-w-md text-muted">{t('notFoundBody')}</p>
      <ButtonLink href="/" className="mt-6">{t('goHome')}</ButtonLink>
    </div>
  );
}
