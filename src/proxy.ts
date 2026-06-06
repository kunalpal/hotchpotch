/**
 * Next.js Proxy (Middleware) — Security Layer
 *
 * This is the first line of defense for every incoming request. It runs at the
 * edge before any route handler or server action executes and is responsible for
 * two things:
 *
 * 1. **Authentication gate** — Unauthenticated requests to protected routes are
 *    redirected to `/sign-in`. The check is optimistic (cookie-existence only);
 *    real session validation happens deeper in the stack via
 *    `getAuthenticatedUser()`. This keeps the proxy fast while still preventing
 *    casual access to protected pages.
 *
 * 2. **Security headers** — Every response gets a hardened set of HTTP headers
 *    (CSP, HSTS, X-Frame-Options, etc.) so that even if an individual route
 *    forgets to set them, the baseline protection is always present.
 *
 * Why proxy.ts and not middleware.ts?
 *   Next.js 16 replaced middleware.ts with proxy.ts. Having both files causes a
 *   build error, so all middleware logic lives here.
 *
 * Related requirements: 5.1–5.5 (Security Middleware and HTTP Headers)
 * See: .kiro/specs/security-remediation/requirements.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Routes that are accessible without a session cookie.
 * - /sign-in        — Login page (must be reachable to authenticate)
 * - /not-authorized — Shown when a user is authenticated but not allowlisted
 * - /api/auth       — Better Auth endpoints (handles login/logout/callback flows)
 */
const PUBLIC_PATHS = [
  '/',
  '/sign-in',
  '/not-authorized',
  '/api/auth',
];

/**
 * Defense-in-depth headers injected on every response.
 *
 * - X-Frame-Options: DENY              → Prevents clickjacking by disallowing framing
 * - X-Content-Type-Options: nosniff    → Stops browsers from MIME-sniffing responses
 * - Referrer-Policy                    → Limits referrer leakage to cross-origin requests
 * - Strict-Transport-Security          → Forces HTTPS for 2 years including subdomains
 * - Content-Security-Policy            → Restricts resource loading origins:
 *     • script-src 'self' 'unsafe-inline' — Same-origin + inline scripts (required by Next.js hydration & next-themes)
 *     • style-src 'self' 'unsafe-inline' https://fonts.googleapis.com — Inline styles needed for Tailwind + ChartStyle + Google Fonts
 *     • worker-src blob:                 — PDF.js spawns Web Workers from blob: URL wrappers
 *     • img-src 'self' blob: data: https: [+ LocalStack in dev] — Blob previews, data URIs, external/S3 images
 *     • connect-src 'self' https: [+ LocalStack in dev] — API calls + S3 presigned URL uploads
 *     • font-src 'self' https://fonts.gstatic.com https://esm.sh — Self-hosted fonts + Google Fonts + Excalidraw fonts
 *     • frame-ancestors 'none'        — Equivalent to X-Frame-Options for CSP-aware browsers
 */
// When running against LocalStack (dev:local), browser-side S3 uploads go to
// http://localhost:4566 which is HTTP-only. Add it to connect-src so the Fetch
// API can PUT to presigned URLs without a CSP violation.
// When running against real/staging AWS (dev or production), presigned URLs are
// always HTTPS, so the blanket `https:` directive already covers them.
const localstackOrigin = process.env.LOCALSTACK_ENDPOINT
  ? ` ${process.env.LOCALSTACK_ENDPOINT}`
  : '';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // blob: needed for PDF.js Web Workers (spawned from a blob URL wrapper)
    'worker-src blob:',
    `img-src 'self' blob: data: https:${localstackOrigin}`,
    `connect-src 'self' https:${localstackOrigin}`,
    "font-src 'self' https://fonts.gstatic.com",
    "frame-ancestors 'none'",
  ].join('; '),
};

/** Returns true if the pathname matches a public (no-auth-required) route. */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from protected routes.
  if (!isPublicPath(pathname)) {
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
  }

  // Attach security headers to every response, regardless of auth status.
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

/**
 * Matcher excludes static assets and favicon so the proxy only runs on
 * meaningful routes (pages, API endpoints, server actions).
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon_light.ico|favicon_dark.ico).*)',
  ],
};
