import { Injectable, NotFoundException } from '@nestjs/common';
import { lastMonths } from '../common/dubai-time';
import { gpa } from '../portal/grading';
import { PrismaService } from '../prisma/prisma.service';

/** Registrar / academic services: registrations, credit audit, prerequisites, transcripts. */
@Injectable()
export class RecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const months = lastMonths(1);
    const [byStatus, students, thisMonth, events, results, approvedApps, prereqs, recentEnrol, recentResults] = await Promise.all([
      this.prisma.enrollment.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.user.count({ where: { deletedAt: null, enrollments: { some: { status: 'ACTIVE' } } } }),
      this.prisma.enrollment.count({ where: { createdAt: { gte: months[0].start } } }),
      this.prisma.event.findMany({ where: { deletedAt: null, publishStatus: 'PUBLISHED', startsAt: { gte: new Date() } }, orderBy: { startsAt: 'asc' }, take: 4, select: { id: true, titleEn: true, startsAt: true, category: true } }),
      this.prisma.courseResult.findMany({ where: { publishedAt: { not: null } }, select: { userId: true, gradePoints: true, creditHours: true } }),
      this.prisma.application.findMany({ where: { status: 'APPROVED', deletedAt: null }, select: { applicantId: true, applicant: { select: { fullName: true } }, program: { select: { nameEn: true, totalCredits: true } } } }),
      this.prisma.coursePrerequisite.findMany({ select: { courseId: true, prerequisiteId: true, course: { select: { code: true } }, prerequisite: { select: { code: true } } } }),
      this.prisma.enrollment.findMany({ where: { status: 'ACTIVE' }, orderBy: { activatedAt: 'desc' }, take: 5, select: { activatedAt: true, user: { select: { fullName: true } }, course: { select: { code: true } } } }),
      this.prisma.courseResult.findMany({ where: { publishedAt: { not: null } }, orderBy: { publishedAt: 'desc' }, take: 5, select: { publishedAt: true, grade: true, user: { select: { fullName: true } }, course: { select: { code: true } } } }),
    ]);
    const n = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;

    // Credit audit: credits passed against the programme's total, for admitted students.
    const audit = approvedApps.filter((a) => a.program?.totalCredits).map((a) => {
      const earned = results.filter((r) => r.userId === a.applicantId && r.gradePoints > 0).reduce((s, r) => s + r.creditHours, 0);
      return { name: a.applicant.fullName, programme: a.program!.nameEn, earned, required: a.program!.totalCredits! };
    });

    // Prerequisite check: active enrolments whose prerequisite course was not passed.
    const issues: { student: string; course: string; missing: string }[] = [];
    if (prereqs.length) {
      const enrolled = await this.prisma.enrollment.findMany({ where: { status: 'ACTIVE', courseId: { in: prereqs.map((p) => p.courseId) } }, select: { userId: true, courseId: true, user: { select: { fullName: true } } } });
      const passed = await this.prisma.courseResult.findMany({ where: { publishedAt: { not: null }, gradePoints: { gt: 0 }, courseId: { in: prereqs.map((p) => p.prerequisiteId) } }, select: { userId: true, courseId: true } });
      for (const e of enrolled) for (const p of prereqs.filter((x) => x.courseId === e.courseId)) {
        if (!passed.some((r) => r.userId === e.userId && r.courseId === p.prerequisiteId)) issues.push({ student: e.user.fullName, course: p.course.code, missing: p.prerequisite.code });
      }
    }
    const atRiskGpa = [...new Set(results.map((r) => r.userId))].filter((u) => (gpa(results.filter((r) => r.userId === u)) ?? 4) < 2).length;
    return {
      data: {
        totals: { students, registrations: n('ACTIVE') + n('PENDING_PAYMENT'), thisMonth, onTrackPercent: students ? Math.round(((students - atRiskGpa) / students) * 100) : null },
        registrations: { active: n('ACTIVE'), pending: n('PENDING_PAYMENT'), cancelled: n('CANCELLED') },
        events, audit: audit.slice(0, 6), prerequisiteIssues: issues.slice(0, 10), prerequisiteIssueCount: issues.length,
        activity: [
          ...recentEnrol.map((e) => ({ at: e.activatedAt, text: `Registration — ${e.user.fullName} · ${e.course.code}` })),
          ...recentResults.map((r) => ({ at: r.publishedAt, text: `Grade ${r.grade} published — ${r.user.fullName} · ${r.course.code}` })),
        ].filter((x) => x.at).sort((a, b) => b.at!.getTime() - a.at!.getTime()).slice(0, 6),
      },
    };
  }

  async students(q?: string) {
    const text = q?.trim();
    return {
      data: await this.prisma.user.findMany({
        where: { deletedAt: null, OR: [{ enrollments: { some: {} } }, { results: { some: {} } }], ...(text ? { AND: [{ OR: [{ fullName: { contains: text, mode: 'insensitive' } }, { email: { contains: text, mode: 'insensitive' } }] }] } : {}) },
        orderBy: { fullName: 'asc' }, take: 50, select: { id: true, fullName: true, email: true, _count: { select: { enrollments: true, results: true } } },
      }),
    };
  }

  /** Official transcript: published results only, grouped by term, with term GPA and CGPA. */
  async transcript(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true, email: true, createdAt: true } });
    if (!u) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Student not found' });
    const [rows, app] = await Promise.all([
      this.prisma.courseResult.findMany({ where: { userId, publishedAt: { not: null } }, orderBy: [{ term: 'asc' }, { createdAt: 'asc' }], select: { term: true, marks: true, grade: true, gradePoints: true, creditHours: true, course: { select: { code: true, titleEn: true } } } }),
      this.prisma.application.findFirst({ where: { applicantId: userId, status: 'APPROVED' }, select: { reference: true, program: { select: { nameEn: true, degreeLevel: true } } } }),
    ]);
    const terms = [...new Set(rows.map((r) => r.term))].map((term) => ({ term, gpa: gpa(rows.filter((r) => r.term === term)), courses: rows.filter((r) => r.term === term) }));
    return { data: { student: { ...u, studentId: `AAU-${u.id.slice(0, 8).toUpperCase()}` }, programme: app?.program ?? null, terms, cgpa: gpa(rows), credits: rows.filter((r) => r.gradePoints > 0).reduce((s, r) => s + r.creditHours, 0), issuedAt: new Date() } };
  }
}
