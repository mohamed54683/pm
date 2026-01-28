/**
 * CSRF Protection Module
 * Token generation and validation
 */

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || 'CHANGE_THIS_CSRF_SECRET_IN_PRODUCTION';

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(): string {
  const token = uuidv4();
  const timestamp = Date.now().toString();
  const data = `${token}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(data)
    .digest('hex');

  return Buffer.from(`${data}:${signature}`).toString('base64');
}

/**
 * Validate a CSRF token
 */
export function validateCsrfToken(token: string, maxAge: number = 3600000): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [uuid, timestamp, signature] = decoded.split(':');

    if (!uuid || !timestamp || !signature) {
      return false;
    }

    // Check timestamp (default: 1 hour max age)
    const tokenTime = parseInt(timestamp, 10);
    if (Date.now() - tokenTime > maxAge) {
      return false;
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', CSRF_SECRET)
      .update(`${uuid}:${timestamp}`)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Extract CSRF token from request headers
 */
export function getCsrfTokenFromHeaders(headers: Headers): string | null {
  return headers.get('x-csrf-token') || headers.get('X-CSRF-Token');
}
