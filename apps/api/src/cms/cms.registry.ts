import { z } from 'zod';
import * as S from './cms.schemas';

/**
 * Updates use PUT semantics (the full schema).
 * Admin-manageable CMS resources. Each entry maps a URL segment to its Prisma
 * model, input schema and searchable text fields.
 */
export interface ResourceDef {
  model: string; // Prisma delegate name
  label: string;
  schema: z.ZodType<Record<string, unknown>>;
  search: string[];
  orderBy: Record<string, 'asc' | 'desc'>;
  hasPublish: boolean;
  softDelete: boolean;
  /** Transforms validated input into Prisma data (relations etc.). */
  toData?: (input: Record<string, unknown>, mode: 'create' | 'update') => Record<string, unknown>;
}

export const CMS_RESOURCES: Record<string, ResourceDef> = {
  colleges: { model: 'college', label: 'Colleges', schema: S.CollegeInput, search: ['nameEn', 'nameAr', 'slug'], orderBy: { sortOrder: 'asc' }, hasPublish: true, softDelete: true },
  departments: { model: 'department', label: 'Departments', schema: S.DepartmentInput, search: ['nameEn', 'nameAr', 'slug'], orderBy: { sortOrder: 'asc' }, hasPublish: true, softDelete: true },
  programs: { model: 'program', label: 'Programmes', schema: S.ProgramInput, search: ['nameEn', 'nameAr', 'slug'], orderBy: { nameEn: 'asc' }, hasPublish: true, softDelete: true },
  courses: { model: 'course', label: 'Courses', schema: S.CourseInput, search: ['titleEn', 'titleAr', 'code'], orderBy: { code: 'asc' }, hasPublish: true, softDelete: true },
  faculty: {
    model: 'facultyMember', label: 'Faculty', schema: S.FacultyInput, search: ['fullNameEn', 'fullNameAr', 'slug'], orderBy: { fullNameEn: 'asc' }, hasPublish: true, softDelete: true,
    toData: (input, mode) => {
      const { departmentIds, ...rest } = input as { departmentIds?: string[] } & Record<string, unknown>;
      const ids = (departmentIds ?? []).map((id) => ({ id }));
      return { ...rest, departments: mode === 'create' ? { connect: ids } : { set: ids } };
    },
  },
  news: { model: 'newsArticle', label: 'News', schema: S.NewsInput, search: ['titleEn', 'titleAr', 'slug'], orderBy: { publishedAt: 'desc' }, hasPublish: true, softDelete: true },
  events: { model: 'event', label: 'Events', schema: S.EventInput as unknown as z.ZodType<Record<string, unknown>>, search: ['titleEn', 'titleAr', 'slug'], orderBy: { startsAt: 'desc' }, hasPublish: true, softDelete: true },
  publications: {
    model: 'publication', label: 'Research publications', schema: S.PublicationInput, search: ['titleEn', 'titleAr', 'slug'], orderBy: { publishedOn: 'desc' }, hasPublish: true, softDelete: true,
    toData: (input, mode) => {
      const { authors, ...rest } = input as { authors: { name: string; affiliation?: string | null; facultyId?: string | null }[] } & Record<string, unknown>;
      const create = authors.map((a, i) => ({ ...a, position: i + 1 }));
      return { ...rest, authors: mode === 'create' ? { create } : { deleteMany: {}, create } };
    },
  },
  faqs: { model: 'faq', label: 'FAQs', schema: S.FaqInput, search: ['questionEn', 'questionAr'], orderBy: { sortOrder: 'asc' }, hasPublish: true, softDelete: false },
  'campus-tour': { model: 'campusTourStop', label: 'Campus tour', schema: S.TourStopInput, search: ['titleEn', 'titleAr', 'slug'], orderBy: { sortOrder: 'asc' }, hasPublish: true, softDelete: false },
  heritage: { model: 'heritageMilestone', label: 'Heritage timeline', schema: S.HeritageInput, search: ['titleEn', 'titleAr', 'yearLabel'], orderBy: { sortOrder: 'asc' }, hasPublish: true, softDelete: false },
  media: { model: 'mediaAsset', label: 'Media library', schema: S.MediaInput, search: ['path', 'altEn', 'author'], orderBy: { createdAt: 'desc' }, hasPublish: false, softDelete: false },
};

