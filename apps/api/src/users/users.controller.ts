import { BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { hashPassword, PasswordSchema } from '../auth/password';
import { AuthUser, CurrentUser, RequirePermissions } from '../common/decorators';
import { PageQuery, pageArgs, pageMeta } from '../common/pagination';
import { PERMISSIONS_CATALOGUE } from '../common/permissions';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';

const UserQuery = PageQuery.extend({ q: z.string().trim().max(100).optional(), role: z.string().max(40).optional() });
const CreateUser = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: PasswordSchema,
  roleKeys: z.array(z.string().max(40)).min(1).max(10),
});
const UpdateUser = z.object({
  fullName: z.string().trim().min(2).max(150),
  isActive: z.boolean(),
  roleKeys: z.array(z.string().max(40)).min(1).max(10),
});
const RolePerms = z.object({ permissionKeys: z.array(z.enum(Object.keys(PERMISSIONS_CATALOGUE) as [string, ...string[]])).max(100) });

const userSelect = {
  id: true, email: true, fullName: true, isActive: true, lastLoginAt: true, createdAt: true, mfaEnabled: true,
  roles: { select: { role: { select: { key: true, nameEn: true, nameAr: true } } } },
} as const;

@ApiTags('admin-users')
@ApiBearerAuth()
@Controller('admin')
export class UsersController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Get('users')
  @RequirePermissions('users.read')
  async list(@Query(new ZodPipe(UserQuery)) q: z.infer<typeof UserQuery>) {
    const where = {
      deletedAt: null,
      ...(q.q ? { OR: [{ email: { contains: q.q, mode: 'insensitive' as const } }, { fullName: { contains: q.q, mode: 'insensitive' as const } }] } : {}),
      ...(q.role ? { roles: { some: { role: { key: q.role } } } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({ where, select: userSelect, orderBy: { createdAt: 'desc' }, ...pageArgs(q) }),
      this.prisma.user.count({ where }),
    ]);
    return { data: rows, meta: pageMeta(q, total) };
  }

  @Get('users/:id')
  @RequirePermissions('users.read')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const u = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, select: userSelect });
    if (!u) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });
    return { data: u };
  }

  @Post('users')
  @RequirePermissions('users.write', 'roles.write')
  async create(@Body(new ZodPipe(CreateUser)) body: z.infer<typeof CreateUser>, @CurrentUser() actor: AuthUser) {
    const roles = await this.resolveRoles(body.roleKeys, actor);
    const user = await this.prisma.user.create({
      data: {
        email: body.email, fullName: body.fullName, passwordHash: await hashPassword(body.password), emailVerified: true,
        roles: { create: roles.map((r) => ({ roleId: r.id })) },
      },
      select: userSelect,
    });
    await this.audit.log({ actorId: actor.id, action: 'users.create', entityType: 'User', entityId: user.id, metadata: { roles: body.roleKeys } });
    return { data: user };
  }

  @Put('users/:id')
  @RequirePermissions('users.write', 'roles.write')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(UpdateUser)) body: z.infer<typeof UpdateUser>, @CurrentUser() actor: AuthUser) {
    if (id === actor.id && (!body.isActive || !body.roleKeys.includes('SUPER_ADMIN')) && actor.roles.includes('SUPER_ADMIN')) {
      throw new BadRequestException({ code: 'SELF_LOCKOUT', message: 'You cannot deactivate yourself or remove your own Super Admin role.' });
    }
    await this.get(id);
    const roles = await this.resolveRoles(body.roleKeys, actor);
    const user = await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      const u = await tx.user.update({
        where: { id },
        data: { fullName: body.fullName, isActive: body.isActive, roles: { create: roles.map((r) => ({ roleId: r.id })) } },
        select: userSelect,
      });
      if (!body.isActive) await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      return u;
    });
    await this.audit.log({ actorId: actor.id, action: 'users.update', entityType: 'User', entityId: id, metadata: { roles: body.roleKeys, isActive: body.isActive } });
    return { data: user };
  }

  @Get('roles')
  @RequirePermissions('roles.read')
  async roles() {
    const roles = await this.prisma.role.findMany({
      orderBy: { nameEn: 'asc' },
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
    });
    return {
      data: roles.map((r) => ({ id: r.id, key: r.key, nameEn: r.nameEn, nameAr: r.nameAr, isSystem: r.isSystem, userCount: r._count.users, permissions: r.permissions.map((p) => p.permission.key).sort() })),
      meta: { catalogue: PERMISSIONS_CATALOGUE },
    };
  }

  @Put('roles/:key/permissions')
  @RequirePermissions('roles.write')
  async setRolePermissions(@Param('key') key: string, @Body(new ZodPipe(RolePerms)) body: z.infer<typeof RolePerms>, @CurrentUser() actor: AuthUser) {
    if (key === 'SUPER_ADMIN') throw new BadRequestException({ code: 'PROTECTED_ROLE', message: 'Super Admin permissions cannot be changed.' });
    const role = await this.prisma.role.findUnique({ where: { key } });
    if (!role) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Role not found' });
    const perms = await this.prisma.permission.findMany({ where: { key: { in: body.permissionKeys } } });
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      this.prisma.rolePermission.createMany({ data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })) }),
    ]);
    await this.audit.log({ actorId: actor.id, action: 'roles.permissions.update', entityType: 'Role', entityId: role.id, metadata: { key, permissions: body.permissionKeys } });
    return { data: { key, permissions: body.permissionKeys.sort() } };
  }

  /** Only Super Admins may grant SUPER_ADMIN. */
  private async resolveRoles(keys: string[], actor: AuthUser) {
    if (keys.includes('SUPER_ADMIN') && !actor.roles.includes('SUPER_ADMIN')) {
      throw new BadRequestException({ code: 'ESCALATION_DENIED', message: 'Only a Super Admin can grant the Super Admin role.' });
    }
    const roles = await this.prisma.role.findMany({ where: { key: { in: keys } } });
    if (roles.length !== new Set(keys).size) throw new BadRequestException({ code: 'UNKNOWN_ROLE', message: 'One or more roles do not exist' });
    return roles;
  }
}
