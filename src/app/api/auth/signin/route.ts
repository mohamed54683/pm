/**
 * Secure Authentication API
 * Production-ready signin with bcrypt, JWT, rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import {
  verifyPassword,
  hashPassword,
  isBcryptHash,
  generateTokenPair,
  checkLoginRateLimit,
  resetLoginRateLimit,
  setAuthCookies,
  generateCsrfToken,
  DEFAULT_ROLE_PERMISSIONS,
} from '@/lib/auth';

// User type for database result
interface DbUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  password?: string;
  password_hash?: string;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let connection;

  try {
    // Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     request.ip ||
                     'unknown';

    // Check rate limit FIRST
    const rateLimitResult = await checkLoginRateLimit(clientIp);
    if (!rateLimitResult.allowed) {
      const retryAfter = Math.ceil(rateLimitResult.msBeforeNext / 1000);
      return NextResponse.json(
        {
          success: false,
          message: `Too many login attempts. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email, password } = body;

    // Input validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get connection from pool
    const pool = getPool();
    connection = await pool.getConnection();

    // Get user with role from user_roles join (DO NOT SELECT password in normal queries - only for auth)
    const [users] = await connection.execute(
      `SELECT u.id, u.name, u.email, u.password, u.status,
              COALESCE(r.name, 'Viewer') as role
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.email = ? AND u.status = 'active' AND u.deleted_at IS NULL`,
      [email]
    );

    // Generic error message to prevent user enumeration
    const genericError = 'Invalid email or password. Please try again.';

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { success: false, message: genericError },
        { status: 401 }
      );
    }

    const user = users[0] as DbUser;
    const storedPassword = user.password || '';

    // Check if password is already hashed (bcrypt) or plain text (legacy)
    let passwordValid = false;

    if (isBcryptHash(storedPassword)) {
      // Password is already hashed - verify with bcrypt
      passwordValid = await verifyPassword(password, storedPassword);
    } else {
      // Legacy plain text password - verify and migrate
      if (storedPassword === password) {
        passwordValid = true;

        // MIGRATE: Hash the password and update the database
        const hashedPassword = await hashPassword(password);

        // Update users table with hashed password
        try {
          await connection.execute(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, email]
          );
          console.log(`Password migrated to bcrypt for user: ${email}`);
        } catch {
          // Ignore if update fails
        }
      }
    }

    if (!passwordValid) {
      return NextResponse.json(
        { success: false, message: genericError },
        { status: 401 }
      );
    }

    // Reset rate limit on successful login
    await resetLoginRateLimit(clientIp);

    // Get user permissions based on role
    const permissions = DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS['Viewer'] || [];

    // Generate JWT tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions,
    });

    // Update last login
    try {
      await connection.execute(
        'UPDATE users SET last_login_at = NOW() WHERE email = ?',
        [email]
      );
    } catch {
      // Ignore if update fails
    }

    // Generate CSRF token for the session
    const csrfToken = generateCsrfToken();

    // Create response with user data (NO PASSWORD)
    const responseData = {
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions,
      },
      csrfToken, // Client needs this for subsequent requests
      expiresAt: tokens.accessTokenExpiry.toISOString(),
    };

    let response = NextResponse.json(responseData);

    // Set secure HTTP-only cookies
    response = setAuthCookies(response, tokens);

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;

  } catch (error: unknown) {
    console.error('Authentication error:', error);

    // Provide specific error messages for common issues
    let errorMessage = 'An error occurred during authentication';
    const err = error as { code?: string };

    if (err.code === 'ECONNREFUSED') {
      errorMessage = 'Database connection failed. Please ensure MySQL service is running.';
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      errorMessage = 'Database access denied. Please check database credentials.';
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      errorMessage = 'Database not found. Please ensure qms_system database exists.';
    }

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
