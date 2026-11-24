'use client';

/**
 * Browser API client. All browser requests use the same-origin Next.js API proxy.
 * The short-lived access token stays in memory; the refresh token is an httpOnly
 * cookie scoped to this website, so it survives a page reload without third-party cookies.
 */
export interface ApiErrorBody { code: string; message: string; details?: unknown }
export class ApiError extends Error {
  constructor(public status: number, public body: ApiErrorBody) {
    super(body.message);
  }
}

const API_BASE_URL = '/api/v1';

/** API-relative media links are served through the same-origin Next.js proxy too. */
export const apiUrl = (url: string) => url.startsWith('/api/') ? url : url;

let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;

export const tokenStore = {
  get: () => accessToken,
  set: (t: string | null) => {
    accessToken = t;
  },
};

async function refresh(): Promise<boolean> {
  refreshing ??= fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
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
    fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      credentials: 'include',
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
        xhr.open('POST', `${API_BASE_URL}${path}`);
        xhr.withCredentials = true;
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
