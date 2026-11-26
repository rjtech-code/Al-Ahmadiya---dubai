'use client';

import { demoApiFetch, demoUploadWithProgress } from './demo-api';

export interface ApiErrorBody { code: string; message: string; details?: unknown }
export class ApiError extends Error {
  constructor(public status: number, public body: ApiErrorBody) { super(body.message); }
}

/** Compatibility no-op: demo mode has no access or refresh tokens. */
export const tokenStore = { get: () => null, set: (_token: string | null) => undefined };
export const apiUrl = (url: string) => url;

/** Every browser API operation is resolved locally; this module never calls fetch(). */
export async function apiFetch<R = unknown>(path: string, init: RequestInit & { json?: unknown; auth?: boolean } = {}): Promise<R> {
  return demoApiFetch<R>(path, init);
}
export async function restoreSession() { return true; }
export function uploadWithProgress<R = unknown>(path: string, form: FormData, onProgress: (pct: number) => void): Promise<R> {
  return demoUploadWithProgress<R>(path, form, onProgress);
}
export const formatMoney = (fils: number, currency = 'AED', locale = 'en') =>
  new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', { style: 'currency', currency, minimumFractionDigits: 2 }).format(fils / 100);
