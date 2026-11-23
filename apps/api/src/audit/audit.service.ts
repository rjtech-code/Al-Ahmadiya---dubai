import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../generated/prisma/client';

export interface AuditEntry {
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');
  constructor(private readonly prisma: PrismaService) {}

  /** Writes an audit record. Audit failures are logged but never break the business action. */
  async log(entry: AuditEntry, tx?: Prisma.TransactionClient) {
    try {
      await (tx ?? this.prisma).auditLog.create({ data: { ...entry, actorId: entry.actorId ?? null } });
    } catch (e) {
      this.logger.error(`Failed to write audit entry ${entry.action}: ${(e as Error).message}`);
    }
  }
}
