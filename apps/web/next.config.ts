import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { API_ORIGIN } from './src/lib/api-origin';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Camera, microphone and screen capture are allowed for our own pages only (live classes); never for embedded third parties.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), display-capture=(self), geolocation=()' },
  // HTTPS only once live (never on localhost, where it would stick in the browser).
  ...(process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://')
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: { formats: ['image/avif', 'image/webp'] },
  // Browser calls go same-origin to /api/v1 and are proxied to the NestJS API,
  // so the httpOnly refresh cookie stays first-party.
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${API_ORIGIN}/api/v1/:path*` }];
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};

export default createNextIntlPlugin('./src/i18n/request.ts')(nextConfig);
