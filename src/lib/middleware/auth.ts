/**
 * API Authentication Middleware
 * JWT verification and RBAC enforcement
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, verifyRefreshToken, generateTokenPair, DecodedToken } from '../auth/jwt';
import { getAccessTokenFromCookies, getRefreshTokenFromCookies, setAuthCookies } from '../auth/cookies';
import { validateCsrfToken, getCsrfTokenFromHeaders } from '../auth/csrf';
import { checkApiRateLimit, getRateLimitHeaders } from '../auth/rate-limiter';
import { Permission } from '../auth/config';

export interface AuthenticatedRequest extends NextRequest {
  user?: DecodedToken;
}

export interface AuthResult {
  authenticated: boolean;
  user?: DecodedToken;
  error?: string;
  statusCode?: number;
  newTokens?: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiry: Date;
    refreshTokenExpiry: Date;
  };
}

// Re-export DecodedToken for convenience
export { DecodedToken } from '../auth/jwt';

/**
 * Verify authentication from request
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  const accessToken = getAccessTokenFromCookies(request.cookies);

  if (accessToken) {
    const decoded = verifyAccessToken(accessToken);
    if (decoded) {
      return {
        authenticated: true,
        user: decoded,
      };
    }
  }

  const refreshToken = getRefreshTokenFromCookies(request.cookies);
  if (refreshToken) {
    const decoded = verifyRefreshToken(refreshToken);
    if (decoded) {
      const newTokens = generateTokenPair({
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions,
      });

      return {
        authenticated: true,
        user: decoded,
        newTokens,
      };
    }
  }

  return {
    authenticated: false,
    error: 'Authentication required',
    statusCode: 401,
  };
}

/**
 * Check if user has required permission
 */
export function hasPermission(user: DecodedToken, permission: Permission): boolean {
  return user.permissions.includes(permission);
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(user: DecodedToken, permissions: Permission[]): boolean {
  return permissions.some(permission => user.permissions.includes(permission));
}

/**
 * Check if user has all required permissions
 */
export function hasAllPermissions(user: DecodedToken, permissions: Permission[]): boolean {
  return permissions.every(permission => user.permissions.includes(permission));
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  );
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  );
}

/**
 * Create rate limit exceeded response
 */
export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(retryAfter / 1000),
    },
    {
      status: 429,
      headers: {
        'Retry-After': Math.ceil(retryAfter / 1000).toString(),
      },
    }
  );
}

// Context type for dynamic routes
interface RouteContext {
  params: Promise<Record<string, string>>;
}

/**
 * Middleware wrapper for protected API routes
 * Supports both regular routes and dynamic routes with params
 */
export function withAuth<T extends RouteContext | undefined = undefined>(
  handler: T extends RouteContext
    ? (request: NextRequest, user: DecodedToken, context: T) => Promise<NextResponse>
    : (request: NextRequest, user: DecodedToken) => Promise<NextResponse>,
  options: {
    requiredPermissions?: Permission[];
    requireAll?: boolean;
    checkCsrf?: boolean;
    rateLimit?: boolean;
  } = {}
) {
  return async (request: NextRequest, context?: T): Promise<NextResponse> => {
    // Rate limiting
    if (options.rateLimit !== false) {
      const clientIp = request.headers.get('x-forwarded-for') ||
                       request.headers.get('x-real-ip') ||
                       'unknown';
      const rateLimitResult = await checkApiRateLimit(clientIp);

      if (!rateLimitResult.allowed) {
        return rateLimitResponse(rateLimitResult.msBeforeNext);
      }
    }

    // CSRF check for mutating requests
    if (options.checkCsrf !== false && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const csrfToken = getCsrfTokenFromHeaders(request.headers);
      if (!csrfToken || !validateCsrfToken(csrfToken)) {
        return NextResponse.json(
          { success: false, error: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
    }

    // Authentication check
    const authResult = await verifyAuth(request);

    if (!authResult.authenticated || !authResult.user) {
      return unauthorizedResponse(authResult.error);
    }

    // Permission check
    if (options.requiredPermissions && options.requiredPermissions.length > 0) {
      const hasAccess = options.requireAll
        ? hasAllPermissions(authResult.user, options.requiredPermissions)
        : hasAnyPermission(authResult.user, options.requiredPermissions);

      if (!hasAccess) {
        return forbiddenResponse('Insufficient permissions');
      }
    }

    // Call the handler with or without context
    let response: NextResponse;
    if (context !== undefined) {
      response = await (handler as (request: NextRequest, user: DecodedToken, context: T) => Promise<NextResponse>)(
        request, authResult.user, context
      );
    } else {
      response = await (handler as (request: NextRequest, user: DecodedToken) => Promise<NextResponse>)(
        request, authResult.user
      );
    }

    // If we generated new tokens, set them in cookies
    if (authResult.newTokens) {
      response = setAuthCookies(response, authResult.newTokens);
    }

    return response;
  };
}

/**
 * Middleware wrapper for public API routes (with optional rate limiting)
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    const rateLimitResult = await checkApiRateLimit(clientIp);

    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.msBeforeNext);
    }

    const response = await handler(request);

    const headers = getRateLimitHeaders(rateLimitResult);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}
