'use client';

/**
 * Browser API client. Calls go to same-origin /api/v1 (proxied to NestJS).
 * The access token lives in memory only; the refresh token is an httpOnly cookie.
 */
export interface ApiErrorBody { code: string; message: string; details?: unknown }
export class ApiError extends Error {
  constructor(public status: number, public body: ApiErrorBody) {
    super(body.message);
  }
}

let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;

export const tokenStore = {
  get: () => accessToken,
  set: (t: string | null) => {
    accessToken = t;
  },
};

async function refresh(): Promise<boolean> {
  refreshing ??= fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'same-origin' })
    .then(async (r) => {
      if (!r.ok || r.status === 204) return false;
      const j = (await r.json()) as { data: { accessToken: string } };
      accessToken = j.data.accessToken;
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function apiFetch<R = unknown>(path: string, init: RequestInit & { json?: unknown; auth?: boolean } = {}): Promise<R> {
  const { json, auth = true, headers, ...rest } = init;
  const doFetch = () =>
    fetch(`/api/v1${path}`, {
      ...rest,
      credentials: 'same-origin',
      headers: {
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });

  let res: Response;
  try {
    res = await doFetch();
    if (res.status === 401 && auth && path !== '/auth/refresh' && (await refresh())) res = await doFetch();
  } catch {
    throw new ApiError(0, { code: 'NETWORK', message: 'Network error. Check your connection and try again.' });
  }
  if (res.status === 204) return undefined as R;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (body as { error?: ApiErrorBody }).error ?? { code: 'ERROR', message: res.statusText });
  return body as R;
}

export async function restoreSession() {
  return accessToken ? true : refresh();
}

/** Multipart upload with progress (used for large lecture videos). */
export function uploadWithProgress<R = unknown>(path: string, form: FormData, onProgress: (pct: number) => void): Promise<R> {
  return restoreSession().then(
    () =>
      new Promise<R>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/v1${path}`);
        const t = tokenStore.get();
        if (t) xhr.setRequestHeader('Authorization', `Bearer ${t}`);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => {
          const body = (() => { try { return JSON.parse(xhr.responseText); } catch { return {}; } })();
          if (xhr.status >= 200 && xhr.status < 300) resolve(body as R);
          else reject(new ApiError(xhr.status, body.error ?? { code: 'UPLOAD_FAILED', message: `Upload failed (${xhr.status})` }));
        };
        xhr.onerror = () => reject(new ApiError(0, { code: 'NETWORK', message: 'Network error during upload' }));
        xhr.send(form);
      }),
  );
}

export const formatMoney = (fils: number, currency = 'AED', locale = 'en') =>
  new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', { style: 'currency', currency, minimumFractionDigits: 2 }).format(fils / 100);
