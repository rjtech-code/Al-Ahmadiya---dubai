import 'server-only';
import type * as T from './types';

/** Public pages use bundled frontend content only. No server-side API requests are made. */
export class ApiUnavailableError extends Error {}
const emptyPage = <X>(): T.Paged<X> => ({ data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 1 } });
export const api = {
  settings: async () => ({} as T.Settings),
  stats: async () => null as T.Stats | null,
  heritage: async () => ({ milestones: [], media: [] }),
  colleges: async () => [] as T.CollegeSummary[],
  college: async (_slug: string) => null as T.College | null,
  department: async (_slug: string) => null as T.Department | null,
  programs: async (_q: Record<string, string | number | undefined> = {}) => emptyPage<T.ProgramSummary>(),
  program: async (_slug: string) => null as T.Program | null,
  courses: async (_q: Record<string, string | number | undefined> = {}) => emptyPage<T.CourseSummary>(),
  course: async (_slug: string) => null as T.Course | null,
  faculty: async (_q: Record<string, string | number | undefined> = {}) => emptyPage<T.FacultySummary>(),
  facultyMember: async (_slug: string) => null as T.Faculty | null,
  news: async (_q: Record<string, string | number | undefined> = {}) => emptyPage<T.NewsSummary>(),
  article: async (_slug: string) => null as T.Article | null,
  events: async (_q: Record<string, string | number | undefined> = {}) => [] as T.EventSummary[],
  event: async (_slug: string) => null as T.EventDetail | null,
  research: async (_q: Record<string, string | number | undefined> = {}) => emptyPage<T.PublicationSummary>(),
  publication: async (_slug: string) => null as T.Publication | null,
  tour: async () => [] as T.TourStop[],
  faqs: async (_scope: 'programs' | 'admissions') => [] as T.Faq[],
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
  programs: [],
  qualifications: ['High school', 'Diploma', 'Bachelor degree'],
});
