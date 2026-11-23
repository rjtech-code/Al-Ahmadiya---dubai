import { z } from 'zod';

export const QUALIFICATIONS = ['UAE_SECONDARY_GENERAL', 'UAE_SECONDARY_ADVANCED', 'IGCSE_A_LEVEL', 'IB_DIPLOMA', 'AMERICAN_HIGH_SCHOOL', 'BACHELOR', 'MASTER', 'OTHER'] as const;

export const EligibilityBody = z.object({
  programSlug: z.string().trim().min(2).max(120),
  qualification: z.enum(QUALIFICATIONS),
  overallPercent: z.coerce.number().min(0).max(100),
  subjects: z.array(z.object({ subject: z.string().trim().min(1).max(80), percent: z.coerce.number().min(0).max(100) })).max(20).default([]),
});

export const PersonalStep = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  firstNameAr: z.string().trim().max(80).optional(),
  lastNameAr: z.string().trim().max(80).optional(),
  dateOfBirth: z.iso.date(),
  gender: z.enum(['male', 'female']),
  nationality: z.string().trim().min(2).max(80),
  emiratesId: z.string().trim().regex(/^784-\d{4}-\d{7}-\d$/, 'Format: 784-XXXX-XXXXXXX-X').optional().or(z.literal('')),
  passportNumber: z.string().trim().max(20).optional(),
});

export const ContactStep = z.object({
  phone: z.string().trim().regex(/^\+?[\d\s()-]{7,20}$/, 'Invalid phone number'),
  addressLine: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80),
  guardianName: z.string().trim().max(150).optional(),
  guardianPhone: z.string().trim().max(20).optional(),
});

export const AcademicStep = z.object({
  qualification: z.enum(QUALIFICATIONS),
  institution: z.string().trim().min(2).max(200),
  graduationYear: z.coerce.number().int().min(1970).max(2100),
  overallPercent: z.coerce.number().min(0).max(100),
  subjects: z.array(z.object({ subject: z.string().trim().min(1).max(80), percent: z.coerce.number().min(0).max(100) })).max(20).default([]),
});

export const ProgramStep = z.object({ programSlug: z.string().trim().min(2).max(120) });

export const StatusLookup = z.object({
  reference: z.string().trim().toUpperCase().regex(/^AHM-\d{4}-[A-Z2-9]{8}$/, 'Invalid reference format'),
  email: z.string().trim().toLowerCase().pipe(z.email()),
});

export const TransitionBody = z.object({
  to: z.enum(['UNDER_REVIEW', 'DOCUMENTS_PENDING', 'RETURNED_FOR_CORRECTION', 'APPROVED', 'REJECTED']),
  note: z.string().trim().max(2000).optional(),
});

export const DOC_TYPES = ['passport', 'emirates-id', 'transcript', 'certificate', 'photo', 'other'] as const;
export const MAX_DOC_BYTES = 5 * 1024 * 1024;
