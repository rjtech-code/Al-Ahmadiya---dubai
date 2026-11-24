import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/prisma/prisma.service';

async function truncateAll() {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const { rows } = await client.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'");
  if (rows.length) await client.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  await client.end();
}

const ADMIN = { email: 'e2e-admin@example.test', password: 'E2eAdminPass1' };

describe('API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const env = { ...process.env, SEED_ADMIN_EMAIL: ADMIN.email, SEED_ADMIN_PASSWORD: ADMIN.password };
    const dbName = new URL(process.env.DATABASE_URL!).pathname.slice(1);
    if (!dbName.endsWith('_test')) throw new Error(`Refusing to run e2e tests against non-test database "${dbName}"`);
    execSync('npx prisma migrate deploy', { env, stdio: 'pipe' });
    await truncateAll();
    execSync('npx prisma db seed', { env, stdio: 'pipe' });
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(mod.createNestApplication({ rawBody: true }));
    await app.init();
    prisma = app.get(PrismaService);
    http = request(app.getHttpServer());
    await setAdmissions(true);
  }, 120_000);

  const setAdmissions = (open: boolean) =>
    prisma.siteSetting.update({ where: { key: 'admissions.status' }, data: open ? { valueEn: 'OPEN', confirmation: 'CONFIRMED' } : { valueEn: 'CLOSED', confirmation: 'CLIENT_CONFIRMATION_REQUIRED' } });

  afterAll(async () => {
    await app?.close();
  });

  const login = async (email: string, password: string, audience = 'portal') => {
    const res = await http.post('/api/v1/auth/login').send({ email, password, audience });
    return res;
  };

  it('GET /health reports the database up', async () => {
    const res = await http.get('/api/v1/health').expect(200);
    expect(res.body.data.database).toBe('up');
  });

  describe('public content', () => {
    it('returns the verified heritage timeline with sources', async () => {
      const res = await http.get('/api/v1/public/heritage').expect(200);
      expect(res.body.data.milestones[0].yearLabel).toBe('1912');
      expect(res.body.data.milestones[0].sourceUrls.length).toBeGreaterThan(0);
      expect(res.body.data.media).toHaveLength(4);
    });

    it('marks unconfirmed university settings', async () => {
      const res = await http.get('/api/v1/public/settings').expect(200);
      expect(res.body.data['university.status'].confirmation).toBe('CLIENT_CONFIRMATION_REQUIRED');
      expect(res.body.data['institution.founded'].confirmation).toBe('CONFIRMED');
    });

    it('hides drafts and demo records from public listings', async () => {
      const college = await prisma.college.create({ data: { slug: 'draft-college', nameEn: 'Draft', nameAr: 'مسودة' } });
      await prisma.college.create({ data: { slug: 'demo-college', nameEn: 'Demo', nameAr: 'تجريبي', publishStatus: 'PUBLISHED', isDemo: true } });
      const res = await http.get('/api/v1/public/colleges').expect(200);
      expect(res.body.data).toEqual([]);
      await http.get(`/api/v1/public/colleges/${college.slug}`).expect(404);
    });

    it('returns related publications with their authors', async () => {
      const mk = (slug: string) => prisma.publication.create({ data: { slug, type: 'report', titleEn: slug, titleAr: slug, abstractEn: 'a', abstractAr: 'a', keywords: ['k'], publishStatus: 'PUBLISHED', confirmation: 'CONFIRMED', authors: { create: [{ name: 'Author', position: 1 }] } } });
      await mk('rel-a');
      await mk('rel-b');
      const res = await http.get('/api/v1/public/research/rel-a').expect(200);
      expect(res.body.data.related[0].authors[0].name).toBe('Author');
    });

    it('validates and stores contact messages', async () => {
      await http.post('/api/v1/public/contact').send({ fullName: 'A', email: 'bad', message: 'x' }).expect(400);
      await http.post('/api/v1/public/contact').send({ fullName: 'Visitor', email: 'v@example.test', message: 'A question about the archive.' }).expect(201);
    });
  });

  describe('authentication', () => {
    it('rejects bad credentials with a uniform error', async () => {
      const res = await login(ADMIN.email, 'wrong-password');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('allows registration while admissions are closed (accounts are needed for courses) but blocks applications', async () => {
      await setAdmissions(false);
      const reg = await http.post('/api/v1/auth/register').send({ fullName: 'Early Bird', email: 'early@example.test', password: 'EarlyBird1234' }).expect(201);
      const res = await http.post('/api/v1/applications').set('Authorization', `Bearer ${reg.body.data.accessToken}`).expect(409);
      expect(res.body.error.code).toBe('ADMISSIONS_CLOSED');
      await setAdmissions(true);
    });

    it('enforces password policy on registration', async () => {
      const res = await http.post('/api/v1/auth/register').send({ fullName: 'Weak', email: 'weak@example.test', password: 'short' }).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('treats refresh without a cookie as anonymous (204)', async () => {
      await http.post('/api/v1/auth/refresh').expect(204);
    });

    it('rotates refresh tokens and revokes the family on reuse', async () => {
      const first = await login(ADMIN.email, ADMIN.password);
      expect(first.status).toBe(200);
      const cookie1 = first.headers['set-cookie'];
      const second = await http.post('/api/v1/auth/refresh').set('Cookie', cookie1).expect(200);
      const cookie2 = second.headers['set-cookie'];
      await http.post('/api/v1/auth/refresh').set('Cookie', cookie1).expect(401); // reuse
      await http.post('/api/v1/auth/refresh').set('Cookie', cookie2).expect(401); // family revoked
    });

    it('locks the account after 5 failed attempts', async () => {
      await http.post('/api/v1/auth/register').send({ fullName: 'Lock Test', email: 'lock@example.test', password: 'LockTest1234' }).expect(201);
      for (let i = 0; i < 5; i++) await login('lock@example.test', 'nope-nope-1');
      const res = await login('lock@example.test', 'LockTest1234');
      expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('RBAC', () => {
    let adminToken: string;
    let applicantToken: string;

    beforeAll(async () => {
      adminToken = (await login(ADMIN.email, ADMIN.password, 'admin')).body.data.accessToken;
      const reg = await http.post('/api/v1/auth/register').send({ fullName: 'Applicant', email: 'applicant@example.test', password: 'Applicant1234' }).expect(201);
      applicantToken = reg.body.data.accessToken;
    });

    it('requires authentication for admin routes', async () => {
      await http.get('/api/v1/admin/dashboard').expect(401);
    });

    it('forbids applicants from admin routes and admin login', async () => {
      await http.get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${applicantToken}`).expect(403);
      const res = await login('applicant@example.test', 'Applicant1234', 'admin');
      expect(res.body.error.code).toBe('NOT_STAFF');
    });

    it('lets a Content Editor save drafts but not publish', async () => {
      await http.post('/api/v1/admin/users').set('Authorization', `Bearer ${adminToken}`)
        .send({ fullName: 'Editor', email: 'editor@example.test', password: 'EditorPass123', roleKeys: ['CONTENT_EDITOR'] }).expect(201);
      const editor = (await login('editor@example.test', 'EditorPass123', 'admin')).body.data.accessToken;
      const created = await http.post('/api/v1/admin/cms/news').set('Authorization', `Bearer ${editor}`).send({
        slug: 'editor-draft', category: 'heritage', titleEn: 'T', titleAr: 'ع', excerptEn: 'E', excerptAr: 'م', bodyEn: 'B', bodyAr: 'ن', publishStatus: 'PUBLISHED',
      }).expect(201);
      expect(created.body.data.publishStatus).toBe('DRAFT');
      await http.post(`/api/v1/admin/cms/news/${created.body.data.id}/status`).set('Authorization', `Bearer ${editor}`).send({ status: 'PUBLISHED' }).expect(403);
      await http.post(`/api/v1/admin/cms/news/${created.body.data.id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'PUBLISHED' }).expect(200);
      const pub = await http.get('/api/v1/public/news/editor-draft').expect(200);
      expect(pub.body.data.titleEn).toBe('T');
    });

    it('prevents non-super-admins from granting Super Admin', async () => {
      await http.post('/api/v1/admin/users').set('Authorization', `Bearer ${adminToken}`)
        .send({ fullName: 'UA', email: 'ua@example.test', password: 'UniAdmin12345', roleKeys: ['UNIVERSITY_ADMIN'] }).expect(201);
      // University Admin lacks users.write → 403 before escalation check
      const ua = (await login('ua@example.test', 'UniAdmin12345', 'admin')).body.data.accessToken;
      await http.post('/api/v1/admin/users').set('Authorization', `Bearer ${ua}`)
        .send({ fullName: 'X', email: 'x@example.test', password: 'Xxxxxxxxxx12', roleKeys: ['SUPER_ADMIN'] }).expect(403);
    });

    it('writes audit entries for sensitive actions', async () => {
      const res = await http.get('/api/v1/admin/audit?action=users.create').set('Authorization', `Bearer ${adminToken}`).expect(200);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
    });
  });


  describe('CMS content management (all resources)', () => {
    let admin: string;
    let editor: string;
    const ids: Record<string, string> = {};

    beforeAll(async () => {
      admin = (await login(ADMIN.email, ADMIN.password, 'admin')).body.data.accessToken;
      editor = (await login('editor@example.test', 'EditorPass123', 'admin')).body.data.accessToken;
    });

    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
    const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

    // Valid payloads (English + Arabic) per resource. Order matters: later ones reference earlier ids.
    const payloads: Record<string, () => Record<string, unknown>> = {
      colleges: () => ({ slug: 'cms-college', nameEn: 'CMS College', nameAr: 'كلية الاختبار' }),
      faculty: () => ({ slug: 'cms-faculty', fullNameEn: 'CMS Faculty', fullNameAr: 'عضو الاختبار', titleEn: 'Lecturer', titleAr: 'محاضر', consentToPublish: true }),
      departments: () => ({ slug: 'cms-dept', collegeId: ids.colleges, nameEn: 'CMS Department', nameAr: 'قسم الاختبار' }),
      programs: () => ({ slug: 'cms-program', departmentId: ids.departments, degreeLevel: 'BACHELOR', nameEn: 'CMS Programme', nameAr: 'برنامج الاختبار' }),
      courses: () => ({ slug: 'cms-course', code: 'CMS101', departmentId: ids.departments, titleEn: 'CMS Course', titleAr: 'مقرر الاختبار', creditHours: 3,
        assessment: [{ labelEn: 'Exam', labelAr: 'اختبار', weight: 100 }] }),
      news: () => ({ slug: 'cms-news', category: 'heritage', titleEn: 'CMS News', titleAr: 'خبر الاختبار', excerptEn: 'e', excerptAr: 'م', bodyEn: 'b', bodyAr: 'ن', publishedAt: day(-1) }),
      events: () => ({ slug: 'cms-event', category: 'academic', titleEn: 'CMS Event', titleAr: 'فعالية الاختبار', summaryEn: 's', summaryAr: 'م', startsAt: day(3), endsAt: day(3.1) }),
      publications: () => ({ slug: 'cms-pub', type: 'report', titleEn: 'CMS Publication', titleAr: 'منشور الاختبار', abstractEn: 'a', abstractAr: 'م', authors: [{ name: 'Author' }] }),
      faqs: () => ({ scope: 'programs', questionEn: 'CMS FAQ?', questionAr: 'سؤال الاختبار؟', answerEn: 'Yes', answerAr: 'نعم' }),
      'campus-tour': () => ({ slug: 'cms-tour', kind: 'library', titleEn: 'CMS Library', titleAr: 'مكتبة الاختبار', descriptionEn: 'd', descriptionAr: 'و' }),
      heritage: () => ({ sortOrder: 999, yearLabel: '2099', titleEn: 'CMS Milestone', titleAr: 'محطة الاختبار', bodyEn: 'b', bodyAr: 'ن', sourceUrls: ['https://example.org/source'] }),
      media: () => ({ path: '/images/test/cms.jpg', altEn: 'CMS image', altAr: 'صورة الاختبار' }),
    };
    const confirmable = ['colleges', 'faculty', 'departments', 'programs', 'courses', 'publications', 'faqs', 'campus-tour'];

    /** Returns the public representation of a record, or null when it is not publicly visible. */
    const publicFind = async (resource: string, row: Record<string, unknown>) => {
      const bySlug: Record<string, string> = { colleges: 'colleges', departments: 'departments', programs: 'programs', courses: 'courses', faculty: 'faculty', news: 'news', events: 'events', publications: 'research' };
      if (bySlug[resource]) {
        const r = await http.get(`/api/v1/public/${bySlug[resource]}/${row.slug}`);
        return r.status === 200 ? r.body.data : null;
      }
      const list = resource === 'faqs' ? (await http.get('/api/v1/public/faqs?scope=programs')).body.data
        : resource === 'campus-tour' ? (await http.get('/api/v1/public/campus-tour')).body.data
        : resource === 'heritage' ? (await http.get('/api/v1/public/heritage')).body.data.milestones
        : (await http.get('/api/v1/public/media')).body.data;
      return (list as { id: string }[]).find((x) => x.id === row.id) ?? null;
    };

    for (const resource of Object.keys(payloads)) {
      it(`${resource}: validation, draft privacy, publish, confirmation gate, bilingual, permissions, delete`, async () => {
        // Invalid data is rejected with field details
        const bad = await http.post(`/api/v1/admin/cms/${resource}`).set(auth(admin)).send({}).expect(400);
        expect(bad.body.error.code).toBe('VALIDATION_FAILED');
        expect(bad.body.error.details.length).toBeGreaterThan(0);

        // Create as draft (confirmed where applicable)
        const base: Record<string, unknown> = { ...payloads[resource](), ...(resource === 'media' ? {} : { publishStatus: 'DRAFT' }), ...(confirmable.includes(resource) ? { confirmation: 'CONFIRMED' } : {}) };
        const created = (await http.post(`/api/v1/admin/cms/${resource}`).set(auth(admin)).send(base).expect(201)).body.data;
        ids[resource] = created.id;

        if (resource !== 'media') {
          expect(await publicFind(resource, created)).toBeNull(); // draft stays private

          // Editor may edit but not publish
          await http.post(`/api/v1/admin/cms/${resource}/${created.id}/status`).set(auth(editor)).send({ status: 'PUBLISHED' }).expect(403);

          // Admin publishes → visible, with both languages on the same record
          await http.post(`/api/v1/admin/cms/${resource}/${created.id}/status`).set(auth(admin)).send({ status: 'PUBLISHED' }).expect(200);
          const pub = await publicFind(resource, created);
          expect(pub).not.toBeNull();
          const pair = Object.keys(base).find((k) => k.endsWith('En') && typeof base[k] === 'string')!;
          expect(pub[pair]).toBe(base[pair]);
          expect(pub[pair.replace(/En$/, 'Ar')]).toBe(base[pair.replace(/En$/, 'Ar')]);

          if (confirmable.includes(resource)) {
            // Published but unconfirmed → hidden
            await http.put(`/api/v1/admin/cms/${resource}/${created.id}`).set(auth(admin)).send({ ...base, publishStatus: 'PUBLISHED', confirmation: 'CLIENT_CONFIRMATION_REQUIRED' }).expect(200);
            expect(await publicFind(resource, created)).toBeNull();
            await http.put(`/api/v1/admin/cms/${resource}/${created.id}`).set(auth(admin)).send({ ...base, publishStatus: 'PUBLISHED', confirmation: 'CONFIRMED' }).expect(200);
            expect(await publicFind(resource, created)).not.toBeNull();
          }
        }

        // Edit is persisted
        const editKey = Object.keys(base).find((k) => k.endsWith('En') && typeof base[k] === 'string')!;
        const edited = (await http.put(`/api/v1/admin/cms/${resource}/${created.id}`).set(auth(admin)).send({ ...base, ...(resource === 'media' ? {} : { publishStatus: 'PUBLISHED' }), [editKey]: `${String(base[editKey])} (edited)` }).expect(200)).body.data;
        expect(edited[editKey]).toMatch(/\(edited\)$/);

        // Unauthenticated and applicant access is refused
        await http.get(`/api/v1/admin/cms/${resource}`).expect(401);
      });
    }

    it('deletes records (dependants first) and removes them from the public site', async () => {
      for (const resource of ['media', 'heritage', 'campus-tour', 'faqs', 'publications', 'events', 'news', 'courses', 'programs', 'departments', 'faculty', 'colleges']) {
        const row = (await http.get(`/api/v1/admin/cms/${resource}/${ids[resource]}`).set(auth(admin)).expect(200)).body.data;
        await http.delete(`/api/v1/admin/cms/${resource}/${ids[resource]}`).set(auth(editor)).expect(403);
        await http.delete(`/api/v1/admin/cms/${resource}/${ids[resource]}`).set(auth(admin)).expect(204);
        expect(await publicFind(resource, row)).toBeNull();
        await http.get(`/api/v1/admin/cms/${resource}/${ids[resource]}`).set(auth(admin)).expect(404);
      }
    });

    it('rejects unknown resources and malformed ids', async () => {
      await http.get('/api/v1/admin/cms/not-a-resource').set(auth(admin)).expect(404);
      await http.get('/api/v1/admin/cms/news/not-a-uuid').set(auth(admin)).expect(400);
    });

    it('rejects invalid field values (slug format, assessment weights, DOI, event dates)', async () => {
      await http.post('/api/v1/admin/cms/colleges').set(auth(admin)).send({ slug: 'Bad Slug!', nameEn: 'x', nameAr: 'x' }).expect(400);
      await http.post('/api/v1/admin/cms/courses').set(auth(admin)).send({ slug: 'w', code: 'W1', departmentId: randomUUID(), titleEn: 'x', titleAr: 'x', creditHours: 3, assessment: [{ labelEn: 'a', labelAr: 'a', weight: 50 }] }).expect(400);
      await http.post('/api/v1/admin/cms/publications').set(auth(admin)).send({ slug: 'p', type: 'report', titleEn: 'x', titleAr: 'x', abstractEn: 'a', abstractAr: 'a', doi: 'not-a-doi', authors: [{ name: 'A' }] }).expect(400);
      await http.post('/api/v1/admin/cms/events').set(auth(admin)).send({ slug: 'e', category: 'academic', titleEn: 'x', titleAr: 'x', summaryEn: 's', summaryAr: 's', startsAt: day(2), endsAt: day(1) }).expect(400);
    });
  });

  describe('admissions', () => {
    let token: string;
    beforeAll(async () => {
      token = (await login('applicant@example.test', 'Applicant1234')).body.data.accessToken;
    });

    it('blocks applications while admissions are not confirmed open', async () => {
      await setAdmissions(false);
      const res = await http.post('/api/v1/applications').set('Authorization', `Bearer ${token}`).expect(409);
      expect(res.body.error.code).toBe('ADMISSIONS_CLOSED');
      await setAdmissions(true);
    });

    it('runs an application through submit and review when admissions are open', async () => {
      const college = await prisma.college.create({ data: { slug: 'c1', nameEn: 'C', nameAr: 'ك', publishStatus: 'PUBLISHED', confirmation: 'CONFIRMED' } });
      const dept = await prisma.department.create({ data: { slug: 'd1', nameEn: 'D', nameAr: 'د', collegeId: college.id, publishStatus: 'PUBLISHED', confirmation: 'CONFIRMED' } });
      const program = await prisma.program.create({ data: { slug: 'p1', nameEn: 'P', nameAr: 'ب', degreeLevel: 'BACHELOR', departmentId: dept.id, publishStatus: 'PUBLISHED', confirmation: 'CONFIRMED' } });
      await prisma.eligibilityRule.create({ data: { programId: program.id, qualification: 'IB_DIPLOMA', minOverallPercent: 75, subjectMinimums: [{ subject: 'Mathematics', minPercent: 80 }] } });

      const elig = await http.post('/api/v1/public/admissions/eligibility').send({ programSlug: 'p1', qualification: 'IB_DIPLOMA', overallPercent: 70, subjects: [] }).expect(200);
      expect(elig.body.data.status).toBe('NOT_ELIGIBLE');

      const auth = { Authorization: `Bearer ${token}` };
      const app1 = (await http.post('/api/v1/applications').set(auth).expect(201)).body.data;
      expect(app1.reference).toMatch(/^AHM-\d{4}-/);
      await http.put(`/api/v1/applications/${app1.id}/steps/1`).set(auth).send({ firstName: 'Sara', lastName: 'Test', dateOfBirth: '2007-05-01', gender: 'female', nationality: 'UAE' }).expect(200);
      await http.put(`/api/v1/applications/${app1.id}/steps/2`).set(auth).send({ phone: '+971 50 000 0000', addressLine: 'Street 1', city: 'Dubai', country: 'UAE' }).expect(200);
      await http.put(`/api/v1/applications/${app1.id}/steps/3`).set(auth).send({ qualification: 'IB_DIPLOMA', institution: 'School', graduationYear: 2026, overallPercent: 90 }).expect(200);
      await http.put(`/api/v1/applications/${app1.id}/steps/4`).set(auth).send({ programSlug: 'p1' }).expect(200);

      await prisma.siteSetting.update({ where: { key: 'admissions.applicationFeeAed' }, data: { valueEn: '0', confirmation: 'CONFIRMED' } });
      const incomplete = await http.post(`/api/v1/applications/${app1.id}/submit`).set(auth).expect(400);
      expect(incomplete.body.error.details.missing).toEqual(['documents']);

      await http.post(`/api/v1/applications/${app1.id}/documents`).set(auth).field('docType', 'passport').attach('file', Buffer.from('not a pdf'), { filename: 'x.pdf', contentType: 'application/pdf' }).expect(400);
      await http.post(`/api/v1/applications/${app1.id}/documents`).set(auth).field('docType', 'passport').attach('file', Buffer.from('%PDF-1.4\n%test'), { filename: 'passport.pdf', contentType: 'application/pdf' }).expect(201);
      await http.post(`/api/v1/applications/${app1.id}/submit`).set(auth).expect(200);

      const status = await http.post('/api/v1/public/admissions/status').send({ reference: app1.reference, email: 'applicant@example.test' }).expect(200);
      expect(status.body.data.status).toBe('SUBMITTED');
      expect(status.body.data).not.toHaveProperty('personal');
      await http.post('/api/v1/public/admissions/status').send({ reference: app1.reference, email: 'someone-else@example.test' }).expect(404);

      const admin = (await login(ADMIN.email, ADMIN.password, 'admin')).body.data.accessToken;
      await http.post(`/api/v1/admin/applications/${app1.id}/transition`).set('Authorization', `Bearer ${admin}`).send({ to: 'APPROVED' }).expect(409);
      await http.post(`/api/v1/admin/applications/${app1.id}/transition`).set('Authorization', `Bearer ${admin}`).send({ to: 'UNDER_REVIEW' }).expect(200);
      await http.post(`/api/v1/admin/applications/${app1.id}/transition`).set('Authorization', `Bearer ${admin}`).send({ to: 'APPROVED', note: 'Meets criteria' }).expect(200);
    });
  });

  describe('payments, online courses and live classes', () => {
    let admin: string;
    let student: string;
    let other: string;
    let courseId: string;
    const H = (t: string) => ({ Authorization: `Bearer ${t}` });
    const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.alloc(2048, 1)]);
    const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(1024, 2)]);
    const PDF = Buffer.from('%PDF-1.4\n% notes\n');

    beforeAll(async () => {
      admin = (await login(ADMIN.email, ADMIN.password, 'admin')).body.data.accessToken;
      student = (await http.post('/api/v1/auth/register').send({ fullName: 'Student One', email: 'student1@example.test', password: 'StudentPass123' }).expect(201)).body.data.accessToken;
      other = (await http.post('/api/v1/auth/register').send({ fullName: 'Student Two', email: 'student2@example.test', password: 'StudentPass123' }).expect(201)).body.data.accessToken;
      const college = await prisma.college.create({ data: { slug: 'lms-c', nameEn: 'C', nameAr: 'ك', publishStatus: 'PUBLISHED', confirmation: 'CONFIRMED' } });
      const dept = await prisma.department.create({ data: { slug: 'lms-d', nameEn: 'D', nameAr: 'د', collegeId: college.id, publishStatus: 'PUBLISHED', confirmation: 'CONFIRMED' } });
      courseId = (await prisma.course.create({ data: { slug: 'lms-course', code: 'LMS100', titleEn: 'Online Course', titleAr: 'مقرر', creditHours: 3, departmentId: dept.id, publishStatus: 'PUBLISHED', confirmation: 'CONFIRMED' } })).id;
    });

    it('application fee is the last step: 402 until paid, then submitted with a receipt', async () => {
      await prisma.siteSetting.update({ where: { key: 'admissions.applicationFeeAed' }, data: { valueEn: '250', confirmation: 'CONFIRMED' } });
      const prog = await prisma.program.findFirstOrThrow({ where: { slug: 'p1' } });
      const a = (await http.post('/api/v1/applications').set(H(student)).expect(201)).body.data;
      await http.put(`/api/v1/applications/${a.id}/steps/1`).set(H(student)).send({ firstName: 'S', lastName: 'O', dateOfBirth: '2006-01-01', gender: 'male', nationality: 'UAE' }).expect(200);
      await http.put(`/api/v1/applications/${a.id}/steps/2`).set(H(student)).send({ phone: '+971500000000', addressLine: 'A 1', city: 'Dubai', country: 'UAE' }).expect(200);
      await http.put(`/api/v1/applications/${a.id}/steps/3`).set(H(student)).send({ qualification: 'IB_DIPLOMA', institution: 'X School', graduationYear: 2026, overallPercent: 80 }).expect(200);
      await http.put(`/api/v1/applications/${a.id}/steps/4`).set(H(student)).send({ programSlug: prog.slug }).expect(200);
      await http.post(`/api/v1/applications/${a.id}/documents`).set(H(student)).field('docType', 'passport').attach('file', PDF, { filename: 'p.pdf', contentType: 'application/pdf' }).expect(201);

      const blocked = await http.post(`/api/v1/applications/${a.id}/submit`).set(H(student)).expect(402);
      expect(blocked.body.error.code).toBe('PAYMENT_REQUIRED');

      const start = (await http.post(`/api/v1/payments/application/${a.id}`).set(H(student)).expect(201)).body.data;
      expect(start.completed).toBe(false);
      expect(start.checkout.amount).toBe(25000);

      // Forged signature is rejected and nothing is submitted
      await http.post('/api/v1/payments/verify').set(H(student)).send({ orderId: start.checkout.orderId, paymentId: 'test_pay_forged123', signature: 'deadbeefdeadbeef' }).expect(400);
      expect((await prisma.application.findUniqueOrThrow({ where: { id: a.id } })).status).toBe('DRAFT');

      // A new order after the failure, completed through the (server-side) test gateway
      const again = (await http.post(`/api/v1/payments/application/${a.id}`).set(H(student)).expect(201)).body.data;
      const paid = (await http.post('/api/v1/payments/test/complete').set(H(student)).send({ orderId: again.checkout.orderId }).expect(200)).body.data;
      expect(paid.status).toBe('SUCCEEDED');
      expect(paid.receiptNumber).toMatch(/^RCPT-\d{4}-/);
      expect((await prisma.application.findUniqueOrThrow({ where: { id: a.id } })).status).toBe('SUBMITTED');

      // Idempotent: completing again does not create a second receipt
      await http.post('/api/v1/payments/test/complete').set(H(student)).send({ orderId: again.checkout.orderId }).expect(200);
      expect(await prisma.payment.count({ where: { applicationId: a.id, status: 'SUCCEEDED' } })).toBe(1);

      const receipt = (await http.get(`/api/v1/me/payments/${paid.id}/receipt`).set(H(student)).expect(200)).body.data;
      expect(receipt.applicationReference).toBe(a.reference);
      await http.get(`/api/v1/me/payments/${paid.id}/receipt`).set(H(other)).expect(404);
    });

    it('admin builds an online course: pricing, video lesson, notes, quiz (with type checks)', async () => {
      await http.put(`/api/v1/admin/lms/courses/${courseId}/online`).set(H(admin)).send({ onlineEnabled: true, deliveryMode: 'LIVE', priceAed: 99.5 }).expect(200);
      await http.post(`/api/v1/admin/lms/courses/${courseId}/lessons`).set(H(admin)).field('titleEn', 'Bad').field('titleAr', 'س').attach('video', Buffer.from('not a video'), { filename: 'x.mp4', contentType: 'video/mp4' }).expect(400);
      const lesson = (await http.post(`/api/v1/admin/lms/courses/${courseId}/lessons`).set(H(admin)).field('titleEn', 'Lecture 1').field('titleAr', 'المحاضرة 1').field('descriptionEn', 'Intro').attach('video', MP4, { filename: 'l1.mp4', contentType: 'video/mp4' }).expect(201)).body.data;
      expect(lesson.videoBytes).toBe(MP4.length);
      await http.post(`/api/v1/admin/lms/courses/${courseId}/notes`).set(H(admin)).field('titleEn', 'Notes').field('titleAr', 'ملاحظات').attach('file', PDF, { filename: 'n.pdf', contentType: 'application/pdf' }).expect(201);
      await http.post(`/api/v1/admin/lms/courses/${courseId}/quizzes`).set(H(admin)).send({ titleEn: 'Q', titleAr: 'س', questions: [{ textEn: '2+2?', textAr: '٢+٢؟', options: [{ en: '3', ar: '٣' }, { en: '4', ar: '٤' }], correct: 1 }] }).expect(201);
      await http.post(`/api/v1/admin/lms/courses/${courseId}/quizzes`).set(H(admin)).send({ titleEn: 'Bad', titleAr: 'س', questions: [{ textEn: 'x', textAr: 'x', options: [{ en: 'a', ar: 'a' }, { en: 'b', ar: 'b' }], correct: 5 }] }).expect(400);
      // Students cannot use the builder
      await http.get(`/api/v1/admin/lms/courses/${courseId}`).set(H(student)).expect(403);
    });

    it('purchase requires login, activates the course after payment and gates content', async () => {
      await http.post('/api/v1/payments/course/lms-course').expect(401);
      const pub = (await http.get('/api/v1/public/courses/lms-course').expect(200)).body.data;
      expect(pub.priceFils).toBe(9950);
      expect(pub.lessons[0]).not.toHaveProperty('videoKey');

      await http.get('/api/v1/me/courses/lms-course').set(H(student)).expect(403);
      const start = (await http.post('/api/v1/payments/course/lms-course').set(H(student)).expect(201)).body.data;
      expect((await http.get('/api/v1/me/enrollments/lms-course').set(H(student)).expect(200)).body.data.status).toBe('PENDING_PAYMENT');
      await http.post('/api/v1/payments/test/complete').set(H(student)).send({ orderId: start.checkout.orderId }).expect(200);
      expect((await http.get('/api/v1/me/enrollments/lms-course').set(H(student)).expect(200)).body.data.status).toBe('ACTIVE');
      await http.post('/api/v1/payments/course/lms-course').set(H(student)).expect(409);

      const mine = (await http.get('/api/v1/me/courses').set(H(student)).expect(200)).body.data;
      expect(mine[0].course.slug).toBe('lms-course');
      const learn = (await http.get('/api/v1/me/courses/lms-course').set(H(student)).expect(200)).body.data;
      expect(learn.quizzes[0].questions[0]).not.toHaveProperty('correct');

      // Signed video URL with HTTP Range support; other students are refused
      const { url } = (await http.get(`/api/v1/me/lessons/${learn.lessons[0].id}/url`).set(H(student)).expect(200)).body.data;
      const range = await http.get(url).set('Range', 'bytes=0-99').expect(206);
      expect(range.headers['content-range']).toBe(`bytes 0-99/${MP4.length}`);
      await http.get(`/api/v1/me/lessons/${learn.lessons[0].id}/url`).set(H(other)).expect(403);
      await http.get('/api/v1/media/tampered.token').expect(403);

      const note = (await http.get(`/api/v1/me/notes/${learn.notes[0].id}/url?download=1`).set(H(student)).expect(200)).body.data;
      const dl = await http.get(note.url).expect(200);
      expect(dl.headers['content-disposition']).toMatch(/^attachment/);

      const attempt = (await http.post(`/api/v1/me/quizzes/${learn.quizzes[0].id}/attempts`).set(H(student)).send({ answers: [1] }).expect(200)).body.data;
      expect(attempt).toMatchObject({ score: 1, total: 1, passed: true });
      const notes = (await http.get('/api/v1/me/notifications').set(H(student)).expect(200)).body;
      expect(notes.data.some((n: { type: string }) => n.type === 'enrollment')).toBe(true);
    });

    it('live class: go live notifies enrolled students, join is gated, recording becomes a lesson', async () => {
      const s = (await http.post('/api/v1/admin/live/sessions').set(H(admin)).send({ courseId, titleEn: 'Live 1', titleAr: 'مباشر 1', scheduledAt: new Date(Date.now() + 3600_000).toISOString(), durationMin: 45 }).expect(201)).body.data;
      await http.get(`/api/v1/me/live/${s.id}/join`).set(H(student)).expect(409); // not started
      await http.post(`/api/v1/admin/live/sessions/${s.id}/start`).set(H(admin)).expect(200);
      const n = (await http.get('/api/v1/me/notifications').set(H(student)).expect(200)).body.data;
      expect(n.some((x: { titleEn: string; link: string }) => x.titleEn === 'Live now: Live 1' && x.link === `/portal/live/${s.id}`)).toBe(true);
      const join = (await http.get(`/api/v1/me/live/${s.id}/join`).set(H(student)).expect(200)).body.data;
      expect(join.sessionId).toBe(s.id);
      await http.get(`/api/v1/me/live/${s.id}/join`).set(H(other)).expect(403);
      await http.post(`/api/v1/admin/live/sessions/${s.id}/end`).set(H(admin)).expect(200);

      // Draft first (private), then publish with notes + quiz
      await http.post(`/api/v1/admin/live/sessions/${s.id}/recording`).set(H(admin)).field('action', 'draft').attach('video', WEBM, { filename: 'rec.webm', contentType: 'video/webm' }).expect(201);
      const before = (await http.get('/api/v1/me/courses/lms-course').set(H(student))).body.data.lessons.length;
      await http.get(`/api/v1/admin/live/sessions/${s.id}/recording-url`).set(H(admin)).expect(200);
      const quiz = JSON.stringify([{ textEn: 'Q?', textAr: 'س؟', options: [{ en: 'a', ar: 'أ' }, { en: 'b', ar: 'ب' }], correct: 0 }]);
      await http.post(`/api/v1/admin/live/sessions/${s.id}/publish`).set(H(admin)).send({ titleEn: 'Live 1 recording', titleAr: 'تسجيل', notesEn: 'Key points', quiz }).expect(200);
      const after = (await http.get('/api/v1/me/courses/lms-course').set(H(student))).body.data;
      expect(after.lessons.length).toBe(before + 1);
      expect(after.notes.some((x: { titleEn: string }) => x.titleEn === 'Notes: Live 1 recording')).toBe(true);
      expect(after.quizzes.some((x: { titleEn: string }) => x.titleEn === 'Quiz: Live 1 recording')).toBe(true);
      await http.post(`/api/v1/admin/live/sessions/${s.id}/publish`).set(H(admin)).send({}).expect(409);
    });

    it('live classroom over websockets: gated join, attendance, presence, comments, moderation, end', async () => {
      const { io } = await import('socket.io-client');
      await app.listen(0);
      const port = (app.getHttpServer().address() as { port: number }).port;
      const connect = (token: string) => io(`http://127.0.0.1:${port}/live`, { auth: { token }, transports: ['websocket'], forceNew: true });
      const call = <T,>(sock: ReturnType<typeof connect>, ev: string, payload: unknown) => new Promise<{ ok: boolean; data: T; error?: { code: string } }>((r) => sock.emit(ev, payload, r));
      const once = <T,>(sock: ReturnType<typeof connect>, ev: string) => new Promise<T>((r) => sock.once(ev, r));

      const sess = (await http.post('/api/v1/admin/live/sessions').set(H(admin)).send({ courseId, titleEn: 'WS class', titleAr: 'حصة', scheduledAt: new Date().toISOString() }).expect(201)).body.data;
      const host = connect(admin);
      const early = await call(host, 'join', { sessionId: sess.id });
      expect(early.error?.code).toBe('NOT_LIVE');
      await http.post(`/api/v1/admin/live/sessions/${sess.id}/start`).set(H(admin)).expect(200);
      const hj = await call<{ isHost: boolean; rtpCapabilities: unknown; participants: unknown[] }>(host, 'join', { sessionId: sess.id });
      expect(hj.ok).toBe(true);
      expect(hj.data.isHost).toBe(true);
      expect(hj.data.rtpCapabilities).toBeTruthy();

      // Not enrolled → refused
      const outsider = connect(other);
      expect((await call(outsider, 'join', { sessionId: sess.id })).error?.code).toBe('NOT_ENROLLED');

      // Enrolled student → attendance + teacher sees name + viewer count
      const participantsP = once<{ name: string }[]>(host, 'participants');
      const stu = connect(student);
      const sj = await call<{ isHost: boolean; viewers: number }>(stu, 'join', { sessionId: sess.id });
      expect(sj.ok).toBe(true);
      expect(sj.data.isHost).toBe(false);
      expect((await participantsP).map((p) => p.name)).toContain('Student One');
      expect(await prisma.liveAttendance.count({ where: { sessionId: sess.id } })).toBe(1);
      const stuTransport = await call<{ id: string }>(stu, 'createTransport', {});
      expect(stuTransport.ok).toBe(true);
      expect((await call(stu, 'produce', { transportId: stuTransport.data.id, kind: 'video', rtpParameters: {} })).error?.code).toBe('FORBIDDEN');

      // Comments reach everyone; only the teacher can delete
      const got = once<{ body: string; name: string }>(host, 'chat');
      expect((await call(stu, 'chat', { body: 'Hello teacher' })).ok).toBe(true);
      const msg = await got;
      expect(msg).toMatchObject({ body: 'Hello teacher', name: 'Student One' });
      expect((await call(stu, 'chat', { body: 'spam' })).error?.code).toBe('TOO_FAST');
      const saved = await prisma.liveChatMessage.findFirstOrThrow({ where: { sessionId: sess.id } });
      expect((await call(stu, 'deleteChat', { id: saved.id })).error?.code).toBe('FORBIDDEN');
      expect((await call(host, 'deleteChat', { id: saved.id })).ok).toBe(true);

      // Live attendance report while connected
      const live = (await http.get(`/api/v1/admin/live/sessions/${sess.id}/attendance`).set(H(admin)).expect(200)).body;
      expect(live.data.find((r: { email: string }) => r.email === 'student1@example.test')).toMatchObject({ onlineNow: true, joinCount: 1 });

      // Teacher ends the class → student is told, attendance finalised
      const ended = once(stu, 'ended');
      await new Promise((r) => setTimeout(r, 1100));
      await http.post(`/api/v1/admin/live/sessions/${sess.id}/end`).set(H(admin)).expect(200);
      await ended;
      const att = await prisma.liveAttendance.findFirstOrThrow({ where: { sessionId: sess.id } });
      expect(att.totalSeconds).toBeGreaterThanOrEqual(1);
      expect(att.lastLeftAt).not.toBeNull();
      const report = (await http.get(`/api/v1/admin/live/sessions/${sess.id}/attendance`).set(H(admin)).expect(200)).body;
      expect(report.meta.enrolled).toBeGreaterThanOrEqual(1);
      expect(['PRESENT', 'LATE', 'PARTIAL']).toContain(report.data.find((r: { email: string }) => r.email === 'student1@example.test').status);
      [host, stu, outsider].forEach((x) => x.close());
    });

    it('records staff logins only, and purges entries older than 12 months', async () => {
      const before = await prisma.staffLogin.count();
      await login('student1@example.test', 'StudentPass123');
      expect(await prisma.staffLogin.count()).toBe(before);
      await login(ADMIN.email, 'wrong-password', 'admin');
      await login(ADMIN.email, ADMIN.password, 'admin');
      const rows = (await http.get('/api/v1/admin/staff-logins').set(H(admin)).expect(200)).body.data;
      expect(rows[0]).toMatchObject({ email: ADMIN.email, success: true });
      expect(rows[1]).toMatchObject({ success: false, reason: 'INVALID_CREDENTIALS' });
      await http.get('/api/v1/admin/staff-logins').set(H(student)).expect(403);

      const old = new Date(); old.setFullYear(old.getFullYear() - 1); old.setDate(old.getDate() - 1);
      await prisma.staffLogin.create({ data: { email: 'old@example.test', success: true, createdAt: old } });
      const { RetentionService } = await import('../src/maintenance/retention.service');
      await app.get(RetentionService).purge();
      expect(await prisma.staffLogin.count({ where: { email: 'old@example.test' } })).toBe(0);
    });

    it('eligibility: admin rules + check across all programmes', async () => {
      const prog = await prisma.program.findFirstOrThrow({ where: { slug: 'p1' } });
      await http.put(`/api/v1/admin/academics/programs/${prog.id}/eligibility`).set(H(admin)).send({ rules: [{ qualification: 'UAE_SECONDARY_ADVANCED', minOverallPercent: 80, subjectMinimums: [{ subject: 'Physics', minPercent: 70 }], confirmation: 'CONFIRMED' }] }).expect(200);
      const ok = (await http.post('/api/v1/admin/academics/eligibility-check').set(H(admin)).send({ qualification: 'UAE_SECONDARY_ADVANCED', overallPercent: 85, subjects: [{ subject: 'physics', percent: 90 }] }).expect(200)).body;
      expect(ok.data.find((r: { program: { slug: string } }) => r.program.slug === 'p1').status).toBe('ELIGIBLE');
      const no = (await http.post('/api/v1/public/admissions/eligibility/all').send({ qualification: 'UAE_SECONDARY_ADVANCED', overallPercent: 70 }).expect(200)).body;
      const r = no.data.find((x: { program: { slug: string } }) => x.program.slug === 'p1');
      expect(r.status).toBe('NOT_ELIGIBLE');
      expect(r.unmet.map((u: { requirement: string }) => u.requirement)).toEqual(['overall', 'Physics']);
      await http.put(`/api/v1/admin/academics/programs/${prog.id}/eligibility`).set(H(admin)).send({ rules: [{ qualification: 'IB_DIPLOMA', minOverallPercent: 1 }, { qualification: 'IB_DIPLOMA', minOverallPercent: 2 }] }).expect(400);
      await http.put(`/api/v1/admin/academics/programs/${prog.id}/curriculum`).set(H(admin)).send({ items: [{ courseId, year: 1, term: 1 }] }).expect(200);
    });

    it('course builder → weekly timetable → auto classes, teacher dashboard, progress and finance', async () => {
      const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 3)]);
      const facultyRole = await prisma.role.findUniqueOrThrow({ where: { key: 'FACULTY' } });
      const { hashPassword } = await import('../src/auth/password');
      const teacherUser = await prisma.user.create({ data: { email: 'teacher@example.test', fullName: 'Teacher One', passwordHash: await hashPassword('TeacherPass123'), emailVerified: true, roles: { create: { roleId: facultyRole.id } } } });
      const teacher = (await login('teacher@example.test', 'TeacherPass123', 'admin').then((r) => r.body)).data.accessToken as string;

      const opts = (await http.get('/api/v1/admin/lms/options').set(H(admin)).expect(200)).body.data;
      expect(opts.teachers.map((t: { email: string }) => t.email)).toContain('teacher@example.test');
      const dept = await prisma.department.findUniqueOrThrow({ where: { slug: 'lms-d' } });
      const details = { titleEn: 'Builder Course', titleAr: 'مقرر', code: 'bld-200', departmentId: dept.id, outcomesEn: ['One'], priceAed: 0, teacherId: teacherUser.id };
      const c = (await http.post('/api/v1/admin/lms/courses').set(H(admin)).send(details).expect(201)).body.data;
      expect(c.code).toBe('BLD-200');
      await http.post('/api/v1/admin/lms/courses').set(H(admin)).send(details).expect(409);
      const img = (await http.post(`/api/v1/admin/lms/courses/${c.id}/image`).set(H(admin)).attach('image', PNG, { filename: 'c.png', contentType: 'image/png' }).expect(201)).body.data;
      expect((await http.get(img.imagePath).expect(200)).headers['content-type']).toBe('image/png');

      const topic = (await http.post(`/api/v1/admin/lms/courses/${c.id}/topics`).set(H(admin)).send({ titleEn: 'Week 1', titleAr: 'الأسبوع 1' }).expect(201)).body.data;
      const lesson = (await http.post(`/api/v1/admin/lms/courses/${c.id}/lessons`).set(H(admin)).field('titleEn', 'L1').field('titleAr', 'د1').field('topicId', topic.id).attach('video', MP4, { filename: 'l.mp4', contentType: 'video/mp4' }).expect(201)).body.data;
      expect(lesson.topicId).toBe(topic.id);
      await http.delete(`/api/v1/admin/lms/topics/${topic.id}`).set(H(admin)).expect(409);

      // Timetable: class every day of the week, 10:00–11:00 Dubai time, for two weeks.
      const { dubaiDate, addDays } = await import('../src/common/dubai-time');
      const today = dubaiDate(new Date());
      const slots = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, startTime: '10:00', endTime: '11:00' }));
      await http.put(`/api/v1/admin/lms/courses/${c.id}/live-plan`).set(H(admin)).send({ enabled: true, startsOn: today, endsOn: addDays(today, 14), slots: [{ weekday: 1, startTime: '11:00', endTime: '10:00' }] }).expect(400);
      await http.put(`/api/v1/admin/lms/courses/${c.id}/live-plan`).set(H(admin)).send({ enabled: true, startsOn: today, endsOn: addDays(today, 14), slots }).expect(200);
      expect(await prisma.liveSession.count({ where: { courseId: c.id } })).toBe(0); // drafts get no classes
      await http.post(`/api/v1/admin/lms/courses/${c.id}/publish`).set(H(admin)).send({ publish: true }).expect(200);
      const generated = await prisma.liveSession.count({ where: { courseId: c.id, slotId: { not: null } } });
      expect(generated).toBeGreaterThanOrEqual(7);
      const { LiveSchedulerService } = await import('../src/live/scheduler.service');
      const scheduler = app.get(LiveSchedulerService);
      expect(await scheduler.generate(c.id)).toBe(0); // idempotent

      // Student joins the free course and watches the lecture.
      await http.post(`/api/v1/payments/course/${c.slug}`).set(H(other)).expect(201);
      await http.post(`/api/v1/me/lessons/${lesson.id}/progress`).set(H(other)).send({ positionSec: 30, completed: true }).expect(200);
      const learn = (await http.get(`/api/v1/me/courses/${c.slug}`).set(H(other)).expect(200)).body.data;
      expect(learn.topics[0].titleEn).toBe('Week 1');
      expect(learn.lessons[0].completed).toBe(true);

      // At class time the class opens and everyone is notified.
      const next = await prisma.liveSession.findFirstOrThrow({ where: { courseId: c.id, status: 'SCHEDULED' }, orderBy: { scheduledAt: 'asc' } });
      await prisma.liveSession.update({ where: { id: next.id }, data: { scheduledAt: new Date(Date.now() - 60_000) } });
      await scheduler.openDue();
      expect((await prisma.liveSession.findUniqueOrThrow({ where: { id: next.id } })).status).toBe('LIVE');
      const otherUser = await prisma.user.findUniqueOrThrow({ where: { email: 'student2@example.test' } });
      expect(await prisma.notification.count({ where: { userId: otherUser.id, link: `/portal/live/${next.id}` } })).toBe(1);
      expect(await prisma.notification.count({ where: { userId: teacherUser.id, link: `/admin/live/${next.id}` } })).toBe(1);

      // Teacher sees only their own course and its students' progress.
      const ov = (await http.get('/api/v1/teach/overview').set(H(teacher)).expect(200)).body.data;
      expect(ov.courses.map((x: { code: string }) => x.code)).toEqual(['BLD-200']);
      const rows = (await http.get(`/api/v1/teach/courses/${c.id}/students`).set(H(teacher)).expect(200)).body.data;
      expect(rows[0]).toMatchObject({ name: 'Student Two', lecturesDone: 1, lecturesTotal: 1 });
      await http.get(`/api/v1/teach/courses/${courseId}/students`).set(H(teacher)).expect(403);
      await http.get(`/api/v1/admin/live/sessions/${next.id}`).set(H(teacher)).expect(200);
      const foreign = await prisma.liveSession.create({ data: { courseId, titleEn: 'x', titleAr: 'x', scheduledAt: new Date(), roomName: 'foreign-room' } });
      await http.post(`/api/v1/admin/live/sessions/${foreign.id}/start`).set(H(teacher)).expect(403);
      await http.post(`/api/v1/admin/live/courses/${courseId}/now`).set(H(teacher)).expect(403);
      await http.get('/api/v1/admin/lms/courses').set(H(teacher)).expect(403);
      await http.get('/api/v1/admin/finance/summary').set(H(teacher)).expect(403);
      await scheduler.closeStale(new Date(Date.now() + 3 * 3600_000));
      expect((await prisma.liveSession.findUniqueOrThrow({ where: { id: next.id } })).status).toBe('ENDED');

      // Finance sees who bought what, paid and due.
      const sum = (await http.get('/api/v1/admin/finance/summary').set(H(admin)).expect(200)).body.data;
      expect(sum).toMatchObject({ collectedFils: expect.any(Number), dueFils: expect.any(Number) });
      const fin = (await http.get('/api/v1/admin/finance/students?q=student').set(H(admin)).expect(200)).body.data;
      const two = fin.find((r: { email: string }) => r.email === 'student2@example.test');
      expect(two.courses.map((x: { code: string }) => x.code)).toContain('BLD-200');
      const det = (await http.get(`/api/v1/admin/finance/students/${two.id}`).set(H(admin)).expect(200)).body.data;
      expect(det.enrollments.length).toBeGreaterThan(0);
    });
  });
});
