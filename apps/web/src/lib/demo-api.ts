'use client';

import { readDemoSession } from './demo-session';

type RequestOptions = RequestInit & { json?: unknown; auth?: boolean };
const STORAGE = 'al-ahmadiya-local-erp-data';
const now = () => new Date().toISOString();
const id = () => `local-${Math.random().toString(36).slice(2, 10)}`;

const initialItems = [
  { id: 'book-001', type: 'BOOK', title: 'Introduction to Computer Science', author: 'A. Rahman', isbn: '9780000000011', subject: 'Computing', year: 2023, url: null, copies: 12, isPublic: true, available: 9, onLoan: 3 },
  { id: 'book-002', type: 'BOOK', title: 'Principles of Business Management', author: 'M. Hassan', isbn: '9780000000028', subject: 'Business', year: 2022, url: null, copies: 8, isPublic: true, available: 6, onLoan: 2 },
  { id: 'book-003', type: 'BOOK', title: 'Academic Writing and Research', author: 'S. Karim', isbn: '9780000000035', subject: 'Research', year: 2024, url: null, copies: 10, isPublic: true, available: 10, onLoan: 0 },
  { id: 'ebook-001', type: 'EBOOK', title: 'Digital Learning Essentials', author: 'University Press', isbn: null, subject: 'Education', year: 2024, url: 'https://example.org/digital-learning', copies: 0, isPublic: true, available: null, onLoan: 0 },
  { id: 'journal-001', type: 'JOURNAL', title: 'Journal of Applied Research', author: null, isbn: null, subject: 'Research', year: 2025, url: 'https://example.org/journal', copies: 0, isPublic: true, available: null, onLoan: 0 },
];
const initialLoans = [
  { id: 'loan-001', issuedAt: '2026-11-12T09:00:00.000Z', dueAt: '2026-11-26T09:00:00.000Z', returnedAt: null, renewals: 0, item: { title: 'Introduction to Computer Science' }, user: { fullName: 'Demo Student 01', email: 'student01@example.test' } },
  { id: 'loan-002', issuedAt: '2026-11-08T09:00:00.000Z', dueAt: '2026-11-22T09:00:00.000Z', returnedAt: null, renewals: 1, item: { title: 'Principles of Business Management' }, user: { fullName: 'Demo Student 02', email: 'student02@example.test' } },
];

function readStore(): Record<string, any> {
  try { return JSON.parse(localStorage.getItem(STORAGE) || '{}'); } catch { return {}; }
}
function writeStore(store: Record<string, any>) { localStorage.setItem(STORAGE, JSON.stringify(store)); }
function getList(store: Record<string, any>, key: string, fallback: any[]) { return Array.isArray(store[key]) ? store[key] : fallback; }
const wrap = (data: unknown, meta?: unknown) => ({ data, ...(meta ? { meta } : {}) });

