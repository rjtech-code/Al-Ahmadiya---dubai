/** Pure eligibility evaluation, so the rules engine is unit-testable. */
export interface RuleInput {
  minOverallPercent: number | null;
  subjectMinimums: { subject: string; minPercent: number }[];
}
export interface ApplicantScores {
  overallPercent: number;
  subjects: { subject: string; percent: number }[];
}
export interface EligibilityResult {
  eligible: boolean;
  unmet: { requirement: string; required: number; actual: number | null }[];
}

export function evaluateEligibility(rule: RuleInput, scores: ApplicantScores): EligibilityResult {
  const unmet: EligibilityResult['unmet'] = [];
  if (rule.minOverallPercent !== null && scores.overallPercent < rule.minOverallPercent) {
    unmet.push({ requirement: 'overall', required: rule.minOverallPercent, actual: scores.overallPercent });
  }
  for (const req of rule.subjectMinimums) {
    const match = scores.subjects.find((s) => s.subject.trim().toLowerCase() === req.subject.trim().toLowerCase());
    if (!match || match.percent < req.minPercent) {
      unmet.push({ requirement: req.subject, required: req.minPercent, actual: match?.percent ?? null });
    }
  }
  return { eligible: unmet.length === 0, unmet };
}
