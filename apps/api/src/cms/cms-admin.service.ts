import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PageQuery, pageArgs, pageMeta } from '../common/pagination';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { CMS_RESOURCES, ResourceDef } from './cms.registry';

/** Minimal structural type for the Prisma model delegates used generically here. */
interface Delegate {
  findMany(args: unknown): Promise<Record<string, unknown>[]>;
  findUnique(args: unknown): Promise<Record<string, unknown> | null>;
  count(args: unknown): Promise<number>;
  create(args: unknown): Promise<Record<string, unknown>>;
  update(args: unknown): Promise<Record<string, unknown>>;
  delete(args: unknown): Promise<Record<string, unknown>>;
}

export interface ListQuery extends PageQuery { q?: string; status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' }

@Injectable()
export class CmsAdminService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  resource(name: string): ResourceDef {
    const def = CMS_RESOURCES[name];
    if (!def) throw new NotFoundException({ code: 'UNKNOWN_RESOURCE', message: `Unknown CMS resource "${name}"` });
    return def;
  }

  private delegate(def: ResourceDef): Delegate {
    return (this.prisma as unknown as Record<string, Delegate>)[def.model];
  }

  private baseWhere(def: ResourceDef) {
    return def.softDelete ? { deletedAt: null } : {};
  }

  async list(name: string, q: ListQuery) {
    const def = this.resource(name);
    const where: Record<string, unknown> = { ...this.baseWhere(def) };
    if (q.q) where.OR = def.search.map((f) => ({ [f]: { contains: q.q, mode: 'insensitive' } }));
    if (q.status && def.hasPublish) where.publishStatus = q.status;
    const d = this.delegate(def);
    const [rows, total] = await Promise.all([d.findMany({ where, orderBy: def.orderBy, ...pageArgs(q) }), d.count({ where })]);
    return { data: rows, meta: pageMeta(q, total) };
  }

  async get(name: string, id: string) {
    const def = this.resource(name);
    const row = await this.delegate(def).findUnique({ where: { id }, ...(this.includeFor(def)) });
    if (!row || (def.softDelete && row.deletedAt)) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Record not found' });
    return { data: row };
  }

  async create(name: string, body: unknown, actorId: string, canPublish: boolean) {
    const def = this.resource(name);
    const input = new ZodPipe(def.schema).transform(body);
    this.guardPublish(def, input, canPublish);
    const data = def.toData ? def.toData(input, 'create') : input;
    const row = await this.delegate(def).create({ data });
    await this.audit.log({ actorId, action: `cms.${name}.create`, entityType: def.model, entityId: String(row.id) });
    return { data: row };
  }

  async update(name: string, id: string, body: unknown, actorId: string, canPublish: boolean) {
    const def = this.resource(name);
    await this.get(name, id);
    const input = new ZodPipe(def.schema).transform(body);
    this.guardPublish(def, input, canPublish);
    const data = def.toData ? def.toData(input, 'update') : input;
    const row = await this.delegate(def).update({ where: { id }, data });
    await this.audit.log({ actorId, action: `cms.${name}.update`, entityType: def.model, entityId: id });
    return { data: row };
  }

  async setStatus(name: string, id: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED', actorId: string) {
    const def = this.resource(name);
    if (!def.hasPublish) throw new BadRequestException({ code: 'NOT_PUBLISHABLE', message: 'This resource has no publishing workflow' });
    await this.get(name, id);
    const row = await this.delegate(def).update({ where: { id }, data: { publishStatus: status } });
    await this.audit.log({ actorId, action: `cms.${name}.status`, entityType: def.model, entityId: id, metadata: { status } });
    return { data: row };
  }

  async remove(name: string, id: string, actorId: string) {
    const def = this.resource(name);
    await this.get(name, id);
    if (def.softDelete) {
      await this.delegate(def).update({ where: { id }, data: { deletedAt: new Date(), publishStatus: 'ARCHIVED' } });
    } else {
      await this.delegate(def).delete({ where: { id } });
    }
    await this.audit.log({ actorId, action: `cms.${name}.delete`, entityType: def.model, entityId: id, metadata: { soft: def.softDelete } });
  }

  /** Editors without cms.publish can only save drafts. */
  private guardPublish(def: ResourceDef, input: Record<string, unknown>, canPublish: boolean) {
    if (!def.hasPublish) return;
    if (!canPublish) input.publishStatus = 'DRAFT';
  }

  private includeFor(def: ResourceDef) {
    if (def.model === 'facultyMember') return { include: { departments: { select: { id: true, nameEn: true } } } };
    if (def.model === 'publication') return { include: { authors: { orderBy: { position: 'asc' } } } };
    return {};
  }
}
