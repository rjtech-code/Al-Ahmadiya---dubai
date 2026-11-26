import { CONTENT } from './public-content';

/**
 * Provisional entry criteria for the proposed programmes (mirrors the database seed).
 * Shown with "criteria are provisional" until Al Ahmadiya confirms them.
 */
export const QUALIFICATIONS = ['UAE_SECONDARY_GENERAL', 'UAE_SECONDARY_ADVANCED', 'IGCSE_A_LEVEL', 'IB_DIPLOMA', 'AMERICAN_HIGH_SCHOOL', 'BACHELOR', 'MASTER', 'OTHER'] as const;
type Rule = { minOverall: number; subjects: { subject: string; min: number }[] };

export function rulesFor(degreeLevel: string): Partial<Record<string, Rule>> {
  if (degreeLevel === 'MASTER') return { BACHELOR: { minOverall: 70, subjects: [] }, MASTER: { minOverall: 60, subjects: [] } };
  const school: Rule = { minOverall: 75, subjects: [{ subject: 'Mathematics', min: 70 }] };
  return { UAE_SECONDARY_ADVANCED: school, IB_DIPLOMA: school };
}

export function checkEligibility(programSlug: string, qualification: string, overallPercent: number, subjects: { subject: string; percent: number }[] = []) {
  const p = CONTENT.programs.find((x) => x.slug === programSlug);
  if (!p) return null;
  const rule = rulesFor(p.degreeLevel)[qualification];
  if (!rule) return { status: 'NO_RULE' as const, unmet: [], confirmation: 'CLIENT_CONFIRMATION_REQUIRED' };
  const unmet: { requirement: string; required: number; actual?: number }[] = [];
  if (overallPercent < rule.minOverall) unmet.push({ requirement: 'overall', required: rule.minOverall, actual: overallPercent });
  for (const s of rule.subjects) {
    const got = subjects.find((x) => x.subject.trim().toLowerCase() === s.subject.toLowerCase());
    // Subject marks are optional in the form: only marks that were entered can fail a requirement.
    if (got && got.percent < s.min) unmet.push({ requirement: s.subject, required: s.min, actual: got.percent });
  }
  return { status: unmet.length ? ('NOT_ELIGIBLE' as const) : ('ELIGIBLE' as const), unmet, confirmation: 'CLIENT_CONFIRMATION_REQUIRED' };
}

export function checkAll(qualification: string, overallPercent: number, subjects: { subject: string; percent: number }[] = []) {
  const rows = CONTENT.programs.map((p) => ({
    program: { slug: p.slug, nameEn: p.nameEn, nameAr: p.nameAr, degreeLevel: p.degreeLevel, college: { nameEn: p.department.college.nameEn, nameAr: p.department.college.nameAr } },
    ...checkEligibility(p.slug, qualification, overallPercent, subjects)!,
  }));
  return { rows, meta: { eligible: rows.filter((r) => r.status === 'ELIGIBLE').length, total: rows.length } };
}
