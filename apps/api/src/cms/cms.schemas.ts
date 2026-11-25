import { z } from 'zod';

const slug = z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');
const text = (max = 300) => z.string().trim().min(1).max(max);
const optText = (max = 20000) => z.string().trim().max(max).nullish();
const strArr = z.array(z.string().trim().min(1).max(500)).max(50).default([]);
const uuid = z.uuid();
const imagePath = z.string().trim().max(500).regex(/^\/[\w\-./]+$/, 'Must be a site-relative path').nullish();
const url = z.url().max(1000).nullish();
const publishStatus = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional();
const confirmation = z.enum(['CONFIRMED', 'CLIENT_CONFIRMATION_REQUIRED']).optional();

export const CollegeInput = z.object({
  slug, nameEn: text(), nameAr: text(), summaryEn: optText(1000), summaryAr: optText(1000),
  overviewEn: optText(), overviewAr: optText(), visionEn: optText(2000), visionAr: optText(2000),
  missionEn: optText(2000), missionAr: optText(2000), imagePath, sortOrder: z.number().int().default(0),
  deanId: uuid.nullish(), publishStatus, confirmation,
});

export const DepartmentInput = z.object({
  slug, collegeId: uuid, nameEn: text(), nameAr: text(), overviewEn: optText(), overviewAr: optText(),
  objectivesEn: strArr, objectivesAr: strArr, researchAreasEn: strArr, researchAreasAr: strArr,
  imagePath, contactEmail: z.email().nullish(), sortOrder: z.number().int().default(0), headId: uuid.nullish(),
  publishStatus, confirmation,
});

export const ProgramInput = z.object({
  departmentId: uuid, degreeLevel: z.enum(['FOUNDATION', 'DIPLOMA', 'BACHELOR', 'MASTER', 'DOCTORATE', 'PROFESSIONAL']),
  nameEn: text(), nameAr: text(), summaryEn: optText(1000), summaryAr: optText(1000), overviewEn: optText(), overviewAr: optText(),
  durationYears: z.number().min(0.5).max(10).nullish(), totalCredits: z.number().int().min(1).max(400).nullish(),
  outcomesEn: strArr, outcomesAr: strArr, requirementsEn: strArr, requirementsAr: strArr, careersEn: strArr, careersAr: strArr,
  category: z.string().trim().max(80).nullish(), imagePath, isFeatured: z.boolean().default(false), publishStatus, confirmation,
});

const SyllabusModule = z.object({ module: text(120), topicsEn: strArr, topicsAr: strArr });
const AssessmentItem = z.object({ labelEn: text(120), labelAr: text(120), weight: z.number().min(0).max(100) });

export const CourseInput = z.object({
  slug, code: z.string().trim().min(2).max(20), departmentId: uuid, titleEn: text(), titleAr: text(),
  descriptionEn: optText(), descriptionAr: optText(), creditHours: z.number().int().min(0).max(30),
  courseType: z.string().trim().max(40).nullish(), outcomesEn: strArr, outcomesAr: strArr,
  syllabus: z.array(SyllabusModule).max(30).nullish(),
  assessment: z.array(AssessmentItem).max(10).refine((a) => a.reduce((s, i) => s + i.weight, 0) === 100, 'Assessment weights must total 100').nullish(),
  imagePath, isFeatured: z.boolean().default(false), instructorId: uuid.nullish(), publishStatus, confirmation,
});

export const FacultyInput = z.object({
  slug, fullNameEn: text(), fullNameAr: text(), titleEn: text(), titleAr: text(), email: z.email().nullish(),
  phone: z.string().trim().max(40).nullish(), photoPath: imagePath, bioEn: optText(), bioAr: optText(),
  specializationEn: optText(200), specializationAr: optText(200),
  education: z.array(z.object({ degreeEn: text(), degreeAr: text(), institution: text(), year: z.number().int().min(1900).max(2100).nullish() })).max(20).nullish(),
  researchInterestsEn: strArr, researchInterestsAr: strArr,
  awards: z.array(z.object({ titleEn: text(), titleAr: text(), year: z.number().int().min(1900).max(2100).nullish() })).max(30).nullish(),
  linkedinUrl: url, orcid: z.string().trim().max(40).nullish(), departmentIds: z.array(uuid).max(10).default([]),
  consentToPublish: z.boolean().default(false), publishStatus, confirmation,
});

