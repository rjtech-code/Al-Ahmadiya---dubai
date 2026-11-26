'use client';

export const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND?.trim().toLowerCase() !== 'false';
export const DEMO_SESSION_KEY = 'al-ahmadiya-demo-session';
export const DEMO_SESSION_EVENT = 'al-ahmadiya-demo-session-changed';

export interface DemoSession {
  role: string;
  id: string;
  email: string;
  fullName: string;
  locale: string;
  roles: string[];
  permissions: string[];
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  UNIVERSITY_ADMIN: ['dashboard.read', 'department.lead', 'teach.own', 'lms.manage', 'live.host', 'admissions.read', 'academics.manage', 'records.manage', 'payments.read', 'library.manage', 'procurement.manage', 'cms.read', 'settings.write', 'engagement.read', 'hr.manage', 'users.read', 'roles.read', 'security.read'],
  ADMISSIONS_OFFICER: ['admissions.read'],
  ADMISSIONS_REVIEWER: ['admissions.read'],
  REGISTRAR: ['records.manage'],
  LIBRARIAN: ['library.manage'],
  PROCUREMENT_OFFICER: ['procurement.manage'],
  ACADEMIC_ADMIN: ['academics.manage', 'lms.manage', 'live.host'],
  FINANCE_MANAGER: ['payments.read'],
  FINANCE_OFFICER: ['payments.read'],
  HR_MANAGER: ['hr.manage'],
  HEAD_OF_DEPARTMENT: ['department.lead', 'teach.own', 'lms.manage'],
  CONTENT_EDITOR: ['cms.read'],
  FACULTY: ['teach.own'],
};

export function saveDemoSession(role: string) {
  const normalizedRole = role.trim().toUpperCase();
  const isStudent = normalizedRole === 'STUDENT';
  const session: DemoSession = {
    role: normalizedRole,
    id: `demo-${normalizedRole.toLowerCase()}`,
    email: isStudent ? 'student.demo@al-ahmadiya.example' : `${normalizedRole.toLowerCase()}.demo@al-ahmadiya.example`,
    fullName: isStudent ? 'Demo Student' : `Demo ${normalizedRole.replaceAll('_', ' ')}`,
    locale: 'en',
    roles: [normalizedRole],
    permissions: ROLE_PERMISSIONS[normalizedRole] ?? [],
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
    return value && typeof value.role === 'string' && Array.isArray(value.roles) ? value : null;
  } catch {
    return null;
  }
}

export function clearDemoSession() {
  localStorage.removeItem(DEMO_SESSION_KEY);
  document.cookie = 'al-ahmadiya-demo-role=; path=/; max-age=0; SameSite=Lax';
  window.dispatchEvent(new Event(DEMO_SESSION_EVENT));
}
