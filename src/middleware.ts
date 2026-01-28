/**
 * Next.js Middleware
 * Secure authentication and routing
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// JWT verification in middleware (lightweight check)
function isValidJwtFormat(token: string): boolean {
  // Basic JWT format check (three parts separated by dots)
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname.startsWith('/images')
  ) {
    return NextResponse.next();
  }

  // Define public paths that don't require authentication
  const publicPaths = ['/signin', '/signup', '/reset-password', '/forgot-password'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // Check for JWT access token (secure cookie)
  const accessToken = request.cookies.get('qms_access_token')?.value;
  const refreshToken = request.cookies.get('qms_refresh_token')?.value;

  // Check if user has valid tokens
  const hasValidAccessToken = accessToken && isValidJwtFormat(accessToken);
  const hasValidRefreshToken = refreshToken && isValidJwtFormat(refreshToken);
  const isAuthenticated = hasValidAccessToken || hasValidRefreshToken;

  // If trying to access protected route without authentication, redirect to signin
  if (!isPublicPath && !isAuthenticated) {
    const signInUrl = new URL('/signin', request.url);
    signInUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If already authenticated and trying to access signin, redirect to dashboard
  if (isAuthenticated && pathname === '/signin') {
    const dashboardUrl = new URL('/', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Add security headers to all responses
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // Content Security Policy (adjust as needed for your application)
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self';"
  );

  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  return response;
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes - handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|.*\\..*|public).*)',
  ],
};
