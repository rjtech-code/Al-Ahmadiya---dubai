import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), display-capture=(), geolocation=()' },
  ...(process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://')
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
    : []),
];
const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: { formats: ['image/avif', 'image/webp'], remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }] },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};
export default createNextIntlPlugin('./src/i18n/request.ts')(nextConfig);
