/**
 * Secure Signout API
 * Clears all auth cookies
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    let response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear all authentication cookies
    response = clearAuthCookies(response);

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Cache-Control', 'no-store');

    return response;
  } catch (error) {
    console.error('Signout error:', error);
    return NextResponse.json(
      { success: false, message: 'Error during logout' },
      { status: 500 }
    );
  }
}

// Also support GET for simple logout links
export async function GET(request: NextRequest) {
  return POST(request);
}
