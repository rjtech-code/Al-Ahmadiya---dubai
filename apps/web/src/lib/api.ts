import 'server-only';
import type * as T from './types';

/**
 * Public website content for the frontend-only preview.
 * Every record below is synthetic demonstration content, not verified institutional information.
 * Replace it with client-approved content before using this site as a live university website.
 */
export class ApiUnavailableError extends Error {}

const colleges: T.CollegeSummary[] = [
  { id: 'demo-college-01', slug: 'computing', nameEn: 'Demo College of Computing', nameAr: 'كلية الحوسبة التجريبية', summaryEn: 'Sample content for computing and digital technology programmes.', summaryAr: 'محتوى تجريبي لبرامج الحوسبة والتقنية الرقمية.', imagePath: '/images/campus/academic.jpg', confirmation: 'CLIENT_CONFIRMATION_REQUIRED', departments: [{ slug: 'computer-science', nameEn: 'Demo Computer Science', nameAr: 'علوم الحاسوب التجريبية' }] },
  { id: 'demo-college-02', slug: 'business', nameEn: 'Demo College of Business', nameAr: 'كلية الأعمال التجريبية', summaryEn: 'Sample content for business and management programmes.', summaryAr: 'محتوى تجريبي لبرامج الأعمال والإدارة.', imagePath: '/images/campus/academic.jpg', confirmation: 'CLIENT_CONFIRMATION_REQUIRED', departments: [{ slug: 'business-administration', nameEn: 'Demo Business Administration', nameAr: 'إدارة الأعمال التجريبية' }] },
];
const departments: T.DepartmentSummary[] = [
  { id: 'demo-dept-01', slug: 'computer-science', nameEn: 'Demo Computer Science', nameAr: 'علوم الحاسوب التجريبية' },
  { id: 'demo-dept-02', slug: 'business-administration', nameEn: 'Demo Business Administration', nameAr: 'إدارة الأعمال التجريبية' },
];
const programs: T.ProgramSummary[] = [
  { id: 'demo-program-01', slug: 'computer-science', degreeLevel: 'BACHELOR', nameEn: 'Demo Bachelor of Computer Science', nameAr: 'بكالوريوس علوم الحاسوب التجريبي', summaryEn: 'A sample programme record for local preview only.', summaryAr: 'سجل برنامج تجريبي للمعاينة المحلية فقط.', durationYears: '4', totalCredits: 120, category: 'Computing', imagePath: '/images/campus/academic.jpg', isFeatured: true, confirmation: 'CLIENT_CONFIRMATION_REQUIRED', department: { nameEn: departments[0].nameEn, nameAr: departments[0].nameAr, college: { slug: colleges[0].slug, nameEn: colleges[0].nameEn, nameAr: colleges[0].nameAr } } },
  { id: 'demo-program-02', slug: 'business-administration', degreeLevel: 'BACHELOR', nameEn: 'Demo Bachelor of Business Administration', nameAr: 'بكالوريوس إدارة الأعمال التجريبي', summaryEn: 'A sample business programme for local preview only.', summaryAr: 'برنامج أعمال تجريبي للمعاينة المحلية فقط.', durationYears: '4', totalCredits: 120, category: 'Business', imagePath: '/images/campus/academic.jpg', isFeatured: false, confirmation: 'CLIENT_CONFIRMATION_REQUIRED', department: { nameEn: departments[1].nameEn, nameAr: departments[1].nameAr, college: { slug: colleges[1].slug, nameEn: colleges[1].nameEn, nameAr: colleges[1].nameAr } } },
];
const courses: T.CourseSummary[] = [
  { id: 'demo-course-01', slug: 'intro-to-computing', code: 'DEMO-CS101', titleEn: 'Demo: Introduction to Computing', titleAr: 'تجريبي: مقدمة في الحوسبة', descriptionEn: 'Synthetic course record for local preview.', descriptionAr: 'سجل مقرر تجريبي للمعاينة المحلية.', creditHours: 3, courseType: 'CORE', imagePath: '/images/campus/academic.jpg', onlineEnabled: true, confirmation: 'CLIENT_CONFIRMATION_REQUIRED' },
  { id: 'demo-course-02', slug: 'business-foundations', code: 'DEMO-BUS101', titleEn: 'Demo: Business Foundations', titleAr: 'تجريبي: أساسيات الأعمال', descriptionEn: 'Synthetic course record for local preview.', descriptionAr: 'سجل مقرر تجريبي للمعاينة المحلية.', creditHours: 3, courseType: 'CORE', imagePath: '/images/campus/academic.jpg', onlineEnabled: true, confirmation: 'CLIENT_CONFIRMATION_REQUIRED' },
];
const faculty: T.FacultySummary[] = [
  { id: 'demo-faculty-01', slug: 'demo-faculty-member', fullNameEn: 'Demo Faculty Member', fullNameAr: 'عضو هيئة تدريس تجريبي', titleEn: 'Sample Lecturer', titleAr: 'محاضر تجريبي', photoPath: null, specializationEn: 'Computing', specializationAr: 'الحوسبة', email: 'faculty.demo@example.test', departments: [{ slug: departments[0].slug, nameEn: departments[0].nameEn, nameAr: departments[0].nameAr }] },
];
const news: T.NewsSummary[] = [
  { id: 'demo-news-01', slug: 'local-demo-announcement', category: 'announcement', titleEn: 'Local demo announcement', titleAr: 'إعلان تجريبي محلي', excerptEn: 'Sample announcement content for preview only.', excerptAr: 'محتوى إعلان تجريبي للمعاينة فقط.', imagePath: null, isFeatured: true, isAnnouncement: true, publishedAt: '2026-11-20T09:00:00.000Z' },
  { id: 'demo-news-02', slug: 'local-demo-campus-update', category: 'university', titleEn: 'Local demo campus update', titleAr: 'تحديث تجريبي للحرم الجامعي', excerptEn: 'Synthetic campus news for local preview.', excerptAr: 'خبر جامعي اصطناعي للمعاينة المحلية.', imagePath: null, isFeatured: false, isAnnouncement: false, publishedAt: '2026-11-18T09:00:00.000Z' },
];
const events: T.EventSummary[] = [
  { id: 'demo-event-01', slug: 'demo-open-day', category: 'academic', titleEn: 'Demo open day', titleAr: 'اليوم المفتوح التجريبي', summaryEn: 'Sample event entry for local preview only.', summaryAr: 'إدخال فعالية تجريبية للمعاينة المحلية فقط.', startsAt: '2026-12-10T09:00:00.000Z', endsAt: '2026-12-10T13:00:00.000Z', venueEn: 'Demo campus venue', venueAr: 'موقع الحرم التجريبي', imagePath: null, registrationUrl: null, isFeatured: true },
  { id: 'demo-event-02', slug: 'demo-academic-workshop', category: 'workshop', titleEn: 'Demo academic workshop', titleAr: 'ورشة أكاديمية تجريبية', summaryEn: 'Synthetic event for local preview.', summaryAr: 'فعالية اصطناعية للمعاينة المحلية.', startsAt: '2026-12-18T09:00:00.000Z', endsAt: '2026-12-18T11:00:00.000Z', venueEn: 'Demo learning centre', venueAr: 'مركز التعلم التجريبي', imagePath: null, registrationUrl: null, isFeatured: false },
];
const publications: T.PublicationSummary[] = [
  { id: 'demo-publication-01', slug: 'sample-research-record', type: 'report', titleEn: 'Sample research record', titleAr: 'سجل بحثي تجريبي', abstractEn: 'Synthetic research entry for local preview only.', abstractAr: 'مدخل بحثي اصطناعي للمعاينة المحلية فقط.', keywords: ['demo', 'sample'], journal: null, doi: null, coverPath: null, publishedOn: '2026-10-01', isFeatured: true, authors: [{ name: 'Demo Author', affiliation: 'Demo Department', position: 1 }] },
];
const faqs: T.Faq[] = [
  { id: 'demo-faq-01', questionEn: 'Is this a live university service?', questionAr: 'هل هذه خدمة جامعية مباشرة؟', answerEn: 'No. This is a frontend-only local demonstration.', answerAr: 'لا. هذه معاينة محلية للواجهة الأمامية فقط.' },
  { id: 'demo-faq-02', questionEn: 'Are the programme details verified?', questionAr: 'هل تفاصيل البرامج موثقة؟', answerEn: 'No. Sample content must be replaced with client-approved information.', answerAr: 'لا. يجب استبدال المحتوى التجريبي بمعلومات معتمدة من العميل.' },
];
const milestones: T.Milestone[] = [
  { id: 'demo-milestone-01', yearLabel: 'Demo', titleEn: 'Historical content awaiting verification', titleAr: 'محتوى تاريخي بانتظار التحقق', bodyEn: 'Placeholder only. No historical claim is made in this demo.', bodyAr: 'عنصر نائب فقط. لا يتضمن هذا العرض أي ادعاء تاريخي.', sourceUrls: [], caveatEn: 'Replace only with verified institutional history.', caveatAr: 'استبدله فقط بتاريخ مؤسسي موثق.', confirmation: 'CLIENT_CONFIRMATION_REQUIRED' },
];
const tour: T.TourStop[] = [
  { id: 'demo-tour-01', slug: 'demo-library', kind: 'library', titleEn: 'Demo library stop', titleAr: 'محطة المكتبة التجريبية', descriptionEn: 'Sample campus-tour stop for preview only.', descriptionAr: 'محطة جولة جامعية تجريبية للمعاينة فقط.', imagePath: '/images/campus/library.jpg', panoramaUrl: null, isHeritage: false },
];
const pageOf = <X,>(rows: X[], q: Record<string, string | number | undefined> = {}): T.Paged<X> => {
  const page = Math.max(1, Number(q.page ?? 1) || 1);
  const pageSize = Math.max(1, Number(q.pageSize ?? 12) || 12);
  const start = (page - 1) * pageSize;
  return { data: rows.slice(start, start + pageSize), meta: { page, pageSize, total: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / pageSize)) } };
};
const matches = (value: unknown, q: unknown) => !q || String(value ?? '').toLowerCase().includes(String(q).toLowerCase());
const collegeDetail = (c: T.CollegeSummary): T.College => ({
  ...c, overviewEn: 'Synthetic overview for local preview only.', overviewAr: 'نظرة عامة اصطناعية للمعاينة المحلية فقط.',
  visionEn: null, visionAr: null, missionEn: null, missionAr: null, dean: null,
  departments: departments.filter((d) => c.slug === 'computing' ? d.slug === 'computer-science' : d.slug === 'business-administration').map((d) => ({ ...d, programs: programs.filter((p) => p.department?.nameEn === d.nameEn), faculty: [] })),
});
const programDetail = (p: T.ProgramSummary): T.Program => ({
  ...p, overviewEn: 'Synthetic programme overview for local preview only.', overviewAr: 'نظرة عامة اصطناعية للبرنامج للمعاينة المحلية فقط.',
  outcomesEn: ['Sample learning outcome'], outcomesAr: ['نتيجة تعلم تجريبية'], requirementsEn: ['Client confirmation required'], requirementsAr: ['يتطلب تأكيد العميل'], careersEn: [], careersAr: [],
  department: { slug: p.department?.college.slug === 'computing' ? departments[0].slug : departments[1].slug, nameEn: p.department?.nameEn ?? departments[0].nameEn, nameAr: p.department?.nameAr ?? departments[0].nameAr, college: p.department?.college ?? { slug: colleges[0].slug, nameEn: colleges[0].nameEn, nameAr: colleges[0].nameAr } },
  curriculum: [{ year: 1, term: 1, course: { slug: courses[0].slug, code: courses[0].code, titleEn: courses[0].titleEn, titleAr: courses[0].titleAr, creditHours: 3 } }], related: programs.filter((x) => x.id !== p.id),
});
const courseDetail = (course: T.CourseSummary): T.Course => ({
  ...course, outcomesEn: ['Sample course outcome'], outcomesAr: ['نتيجة مقرر تجريبية'], syllabus: [{ module: 'Demo module', moduleAr: 'وحدة تجريبية', topicsEn: ['Sample topic'], topicsAr: ['موضوع تجريبي'] }],
  assessment: [{ labelEn: 'Sample assessment', labelAr: 'تقييم تجريبي', weight: 100 }], instructor: faculty[0],
  department: { slug: departments[0].slug, nameEn: departments[0].nameEn, nameAr: departments[0].nameAr },
  related: courses.filter((x) => x.id !== course.id), deliveryMode: 'RECORDED', priceFils: 0, currency: 'AED',
  topics: [{ id: 'demo-topic-01', titleEn: 'Sample topic', titleAr: 'موضوع تجريبي' }],
  lessons: [{ id: 'demo-lesson-01', titleEn: 'Sample lesson', titleAr: 'درس تجريبي', durationSec: 600 }],
  _count: { notes: 1, quizzes: 1, liveSessions: 0 },
});
const facultyDetail = (f: T.FacultySummary): T.Faculty => ({
  ...f, phone: null, bioEn: 'Synthetic faculty profile for local preview only.', bioAr: 'ملف تعريفي اصطناعي لعضو هيئة تدريس للمعاينة فقط.',
  linkedinUrl: null, orcid: null, education: [], researchInterestsEn: [], researchInterestsAr: [], awards: [],
  courses: courses.map((c) => ({ slug: c.slug, code: c.code, titleEn: c.titleEn, titleAr: c.titleAr })), publications: [],
});
const articleDetail = (n: T.NewsSummary): T.Article => ({
  ...n, bodyEn: 'This is synthetic demonstration content. Replace it with an approved news article before publication.',
  bodyAr: 'هذا محتوى تجريبي اصطناعي. استبدله بمقال إخباري معتمد قبل النشر.',
  quoteEn: null, quoteAr: null, quoteByEn: null, quoteByAr: null, sourceUrl: null, related: news.filter((x) => x.id !== n.id),
});
const eventDetail = (e: T.EventSummary): T.EventDetail => ({
  ...e, overviewEn: 'Synthetic event details for local preview only.', overviewAr: 'تفاصيل فعالية اصطناعية للمعاينة المحلية فقط.',
  mapUrl: null, agenda: [], speakers: [], faqs, related: events.filter((x) => x.id !== e.id),
});
const publicationDetail = (p: T.PublicationSummary): T.Publication => ({
  ...p, findingsEn: ['Sample finding'], findingsAr: ['نتيجة تجريبية'], fullTextUrl: null, related: publications.filter((x) => x.id !== p.id),
});

