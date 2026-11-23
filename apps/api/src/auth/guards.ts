import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthedRequest, IS_PUBLIC, PERMISSIONS } from '../common/decorators';
import { env } from '../config/env';

interface AccessClaims { sub: string; email: string; roles: string[]; perms: string[] }

/** Global guard: verifies the bearer access token unless the route is @Public(). On public routes a valid token is still attached. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true; // websockets authenticate in the gateway handshake
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (token) {
      try {
        const c = await this.jwt.verifyAsync<AccessClaims>(token, { secret: env().JWT_ACCESS_SECRET, algorithms: ['HS256'] });
        req.user = { id: c.sub, email: c.email, roles: c.roles ?? [], permissions: c.perms ?? [] };
      } catch {
        if (!isPublic) throw new UnauthorizedException({ code: 'TOKEN_INVALID', message: 'Access token is invalid or expired' });
      }
    }
    if (isPublic) return true;
    if (!req.user) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Authentication required' });
    return true;
  }
}

/** Global guard: enforces @RequirePermissions(...). */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    if (ctx.getType() !== 'http') return true;
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS, [ctx.getHandler(), ctx.getClass()]);
    if (!required?.length) return true;
    const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
    if (!user) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Authentication required' });
    const missing = required.filter((p) => !user.permissions.includes(p));
    if (missing.length) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You do not have permission to perform this action', details: { missing } });
    return true;
  }
}
