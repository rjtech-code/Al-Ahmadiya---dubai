'use client';

export const USE_BACKEND = false;
export const DEMO_SESSION_KEY = 'al-ahmadiya-demo-session';
export const DEMO_SESSION_EVENT = 'al-ahmadiya-demo-session-changed';

export interface DemoSession {
  role: string; id: string; email: string; fullName: string; locale: string; roles: string[]; permissions: string[];
}

const COMMON = ['dashboard.read'];
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  UNIVERSITY_ADMIN: [...COMMON, 'department.lead', 'teach.own', 'lms.manage', 'live.host', 'admissions.read', 'admissions.review', 'admissions.decide', 'academics.manage', 'records.manage', 'payments.read', 'library.manage', 'procurement.manage', 'cms.read', 'settings.write', 'engagement.read', 'hr.manage', 'users.read', 'roles.read', 'security.read'],
  ADMISSIONS_OFFICER: [...COMMON, 'admissions.read', 'admissions.review', 'admissions.decide'],
  ADMISSIONS_REVIEWER: [...COMMON, 'admissions.read', 'admissions.review'],
  REGISTRAR: [...COMMON, 'records.manage'],
  LIBRARIAN: [...COMMON, 'library.manage'],
  PROCUREMENT_OFFICER: [...COMMON, 'procurement.manage'],
  ACADEMIC_ADMIN: [...COMMON, 'academics.manage', 'lms.manage', 'live.host'],
  FINANCE_MANAGER: [...COMMON, 'payments.read'],
  FINANCE_OFFICER: [...COMMON, 'payments.read'],
  HR_MANAGER: [...COMMON, 'hr.manage'],
  HEAD_OF_DEPARTMENT: [...COMMON, 'department.lead', 'teach.own', 'lms.manage'],
  CONTENT_EDITOR: [...COMMON, 'cms.read'],
  FACULTY: [...COMMON, 'teach.own'],
};

export function saveDemoSession(role: string, profile?: { fullName?: string; email?: string }) {
  const normalizedRole = role.trim().toUpperCase();
  const isStudent = normalizedRole === 'STUDENT';
  const session: DemoSession = {
    role: normalizedRole,
    id: `demo-${normalizedRole.toLowerCase()}`,
    email: profile?.email?.trim() || (isStudent ? 'student.demo@al-ahmadiya.example' : `${normalizedRole.toLowerCase()}.demo@al-ahmadiya.example`),
    fullName: profile?.fullName?.trim() || (isStudent ? 'Demo Student' : `Demo ${normalizedRole.replaceAll('_', ' ')}`),
    locale: 'en',
    roles: [normalizedRole],
    permissions: isStudent ? [] : (ROLE_PERMISSIONS[normalizedRole] ?? [...COMMON]),
  };
  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
  document.cookie = `al-ahmadiya-demo-role=${encodeURIComponent(normalizedRole)}; path=/; max-age=604800; SameSite=Lax`;
  window.dispatchEvent(new Event(DEMO_SESSION_EVENT));
  return session;
}

export function readDemoSession(): DemoSession | null {
  try {
    const raw = localStorage.getItem(DEMO_SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as DemoSession;
    if (!value || typeof value.role !== 'string' || !Array.isArray(value.roles)) return null;
    const normalizedRole = value.role.toUpperCase();
    value.permissions = normalizedRole === 'STUDENT' ? [] : (ROLE_PERMISSIONS[normalizedRole] ?? [...COMMON]);
    return value;
  } catch { return null; }
}

export function clearDemoSession() {
  localStorage.removeItem(DEMO_SESSION_KEY);
  document.cookie = 'al-ahmadiya-demo-role=; path=/; max-age=0; SameSite=Lax';
  window.dispatchEvent(new Event(DEMO_SESSION_EVENT));
}