export const api = {
  settings: async () => ({ 'institution.name': { en: 'Al Ahmadiya — Demo', ar: 'الأحمدية — تجريبي', confirmation: 'CLIENT_CONFIRMATION_REQUIRED', sourceUrl: null } } as T.Settings),
  stats: async () => ({ colleges: colleges.length, programs: programs.length, courses: courses.length, faculty: faculty.length, publications: publications.length } as T.Stats),
  heritage: async () => ({ milestones, media: [] as T.Media[] }),
  colleges: async () => colleges,
  college: async (slug: string) => { const c = colleges.find((x) => x.slug === slug); return c ? collegeDetail(c) : null; },
  department: async (slug: string) => { const d = departments.find((x) => x.slug === slug); if (!d) return null; return { ...d, overviewEn: 'Synthetic department overview for local preview.', overviewAr: 'نظرة عامة اصطناعية للقسم للمعاينة.', objectivesEn: ['Sample objective'], objectivesAr: ['هدف تجريبي'], researchAreasEn: [], researchAreasAr: [], imagePath: null, contactEmail: null, confirmation: 'CLIENT_CONFIRMATION_REQUIRED' as const, college: { slug: colleges[0].slug, nameEn: colleges[0].nameEn, nameAr: colleges[0].nameAr }, head: faculty[0], programs, courses, faculty }; },
  programs: async (q: Record<string, string | number | undefined> = {}) => pageOf(programs.filter((p) => matches(p.nameEn, q.q) || matches(p.nameAr, q.q)).filter((p) => !q.degreeLevel || p.degreeLevel === q.degreeLevel), q),
  program: async (slug: string) => { const p = programs.find((x) => x.slug === slug); return p ? programDetail(p) : null; },
  courses: async (q: Record<string, string | number | undefined> = {}) => pageOf(courses.filter((p) => matches(p.titleEn, q.q) || matches(p.code, q.q)).filter((p) => !q.department || p.courseType === q.department), q),
  course: async (slug: string) => { const p = courses.find((x) => x.slug === slug); return p ? courseDetail(p) : null; },
  faculty: async (q: Record<string, string | number | undefined> = {}) => pageOf(faculty.filter((p) => matches(p.fullNameEn, q.q) || matches(p.specializationEn, q.q)), q),
  facultyMember: async (slug: string) => { const p = faculty.find((x) => x.slug === slug); return p ? facultyDetail(p) : null; },
  news: async (q: Record<string, string | number | undefined> = {}) => pageOf(news.filter((p) => (!q.category || p.category === q.category) && (!q.featured || p.isFeatured) && (matches(p.titleEn, q.q) || matches(p.excerptEn, q.q))), q),
  article: async (slug: string) => { const p = news.find((x) => x.slug === slug); return p ? articleDetail(p) : null; },
  events: async (q: Record<string, string | number | undefined> = {}) => events.filter((e) => (!q.category || e.category === q.category) && (!q.when || (q.when === 'upcoming' ? new Date(e.startsAt) >= new Date() : new Date(e.startsAt) < new Date()))).slice(0, Number(q.limit ?? 100)),
  event: async (slug: string) => { const p = events.find((x) => x.slug === slug); return p ? eventDetail(p) : null; },
  research: async (q: Record<string, string | number | undefined> = {}) => pageOf(publications.filter((p) => matches(p.titleEn, q.q) || matches(p.abstractEn, q.q)), q),
  publication: async (slug: string) => { const p = publications.find((x) => x.slug === slug); return p ? publicationDetail(p) : null; },
  tour: async () => tour,
  faqs: async (_scope: 'programs' | 'admissions') => faqs,
};

export interface AdmissionsConfig {
  open: boolean;
  statusConfirmation: string;
  programs: { slug: string; nameEn: string; nameAr: string; degreeLevel: string; eligibilityRules: { qualification: string; confirmation: string }[] }[];
  qualifications: string[];
}
export const admissionsConfig = async (): Promise<AdmissionsConfig> => ({
  open: true,
  statusConfirmation: 'DEMO_ONLY',
  programs: programs.map((p) => ({ slug: p.slug, nameEn: p.nameEn, nameAr: p.nameAr, degreeLevel: p.degreeLevel, eligibilityRules: [{ qualification: 'HIGH_SCHOOL', confirmation: 'CLIENT_CONFIRMATION_REQUIRED' }] })),
  qualifications: ['High school', 'Diploma', 'Bachelor degree'],
});
