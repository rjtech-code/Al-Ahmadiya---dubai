import { API_BASE_URL } from '@/lib/api-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const incoming = new URL(request.url);
  const target = `${API_BASE_URL}/${path.map(encodeURIComponent).join('/')}${incoming.search}`;

  const headers = new Headers(request.headers);
  // These are hop-by-hop/browser-origin headers and must not be forwarded upstream.
  for (const name of ['host', 'connection', 'content-length', 'accept-encoding', 'origin', 'referer']) {
    headers.delete(name);
  }

  const method = request.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'manual',
    });
  } catch {
    return Response.json(
      { error: { code: 'API_UNAVAILABLE', message: 'The application server is temporarily unavailable. Please try again.' } },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, name) => {
    if (!['connection', 'content-encoding', 'content-length', 'transfer-encoding', 'set-cookie'].includes(name.toLowerCase())) {
      responseHeaders.set(name, value);
    }
  });

  // Preserve every Set-Cookie header. The browser sees this response as coming
  // from the website's own origin, not from the cross-site Render API.
  const cookies = upstream.headers.getSetCookie();
  for (const cookie of cookies) responseHeaders.append('set-cookie', cookie);

  const noBody = method === 'HEAD' || upstream.status === 204 || upstream.status === 304;
  return new Response(noBody ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
