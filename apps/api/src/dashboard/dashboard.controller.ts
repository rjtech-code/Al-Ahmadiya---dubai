import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

/** All figures are live database counts. */
@ApiTags('admin-dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('dashboard.read')
  async summary() {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [byStatus, newApps, users, staff, content, messages, subscribers, pendingConfirmation, recent] = await Promise.all([
      this.prisma.application.groupBy({ by: ['status'], _count: { _all: true }, where: { deletedAt: null } }),
      this.prisma.application.count({ where: { submittedAt: { gte: since } } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, roles: { some: { role: { key: { notIn: ['APPLICANT', 'STUDENT'] } } } } } }),
      Promise.all([
        this.prisma.college.count({ where: { deletedAt: null, publishStatus: 'PUBLISHED' } }),
        this.prisma.program.count({ where: { deletedAt: null, publishStatus: 'PUBLISHED' } }),
        this.prisma.newsArticle.count({ where: { deletedAt: null, publishStatus: 'PUBLISHED' } }),
        this.prisma.event.count({ where: { deletedAt: null, publishStatus: 'PUBLISHED' } }),
        this.prisma.facultyMember.count({ where: { deletedAt: null, publishStatus: 'PUBLISHED' } }),
      ]),
      this.prisma.contactMessage.count({ where: { handledAt: null } }),
      this.prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
      this.prisma.siteSetting.count({ where: { confirmation: 'CLIENT_CONFIRMATION_REQUIRED' } }),
      this.prisma.staffLogin.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, email: true, success: true, reason: true, ip: true, createdAt: true, user: { select: { fullName: true } } } }),
    ]);
    const [onlineCourses, activeEnrollments, liveNow, revenue] = await Promise.all([
      this.prisma.course.count({ where: { onlineEnabled: true, deletedAt: null } }),
      this.prisma.enrollment.count({ where: { status: 'ACTIVE' } }),
      this.prisma.liveSession.count({ where: { status: 'LIVE' } }),
      this.prisma.payment.aggregate({ where: { status: 'SUCCEEDED' }, _sum: { amountFils: true }, _count: { _all: true } }),
    ]);
    const statusCounts = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all]));
    return {
      data: {
        admissions: { byStatus: statusCounts, submittedLast30Days: newApps, pendingReview: (statusCounts.SUBMITTED ?? 0) + (statusCounts.UNDER_REVIEW ?? 0) + (statusCounts.DOCUMENTS_PENDING ?? 0) },
        users: { total: users, staff },
        content: { colleges: content[0], programs: content[1], news: content[2], events: content[3], faculty: content[4] },
        engagement: { unhandledMessages: messages, subscribers },
        settingsAwaitingConfirmation: pendingConfirmation,
        learning: { onlineCourses, activeEnrollments, liveNow },
        payments: { count: revenue._count._all, amountFils: revenue._sum.amountFils ?? 0 },
        recentStaffLogins: recent,
      },
    };
  }
}
