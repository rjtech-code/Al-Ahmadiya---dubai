/**
 * Canonical server-side NestJS API origin for Next.js fetches, sitemap and rewrites.
 * Keep this private: browser REST requests use the same-origin /api/v1 proxy.
 */
const configuredOrigin = process.env.API_ORIGIN?.trim()
  || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:4000');

if (!configuredOrigin) {
  throw new Error('API_ORIGIN is required in production. Set it to the NestJS API origin, without /api/v1.');
}

let parsedOrigin: URL;
try {
  parsedOrigin = new URL(configuredOrigin);
} catch {
  throw new Error('API_ORIGIN must be a valid absolute HTTP(S) origin.');
}

if (!['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.pathname !== '/' || parsedOrigin.search || parsedOrigin.hash) {
  throw new Error('API_ORIGIN must contain only the HTTP(S) origin, without a path, query, or hash.');
}

export const API_ORIGIN = parsedOrigin.origin;
export const API_BASE_URL = `${API_ORIGIN}/api/v1`;
