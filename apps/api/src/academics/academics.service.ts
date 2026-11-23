import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { evaluateEligibility } from '../admissions/eligibility';
import { QUALIFICATIONS } from '../admissions/admissions.schemas';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/decorators';
import { env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

export const RulesInput = z.object({
  rules: z.array(z.object({
    qualification: z.enum(QUALIFICATIONS),
    minOverallPercent: z.coerce.number().min(0).max(100).nullable(),
    subjectMinimums: z.array(z.object({ subject: z.string().trim().min(1).max(80), minPercent: z.coerce.number().min(0).max(100) })).max(20).default([]),
    englishRequirementEn: z.string().trim().max(300).nullish(),
    englishRequirementAr: z.string().trim().max(300).nullish(),
    notesEn: z.string().trim().max(1000).nullish(),
    notesAr: z.string().trim().max(1000).nullish(),
    isActive: z.boolean().default(true),
    confirmation: z.enum(['CONFIRMED', 'CLIENT_CONFIRMATION_REQUIRED']).default('CLIENT_CONFIRMATION_REQUIRED'),
  })).max(20).refine((r) => new Set(r.map((x) => x.qualification)).size === r.length, 'Each qualification can only have one rule'),
});

export const CurriculumInput = z.object({ items: z.array(z.object({ courseId: z.uuid(), year: z.number().int().min(1).max(8), term: z.number().int().min(1).max(4).nullable().default(1) })).max(200) });

export const CheckInput = z.object({
  qualification: z.enum(QUALIFICATIONS),
  overallPercent: z.coerce.number().min(0).max(100),
  subjects: z.array(z.object({ subject: z.string().trim().min(1).max(80), percent: z.coerce.number().min(0).max(100) })).max(20).default([]),
});

@Injectable()
export class AcademicsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async programs() {
    const rows = await this.prisma.program.findMany({
      where: { deletedAt: null }, orderBy: { nameEn: 'asc' },
      select: {
        id: true, slug: true, nameEn: true, nameAr: true, degreeLevel: true, publishStatus: true, confirmation: true, isDemo: true,
        department: { select: { nameEn: true, college: { select: { nameEn: true } } } },
        _count: { select: { curriculum: true, applications: true } },
        eligibilityRules: { select: { qualification: true, isActive: true, confirmation: true } },
      },
    });
    return { data: rows };
  }

  async program(id: string) {
    const p = await this.prisma.program.findFirst({
      where: { id, deletedAt: null },
      include: {
        department: { select: { id: true, nameEn: true } },
        curriculum: { orderBy: [{ year: 'asc' }, { term: 'asc' }], include: { course: { select: { id: true, code: true, titleEn: true, creditHours: true } } } },
        eligibilityRules: { orderBy: { qualification: 'asc' } },
      },
    });
    if (!p) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Programme not found' });
    return { data: p };
  }

  async setCurriculum(id: string, body: z.infer<typeof CurriculumInput>, actor: AuthUser) {
    await this.program(id);
    await this.prisma.$transaction([
      this.prisma.programCourse.deleteMany({ where: { programId: id } }),
      this.prisma.programCourse.createMany({ data: body.items.map((i) => ({ programId: id, courseId: i.courseId, year: i.year, term: i.term })), skipDuplicates: true }),
    ]);
    await this.audit.log({ actorId: actor.id, action: 'academics.curriculum.update', entityType: 'Program', entityId: id, metadata: { count: body.items.length } });
    return this.program(id);
  }

  async setRules(id: string, body: z.infer<typeof RulesInput>, actor: AuthUser) {
    await this.program(id);
    await this.prisma.$transaction([
      this.prisma.eligibilityRule.deleteMany({ where: { programId: id } }),
      this.prisma.eligibilityRule.createMany({ data: body.rules.map((r) => ({ ...r, programId: id })) }),
    ]);
    await this.audit.log({ actorId: actor.id, action: 'academics.eligibility.update', entityType: 'Program', entityId: id, metadata: { qualifications: body.rules.map((r) => r.qualification) } });
    return this.program(id);
  }

  /**
   * Evaluates a candidate against every programme's rule for their qualification.
   * Admin mode includes drafts/unconfirmed programmes; public mode only published + confirmed (+ demo in dev).
   */
  async checkAll(body: z.infer<typeof CheckInput>, mode: 'admin' | 'public') {
    const visibility = mode === 'admin' ? { deletedAt: null } : {
      deletedAt: null, publishStatus: 'PUBLISHED' as const,
      AND: [env().SHOW_DEMO_CONTENT ? { OR: [{ confirmation: 'CONFIRMED' as const, isDemo: false }, { isDemo: true }] } : { confirmation: 'CONFIRMED' as const, isDemo: false }],
    };
    const programs = await this.prisma.program.findMany({
      where: visibility, orderBy: { nameEn: 'asc' },
      select: { id: true, slug: true, nameEn: true, nameAr: true, degreeLevel: true, publishStatus: true, eligibilityRules: { where: { qualification: body.qualification, isActive: true } }, department: { select: { college: { select: { nameEn: true, nameAr: true } } } } },
    });
    const results = programs.map((p) => {
      const rule = p.eligibilityRules[0];
      if (!rule) return { program: { id: p.id, slug: p.slug, nameEn: p.nameEn, nameAr: p.nameAr, degreeLevel: p.degreeLevel, publishStatus: p.publishStatus, college: p.department.college }, status: 'NO_RULE' as const, unmet: [] };
      const r = evaluateEligibility(
        { minOverallPercent: rule.minOverallPercent ? Number(rule.minOverallPercent) : null, subjectMinimums: (rule.subjectMinimums as { subject: string; minPercent: number }[] | null) ?? [] },
        { overallPercent: body.overallPercent, subjects: body.subjects },
      );
      return { program: { id: p.id, slug: p.slug, nameEn: p.nameEn, nameAr: p.nameAr, degreeLevel: p.degreeLevel, publishStatus: p.publishStatus, college: p.department.college }, status: r.eligible ? ('ELIGIBLE' as const) : ('NOT_ELIGIBLE' as const), unmet: r.unmet, ruleConfirmation: rule.confirmation };
    });
    const order = { ELIGIBLE: 0, NOT_ELIGIBLE: 1, NO_RULE: 2 };
    results.sort((a, b) => order[a.status] - order[b.status]);
    return { data: results, meta: { eligible: results.filter((r) => r.status === 'ELIGIBLE').length, total: results.length } };
  }

  /** Student/applicant dashboard summary. */
  async overview(user: AuthUser) {
    const [apps, enrollments, payments, unread, live] = await Promise.all([
      this.prisma.application.count({ where: { applicantId: user.id, deletedAt: null } }),
      this.prisma.enrollment.count({ where: { userId: user.id, status: 'ACTIVE' } }),
      this.prisma.payment.findMany({ where: { userId: user.id, status: 'PENDING' }, select: { id: true } }),
      this.prisma.notification.count({ where: { userId: user.id, readAt: null } }),
      this.prisma.liveSession.count({ where: { status: 'LIVE', course: { enrollments: { some: { userId: user.id, status: 'ACTIVE' } } } } }),
    ]);
    return { data: { applications: apps, activeCourses: enrollments, pendingPayments: payments.length, unreadNotifications: unread, liveNow: live } };
  }
}
