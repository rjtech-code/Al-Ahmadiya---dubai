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
