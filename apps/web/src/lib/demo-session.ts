'use client';

export const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND?.trim().toLowerCase() !== 'false';
export const DEMO_SESSION_KEY = 'al-ahmadiya-demo-session';

export interface DemoSession {
  role: string;
  id: string;
  email: string;
  fullName: string;
  locale: string;
  roles: string[];
  permissions: string[];
}

export function saveDemoSession(role: string) {
  const normalizedRole = role.toUpperCase();
  const isStudent = normalizedRole === 'STUDENT';
  const session: DemoSession = {
    role: normalizedRole,
    id: `demo-${normalizedRole.toLowerCase()}`,
    email: isStudent ? 'student.demo@al-ahmadiya.example' : `${normalizedRole.toLowerCase()}.demo@al-ahmadiya.example`,
    fullName: isStudent ? 'Demo Student' : `Demo ${normalizedRole.replaceAll('_', ' ')}`,
    locale: 'en',
    roles: [normalizedRole],
    permissions: isStudent ? [] : ['*'],
  };
  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
  document.cookie = `al-ahmadiya-demo-role=${encodeURIComponent(normalizedRole)}; path=/; max-age=604800; SameSite=Lax`;
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
}
