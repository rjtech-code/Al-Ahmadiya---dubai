import type { ApplicationStatus } from '../generated/prisma/enums';

/** Allowed admin status transitions. Applicants only move DRAFT→SUBMITTED, RETURNED→SUBMITTED, and *→WITHDRAWN. */
export const ADMIN_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT: [],
  SUBMITTED: ['UNDER_REVIEW', 'RETURNED_FOR_CORRECTION'],
  UNDER_REVIEW: ['DOCUMENTS_PENDING', 'RETURNED_FOR_CORRECTION', 'APPROVED', 'REJECTED'],
  DOCUMENTS_PENDING: ['UNDER_REVIEW', 'RETURNED_FOR_CORRECTION'],
  RETURNED_FOR_CORRECTION: [],
  APPROVED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

/** Decisions need admissions.decide; other transitions need admissions.review. */
export const DECISION_STATUSES: ApplicationStatus[] = ['APPROVED', 'REJECTED'];

export function canTransition(from: ApplicationStatus, to: ApplicationStatus) {
  return ADMIN_TRANSITIONS[from].includes(to);
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
export function applicationReference(year: number, random: Uint8Array) {
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHABET[random[i] % ALPHABET.length];
  return `AHM-${year}-${s}`;
}
