import { Body, Controller, Get, HttpCode, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { z } from 'zod';
import { clientIp, Public, RequirePermissions } from '../common/decorators';
import { PageQuery, pageArgs, pageMeta } from '../common/pagination';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';

const ContactBody = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  phone: z.string().trim().max(40).regex(/^[+\d\s()-]*$/, 'Invalid phone number').optional(),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(5000),
  locale: z.enum(['en', 'ar']).default('en'),
  website: z.string().max(0, 'Spam detected').optional(), // honeypot
});
const NewsletterBody = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()), locale: z.enum(['en', 'ar']).default('en') });

@ApiTags('engagement')
@Controller()
export class EngagementController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('public/contact')
  @HttpCode(201)
  async contact(@Body(new ZodPipe(ContactBody)) body: z.infer<typeof ContactBody>, @Req() req: Request) {
    const { website: _hp, ...data } = body;
    const msg = await this.prisma.contactMessage.create({ data: { ...data, ip: clientIp(req) }, select: { id: true, createdAt: true } });
    return { data: msg };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('public/newsletter')
  @HttpCode(201)
  async subscribe(@Body(new ZodPipe(NewsletterBody)) body: z.infer<typeof NewsletterBody>) {
    // Idempotent: re-subscribing an existing address succeeds without revealing prior state.
    await this.prisma.newsletterSubscriber.upsert({
      where: { email: body.email },
      create: body,
      update: { unsubscribedAt: null, locale: body.locale },
    });
    return { data: { subscribed: true } };
  }

  @ApiBearerAuth()
  @RequirePermissions('engagement.read')
  @Get('admin/contact-messages')
  async messages(@Query(new ZodPipe(PageQuery)) q: PageQuery) {
    const [rows, total] = await Promise.all([
      this.prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, ...pageArgs(q) }),
      this.prisma.contactMessage.count(),
    ]);
    return { data: rows, meta: pageMeta(q, total) };
  }

  @ApiBearerAuth()
  @RequirePermissions('engagement.read')
  @Get('admin/newsletter-subscribers')
  async subscribers(@Query(new ZodPipe(PageQuery)) q: PageQuery) {
    const where = { unsubscribedAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(q) }),
      this.prisma.newsletterSubscriber.count({ where }),
    ]);
    return { data: rows, meta: pageMeta(q, total) };
  }
}
