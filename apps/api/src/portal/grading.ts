/** Default 4.0 grading scale. Override with the `grading.scale` site setting (JSON array, same shape) once the university confirms its own. */
export interface GradeBand { min: number; grade: string; points: number }
export const DEFAULT_SCALE: GradeBand[] = [
  { min: 90, grade: 'A', points: 4.0 }, { min: 85, grade: 'A-', points: 3.7 }, { min: 80, grade: 'B+', points: 3.3 },
  { min: 75, grade: 'B', points: 3.0 }, { min: 70, grade: 'B-', points: 2.7 }, { min: 65, grade: 'C+', points: 2.3 },
  { min: 60, grade: 'C', points: 2.0 }, { min: 50, grade: 'D', points: 1.0 }, { min: 0, grade: 'F', points: 0 },
];

export const gradeFor = (marks: number, scale: GradeBand[] = DEFAULT_SCALE) =>
  [...scale].sort((a, b) => b.min - a.min).find((b) => marks >= b.min) ?? scale[scale.length - 1];

/** Credit-weighted average of grade points. */
export function gpa(rows: { gradePoints: number; creditHours: number }[]) {
  const credits = rows.reduce((s, r) => s + r.creditHours, 0);
  return credits ? Math.round((rows.reduce((s, r) => s + r.gradePoints * r.creditHours, 0) / credits) * 100) / 100 : null;
}
