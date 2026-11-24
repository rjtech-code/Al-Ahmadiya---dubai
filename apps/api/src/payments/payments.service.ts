import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { getRandomValues, randomUUID } from 'node:crypto';
import { AdmissionsService } from '../admissions/admissions.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/decorators';
import { PageQuery, pageArgs, pageMeta } from '../common/pagination';
import { env } from '../config/env';
import type { Prisma } from '../generated/prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { applicationFeeFils } from './fees';
import { makeGateway, RazorpayGateway, TestGateway, type PaymentGateway } from './gateways';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const receiptNumber = () => `RCPT-${new Date().getFullYear()}-${[...getRandomValues(new Uint8Array(8))].map((b) => ALPHABET[b % ALPHABET.length]).join('')}`;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('Payments');
  private gateway: PaymentGateway | null = makeGateway();

  constructor(
    private readonly prisma: PrismaService,
    private readonly admissions: AdmissionsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  config() {
    return { data: { provider: this.gateway?.name ?? 'none', keyId: this.gateway?.name === 'razorpay' ? env().RAZORPAY_KEY_ID : undefined } };
  }

  private requireGateway() {
    if (!this.gateway) throw new ServiceUnavailableException({ code: 'PAYMENTS_NOT_CONFIGURED', message: 'Online payment is not available yet. Please try again later.' });
    return this.gateway;
  }

  /** Application fee — the last step of the application. Free applications are submitted immediately. */
  async startApplicationFee(user: AuthUser, applicationId: string) {
    const app = await this.admissions.assertSubmittable(user, applicationId);
    const fee = await applicationFeeFils(this.prisma);
    if (fee === null) throw new ConflictException({ code: 'FEE_NOT_CONFIGURED', message: 'The application fee has not been confirmed yet.' });
    const paid = await this.prisma.payment.findFirst({ where: { applicationId: app.id, status: 'SUCCEEDED' } });
    if (fee === 0 || paid) {
      await this.admissions.markSubmitted(app.id, user.id);
      return { data: { completed: true as const, applicationId: app.id } };
    }
    return { data: { completed: false as const, checkout: await this.createPayment(user, { purpose: 'application-fee', applicationId: app.id, amountFils: fee, description: `Application fee ${app.reference}` }) } };
  }

  /** Course purchase. Login is required; free courses activate immediately. */
  async startCoursePurchase(user: AuthUser, courseSlug: string) {
    const course = await this.prisma.course.findFirst({ where: { slug: courseSlug, onlineEnabled: true, publishStatus: 'PUBLISHED', deletedAt: null } });
    if (!course) throw new NotFoundException({ code: 'COURSE_NOT_AVAILABLE', message: 'This course is not available for online enrolment.' });
    const existing = await this.prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } } });
    if (existing?.status === 'ACTIVE') throw new ConflictException({ code: 'ALREADY_ENROLLED', message: 'You are already enrolled in this course.' });
    const enrollment = existing ?? (await this.prisma.enrollment.create({ data: { userId: user.id, courseId: course.id } }));
    if (!course.priceFils) {
      await this.activateEnrollment(enrollment.id);
      return { data: { completed: true as const, courseSlug: course.slug } };
    }
    return {
      data: {
        completed: false as const,
        checkout: await this.createPayment(user, { purpose: 'course', enrollmentId: enrollment.id, amountFils: course.priceFils, currency: course.currency, description: `Course ${course.code} — ${course.titleEn}` }),
      },
    };
  }

  private async createPayment(user: AuthUser, p: { purpose: string; applicationId?: string; enrollmentId?: string; amountFils: number; currency?: string; description: string }) {
    const gw = this.requireGateway();
    const idempotencyKey = randomUUID();
    const checkout = await gw.createOrder({ amountFils: p.amountFils, currency: p.currency ?? 'AED', receipt: idempotencyKey, description: p.description });
    const payment = await this.prisma.payment.create({
      data: {
        userId: user.id, purpose: p.purpose, applicationId: p.applicationId, enrollmentId: p.enrollmentId, description: p.description,
        amountFils: p.amountFils, currency: p.currency ?? 'AED', provider: gw.name, providerOrderId: checkout.orderId, idempotencyKey, status: 'PENDING',
      },
    });
    return { ...checkout, paymentId: payment.id, prefill: { name: undefined as string | undefined, email: user.email } };
  }

  /** Browser returns gateway ids + signature; the server verifies before anything is marked paid. */
  async verify(user: AuthUser, body: { orderId: string; paymentId: string; signature: string }) {
    const payment = await this.prisma.payment.findUnique({ where: { providerOrderId: body.orderId } });
    if (!payment || payment.userId !== user.id) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Payment not found' });
    if (payment.status === 'SUCCEEDED') return { data: await this.summary(payment.id) };
    const gw = this.requireGateway();
    if (gw.name !== payment.provider || !gw.verifySignature(body.orderId, body.paymentId, body.signature)) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', rawCallback: { reason: 'signature-mismatch' } } });
      throw new BadRequestException({ code: 'PAYMENT_VERIFICATION_FAILED', message: 'We could not verify this payment. You have not been charged twice; please contact support if money was deducted.' });
    }
    await this.fulfil(payment.id, body.paymentId, { source: 'checkout' });
    return { data: await this.summary(payment.id) };
  }

  /** Development test gateway: simulates the gateway completing the payment, then verifies like Razorpay. */
  async testComplete(user: AuthUser, orderId: string) {
    if (!(this.gateway instanceof TestGateway)) throw new ForbiddenException({ code: 'TEST_GATEWAY_DISABLED', message: 'Test gateway is not enabled' });
    const { paymentId, signature } = this.gateway.complete(orderId);
    return this.verify(user, { orderId, paymentId, signature });
  }

  /** Razorpay webhook (payment.captured / order.paid): server-to-server confirmation. */
  async webhook(raw: Buffer | undefined, signature: string | undefined) {
    const secret = env().RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !raw || !signature || !RazorpayGateway.verifyWebhook(raw, signature, secret)) throw new ForbiddenException({ code: 'INVALID_WEBHOOK', message: 'Invalid signature' });
    const evt = JSON.parse(raw.toString()) as { event: string; payload?: { payment?: { entity?: { id: string; order_id: string; status: string } } } };
    const ent = evt.payload?.payment?.entity;
    if (ent && ['payment.captured', 'order.paid'].includes(evt.event)) {
      const payment = await this.prisma.payment.findUnique({ where: { providerOrderId: ent.order_id } });
      if (payment && payment.status !== 'SUCCEEDED') await this.fulfil(payment.id, ent.id, { source: 'webhook', event: evt.event });
    }
    return { received: true };
  }

  /** Idempotent: marks paid, issues receipt, then submits the application or activates the course. */
  private async fulfil(paymentId: string, providerRef: string, raw: Prisma.InputJsonValue) {
    await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      if (p.status === 'SUCCEEDED') return;
      await tx.payment.update({ where: { id: p.id }, data: { status: 'SUCCEEDED', providerRef, paidAt: new Date(), receiptNumber: receiptNumber(), rawCallback: raw } });
      if (p.applicationId) await this.admissions.markSubmitted(p.applicationId, p.userId, tx);
      if (p.enrollmentId) await this.activateEnrollment(p.enrollmentId, tx);
      await this.notifications.notify([p.userId], {
        type: 'payment', titleEn: 'Payment received', titleAr: 'تم استلام الدفعة',
        bodyEn: `${p.description} — receipt available in your account.`, bodyAr: 'الإيصال متاح في حسابك.', link: `/account/receipts/${p.id}`,
      }, tx);
      await this.audit.log({ actorId: p.userId, action: 'payments.succeeded', entityType: 'Payment', entityId: p.id, metadata: { amountFils: p.amountFils, purpose: p.purpose } }, tx);
    });
  }

  private async activateEnrollment(enrollmentId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const e = await db.enrollment.update({ where: { id: enrollmentId }, data: { status: 'ACTIVE', activatedAt: new Date() }, include: { course: true } });
    await this.notifications.notify([e.userId], {
      type: 'enrollment', titleEn: `Course activated: ${e.course.titleEn}`, titleAr: `تم تفعيل المقرر: ${e.course.titleAr}`,
      bodyEn: 'Start learning from your dashboard.', bodyAr: 'ابدأ التعلّم من لوحة حسابك.', link: `/portal/courses/${e.course.slug}`,
    }, tx);
  }

  private summary(id: string) {
    return this.prisma.payment.findUniqueOrThrow({ where: { id }, select: { id: true, status: true, purpose: true, amountFils: true, currency: true, receiptNumber: true, paidAt: true, applicationId: true, enrollment: { select: { course: { select: { slug: true } } } } } });
  }

  async mine(user: AuthUser) {
    return { data: await this.prisma.payment.findMany({ where: { userId: user.id, status: { in: ['SUCCEEDED', 'PENDING', 'FAILED'] } }, orderBy: { createdAt: 'desc' }, select: { id: true, purpose: true, description: true, amountFils: true, vatFils: true, currency: true, status: true, receiptNumber: true, paidAt: true, createdAt: true } }) };
  }

  async receipt(user: AuthUser, id: string) {
    const p = await this.prisma.payment.findFirst({
      where: { id, status: 'SUCCEEDED', OR: [{ userId: user.id }, ...(user.permissions.includes('payments.read') ? [{}] : [])] },
      include: { user: { select: { fullName: true, email: true } }, application: { select: { reference: true } }, enrollment: { select: { course: { select: { code: true, titleEn: true, titleAr: true } } } } },
    });
    if (!p) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Receipt not found' });
    return {
      data: {
        id: p.id, receiptNumber: p.receiptNumber, paidAt: p.paidAt, description: p.description, amountFils: p.amountFils, vatFils: p.vatFils, currency: p.currency,
        provider: p.provider, providerRef: p.providerRef, payer: p.user, applicationReference: p.application?.reference ?? null, course: p.enrollment?.course ?? null,
      },
    };
  }

  async adminList(q: PageQuery & { status?: string; purpose?: string }) {
    const where = { ...(q.status ? { status: q.status as 'SUCCEEDED' } : {}), ...(q.purpose ? { purpose: q.purpose } : {}) };
    const [rows, total, totals] = await Promise.all([
      this.prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(q), include: { user: { select: { fullName: true, email: true } } } }),
      this.prisma.payment.count({ where }),
      this.prisma.payment.groupBy({ by: ['purpose'], where: { status: 'SUCCEEDED' }, _sum: { amountFils: true }, _count: { _all: true } }),
    ]);
    return { data: rows, meta: { ...pageMeta(q, total), totals: totals.map((t) => ({ purpose: t.purpose, count: t._count._all, amountFils: t._sum.amountFils ?? 0 })), provider: this.gateway?.name ?? 'none' } };
  }
}
