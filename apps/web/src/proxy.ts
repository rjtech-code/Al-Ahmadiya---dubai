import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Everything except API proxying, the admin panel, Next internals and static files.
  matcher: ['/((?!api|admin|_next|_vercel|images|.*\\..*).*)'],
};
