import 'server-only';
import type * as T from './types';
import { API_BASE_URL } from './api-origin';

const API = API_BASE_URL;

export class ApiUnavailableError extends Error {}

/**
 * Server-side GET against the public API.
 * - Returns null on 404 (so pages can call notFound()).
 * - During the production build, treats an unavailable CMS/API as missing optional
 *   content so static pages can still be generated with their existing safe defaults.
 * - At runtime, throws ApiUnavailableError so the route error boundary can report
 *   genuine API outages instead of silently hiding them.
 */
async function get<R>(path: string, revalidate = 60): Promise<R | null> {
  const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build';
  let res: Response;

  try {
    res = await fetch(`${API}${path}`, { next: { revalidate, tags: ['cms'] } });
  } catch {
    if (isProductionBuild) return null;
    throw new ApiUnavailableError(`API unreachable: ${path}`);
  }

  if (res.status === 404) return null;
  if (!res.ok) {
    if (isProductionBuild) return null;
    throw new ApiUnavailableError(`API ${res.status}: ${path}`);
  }

  try {
    return (await res.json()) as R;
  } catch {
    if (isProductionBuild) return null;
    throw new ApiUnavailableError(`Invalid API response: ${path}`);
  }
}

const data = <R>(p: Promise<{ data: R } | null>) => p.then((r) => r?.data ?? null);
const qs = (params: Record<string, string | number | undefined | null>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : '';
};
const paged = <X>(path: string): Promise<T.Paged<X>> =>
  get<T.Paged<X>>(path).then((r) => r ?? { data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 1 } });

export const api = {
  settings: () => data(get<{ data: T.Settings }>('/public/settings', 300)).then((s) => s ?? {}),
  stats: () => data(get<{ data: T.Stats }>('/public/stats')),
  heritage: () => data(get<{ data: { milestones: T.Milestone[]; media: T.Media[] } }>('/public/heritage', 300)).then((h) => h ?? { milestones: [], media: [] }),
  colleges: () => data(get<{ data: T.CollegeSummary[] }>('/public/colleges')).then((r) => r ?? []),
  college: (slug: string) => data(get<{ data: T.College }>(`/public/colleges/${encodeURIComponent(slug)}`)),
  department: (slug: string) => data(get<{ data: T.Department }>(`/public/departments/${encodeURIComponent(slug)}`)),
  programs: (q: Record<string, string | number | undefined> = {}) => paged<T.ProgramSummary>(`/public/programs${qs(q)}`),
  program: (slug: string) => data(get<{ data: T.Program }>(`/public/programs/${encodeURIComponent(slug)}`)),
  courses: (q: Record<string, string | number | undefined> = {}) => paged<T.CourseSummary>(`/public/courses${qs(q)}`),
  course: (slug: string) => data(get<{ data: T.Course }>(`/public/courses/${encodeURIComponent(slug)}`)),
  faculty: (q: Record<string, string | number | undefined> = {}) => paged<T.FacultySummary>(`/public/faculty${qs(q)}`),
  facultyMember: (slug: string) => data(get<{ data: T.Faculty }>(`/public/faculty/${encodeURIComponent(slug)}`)),
  news: (q: Record<string, string | number | undefined> = {}) => paged<T.NewsSummary>(`/public/news${qs(q)}`),
  article: (slug: string) => data(get<{ data: T.Article }>(`/public/news/${encodeURIComponent(slug)}`)),
  events: (q: Record<string, string | number | undefined> = {}) => data(get<{ data: T.EventSummary[] }>(`/public/events${qs(q)}`)).then((r) => r ?? []),
  event: (slug: string) => data(get<{ data: T.EventDetail }>(`/public/events/${encodeURIComponent(slug)}`)),
  research: (q: Record<string, string | number | undefined> = {}) => paged<T.PublicationSummary>(`/public/research${qs(q)}`),
  publication: (slug: string) => data(get<{ data: T.Publication }>(`/public/research/${encodeURIComponent(slug)}`)),
  tour: () => data(get<{ data: T.TourStop[] }>('/public/campus-tour')).then((r) => r ?? []),
  faqs: (scope: 'programs' | 'admissions') => data(get<{ data: T.Faq[] }>(`/public/faqs?scope=${scope}`)).then((r) => r ?? []),
};

export interface AdmissionsConfig {
  open: boolean;
  statusConfirmation: string;
  programs: { slug: string; nameEn: string; nameAr: string; degreeLevel: string; eligibilityRules: { qualification: string; confirmation: string }[] }[];
  qualifications: string[];
}
export const admissionsConfig = () =>
  get<{ data: AdmissionsConfig }>('/public/admissions/config', 30).then((r) => r?.data ?? { open: false, statusConfirmation: 'CLIENT_CONFIRMATION_REQUIRED', programs: [], qualifications: [] });
