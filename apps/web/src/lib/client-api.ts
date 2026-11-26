'use client';

import { USE_BACKEND } from './demo-session';
import { demoApiFetch } from './demo-api';

export interface ApiErrorBody { code: string; message: string; details?: unknown }
export class ApiError extends Error {
  constructor(public status: number, public body: ApiErrorBody) { super(body.message); }
}
const API_BASE_URL = '/api/v1';
export const apiUrl = (url: string) => url;
let accessToken: string | null = null;
export const tokenStore = { get: () => accessToken, set: (t: string | null) => { accessToken = t; } };

export async function apiFetch<R = unknown>(path: string, init: RequestInit & { json?: unknown; auth?: boolean } = {}): Promise<R> {
  if (!USE_BACKEND) return demoApiFetch<R>(path, init);
  const { json, auth = true, headers, ...rest } = init;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest, credentials: 'include',
    headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  }).catch(() => { throw new ApiError(0, { code: 'NETWORK', message: 'Network error. Check your connection and try again.' }); });
  if (res.status === 204) return undefined as R;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (body as { error?: ApiErrorBody }).error ?? { code: 'ERROR', message: res.statusText });
  return body as R;
}
export async function restoreSession() { return USE_BACKEND ? Boolean(accessToken) : true; }
export function uploadWithProgress<R = unknown>(_path: string, _form: FormData, _onProgress: (pct: number) => void): Promise<R> {
  return Promise.reject(new ApiError(0, { code: 'OFFLINE_DEMO', message: 'File uploads are disabled in local demo mode.' }));
}
export const formatMoney = (fils: number, currency = 'AED', locale = 'en') =>
  new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', { style: 'currency', currency, minimumFractionDigits: 2 }).format(fils / 100);
