/**
 * Token Refresh API
 * Generates new access token from valid refresh token
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyRefreshToken,
  generateTokenPair,
  getRefreshTokenFromCookies,
  setAuthCookies,
  generateCsrfToken,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookies
    const refreshToken = getRefreshTokenFromCookies(request.cookies);

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'No refresh token provided' },
        { status: 401 }
      );
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Generate new token pair
    const tokens = generateTokenPair({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
    });

    // Generate new CSRF token
    const csrfToken = generateCsrfToken();

    // Create response
    let response = NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      csrfToken,
      expiresAt: tokens.accessTokenExpiry.toISOString(),
    });

    // Set new cookies
    response = setAuthCookies(response, tokens);

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Cache-Control', 'no-store');

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, message: 'Error refreshing token' },
      { status: 500 }
    );
  }
}
