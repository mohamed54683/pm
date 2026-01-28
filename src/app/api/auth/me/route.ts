/**
 * Current User API
 * Returns authenticated user info
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware/auth';
import { setAuthCookies } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);

    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Return user info (without sensitive data)
    const responseData = {
      success: true,
      user: {
        userId: authResult.user.userId,
        email: authResult.user.email,
        role: authResult.user.role,
        permissions: authResult.user.permissions,
      },
    };

    let response = NextResponse.json(responseData);

    // If tokens were refreshed, set new cookies
    if (authResult.newTokens) {
      response = setAuthCookies(response, authResult.newTokens);
    }

    return response;
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { success: false, message: 'Error getting user info' },
      { status: 500 }
    );
  }
}
