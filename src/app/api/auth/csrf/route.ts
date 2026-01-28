/**
 * CSRF Token API
 * Generates CSRF token for forms
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCsrfToken } from '@/lib/auth';
import { verifyAuth } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const authResult = await verifyAuth(request);

    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Generate new CSRF token
    const csrfToken = generateCsrfToken();

    return NextResponse.json({
      success: true,
      csrfToken,
    });
  } catch (error) {
    console.error('CSRF token error:', error);
    return NextResponse.json(
      { success: false, message: 'Error generating CSRF token' },
      { status: 500 }
    );
  }
}
