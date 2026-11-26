import 'server-only';
import type * as T from './types';

/**
 * Public website content for the frontend-only preview.
 * Every record below is synthetic demonstration content, not verified institutional information.
 * Replace it with client-approved content before using this site as a live university website.
 */
export class ApiUnavailableError extends Error {}

import { CONTENT } from './public-content';
import { QUALIFICATIONS, rulesFor } from './eligibility';

type C = typeof CONTENT;
const DAY = 86_400_000;
const at = (days: number, hour = 9) => { const d = new Date(Date.now() + days * DAY); d.setUTCHours(hour - 4, 0, 0, 0); return d.toISOString(); };
const deptOf = (slug: string) => CONTENT.departments.find((d) => d.slug === slug)!;
const facultyBySlug = (slug: string | null | undefined) => (slug ? faculty.find((f) => f.slug === slug) ?? null : null);

const colleges: T.CollegeSummary[] = CONTENT.colleges.map((c) => ({ id: c.id, slug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr, summaryEn: c.summaryEn, summaryAr: c.summaryAr, imagePath: c.imagePath, confirmation: c.confirmation, departments: [...c.departments] }));
const departments: T.DepartmentSummary[] = CONTENT.departments.map((d) => ({ id: d.id, slug: d.slug, nameEn: d.nameEn, nameAr: d.nameAr }));
const programs: T.ProgramSummary[] = CONTENT.programs.map((p) => ({ id: p.id, slug: p.slug, degreeLevel: p.degreeLevel as T.DegreeLevel, nameEn: p.nameEn, nameAr: p.nameAr, summaryEn: p.summaryEn, summaryAr: p.summaryAr, durationYears: p.durationYears, totalCredits: p.totalCredits, category: p.category, imagePath: p.imagePath, isFeatured: p.isFeatured, confirmation: p.confirmation, department: p.department }));
const courses: T.CourseSummary[] = CONTENT.courses.map((c) => ({ id: c.id, slug: c.slug, code: c.code, titleEn: c.titleEn, titleAr: c.titleAr, descriptionEn: c.descriptionEn, descriptionAr: c.descriptionAr, creditHours: c.creditHours, courseType: c.courseType, imagePath: c.imagePath, onlineEnabled: true, confirmation: c.confirmation }));
const faculty: T.FacultySummary[] = CONTENT.faculty.map((f) => ({ ...f, departments: [...f.departments] }));
const news: T.NewsSummary[] = CONTENT.news.map(({ daysAgo, ...n }) => ({ ...n, publishedAt: at(-daysAgo) }));
const events: T.EventSummary[] = CONTENT.events.map(({ inDays, venueEn, venueAr, ...e }) => ({ ...e, startsAt: at(inDays, 10), endsAt: at(inDays, 13), venueEn: venueEn ?? 'Al Ahmadiya, Dubai', venueAr: venueAr ?? 'الأحمدية، دبي', registrationUrl: null }));
// Research publications are not listed until real, citable work is supplied.
const publications: T.PublicationSummary[] = [];
const faqs: T.Faq[] = CONTENT.faqs.map((f) => ({ id: f.id, questionEn: f.questionEn, questionAr: f.questionAr, answerEn: f.answerEn, answerAr: f.answerAr }));
/** Heritage timeline: facts with published sources only. */
const milestones: T.Milestone[] = [
  { id: 'm-1912', yearLabel: '1912', titleEn: 'Al Ahmadiya School is founded', titleAr: 'تأسيس المدرسة الأحمدية', bodyEn: 'Pearl merchant Sheikh Ahmed bin Dalmouk founds the school in Al Ras, Deira — remembered as Dubai’s first semi-formal school.', bodyAr: 'أسس تاجر اللؤلؤ الشيخ أحمد بن دلموك المدرسة في منطقة الراس بديرة، وتُعدّ أول مدرسة شبه نظامية في دبي.', sourceUrls: ['https://en.wikipedia.org/wiki/Al_Ahmadiya_School'], caveatEn: 'Some sources give a slightly different founding year.', caveatAr: 'تذكر بعض المصادر سنة تأسيس مختلفة قليلاً.', confirmation: 'CONFIRMED' },
  { id: 'm-1963', yearLabel: '1963', titleEn: 'A larger building', titleAr: 'مبنى أكبر', bodyEn: 'After educating more than 3,500 pupils, the school moves to a larger building to serve a growing city.', bodyAr: 'بعد أن تعلّم فيها أكثر من 3500 طالب، انتقلت المدرسة إلى مبنى أكبر لتخدم مدينة تنمو.', sourceUrls: ['https://en.wikipedia.org/wiki/Al_Ahmadiya_School'], caveatEn: null, caveatAr: null, confirmation: 'CONFIRMED' },
  { id: 'm-2000', yearLabel: '2000', titleEn: 'A museum of education', titleAr: 'متحف للتعليم', bodyEn: 'The restored 1912 building opens as a museum of education in the Al Ras heritage district.', bodyAr: 'افتُتح مبنى 1912 بعد ترميمه متحفاً للتعليم في منطقة الراس التراثية.', sourceUrls: ['https://en.wikipedia.org/wiki/Al_Ahmadiya_School'], caveatEn: null, caveatAr: null, confirmation: 'CONFIRMED' },
  { id: 'm-next', yearLabel: 'Next', titleEn: 'Towards a university', titleAr: 'نحو جامعة', bodyEn: 'Al Ahmadiya is preparing its next chapter as a proposed university, subject to official approval.', bodyAr: 'تستعد الأحمدية لفصلها القادم بوصفها جامعة مقترحة، رهناً بالموافقة الرسمية.', sourceUrls: [], caveatEn: 'Proposal — subject to regulatory approval.', caveatAr: 'مقترح — رهن الموافقة التنظيمية.', confirmation: 'CLIENT_CONFIRMATION_REQUIRED' },
];
const tour: T.TourStop[] = CONTENT.tour.map((s) => ({ ...s }));
const pageOf = <X,>(rows: X[], q: Record<string, string | number | undefined> = {}): T.Paged<X> => {
  const page = Math.max(1, Number(q.page ?? 1) || 1);
  const pageSize = Math.max(1, Number(q.pageSize ?? 12) || 12);
  const start = (page - 1) * pageSize;
  return { data: rows.slice(start, start + pageSize), meta: { page, pageSize, total: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / pageSize)) } };
};
const matches = (value: unknown, q: unknown) => !q || String(value ?? '').toLowerCase().includes(String(q).toLowerCase());
const courseExtra = (slug: string) => CONTENT.courses.find((c) => c.slug === slug)!;
const collegeDetail = (c: T.CollegeSummary): T.College => {
  const x = CONTENT.colleges.find((k) => k.slug === c.slug)!;
  return {
    ...c, overviewEn: x.overviewEn ?? null, overviewAr: x.overviewAr ?? null, visionEn: x.visionEn ?? null, visionAr: x.visionAr ?? null, missionEn: x.missionEn ?? null, missionAr: x.missionAr ?? null, dean: facultyBySlug(x.dean),
    departments: c.departments.map((d) => ({ ...d, programs: programs.filter((p) => CONTENT.programs.find((k) => k.slug === p.slug)?.deptSlug === d.slug), faculty: faculty.filter((f) => f.departments?.some((x2) => x2.slug === d.slug)) })),
  } as T.College;
};
const programDetail = (p: T.ProgramSummary): T.Program => {
  const x = CONTENT.programs.find((k) => k.slug === p.slug)!;
  const d = deptOf(x.deptSlug);
  return {
    ...p,
    overviewEn: `The ${p.nameEn} is offered by the Department of ${d.nameEn}. ${p.summaryEn} Teaching mixes lectures, workshops and supervised projects, and students graduate with a portfolio of work that shows what they can do.`,
    overviewAr: `يقدّم قسم ${d.nameAr} برنامج ${p.nameAr}. ${p.summaryAr} ويجمع التدريس بين المحاضرات وورش العمل والمشاريع تحت الإشراف.`,
    outcomesEn: ['Apply core knowledge of the discipline to real problems', 'Communicate ideas clearly in English and Arabic', 'Work effectively in teams and lead projects', 'Act with integrity and professional responsibility'],
    outcomesAr: ['تطبيق المعرفة الأساسية في التخصص على مشكلات حقيقية', 'عرض الأفكار بوضوح باللغتين', 'العمل بفاعلية ضمن فرق وقيادة المشاريع', 'التصرف بنزاهة ومسؤولية مهنية'],
    requirementsEn: p.degreeLevel === 'MASTER' ? ['A recognised bachelor’s degree in a related field', 'English language proficiency', 'Statement of purpose and CV'] : ['UAE secondary school certificate or equivalent', 'English language proficiency', 'Passport and Emirates ID copies'],
    requirementsAr: p.degreeLevel === 'MASTER' ? ['درجة بكالوريوس معترف بها في مجال ذي صلة', 'إتقان اللغة الإنجليزية', 'خطاب الغرض والسيرة الذاتية'] : ['شهادة الثانوية العامة الإماراتية أو ما يعادلها', 'إتقان اللغة الإنجليزية', 'نسخة من جواز السفر والهوية'],
    careersEn: [...x.careersEn], careersAr: [...x.careersAr],
    department: { slug: d.slug, nameEn: d.nameEn, nameAr: d.nameAr, college: d.college },
    curriculum: x.curriculum.map(([code, year]) => { const c = courses.find((k) => k.code === code)!; return { year: year as number, term: 1, course: { slug: c.slug, code: c.code, titleEn: c.titleEn, titleAr: c.titleAr, creditHours: c.creditHours } }; }),
    related: programs.filter((r) => r.id !== p.id && (r.category === p.category || r.degreeLevel === p.degreeLevel)).slice(0, 3),
  } as T.Program;
};
const courseDetail = (course: T.CourseSummary): T.Course => {
  const x = courseExtra(course.slug);
  const d = deptOf(x.dept);
  return {
    ...course, outcomesEn: [...x.outcomesEn], outcomesAr: [...x.outcomesAr], syllabus: x.syllabus.map((m) => ({ ...m, topicsEn: [...m.topicsEn], topicsAr: [...m.topicsAr] })),
    assessment: [{ labelEn: 'Coursework', labelAr: 'الأعمال الفصلية', weight: 40 }, { labelEn: 'Project', labelAr: 'المشروع', weight: 30 }, { labelEn: 'Final quiz', labelAr: 'الاختبار النهائي', weight: 30 }],
    instructor: facultyBySlug(x.instr), department: { slug: d.slug, nameEn: d.nameEn, nameAr: d.nameAr },
    related: courses.filter((r) => r.id !== course.id && courseExtra(r.slug).dept === x.dept).slice(0, 3),
    deliveryMode: x.live ? 'LIVE' : 'RECORDED', priceFils: x.priceFils, currency: 'AED',
    topics: x.syllabus.map((m, i) => ({ id: `${course.slug}-t${i + 1}`, titleEn: m.module, titleAr: m.moduleAr })),
    lessons: x.syllabus.flatMap((m, i) => m.topicsEn.map((t, j) => ({ id: `${course.slug}-l${i + 1}-${j + 1}`, titleEn: t, titleAr: m.topicsAr[j] ?? t, durationSec: (18 + ((i + j) * 4) % 12) * 60 }))),
    _count: { notes: x.syllabus.length, quizzes: x.syllabus.length, liveSessions: x.live ? 2 : 0 },
  } as T.Course;
};
const facultyDetail = (f: T.FacultySummary): T.Faculty => ({
  ...f, phone: null,
  bioEn: `${f.fullNameEn} teaches and researches in ${String(f.specializationEn ?? '').toLowerCase()}, linking theory to practice through case studies and projects. Profile shown for illustration; faculty appointments will be confirmed by Al Ahmadiya.`,
  bioAr: `يعمل ${f.fullNameAr} في التدريس والبحث في مجال ${f.specializationAr ?? ''}. ملف توضيحي؛ ستؤكد الأحمدية تعيينات أعضاء هيئة التدريس.`,
  linkedinUrl: null, orcid: null, education: [], researchInterestsEn: [f.specializationEn ?? ''], researchInterestsAr: [f.specializationAr ?? ''], awards: [],
  courses: CONTENT.courses.filter((c) => c.instr === f.slug).map((c) => ({ slug: c.slug, code: c.code, titleEn: c.titleEn, titleAr: c.titleAr })), publications: [],
} as T.Faculty);
const articleDetail = (n: T.NewsSummary): T.Article => ({
  ...n, bodyEn: `${n.excerptEn}\n\nFull story to be published by the Al Ahmadiya communications team.`, bodyAr: `${n.excerptAr}\n\nسينشر فريق الاتصال في الأحمدية الخبر كاملاً.`,
  quoteEn: null, quoteAr: null, quoteByEn: null, quoteByAr: null, sourceUrl: null, related: news.filter((x) => x.id !== n.id).slice(0, 3),
} as T.Article);
const eventDetail = (e: T.EventSummary): T.EventDetail => ({
  ...e, overviewEn: e.summaryEn, overviewAr: e.summaryAr, mapUrl: null, agenda: [], speakers: [], faqs, related: events.filter((x) => x.id !== e.id).slice(0, 3),
} as T.EventDetail);
const publicationDetail = (p: T.PublicationSummary): T.Publication => ({ ...p, findingsEn: [], findingsAr: [], fullTextUrl: null, related: [] } as T.Publication);
export type PublicCourseExtra = C['courses'][number];
export const courseMeta = (slug: string) => { const x = CONTENT.courses.find((c) => c.slug === slug); return x ? { priceFils: x.priceFils, live: x.live, featured: x.featured, instructor: facultyBySlug(x.instr) } : null; };