export const NewsInput = z.object({
  slug, category: z.enum(['university', 'academic', 'research', 'student-life', 'announcement', 'heritage']),
  titleEn: text(), titleAr: text(), excerptEn: text(600), excerptAr: text(600), bodyEn: text(50000), bodyAr: text(50000),
  quoteEn: optText(600), quoteAr: optText(600), quoteByEn: optText(200), quoteByAr: optText(200), imagePath,
  isFeatured: z.boolean().default(false), isAnnouncement: z.boolean().default(false), sourceUrl: url,
  publishedAt: z.coerce.date().nullish(), publishStatus,
});

export const EventInput = z.object({
  slug, category: z.enum(['academic', 'research', 'cultural', 'sports', 'workshop', 'heritage']),
  titleEn: text(), titleAr: text(), summaryEn: text(600), summaryAr: text(600), overviewEn: optText(), overviewAr: optText(),
  startsAt: z.coerce.date(), endsAt: z.coerce.date(), venueEn: optText(200), venueAr: optText(200), mapUrl: url, imagePath,
  registrationUrl: url, isFeatured: z.boolean().default(false), publishStatus,
}).refine((e) => e.endsAt >= e.startsAt, { message: 'End must be after start', path: ['endsAt'] });

export const PublicationInput = z.object({
  slug, type: z.enum(['journal-article', 'conference', 'book', 'report']), titleEn: text(500), titleAr: text(500),
  abstractEn: text(10000), abstractAr: text(10000), findingsEn: strArr, findingsAr: strArr,
  keywords: z.array(z.string().trim().min(1).max(60)).max(20).default([]), journal: optText(300),
  doi: z.string().trim().regex(/^10\.\d{4,9}\/\S+$/, 'Invalid DOI').nullish(), fullTextUrl: url, coverPath: imagePath,
  publishedOn: z.coerce.date().nullish(), isFeatured: z.boolean().default(false), departmentId: uuid.nullish(),
  authors: z.array(z.object({ name: text(200), affiliation: optText(300), facultyId: uuid.nullish() })).min(1).max(50),
  publishStatus, confirmation,
});

export const FaqInput = z.object({
  scope: z.enum(['programs', 'admissions', 'event']), eventId: uuid.nullish(), questionEn: text(500), questionAr: text(500),
  answerEn: text(5000), answerAr: text(5000), sortOrder: z.number().int().default(0), publishStatus, confirmation,
});

export const TourStopInput = z.object({
  slug, kind: z.enum(['academic', 'library', 'research', 'sports', 'student-life', 'heritage']), titleEn: text(), titleAr: text(),
  descriptionEn: text(5000), descriptionAr: text(5000), imagePath, panoramaUrl: url, isHeritage: z.boolean().default(false),
  sortOrder: z.number().int().default(0), publishStatus, confirmation,
});

export const HeritageInput = z.object({
  sortOrder: z.number().int(), yearLabel: text(40), titleEn: text(), titleAr: text(), bodyEn: text(5000), bodyAr: text(5000),
  sourceUrls: z.array(z.url()).max(10).default([]), caveatEn: optText(1000), caveatAr: optText(1000), publishStatus, confirmation,
});

export const MediaInput = z.object({
  path: z.string().trim().regex(/^\/[\w\-./]+$/), altEn: text(300), altAr: text(300), captionEn: optText(600), captionAr: optText(600),
  author: optText(200), license: optText(80), licenseUrl: url, sourceUrl: url, width: z.number().int().positive().nullish(),
  height: z.number().int().positive().nullish(), approved: z.boolean().default(false),
});
