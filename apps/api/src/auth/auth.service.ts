import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { AuthUser } from '../common/decorators';
import { ROLE_DEFINITIONS, STAFF_ROLES } from '../common/permissions';
import { env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { dummyVerify, hashPassword, verifyPassword } from './password';
import { LoginSchema, RegisterSchema } from './auth.schemas';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

export interface ClientInfo { ip?: string; userAgent?: string }
export interface IssuedTokens { accessToken: string; expiresIn: number; refreshToken: string; refreshExpiresAt: Date; user: PublicUser }
export interface PublicUser { id: string; email: string; fullName: string; locale: string; roles: string[]; permissions: string[] }

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async register(input: z.infer<typeof RegisterSchema>, client: ClientInfo) {
    // Accounts are always available (needed to buy online courses). Submitting an
    // application is separately gated by the admissions status.
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      // Do not reveal whether the e-mail is registered beyond what is necessary for UX.
      throw new ForbiddenException({ code: 'EMAIL_IN_USE', message: 'An account with this e-mail already exists. Please sign in.' });
    }
    const passwordHash = await hashPassword(input.password);
    const user = await this.prisma.$transaction(async (tx) => {
      // Keep public registration self-healing when the initial role seed has not
      // been run (for example, on a fresh production database).
      const applicantRole = ROLE_DEFINITIONS.find((role) => role.key === 'APPLICANT');
      if (!applicantRole) throw new Error('APPLICANT role definition is missing from the permission catalogue');
      const role = await tx.role.upsert({
        where: { key: 'APPLICANT' },
        update: {},
        create: {
          key: applicantRole.key,
          nameEn: applicantRole.nameEn,
          nameAr: applicantRole.nameAr,
          isSystem: true,
        },
      });
      const u = await tx.user.create({
        data: { email: input.email, fullName: input.fullName, locale: input.locale, passwordHash, roles: { create: { roleId: role.id } } },
      });
      return u;
    });
    return this.issueTokens(user.id, client, randomUUID());
  }

  async login(input: z.infer<typeof LoginSchema>, client: ClientInfo): Promise<IssuedTokens> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    const invalid = () => new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Incorrect e-mail or password' });

    if (!user || user.deletedAt) {
      await dummyVerify(input.password);
      if (input.audience === 'admin') await this.recordStaffLogin(null, input.email, false, 'UNKNOWN_ACCOUNT', client);
      throw invalid();
    }
    const staff = (await this.loadAuthUser(user.id)).roles.some((r) => STAFF_ROLES.includes(r));
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      if (staff) await this.recordStaffLogin(user.id, user.email, false, 'ACCOUNT_LOCKED', client);
      throw new UnauthorizedException({ code: 'ACCOUNT_LOCKED', message: `Too many failed attempts. Try again after ${LOCK_MINUTES} minutes.` });
    }
    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok) {
      const failed = user.failedLogins + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: failed >= MAX_FAILED ? 0 : failed, lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null },
      });
      if (staff) await this.recordStaffLogin(user.id, user.email, false, 'INVALID_CREDENTIALS', client);
      throw invalid();
    }
    if (!user.isActive) throw new ForbiddenException({ code: 'ACCOUNT_DISABLED', message: 'This account is disabled. Contact the administrator.' });

    if (input.audience === 'admin' && !staff) {
      throw new ForbiddenException({ code: 'NOT_STAFF', message: 'This account does not have access to the administration panel.' });
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
    if (staff) await this.recordStaffLogin(user.id, user.email, true, null, client);
    return this.issueTokens(user.id, client, randomUUID());
  }

  /** Rotates the refresh token. Reuse of a rotated/revoked token revokes the whole session family. */
  async refresh(rawToken: string | undefined, client: ClientInfo): Promise<IssuedTokens> {
    const unauthorized = () => new UnauthorizedException({ code: 'SESSION_EXPIRED', message: 'Your session has expired. Please sign in again.' });
    if (!rawToken) throw unauthorized();
    const session = await this.prisma.session.findUnique({ where: { tokenHash: sha256(rawToken) } });
    if (!session) throw unauthorized();
    if (session.revokedAt || session.replacedBy) {
      await this.prisma.session.updateMany({ where: { familyId: session.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
      this.logger.warn(`Refresh token reuse detected for user ${session.userId}; session family revoked`);
      throw unauthorized();
    }
    if (session.expiresAt < new Date()) throw unauthorized();
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !user.isActive || user.deletedAt) throw unauthorized();

    const tokens = await this.issueTokens(session.userId, client, session.familyId);
    const newSession = await this.prisma.session.findUniqueOrThrow({ where: { tokenHash: sha256(tokens.refreshToken) } });
    await this.prisma.session.update({ where: { id: session.id }, data: { replacedBy: newSession.id, revokedAt: new Date() } });
    return tokens;
  }

  async logout(rawToken: string | undefined, actorId?: string) {
    if (!rawToken) return;
    const session = await this.prisma.session.findUnique({ where: { tokenHash: sha256(rawToken) } });
    if (session) {
      await this.prisma.session.updateMany({ where: { familyId: session.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
      void actorId;
    }
  }

  async requestPasswordReset(email: string, client: ClientInfo) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return; // identical response regardless (no account enumeration)
    const token = randomBytes(32).toString('base64url');
    await this.prisma.passwordReset.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 30 * 60_000) } });
    void client;
    // E-mail delivery provider (Microsoft 365 / Google Workspace) is pending — see INTEGRATIONS.md.
    if (env().NODE_ENV === 'development') {
      this.logger.warn(`[DEV ONLY] Password reset link: ${env().WEB_BASE_URL}/en/login/reset?token=${token}`);
    }
  }

  async resetPassword(token: string, password: string, client: ClientInfo) {
    const rec = await this.prisma.passwordReset.findUnique({ where: { tokenHash: sha256(token) } });
    if (!rec || rec.usedAt || rec.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'RESET_TOKEN_INVALID', message: 'This reset link is invalid or has expired.' });
    }
    const passwordHash = await hashPassword(password);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: rec.userId }, data: { passwordHash, failedLogins: 0, lockedUntil: null } }),
      this.prisma.passwordReset.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
      this.prisma.session.updateMany({ where: { userId: rec.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    void client;
  }

  /** Staff accounts only — applicants and students are never recorded. Purged after 12 months. */
  private async recordStaffLogin(userId: string | null, email: string, success: boolean, reason: string | null, client: ClientInfo) {
    await this.prisma.staffLogin.create({ data: { userId, email, success, reason, ip: client.ip, userAgent: client.userAgent?.slice(0, 300) } }).catch((e: Error) => this.logger.error(`staff login record failed: ${e.message}`));
  }

  async loadAuthUser(userId: string): Promise<AuthUser & { fullName: string; locale: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });
    const roles = user.roles.map((r) => r.role.key);
    const permissions = [...new Set(user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.key)))].sort();
    return { id: user.id, email: user.email, fullName: user.fullName, locale: user.locale, roles, permissions };
  }

  private async issueTokens(userId: string, client: ClientInfo, familyId: string): Promise<IssuedTokens> {
    const u = await this.loadAuthUser(userId);
    const expiresIn = env().JWT_ACCESS_TTL_SECONDS;
    const accessToken = await this.jwt.signAsync(
      { sub: u.id, email: u.email, roles: u.roles, perms: u.permissions },
      { secret: env().JWT_ACCESS_SECRET, expiresIn, algorithm: 'HS256' },
    );
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshExpiresAt = new Date(Date.now() + env().REFRESH_TTL_DAYS * 86_400_000);
    await this.prisma.session.create({
      data: { userId, familyId, tokenHash: sha256(refreshToken), expiresAt: refreshExpiresAt, ip: client.ip, userAgent: client.userAgent?.slice(0, 300) },
    });
    return { accessToken, expiresIn, refreshToken, refreshExpiresAt, user: u };
  }
}
