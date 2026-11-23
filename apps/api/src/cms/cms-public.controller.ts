import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { z } from 'zod';
import { Public } from '../common/decorators';
import { PageQuery, pageArgs, pageMeta } from '../common/pagination';
import { ZodPipe } from '../common/zod.pipe';
import { env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Public visibility for records that carry a client-confirmation flag
 * (colleges, departments, programmes, courses, faculty, publications, FAQs, tour stops):
 * published AND client-confirmed AND not deleted. Demo records (always unconfirmed)
 * are shown only when SHOW_DEMO_CONTENT=true, which is forbidden in production.
 */
function visible(opts: { softDelete?: boolean } = {}) {
  return {
    publishStatus: 'PUBLISHED' as const,
    ...(opts.softDelete === false ? {} : { deletedAt: null }),
    AND: [env().SHOW_DEMO_CONTENT ? { OR: [{ confirmation: 'CONFIRMED' as const, isDemo: false }, { isDemo: true }] } : { confirmation: 'CONFIRMED' as const, isDemo: false }],
  };
}

/** Public visibility for editorial content (news, events): publishing is the approval step. */
function editorial() {
  return { publishStatus: 'PUBLISHED' as const, deletedAt: null, ...(env().SHOW_DEMO_CONTENT ? {} : { isDemo: false }) };
}

const ci = (q: string) => ({ contains: q, mode: 'insensitive' as const });
const notFound = () => new NotFoundException({ code: 'NOT_FOUND', message: 'Page not found' });

const ProgramQuery = PageQuery.extend({
  q: z.string().trim().max(100).optional(),
  level: z.enum(['FOUNDATION', 'DIPLOMA', 'BACHELOR', 'MASTER', 'DOCTORATE', 'PROFESSIONAL']).optional(),
  category: z.string().trim().max(80).optional(),
  college: z.string().trim().max(120).optional(),
  featured: z.enum(['true', 'false']).optional(),
});
const FacultyQuery = PageQuery.extend({
  q: z.string().trim().max(100).optional(),
  college: z.string().trim().max(120).optional(),
  department: z.string().trim().max(120).optional(),
  specialization: z.string().trim().max(120).optional(),
});
const NewsQuery = PageQuery.extend({ category: z.string().trim().max(40).optional(), featured: z.enum(['true', 'false']).optional() });
const EventQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  category: z.string().trim().max(40).optional(),
  when: z.enum(['upcoming', 'past', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
const ResearchQuery = PageQuery.extend({
  q: z.string().trim().max(100).optional(),
  type: z.string().trim().max(40).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  department: z.string().trim().max(120).optional(),
  author: z.string().trim().max(120).optional(),
});
const CourseQuery = PageQuery.extend({ featured: z.enum(['true', 'false']).optional() });

@ApiTags('public')
@Public()
@SkipThrottle()
@Controller('public')
export class CmsPublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('settings')
  async settings() {
    const rows = await this.prisma.siteSetting.findMany();
    return {
      data: Object.fromEntries(rows.map((r) => [r.key, { en: r.valueEn, ar: r.valueAr, confirmation: r.confirmation, sourceUrl: r.sourceUrl }])),
      // Lets the website label the whole site as a demo environment (never true in production).
      meta: { demoContent: env().SHOW_DEMO_CONTENT },
    };
  }

  /** Real counts of published records (no marketing figures). */
  @Get('stats')
  async stats() {
    const [colleges, programs, courses, faculty, publications] = await Promise.all([
      this.prisma.college.count({ where: visible() }),
      this.prisma.program.count({ where: visible() }),
      this.prisma.course.count({ where: visible() }),
      this.prisma.facultyMember.count({ where: { ...visible(), consentToPublish: true } }),
      this.prisma.publication.count({ where: visible() }),
    ]);
    return { data: { colleges, programs, courses, faculty, publications } };
  }

  @Get('heritage')
  async heritage() {
    const [milestones, media] = await Promise.all([
      this.prisma.heritageMilestone.findMany({ where: { publishStatus: 'PUBLISHED' }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.mediaAsset.findMany({ where: { path: { startsWith: '/images/history/' } }, orderBy: { path: 'asc' } }),
    ]);
    return { data: { milestones, media } };
  }

  @Get('media')
  async media() {
    return { data: await this.prisma.mediaAsset.findMany({ orderBy: { path: 'asc' } }) };
  }

  // ── Colleges & departments ──
  @Get('colleges')
  async colleges() {
    return {
      data: await this.prisma.college.findMany({
        where: visible(), orderBy: { sortOrder: 'asc' },
        include: { departments: { where: visible(), orderBy: { sortOrder: 'asc' }, select: { id: true, slug: true, nameEn: true, nameAr: true } } },
      }),
    };
  }

  @Get('colleges/:slug')
  async college(@Param('slug') slug: string) {
    const c = await this.prisma.college.findFirst({
      where: { slug, ...visible() },
      include: {
        dean: true,
        departments: {
          where: visible(), orderBy: { sortOrder: 'asc' },
          include: {
            programs: { where: visible(), take: 6 },
            faculty: { where: { ...visible(), consentToPublish: true }, take: 8 },
          },
        },
      },
    });
    if (!c) throw notFound();
    return { data: c };
  }

  @Get('departments/:slug')
  async department(@Param('slug') slug: string) {
    const d = await this.prisma.department.findFirst({
      where: { slug, ...visible() },
      include: {
        college: { select: { slug: true, nameEn: true, nameAr: true } },
        head: true,
        programs: { where: visible() },
        courses: { where: visible(), take: 12, orderBy: { code: 'asc' } },
        faculty: { where: { ...visible(), consentToPublish: true }, take: 12 },
      },
    });
    if (!d) throw notFound();
    return { data: d };
  }

  // ── Programmes & courses ──
  @Get('programs')
  async programs(@Query(new ZodPipe(ProgramQuery)) q: z.infer<typeof ProgramQuery>) {
    const where = {
      ...visible(),
      ...(q.level ? { degreeLevel: q.level } : {}),
      ...(q.category ? { category: q.category } : {}),
      ...(q.college ? { department: { college: { slug: q.college } } } : {}),
      ...(q.featured === 'true' ? { isFeatured: true } : {}),
      ...(q.q ? { OR: [{ nameEn: ci(q.q) }, { nameAr: ci(q.q) }, { summaryEn: ci(q.q) }] } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.program.findMany({
        where, orderBy: [{ isFeatured: 'desc' }, { nameEn: 'asc' }], ...pageArgs(q),
        include: { department: { select: { nameEn: true, nameAr: true, college: { select: { slug: true, nameEn: true, nameAr: true } } } } },
      }),
      this.prisma.program.count({ where }),
    ]);
    return { data: rows, meta: pageMeta(q, total) };
  }

  @Get('programs/:slug')
  async program(@Param('slug') slug: string) {
    const p = await this.prisma.program.findFirst({
      where: { slug, ...visible() },
      include: {
        department: { include: { college: { select: { slug: true, nameEn: true, nameAr: true } } } },
        curriculum: { where: { course: visible() }, orderBy: [{ year: 'asc' }, { term: 'asc' }], include: { course: { select: { slug: true, code: true, titleEn: true, titleAr: true, creditHours: true } } } },
      },
    });
    if (!p) throw notFound();
    const related = await this.prisma.program.findMany({ where: { ...visible(), departmentId: p.departmentId, id: { not: p.id } }, take: 3 });
    return { data: { ...p, related } };
  }

  @Get('courses')
  async courses(@Query(new ZodPipe(CourseQuery)) q: z.infer<typeof CourseQuery>) {
    const where = { ...visible(), ...(q.featured === 'true' ? { isFeatured: true } : {}) };
    const [rows, total] = await Promise.all([
      this.prisma.course.findMany({ where, orderBy: { code: 'asc' }, ...pageArgs(q) }),
      this.prisma.course.count({ where }),
    ]);
    return { data: rows, meta: pageMeta(q, total) };
  }

  @Get('courses/:slug')
  async course(@Param('slug') slug: string) {
    const c = await this.prisma.course.findFirst({
      where: { slug, ...visible() },
      include: {
        instructor: true, department: { select: { slug: true, nameEn: true, nameAr: true } },
        // Online course outline: titles only (video access requires an active enrollment).
        topics: { orderBy: { sortOrder: 'asc' }, select: { id: true, titleEn: true, titleAr: true } },
        lessons: { where: { status: 'PUBLISHED' }, orderBy: { sortOrder: 'asc' }, select: { id: true, titleEn: true, titleAr: true, durationSec: true, topicId: true } },
        _count: { select: { notes: { where: { status: 'PUBLISHED' } }, quizzes: { where: { status: 'PUBLISHED' } }, liveSessions: { where: { status: { in: ['SCHEDULED', 'LIVE'] } } } } },
      },
    });
    if (!c) throw notFound();
    const instructor = c.instructor && c.instructor.consentToPublish && c.instructor.publishStatus === 'PUBLISHED' ? c.instructor : null;
    const related = await this.prisma.course.findMany({ where: { ...visible(), departmentId: c.departmentId, id: { not: c.id } }, take: 3 });
    return { data: { ...c, instructor, related } };
  }

  // ── Faculty ──
  @Get('faculty')
  async faculty(@Query(new ZodPipe(FacultyQuery)) q: z.infer<typeof FacultyQuery>) {
    const where = {
      ...visible(), consentToPublish: true,
      ...(q.department ? { departments: { some: { slug: q.department } } } : {}),
      ...(q.college ? { departments: { some: { college: { slug: q.college } } } } : {}),
      ...(q.specialization ? { specializationEn: ci(q.specialization) } : {}),
      ...(q.q ? { OR: [{ fullNameEn: ci(q.q) }, { fullNameAr: ci(q.q) }, { specializationEn: ci(q.q) }] } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.facultyMember.findMany({ where, orderBy: { fullNameEn: 'asc' }, ...pageArgs(q), include: { departments: { select: { slug: true, nameEn: true, nameAr: true } } } }),
      this.prisma.facultyMember.count({ where }),
    ]);
    return { data: rows, meta: pageMeta(q, total) };
  }

  @Get('faculty/:slug')
  async facultyMember(@Param('slug') slug: string) {
    const f = await this.prisma.facultyMember.findFirst({
      where: { slug, ...visible(), consentToPublish: true },
      include: {
        departments: { select: { slug: true, nameEn: true, nameAr: true } },
        courses: { where: visible(), select: { slug: true, code: true, titleEn: true, titleAr: true } },
        publications: { where: { publication: visible() }, include: { publication: { select: { slug: true, titleEn: true, titleAr: true, journal: true, publishedOn: true, coverPath: true } } } },
      },
    });
    if (!f) throw notFound();
    return { data: f };
  }

  // ── News ──
  @Get('news')
  async news(@Query(new ZodPipe(NewsQuery)) q: z.infer<typeof NewsQuery>) {
    const where = { ...editorial(), ...(q.category ? { category: q.category } : {}), ...(q.featured === 'true' ? { isFeatured: true } : {}) };
    const [rows, total] = await Promise.all([
      this.prisma.newsArticle.findMany({ where, orderBy: { publishedAt: 'desc' }, ...pageArgs(q), omit: { bodyEn: true, bodyAr: true } }),
      this.prisma.newsArticle.count({ where }),
    ]);
    return { data: rows, meta: pageMeta(q, total) };
  }

  @Get('news/:slug')
  async article(@Param('slug') slug: string) {
    const a = await this.prisma.newsArticle.findFirst({ where: { slug, ...editorial() } });
    if (!a) throw notFound();
    const related = await this.prisma.newsArticle.findMany({
      where: { ...editorial(), id: { not: a.id }, category: a.category }, orderBy: { publishedAt: 'desc' }, take: 3, omit: { bodyEn: true, bodyAr: true },
    });
    return { data: { ...a, related } };
  }

  // ── Events ──
  @Get('events')
  async events(@Query(new ZodPipe(EventQuery)) q: z.infer<typeof EventQuery>) {
    const now = new Date();
    const startsAt = {
      ...(q.from ? { gte: q.from } : {}),
      ...(q.to ? { lte: q.to } : {}),
      ...(q.when === 'upcoming' ? { gte: q.from && q.from > now ? q.from : now } : {}),
      ...(q.when === 'past' ? { lt: now } : {}),
    };
    const rows = await this.prisma.event.findMany({
      where: { ...editorial(), ...(q.category ? { category: q.category } : {}), startsAt },
      orderBy: { startsAt: q.when === 'past' ? 'desc' : 'asc' }, take: q.limit,
    });
    return { data: rows };
  }

  @Get('events/:slug')
  async event(@Param('slug') slug: string) {
    const e = await this.prisma.event.findFirst({
      where: { slug, ...editorial() },
      include: { agenda: { orderBy: { startsAt: 'asc' } }, speakers: true, faqs: { where: visible({ softDelete: false }), orderBy: { sortOrder: 'asc' } } },
    });
    if (!e) throw notFound();
    const related = await this.prisma.event.findMany({ where: { ...editorial(), id: { not: e.id }, category: e.category }, orderBy: { startsAt: 'desc' }, take: 3 });
    return { data: { ...e, related } };
  }

  // ── Research ──
  @Get('research')
  async research(@Query(new ZodPipe(ResearchQuery)) q: z.infer<typeof ResearchQuery>) {
    const where = {
      ...visible(),
      ...(q.type ? { type: q.type } : {}),
      ...(q.year ? { publishedOn: { gte: new Date(`${q.year}-01-01`), lt: new Date(`${q.year + 1}-01-01`) } } : {}),
      ...(q.author ? { authors: { some: { name: ci(q.author) } } } : {}),
      ...(q.q ? { OR: [{ titleEn: ci(q.q) }, { titleAr: ci(q.q) }, { abstractEn: ci(q.q) }, { keywords: { has: q.q } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.publication.findMany({ where, orderBy: [{ isFeatured: 'desc' }, { publishedOn: 'desc' }], ...pageArgs(q), include: { authors: { orderBy: { position: 'asc' } } } }),
      this.prisma.publication.count({ where }),
    ]);
    return { data: rows, meta: pageMeta(q, total) };
  }

  @Get('research/:slug')
  async publication(@Param('slug') slug: string) {
    const p = await this.prisma.publication.findFirst({ where: { slug, ...visible() }, include: { authors: { orderBy: { position: 'asc' } } } });
    if (!p) throw notFound();
    const related = await this.prisma.publication.findMany({
      where: { ...visible(), id: { not: p.id }, ...(p.keywords.length ? { keywords: { hasSome: p.keywords } } : {}) }, take: 3, orderBy: { publishedOn: 'desc' },
      include: { authors: { orderBy: { position: 'asc' } } },
    });
    return { data: { ...p, related } };
  }

  // ── Campus tour & FAQs ──
  @Get('campus-tour')
  async tour() {
    return { data: await this.prisma.campusTourStop.findMany({ where: visible({ softDelete: false }), orderBy: { sortOrder: 'asc' } }) };
  }

  @Get('faqs')
  async faqs(@Query('scope') scope?: string) {
    const s = z.enum(['programs', 'admissions']).safeParse(scope);
    return { data: await this.prisma.faq.findMany({ where: { ...visible({ softDelete: false }), ...(s.success ? { scope: s.data } : {}) }, orderBy: { sortOrder: 'asc' } }) };
  }
}
