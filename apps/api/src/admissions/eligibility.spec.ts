import { evaluateEligibility } from './eligibility';
import { applicationReference, canTransition } from './workflow';

describe('evaluateEligibility', () => {
  const rule = { minOverallPercent: 80, subjectMinimums: [{ subject: 'Mathematics', minPercent: 85 }] };

  it('is eligible when all thresholds are met', () => {
    expect(evaluateEligibility(rule, { overallPercent: 90, subjects: [{ subject: 'mathematics', percent: 88 }] })).toEqual({ eligible: true, unmet: [] });
  });

  it('reports each unmet requirement', () => {
    const r = evaluateEligibility(rule, { overallPercent: 70, subjects: [{ subject: 'Mathematics', percent: 60 }] });
    expect(r.eligible).toBe(false);
    expect(r.unmet.map((u) => u.requirement)).toEqual(['overall', 'Mathematics']);
  });

  it('treats a missing subject as unmet with null actual', () => {
    const r = evaluateEligibility(rule, { overallPercent: 95, subjects: [] });
    expect(r.unmet).toEqual([{ requirement: 'Mathematics', required: 85, actual: null }]);
  });

  it('accepts exact threshold values', () => {
    expect(evaluateEligibility(rule, { overallPercent: 80, subjects: [{ subject: 'Mathematics', percent: 85 }] }).eligible).toBe(true);
  });
});

describe('application workflow', () => {
  it('allows only defined admin transitions', () => {
    expect(canTransition('SUBMITTED', 'UNDER_REVIEW')).toBe(true);
    expect(canTransition('UNDER_REVIEW', 'APPROVED')).toBe(true);
    expect(canTransition('SUBMITTED', 'APPROVED')).toBe(false);
    expect(canTransition('APPROVED', 'REJECTED')).toBe(false);
    expect(canTransition('DRAFT', 'UNDER_REVIEW')).toBe(false);
  });

  it('generates non-sequential references without ambiguous characters', () => {
    const ref = applicationReference(2027, new Uint8Array([0, 1, 2, 3, 4, 5, 6, 31]));
    expect(ref).toMatch(/^AHM-2027-[A-HJ-NP-Z2-9]{8}$/);
  });
});
