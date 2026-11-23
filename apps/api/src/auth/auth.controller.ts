import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { z } from 'zod';
import { AuthUser, clientIp, CurrentUser, Public } from '../common/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { env } from '../config/env';
import { ForgotSchema, LoginSchema, RegisterSchema, ResetSchema } from './auth.schemas';
import { AuthService, IssuedTokens } from './auth.service';

export const REFRESH_COOKIE = 'aau_rt';

function cookieOptions(expires?: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: env().NODE_ENV === 'production' || env().NODE_ENV === 'staging',
    sameSite: 'strict',
    path: '/api/v1/auth',
    ...(expires ? { expires } : {}),
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private respond(res: Response, t: IssuedTokens, persistent: boolean) {
    // Session cookie (no expiry) unless "remember me"; server-side expiry is enforced regardless.
    res.cookie(REFRESH_COOKIE, t.refreshToken, cookieOptions(persistent ? t.refreshExpiresAt : undefined));
    return { data: { accessToken: t.accessToken, expiresIn: t.expiresIn, user: t.user } };
  }

  private client(req: Request) {
    return { ip: clientIp(req), userAgent: req.headers['user-agent'] };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(@Body(new ZodPipe(RegisterSchema)) body: z.infer<typeof RegisterSchema>, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.register(body, this.client(req)), false);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(@Body(new ZodPipe(LoginSchema)) body: z.infer<typeof LoginSchema>, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.login(body, this.client(req)), body.rememberMe);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(200)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    // No session cookie at all is a normal anonymous visit, not an error.
    if (!raw) {
      res.status(204);
      return;
    }
    try {
      return this.respond(res, await this.auth.refresh(raw, this.client(req)), true);
    } catch (e) {
      res.clearCookie(REFRESH_COOKIE, cookieOptions());
      throw e;
    }
  }

  @Public()
  @HttpCode(204)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE] as string | undefined);
    res.clearCookie(REFRESH_COOKIE, cookieOptions());
  }

  @ApiBearerAuth()
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return { data: await this.auth.loadAuthUser(user.id) };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(202)
  @Post('forgot-password')
  async forgot(@Body(new ZodPipe(ForgotSchema)) body: z.infer<typeof ForgotSchema>, @Req() req: Request) {
    await this.auth.requestPasswordReset(body.email, this.client(req));
    return { data: { message: 'If an account exists for this e-mail, a reset link has been sent.' } };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(204)
  @Post('reset-password')
  async reset(@Body(new ZodPipe(ResetSchema)) body: z.infer<typeof ResetSchema>, @Req() req: Request) {
    await this.auth.resetPassword(body.token, body.password, this.client(req));
  }
}
