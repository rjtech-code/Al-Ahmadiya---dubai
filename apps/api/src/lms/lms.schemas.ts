import { z } from 'zod';

export const OnlineSettings = z.object({
  onlineEnabled: z.boolean(),
  deliveryMode: z.enum(['RECORDED', 'LIVE']),
  priceAed: z.coerce.number().min(0).max(1_000_000).nullable(),
});

const bool = z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]);
export const LessonMeta = z.object({
  titleEn: z.string().trim().min(1).max(200),
  titleAr: z.string().trim().min(1).max(200),
  descriptionEn: z.string().trim().max(5000).optional().nullable(),
  descriptionAr: z.string().trim().max(5000).optional().nullable(),
  isPreview: bool.default(false),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('PUBLISHED'),
  durationSec: z.coerce.number().int().min(0).max(86_400).optional().nullable(),
  topicId: z.uuid().optional().nullable().or(z.literal('').transform(() => null)),
});

export const NoteInput = z.object({
  titleEn: z.string().trim().min(1).max(200),
  titleAr: z.string().trim().min(1).max(200),
  bodyEn: z.string().trim().max(50_000).optional().nullable(),
  bodyAr: z.string().trim().max(50_000).optional().nullable(),
  lessonId: z.uuid().optional().nullable().or(z.literal('').transform(() => null)),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('PUBLISHED'),
});

export const QuizQuestion = z.object({
  textEn: z.string().trim().min(1).max(1000),
  textAr: z.string().trim().min(1).max(1000),
  options: z.array(z.object({ en: z.string().trim().min(1).max(300), ar: z.string().trim().min(1).max(300) })).min(2).max(6),
  correct: z.number().int().min(0),
}).refine((q) => q.correct < q.options.length, { message: 'Correct answer must be one of the options', path: ['correct'] });

export const QuizInput = z.object({
  titleEn: z.string().trim().min(1).max(200),
  titleAr: z.string().trim().min(1).max(200),
  lessonId: z.uuid().optional().nullable(),
  passPercent: z.number().int().min(0).max(100).default(60),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('PUBLISHED'),
  questions: z.array(QuizQuestion).min(1).max(100),
});

export const Reorder = z.object({ ids: z.array(z.uuid()).min(1).max(500) });
export const Attempt = z.object({ answers: z.array(z.number().int().min(-1).max(10)).max(100) });

const lines = z.array(z.string().trim().min(1).max(300)).max(20).default([]);
export const CourseDetails = z.object({
  titleEn: z.string().trim().min(2).max(200),
  titleAr: z.string().trim().min(2).max(200),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,20}$/, 'Use letters, numbers and dashes (e.g. CS101)'),
  departmentId: z.uuid(),
  descriptionEn: z.string().trim().max(5000).optional().nullable(),
  descriptionAr: z.string().trim().max(5000).optional().nullable(),
  outcomesEn: lines,
  outcomesAr: lines,
  creditHours: z.coerce.number().int().min(0).max(30).default(3),
  priceAed: z.coerce.number().min(0).max(1_000_000).default(0),
  teacherId: z.uuid().nullable().optional(),
  isFeatured: z.boolean().default(false),
});

export const TopicInput = z.object({ titleEn: z.string().trim().min(1).max(200), titleAr: z.string().trim().min(1).max(200) });

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM');
export const LivePlan = z.object({
  enabled: z.boolean(),
  startsOn: z.iso.date().nullable().optional(),
  endsOn: z.iso.date().nullable().optional(),
  slots: z.array(z.object({ weekday: z.number().int().min(1).max(7), startTime: hhmm, endTime: hhmm })
    .refine((s) => s.endTime > s.startTime, { message: 'End time must be after start time', path: ['endTime'] })).max(21).default([]),
}).refine((p) => !p.enabled || (p.startsOn && p.endsOn && p.endsOn >= p.startsOn), { message: 'Choose a start and end date (end on or after start)', path: ['endsOn'] })
  .refine((p) => !p.enabled || p.slots.length > 0, { message: 'Add at least one day with a time', path: ['slots'] });

export const PublishInput = z.object({ publish: z.boolean() });
export const ProgressInput = z.object({ positionSec: z.number().int().min(0).max(86_400), completed: z.boolean().default(false) });
