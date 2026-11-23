'use client';

import { CreditCard, Loader2, ShieldCheck, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { apiFetch, ApiError, formatMoney } from './client-api';

export interface Checkout { provider: 'razorpay' | 'test'; orderId: string; amount: number; currency: string; keyId?: string; description: string; prefill?: { email?: string; name?: string } }
export interface PaymentResult { id: string; status: string; receiptNumber: string | null }

declare global {
  interface Window { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void } }
}

const loadRazorpay = () =>
  new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Razorpay checkout'));
    document.body.appendChild(s);
  });

/**
 * Opens the configured gateway and ALWAYS verifies on the server (/payments/verify) before
 * reporting success. The test gateway is development-only and clearly labelled.
 */
export function useCheckout() {
  const [testOrder, setTestOrder] = useState<{ c: Checkout; resolve: (r: PaymentResult) => void; reject: (e: Error) => void } | null>(null);

  const pay = useCallback(async (c: Checkout): Promise<PaymentResult> => {
    if (c.provider === 'test') return new Promise((resolve, reject) => setTestOrder({ c, resolve, reject }));
    await loadRazorpay();
    return new Promise((resolve, reject) => {
      const rzp = new window.Razorpay!({
        key: c.keyId, order_id: c.orderId, amount: c.amount, currency: c.currency, name: 'Al Ahmadiya', description: c.description,
        prefill: c.prefill, theme: { color: '#0b3a3c' },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const { data } = await apiFetch<{ data: PaymentResult }>('/payments/verify', { method: 'POST', json: { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature } });
            resolve(data);
          } catch (e) { reject(e as Error); }
        },
        modal: { ondismiss: () => reject(new Error('cancelled')) },
      });
      rzp.on('payment.failed', () => reject(new Error('failed')));
      rzp.open();
    });
  }, []);

  const dialog = testOrder ? <TestGatewayDialog order={testOrder.c} onDone={(r) => { testOrder.resolve(r); setTestOrder(null); }} onCancel={() => { testOrder.reject(new Error('cancelled')); setTestOrder(null); }} /> : null;
  return { pay, dialog };
}

function TestGatewayDialog({ order, onDone, onCancel }: { order: Checkout; onDone: (r: PaymentResult) => void; onCancel: () => void }) {
  const t = useTranslations('checkout');
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const complete = async () => {
    setBusy(true); setError('');
    try {
      const { data } = await apiFetch<{ data: PaymentResult }>('/payments/test/complete', { method: 'POST', json: { orderId: order.orderId } });
      onDone(data);
    } catch (e) { setError(e instanceof ApiError ? e.message : t('failed')); setBusy(false); }
  };
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="pay-title" className="fixed inset-0 z-[60] grid place-items-center bg-brand-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] bg-cream-50 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 id="pay-title" className="flex items-center gap-2 font-display text-2xl font-semibold text-brand-900"><ShieldCheck className="size-6 text-gold-600" />{t('title')}</h2>
          <button onClick={onCancel} aria-label={t('cancel')} className="grid size-9 place-items-center rounded-full hover:bg-cream-200"><X className="size-5" /></button>
        </div>
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-warning">{t('testMode')}</p>
        <p className="mt-4 text-sm text-muted">{order.description}</p>
        <p className="mt-1 font-display text-4xl font-semibold text-brand-900">{formatMoney(order.amount, order.currency, locale)}</p>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-6 flex gap-3">
          <button onClick={complete} disabled={busy} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand-900 font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}{busy ? t('processing') : t('pay', { amount: formatMoney(order.amount, order.currency, locale) })}
          </button>
          <button onClick={onCancel} disabled={busy} className="h-12 rounded-full border border-gold-400 px-5 font-semibold text-brand-900">{t('cancel')}</button>
        </div>
      </div>
    </div>
  );
}
