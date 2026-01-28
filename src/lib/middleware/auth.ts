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

/**
 * Verify authentication from request
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  // Get access token from cookies
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

  // Try refresh token if access token is invalid/expired
  const refreshToken = getRefreshTokenFromCookies(request.cookies);
  if (refreshToken) {
    const decoded = verifyRefreshToken(refreshToken);
    if (decoded) {
      // Generate new token pair
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

/**
 * Middleware wrapper for protected API routes
 */
export function withAuth(
  handler: (request: NextRequest, user: DecodedToken) => Promise<NextResponse>,
  options: {
    requiredPermissions?: Permission[];
    requireAll?: boolean;
    checkCsrf?: boolean;
    rateLimit?: boolean;
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
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

    // Call the handler
    let response = await handler(request, authResult.user);

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

    // Add rate limit headers
    const headers = getRateLimitHeaders(rateLimitResult);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}
