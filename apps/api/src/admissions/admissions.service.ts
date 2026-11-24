import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { getRandomValues } from 'node:crypto';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/decorators';
import { PageQuery, pageArgs, pageMeta } from '../common/pagination';
import { ZodPipe } from '../common/zod.pipe';
import { env } from '../config/env';
import type { Prisma } from '../generated/prisma/client';
import type { ApplicationStatus } from '../generated/prisma/enums';
import { applicationFeeFils } from '../payments/fees';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as S from './admissions.schemas';
import { evaluateEligibility } from './eligibility';
import { applicationReference, canTransition, DECISION_STATUSES } from './workflow';

const STEP_SCHEMAS = { 1: S.PersonalStep, 2: S.ContactStep, 3: S.AcademicStep, 4: S.ProgramStep } as const;
const MAGIC: Record<string, (b: Buffer) => boolean> = {
  'application/pdf': (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
};

@Injectable()
export class AdmissionsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly storage: StorageService) {}

  private visibleProgram() {
    // Same rule as the public catalogue: published + client-confirmed (demo records only in demo mode).
    return {
      publishStatus: 'PUBLISHED' as const, deletedAt: null,
      AND: [env().SHOW_DEMO_CONTENT ? { OR: [{ confirmation: 'CONFIRMED' as const, isDemo: false }, { isDemo: true }] } : { confirmation: 'CONFIRMED' as const, isDemo: false }],
    };
  }

  async config() {
    const [status, programs] = await Promise.all([
      this.prisma.siteSetting.findUnique({ where: { key: 'admissions.status' } }),
      this.prisma.program.findMany({
        where: { ...this.visibleProgram(), eligibilityRules: { some: { isActive: true } } },
        select: { slug: true, nameEn: true, nameAr: true, degreeLevel: true, eligibilityRules: { where: { isActive: true }, select: { qualification: true, confirmation: true } } },
        orderBy: { nameEn: 'asc' },
      }),
    ]);
    const open = status?.valueEn === 'OPEN' && status.confirmation === 'CONFIRMED';
    return { data: { open, statusConfirmation: status?.confirmation ?? 'CLIENT_CONFIRMATION_REQUIRED', programs, qualifications: S.QUALIFICATIONS } };
  }

  private async assertOpen() {
    const { data } = await this.config();
    if (!data.open) throw new ConflictException({ code: 'ADMISSIONS_CLOSED', message: 'Online applications are not open yet. Admission details will be announced once confirmed.' });
  }

  async checkEligibility(body: z.infer<typeof S.EligibilityBody>) {
    const program = await this.prisma.program.findFirst({ where: { slug: body.programSlug, ...this.visibleProgram() } });
    if (!program) throw new NotFoundException({ code: 'PROGRAM_NOT_FOUND', message: 'Programme not found' });
    const rule = await this.prisma.eligibilityRule.findUnique({ where: { programId_qualification: { programId: program.id, qualification: body.qualification } } });
    if (!rule || !rule.isActive) {
      return { data: { status: 'NO_RULE' as const, eligible: null, unmet: [], confirmation: 'CLIENT_CONFIRMATION_REQUIRED' } };
    }
    const result = evaluateEligibility(
      { minOverallPercent: rule.minOverallPercent ? Number(rule.minOverallPercent) : null, subjectMinimums: (rule.subjectMinimums as { subject: string; minPercent: number }[] | null) ?? [] },
      { overallPercent: body.overallPercent, subjects: body.subjects },
    );
    return {
      data: {
        status: result.eligible ? ('ELIGIBLE' as const) : ('NOT_ELIGIBLE' as const), ...result,
        confirmation: rule.confirmation,
        englishRequirement: { en: rule.englishRequirementEn, ar: rule.englishRequirementAr },
        notes: { en: rule.notesEn, ar: rule.notesAr },
      },
    };
  }

  // ── Applicant ──
  async mine(user: AuthUser) {
    return {
      data: await this.prisma.application.findMany({
        where: { applicantId: user.id, deletedAt: null }, orderBy: { createdAt: 'desc' },
        include: {
          program: { select: { slug: true, nameEn: true, nameAr: true } },
          documents: { select: { id: true, docType: true, originalName: true, sizeBytes: true, status: true, createdAt: true } },
          payments: { select: { id: true, status: true, amountFils: true, currency: true, receiptNumber: true, paidAt: true }, orderBy: { createdAt: 'desc' } },
        },
      }),
      meta: { applicationFeeFils: await applicationFeeFils(this.prisma) },
    };
  }

  async createDraft(user: AuthUser) {
    await this.assertOpen();
    const existing = await this.prisma.application.findFirst({ where: { applicantId: user.id, status: { in: ['DRAFT', 'RETURNED_FOR_CORRECTION'] }, deletedAt: null } });
    if (existing) return { data: existing };
    const reference = applicationReference(new Date().getFullYear(), getRandomValues(new Uint8Array(8)));
    const app = await this.prisma.application.create({
      data: { reference, applicantId: user.id, statusHistory: { create: { toStatus: 'DRAFT', actorId: user.id } } },
    });
    await this.audit.log({ actorId: user.id, action: 'admissions.application.create', entityType: 'Application', entityId: app.id });
    return { data: app };
  }

  private async ownEditable(user: AuthUser, id: string) {
    const app = await this.prisma.application.findFirst({ where: { id, applicantId: user.id, deletedAt: null } });
    if (!app) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Application not found' });
    if (!['DRAFT', 'RETURNED_FOR_CORRECTION'].includes(app.status)) throw new ConflictException({ code: 'NOT_EDITABLE', message: 'This application can no longer be edited.' });
    return app;
  }

  async saveStep(user: AuthUser, id: string, step: number, body: unknown) {
    const app = await this.ownEditable(user, id);
    const schema = STEP_SCHEMAS[step as keyof typeof STEP_SCHEMAS];
    if (!schema) throw new BadRequestException({ code: 'INVALID_STEP', message: 'Invalid step' });
    const data = new ZodPipe(schema).transform(body) as Record<string, unknown>;
    const nextStep = Math.max(app.currentStep, step + 1);
    if (step === 4) {
      const program = await this.prisma.program.findFirst({ where: { slug: String(data.programSlug), ...this.visibleProgram() } });
      if (!program) throw new BadRequestException({ code: 'PROGRAM_NOT_FOUND', message: 'Select a valid programme' });
      return { data: await this.prisma.application.update({ where: { id }, data: { programId: program.id, currentStep: nextStep } }) };
    }
    const field = ({ 1: 'personal', 2: 'contact', 3: 'academic' } as const)[step as 1 | 2 | 3];
    return { data: await this.prisma.application.update({ where: { id }, data: { [field]: data, currentStep: nextStep } }) };
  }

  async uploadDocument(user: AuthUser, id: string, docType: string, file?: Express.Multer.File) {
    const app = await this.ownEditable(user, id);
    const type = z.enum(S.DOC_TYPES).safeParse(docType);
    if (!type.success) throw new BadRequestException({ code: 'INVALID_DOC_TYPE', message: 'Invalid document type' });
    if (!file) throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'Choose a file to upload' });
    if (file.size > S.MAX_DOC_BYTES) throw new BadRequestException({ code: 'FILE_TOO_LARGE', message: 'Files must be 5 MB or smaller' });
    const sniff = MAGIC[file.mimetype];
    if (!sniff || !sniff(file.buffer)) throw new BadRequestException({ code: 'FILE_TYPE', message: 'Only PDF, JPEG or PNG files are accepted' });
    const count = await this.prisma.applicationDocument.count({ where: { applicationId: app.id } });
    if (count >= 15) throw new BadRequestException({ code: 'TOO_MANY_FILES', message: 'Maximum of 15 documents per application' });

    const { key, sha256 } = await this.storage.put(`applications/${app.id}`, file.buffer, file.mimetype);
    const doc = await this.prisma.applicationDocument.create({
      data: { applicationId: app.id, docType: type.data, originalName: file.originalname.slice(0, 200), storageKey: key, mimeType: file.mimetype, sizeBytes: file.size, sha256 },
      select: { id: true, docType: true, originalName: true, sizeBytes: true, status: true, createdAt: true },
    });
    await this.audit.log({ actorId: user.id, action: 'admissions.document.upload', entityType: 'ApplicationDocument', entityId: doc.id });
    return { data: doc };
  }

  async deleteDocument(user: AuthUser, id: string, docId: string) {
    const app = await this.ownEditable(user, id);
    const doc = await this.prisma.applicationDocument.findFirst({ where: { id: docId, applicationId: app.id } });
    if (!doc) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Document not found' });
    await this.prisma.applicationDocument.delete({ where: { id: doc.id } });
    await this.storage.remove(doc.storageKey);
  }

  /** Validates that a draft is complete and admissions are open. Used before payment and before submission. */
  async assertSubmittable(user: AuthUser, id: string) {
    await this.assertOpen();
    const app = await this.ownEditable(user, id);
    const missing: string[] = [];
    for (const [step, sc] of Object.entries({ personal: S.PersonalStep, contact: S.ContactStep, academic: S.AcademicStep })) {
      if (!sc.safeParse(app[step as 'personal']).success) missing.push(step);
    }
    if (!app.programId) missing.push('program');
    const docs = await this.prisma.applicationDocument.count({ where: { applicationId: app.id } });
    if (docs === 0) missing.push('documents');
    if (missing.length) throw new BadRequestException({ code: 'INCOMPLETE', message: 'Complete all steps before submitting', details: { missing } });
    return app;
  }

  /** Final state change; called directly for free applications or by the payments module after a verified payment. */
  async markSubmitted(applicationId: string, actorId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const app = await db.application.findUniqueOrThrow({ where: { id: applicationId } });
    if (!['DRAFT', 'RETURNED_FOR_CORRECTION'].includes(app.status)) return app; // idempotent
    return db.application.update({
      where: { id: applicationId },
      data: { status: 'SUBMITTED', submittedAt: new Date(), currentStep: 8, statusHistory: { create: { fromStatus: app.status, toStatus: 'SUBMITTED', actorId } } },
    });
  }

  async submit(user: AuthUser, id: string) {
    const app = await this.assertSubmittable(user, id);
    const fee = await applicationFeeFils(this.prisma);
    if (fee === null) throw new ConflictException({ code: 'FEE_NOT_CONFIGURED', message: 'The application fee has not been confirmed yet. Please try again later.' });
    if (fee > 0) {
      const paid = await this.prisma.payment.count({ where: { applicationId: app.id, status: 'SUCCEEDED' } });
      if (!paid) throw new HttpException({ code: 'PAYMENT_REQUIRED', message: 'Pay the application fee to submit your application.', details: { amountFils: fee } }, HttpStatus.PAYMENT_REQUIRED);
    }
    const updated = await this.markSubmitted(app.id, user.id);
    await this.audit.log({ actorId: user.id, action: 'admissions.application.submit', entityType: 'Application', entityId: id });
    return { data: updated };
  }

  /** Requires reference AND the applicant's e-mail; returns status data only (no personal details). */
  async lookupStatus(body: z.infer<typeof S.StatusLookup>) {
    const app = await this.prisma.application.findFirst({
      where: { reference: body.reference, applicant: { email: body.email }, deletedAt: null },
      include: {
        program: { select: { nameEn: true, nameAr: true } },
        statusHistory: { orderBy: { createdAt: 'asc' }, select: { toStatus: true, createdAt: true } },
        documents: { select: { docType: true, status: true } },
      },
    });
    if (!app) throw new NotFoundException({ code: 'NOT_FOUND', message: 'No application matches this reference and e-mail.' });
    return {
      data: {
        reference: app.reference, status: app.status, submittedAt: app.submittedAt, program: app.program,
        timeline: app.statusHistory, pendingDocuments: app.documents.filter((d) => d.status === 'REJECTED').map((d) => d.docType),
      },
    };
  }

  // ── Admin ──
  async adminList(q: PageQuery & { status?: ApplicationStatus; q?: string }) {
    const where = {
      deletedAt: null, status: q.status ?? { not: 'DRAFT' as const },
      ...(q.q ? { OR: [{ reference: { contains: q.q.toUpperCase() } }, { applicant: { email: { contains: q.q, mode: 'insensitive' as const } } }, { applicant: { fullName: { contains: q.q, mode: 'insensitive' as const } } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.application.findMany({
        where, orderBy: { submittedAt: 'desc' }, ...pageArgs(q),
        select: { id: true, reference: true, status: true, submittedAt: true, applicant: { select: { fullName: true, email: true } }, program: { select: { nameEn: true } } },
      }),
      this.prisma.application.count({ where }),
    ]);
    return { data: rows, meta: pageMeta(q, total) };
  }

  async adminGet(id: string, actor: AuthUser) {
    const app = await this.prisma.application.findFirst({
      where: { id, deletedAt: null },
      include: {
        applicant: { select: { id: true, fullName: true, email: true } }, program: { select: { slug: true, nameEn: true } },
        documents: { omit: { storageKey: true } }, statusHistory: { orderBy: { createdAt: 'asc' } }, payments: true,
      },
    });
    if (!app) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Application not found' });
    await this.audit.log({ actorId: actor.id, action: 'admissions.application.view', entityType: 'Application', entityId: id });
    return { data: app };
  }

  async adminDocument(appId: string, docId: string, actor: AuthUser) {
    const doc = await this.prisma.applicationDocument.findFirst({ where: { id: docId, applicationId: appId } });
    if (!doc) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Document not found' });
    await this.audit.log({ actorId: actor.id, action: 'admissions.document.download', entityType: 'ApplicationDocument', entityId: docId });
    return { doc, buffer: await this.storage.get(doc.storageKey) };
  }

  async transition(id: string, to: ApplicationStatus, note: string | undefined, actor: AuthUser) {
    if (DECISION_STATUSES.includes(to) && !actor.permissions.includes('admissions.decide')) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Only authorised officers can approve or reject applications.' });
    }
    return this.prisma.$transaction(async (tx) => {
      const app = await tx.application.findFirst({ where: { id, deletedAt: null } });
      if (!app) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Application not found' });
      if (!canTransition(app.status, to)) throw new ConflictException({ code: 'INVALID_TRANSITION', message: `Cannot move from ${app.status} to ${to}` });
      const updated = await tx.application.update({
        where: { id },
        data: {
          status: to, ...(DECISION_STATUSES.includes(to) ? { decidedAt: new Date(), decisionNote: note ?? null } : {}),
          statusHistory: { create: { fromStatus: app.status, toStatus: to, actorId: actor.id, note } },
        },
      });
      await this.audit.log({ actorId: actor.id, action: 'admissions.application.transition', entityType: 'Application', entityId: id, metadata: { from: app.status, to } }, tx);
      return { data: updated };
    });
  }
}