export const api = {
  settings: async () => ({ 'institution.name': { en: 'Al Ahmadiya', ar: 'الأحمدية', confirmation: 'CONFIRMED', sourceUrl: null } } as T.Settings),
  stats: async () => ({ colleges: colleges.length, programs: programs.length, courses: courses.length, faculty: faculty.length, publications: publications.length } as T.Stats),
  heritage: async () => ({ milestones, media: [] as T.Media[] }),
  colleges: async () => colleges,
  college: async (slug: string) => { const c = colleges.find((x) => x.slug === slug); return c ? collegeDetail(c) : null; },
  department: async (slug: string) => { const d = departments.find((x) => x.slug === slug); if (!d) return null; return { ...d, overviewEn: 'Synthetic department overview for local preview.', overviewAr: 'نظرة عامة اصطناعية للقسم للمعاينة.', objectivesEn: ['Sample objective'], objectivesAr: ['هدف تجريبي'], researchAreasEn: [], researchAreasAr: [], imagePath: null, contactEmail: null, confirmation: 'CLIENT_CONFIRMATION_REQUIRED' as const, college: { slug: colleges[0].slug, nameEn: colleges[0].nameEn, nameAr: colleges[0].nameAr }, head: faculty[0], programs, courses, faculty }; },
  programs: async (q: Record<string, string | number | undefined> = {}) => pageOf(programs.filter((p) => matches(p.nameEn, q.q) || matches(p.nameAr, q.q)).filter((p) => !q.degreeLevel || p.degreeLevel === q.degreeLevel).filter((p) => !q.featured || p.isFeatured), q),
  program: async (slug: string) => { const p = programs.find((x) => x.slug === slug); return p ? programDetail(p) : null; },
  courses: async (q: Record<string, string | number | undefined> = {}) => pageOf(courses.filter((p) => matches(p.titleEn, q.q) || matches(p.code, q.q)).filter((p) => !q.department || p.courseType === q.department).filter((p) => !q.featured || CONTENT.courses.find((c) => c.slug === p.slug)?.featured), q),
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
  programs: programs.map((p) => ({ slug: p.slug, nameEn: p.nameEn, nameAr: p.nameAr, degreeLevel: p.degreeLevel, eligibilityRules: Object.keys(rulesFor(p.degreeLevel)).map((qualification) => ({ qualification, confirmation: 'CLIENT_CONFIRMATION_REQUIRED' })) })),
  qualifications: [...QUALIFICATIONS],
});
