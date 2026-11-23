import { Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthUser, CurrentUser, Public, RequirePermissions } from '../common/decorators';
import { PageQuery } from '../common/pagination';
import { ZodPipe } from '../common/zod.pipe';
import { PaymentsService } from './payments.service';

const Verify = z.object({ orderId: z.string().min(5).max(100), paymentId: z.string().min(5).max(100), signature: z.string().min(10).max(200) });
const AdminQ = PageQuery.extend({ status: z.enum(['INITIATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED']).optional(), purpose: z.enum(['application-fee', 'course']).optional() });

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  @Public()
  @Get('public/payments/config')
  config() {
    return this.svc.config();
  }

  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('payments/application/:id')
  application(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.svc.startApplicationFee(user, id);
  }

  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('payments/course/:slug')
  course(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.svc.startCoursePurchase(user, slug);
  }

  @ApiBearerAuth()
  @HttpCode(200)
  @Post('payments/verify')
  verify(@Body(new ZodPipe(Verify)) body: z.infer<typeof Verify>, @CurrentUser() user: AuthUser) {
    return this.svc.verify(user, body);
  }

  @ApiBearerAuth()
  @HttpCode(200)
  @Post('payments/test/complete')
  testComplete(@Body(new ZodPipe(z.object({ orderId: z.string().startsWith('test_order_') }))) body: { orderId: string }, @CurrentUser() user: AuthUser) {
    return this.svc.testComplete(user, body.orderId);
  }

  @Public()
  @SkipThrottle()
  @HttpCode(200)
  @Post('payments/razorpay/webhook')
  webhook(@Req() req: RawBodyRequest<Request>, @Headers('x-razorpay-signature') sig?: string) {
    return this.svc.webhook(req.rawBody, sig);
  }

  @ApiBearerAuth()
  @Get('me/payments')
  mine(@CurrentUser() user: AuthUser) {
    return this.svc.mine(user);
  }

  @ApiBearerAuth()
  @Get('me/payments/:id/receipt')
  receipt(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.svc.receipt(user, id);
  }

  @ApiBearerAuth()
  @RequirePermissions('payments.read')
  @Get('admin/payments')
  adminList(@Query(new ZodPipe(AdminQ)) q: z.infer<typeof AdminQ>) {
    return this.svc.adminList(q);
  }
}
