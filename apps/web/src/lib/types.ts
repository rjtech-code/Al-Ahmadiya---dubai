/** Shapes returned by the NestJS public API (subset used by the website). */
export type Confirmation = 'CONFIRMED' | 'CLIENT_CONFIRMATION_REQUIRED';
export type DegreeLevel = 'FOUNDATION' | 'DIPLOMA' | 'BACHELOR' | 'MASTER' | 'DOCTORATE' | 'PROFESSIONAL';

export interface PageMeta { page: number; pageSize: number; total: number; totalPages: number }
export interface Paged<T> { data: T[]; meta: PageMeta }

export interface SettingValue { en: string | null; ar: string | null; confirmation: Confirmation; sourceUrl: string | null }
export type Settings = Record<string, SettingValue>;

export interface Media {
  id: string; path: string; altEn: string; altAr: string; captionEn: string | null; captionAr: string | null;
  author: string | null; license: string | null; licenseUrl: string | null; sourceUrl: string | null; width: number | null; height: number | null;
}

export interface Milestone {
  id: string; yearLabel: string; titleEn: string; titleAr: string; bodyEn: string; bodyAr: string;
  sourceUrls: string[]; caveatEn: string | null; caveatAr: string | null; confirmation: Confirmation;
}

export interface FacultySummary {
  id: string; slug: string; fullNameEn: string; fullNameAr: string; titleEn: string; titleAr: string;
  photoPath: string | null; specializationEn: string | null; specializationAr: string | null; email: string | null;
  departments?: { slug: string; nameEn: string; nameAr: string }[];
}
export interface Faculty extends FacultySummary {
  phone: string | null; bioEn: string | null; bioAr: string | null; linkedinUrl: string | null; orcid: string | null;
  education: { degreeEn: string; degreeAr: string; institution: string; year?: number | null }[] | null;
  researchInterestsEn: string[]; researchInterestsAr: string[];
  awards: { titleEn: string; titleAr: string; year?: number | null }[] | null;
  courses: { slug: string; code: string; titleEn: string; titleAr: string }[];
  publications: { publication: { slug: string; titleEn: string; titleAr: string; journal: string | null; publishedOn: string | null; coverPath: string | null } }[];
}

export interface ProgramSummary {
  id: string; slug: string; degreeLevel: DegreeLevel; nameEn: string; nameAr: string; summaryEn: string | null; summaryAr: string | null;
  durationYears: string | null; totalCredits: number | null; category: string | null; imagePath: string | null; isFeatured: boolean; confirmation: Confirmation;
  department?: { nameEn: string; nameAr: string; college: { slug: string; nameEn: string; nameAr: string } };
}
export interface Program extends ProgramSummary {
  overviewEn: string | null; overviewAr: string | null; outcomesEn: string[]; outcomesAr: string[];
  requirementsEn: string[]; requirementsAr: string[]; careersEn: string[]; careersAr: string[];
  department: { slug: string; nameEn: string; nameAr: string; college: { slug: string; nameEn: string; nameAr: string } };
  curriculum: { year: number; term: number | null; course: { slug: string; code: string; titleEn: string; titleAr: string; creditHours: number } }[];
  related: ProgramSummary[];
}

export interface CourseSummary {
  id: string; slug: string; code: string; titleEn: string; titleAr: string; descriptionEn: string | null; descriptionAr: string | null;
  creditHours: number; courseType: string | null; imagePath: string | null; onlineEnabled: boolean; confirmation: Confirmation;
}
export interface Course extends CourseSummary {
  outcomesEn: string[]; outcomesAr: string[];
  syllabus: { module: string; moduleAr?: string; topicsEn: string[]; topicsAr: string[] }[] | null;
  assessment: { labelEn: string; labelAr: string; weight: number }[] | null;
  instructor: FacultySummary | null; department: { slug: string; nameEn: string; nameAr: string }; related: CourseSummary[];
  onlineEnabled: boolean; deliveryMode: 'RECORDED' | 'LIVE'; priceFils: number | null; currency: string;
  topics?: { id: string; titleEn: string; titleAr: string }[];
  lessons: { id: string; titleEn: string; titleAr: string; durationSec: number | null; topicId?: string | null }[];
  _count: { notes: number; quizzes: number; liveSessions: number };
}

export interface DepartmentSummary { id: string; slug: string; nameEn: string; nameAr: string }
export interface Department extends DepartmentSummary {
  overviewEn: string | null; overviewAr: string | null; objectivesEn: string[]; objectivesAr: string[];
  researchAreasEn: string[]; researchAreasAr: string[]; imagePath: string | null; contactEmail: string | null; confirmation: Confirmation;
  college: { slug: string; nameEn: string; nameAr: string }; head: FacultySummary | null;
  programs: ProgramSummary[]; courses: CourseSummary[]; faculty: FacultySummary[];
}
export interface CollegeSummary {
  id: string; slug: string; nameEn: string; nameAr: string; summaryEn: string | null; summaryAr: string | null; imagePath: string | null;
  confirmation: Confirmation; departments: DepartmentSummary[];
}
export interface College extends Omit<CollegeSummary, 'departments'> {
  overviewEn: string | null; overviewAr: string | null; visionEn: string | null; visionAr: string | null; missionEn: string | null; missionAr: string | null;
  dean: FacultySummary | null;
  departments: (DepartmentSummary & { programs: ProgramSummary[]; faculty: FacultySummary[] })[];
}

export interface NewsSummary {
  id: string; slug: string; category: string; titleEn: string; titleAr: string; excerptEn: string; excerptAr: string;
  imagePath: string | null; isFeatured: boolean; isAnnouncement: boolean; publishedAt: string | null;
}
export interface Article extends NewsSummary {
  bodyEn: string; bodyAr: string; quoteEn: string | null; quoteAr: string | null; quoteByEn: string | null; quoteByAr: string | null;
  sourceUrl: string | null; related: NewsSummary[];
}

export interface EventSummary {
  id: string; slug: string; category: string; titleEn: string; titleAr: string; summaryEn: string; summaryAr: string;
  startsAt: string; endsAt: string; venueEn: string | null; venueAr: string | null; imagePath: string | null; registrationUrl: string | null; isFeatured: boolean;
}
export interface EventDetail extends EventSummary {
  overviewEn: string | null; overviewAr: string | null; mapUrl: string | null;
  agenda: { id: string; startsAt: string; endsAt: string; titleEn: string; titleAr: string }[];
  speakers: { id: string; nameEn: string; nameAr: string; roleEn: string | null; roleAr: string | null; photoPath: string | null }[];
  faqs: Faq[]; related: EventSummary[];
}

export interface PublicationSummary {
  id: string; slug: string; type: string; titleEn: string; titleAr: string; abstractEn: string; abstractAr: string;
  keywords: string[]; journal: string | null; doi: string | null; coverPath: string | null; publishedOn: string | null; isFeatured: boolean;
  authors: { name: string; affiliation: string | null; position: number }[];
}
export interface Publication extends PublicationSummary {
  findingsEn: string[]; findingsAr: string[]; fullTextUrl: string | null; related: PublicationSummary[];
}

export interface Faq { id: string; questionEn: string; questionAr: string; answerEn: string; answerAr: string }
export interface TourStop {
  id: string; slug: string; kind: string; titleEn: string; titleAr: string; descriptionEn: string; descriptionAr: string;
  imagePath: string | null; panoramaUrl: string | null; isHeritage: boolean;
}
export interface Stats { colleges: number; programs: number; courses: number; faculty: number; publications: number }