export async function demoApiFetch<R = unknown>(path: string, init: RequestOptions = {}): Promise<R> {
  const method = (init.method || 'GET').toUpperCase();
  const clean = path.split('?')[0];
  const query = new URLSearchParams(path.split('?')[1] || '');
  const payload = (init.json ?? {}) as Record<string, any>;
  const store = readStore();
  const user = readDemoSession();
  const role = user?.role ?? 'GUEST';
  const listMeta = (rows: any[]) => ({ page: Number(query.get('page') || 1), pageSize: Number(query.get('pageSize') || 20), total: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / Number(query.get('pageSize') || 20))) });

  if (clean === '/auth/me') return wrap({ id: user?.id ?? 'demo-user', email: user?.email ?? 'demo@example.test', fullName: user?.fullName ?? 'Demo User', roles: user?.roles ?? [], permissions: user?.permissions ?? [] }) as R;

  if (clean === '/admin/library/overview') {
    const items = getList(store, 'library.items', initialItems);
    const loans = getList(store, 'library.loans', initialLoans);
    const active = loans.filter((l) => !l.returnedAt);
    const month = now().slice(0, 7);
    const books = items.filter((i) => i.type === 'BOOK');
    return wrap({
      totals: { titles: books.length, copies: books.reduce((n, i) => n + i.copies, 0), eResources: items.filter((i) => i.type !== 'BOOK').length, activeBorrowers: new Set(active.map((l) => l.user.email)).size, onLoan: active.length, overdue: active.filter((l) => l.dueAt < now()).length, thisMonth: loans.filter((l) => l.issuedAt.startsWith(month)).length },
      byType: { ebooks: items.filter((i) => i.type === 'EBOOK').length, journals: items.filter((i) => i.type === 'JOURNAL').length, databases: items.filter((i) => i.type === 'DATABASE').length, papers: items.filter((i) => i.type === 'PAPER').length },
      monthly: [{ month: '2026-06', count: 8 }, { month: '2026-07', count: 11 }, { month: '2026-08', count: 13 }, { month: '2026-09', count: 9 }, { month: '2026-10', count: 16 }, { month: '2026-11', count: loans.length }],
      dueSoon: active.slice(0, 5).map((l) => ({ id: l.id, title: l.item.title, borrower: l.user.fullName, dueAt: l.dueAt, overdue: l.dueAt < now() })),
      borrowers: active.map((l) => ({ name: l.user.fullName, items: 1, nextDue: l.dueAt })),
    }) as R;
  }
  if (clean === '/admin/library/items') {
    let rows = getList(store, 'library.items', initialItems);
    const q = (query.get('q') || '').toLowerCase();
    const type = query.get('type');
    if (q) rows = rows.filter((i) => [i.title, i.author, i.subject, i.isbn].some((v) => String(v || '').toLowerCase().includes(q)));
    if (type) rows = rows.filter((i) => i.type === type);
    if (method === 'POST') {
      const item = { id: id(), ...payload, available: payload.type === 'BOOK' ? Number(payload.copies || 0) : null, onLoan: 0 };
      rows = [...rows, item]; store['library.items'] = rows; writeStore(store); return wrap(item) as R;
    }
    return wrap(rows) as R;
  }
  if (clean.startsWith('/admin/library/items/') && method === 'DELETE') {
    store['library.items'] = getList(store, 'library.items', initialItems).filter((i) => i.id !== clean.split('/').pop());
    writeStore(store); return wrap({ success: true }) as R;
  }
  if (clean === '/admin/library/loans') {
    let rows = getList(store, 'library.loans', initialLoans);
    if (method === 'POST') {
      const items = getList(store, 'library.items', initialItems);
      const item = items.find((i) => i.id === payload.itemId);
      if (item) { item.available = Math.max(0, Number(item.available || 0) - 1); item.onLoan = Number(item.onLoan || 0) + 1; }
      const loan = { id: id(), issuedAt: now(), dueAt: new Date(Date.now() + Number(payload.days || 14) * 86400000).toISOString(), returnedAt: null, renewals: 0, item: { title: item?.title ?? 'Demo book' }, user: { fullName: 'Demo Borrower', email: payload.email ?? 'borrower@example.test' } };
      rows = [...rows, loan]; store['library.items'] = items; store['library.loans'] = rows; writeStore(store); return wrap(loan) as R;
    }
    return wrap(rows.filter((l) => !l.returnedAt)) as R;
  }
  if (clean.startsWith('/admin/library/loans/')) {
    const loans = getList(store, 'library.loans', initialLoans);
    const loan = loans.find((l) => clean.includes(l.id));
    if (loan && clean.endsWith('/renew')) { loan.dueAt = new Date(new Date(loan.dueAt).getTime() + 14 * 86400000).toISOString(); loan.renewals += 1; }
    if (loan && clean.endsWith('/return')) loan.returnedAt = now();
    store['library.loans'] = loans; writeStore(store); return wrap({ success: true }) as R;
  }

  const listPaths = ['/admin/applications', '/admin/users', '/admin/roles', '/admin/cms', '/admin/contact-messages', '/admin/newsletter-subscribers', '/admin/leave', '/admin/live/sessions', '/admin/lms/courses', '/admin/records/students', '/admin/payments', '/me/notifications', '/me/courses', '/me/live'];
  if (listPaths.includes(clean)) return wrap([], listMeta([])) as R;

  if (method !== 'GET' && method !== 'HEAD') {
    const key = `mutation:${clean}`;
    const rows = getList(store, key, []);
    rows.push({ id: id(), ...payload, createdAt: now(), createdBy: role });
    store[key] = rows; writeStore(store);
    return wrap({ success: true, id: rows[rows.length - 1].id }) as R;
  }

  if (clean.includes('/overview') || clean.includes('/summary') || clean.endsWith('/config') || clean.endsWith('/dashboard')) return wrap({}) as R;
  if (clean.includes('/students')) return wrap([], listMeta([])) as R;
  if (clean.includes('/items') || clean.includes('/loans') || clean.includes('/applications') || clean.includes('/notifications') || clean.includes('/courses') || clean.includes('/sessions')) return wrap([]) as R;
  return wrap({}) as R;
}
