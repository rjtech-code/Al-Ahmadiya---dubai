import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

export interface CheckoutPayload {
  provider: 'razorpay' | 'test';
  orderId: string;
  amount: number;
  currency: string;
  keyId?: string; // Razorpay publishable key
  description: string;
}

export interface PaymentGateway {
  readonly name: 'razorpay' | 'test';
  createOrder(input: { amountFils: number; currency: string; receipt: string; description: string }): Promise<CheckoutPayload>;
  /** Verifies the checkout signature returned to the browser. */
  verifySignature(orderId: string, paymentId: string, signature: string): boolean;
}

const safeEq = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Razorpay Orders API + checkout signature: HMAC_SHA256(order_id|payment_id, key_secret). */
export class RazorpayGateway implements PaymentGateway {
  readonly name = 'razorpay' as const;
  constructor(private readonly keyId: string, private readonly keySecret: string) {}

  async createOrder({ amountFils, currency, receipt, description }: { amountFils: number; currency: string; receipt: string; description: string }): Promise<CheckoutPayload> {
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}` },
      body: JSON.stringify({ amount: amountFils, currency, receipt: receipt.slice(0, 40), notes: { description: description.slice(0, 200) } }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; error?: { description?: string } };
    if (!res.ok || !body.id) throw new Error(`Razorpay order failed: ${body.error?.description ?? res.status}`);
    return { provider: 'razorpay', orderId: body.id, amount: amountFils, currency, keyId: this.keyId, description };
  }

  verifySignature(orderId: string, paymentId: string, signature: string) {
    return safeEq(createHmac('sha256', this.keySecret).update(`${orderId}|${paymentId}`).digest('hex'), signature);
  }

  static verifyWebhook(rawBody: Buffer, signature: string, secret: string) {
    return safeEq(createHmac('sha256', secret).update(rawBody).digest('hex'), signature);
  }
}

/**
 * DEVELOPMENT-ONLY gateway that mimics Razorpay's order/signature protocol so the full flow can be
 * exercised without credentials. The signature is produced by the server (never the browser).
 * env() refuses PAYMENT_PROVIDER=test in production.
 */
export class TestGateway implements PaymentGateway {
  readonly name = 'test' as const;
  private secret = `${env().COOKIE_SECRET}:test-gateway`;

  async createOrder({ amountFils, currency, description }: { amountFils: number; currency: string; receipt: string; description: string }): Promise<CheckoutPayload> {
    return { provider: 'test', orderId: `test_order_${randomUUID().replace(/-/g, '').slice(0, 20)}`, amount: amountFils, currency, description };
  }

  /** Simulates the gateway completing a payment. */
  complete(orderId: string) {
    const paymentId = `test_pay_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    return { paymentId, signature: createHmac('sha256', this.secret).update(`${orderId}|${paymentId}`).digest('hex') };
  }

  verifySignature(orderId: string, paymentId: string, signature: string) {
    return safeEq(createHmac('sha256', this.secret).update(`${orderId}|${paymentId}`).digest('hex'), signature);
  }
}

export function makeGateway(): PaymentGateway | null {
  const e = env();
  if (e.PAYMENT_PROVIDER === 'razorpay') return new RazorpayGateway(e.RAZORPAY_KEY_ID!, e.RAZORPAY_KEY_SECRET!);
  if (e.PAYMENT_PROVIDER === 'test' && e.NODE_ENV !== 'production') return new TestGateway();
  return null;
}
