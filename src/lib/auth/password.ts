/**
 * Password Security Module
 * Bcrypt hashing with validation
 */

import * as bcrypt from 'bcryptjs';
import { AUTH_CONFIG } from './config';

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate password against security requirements
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const config = AUTH_CONFIG.password;

  if (password.length < config.minLength) {
    errors.push(`Password must be at least ${config.minLength} characters long`);
  }

  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (config.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (config.requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*...)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(AUTH_CONFIG.password.bcryptRounds);
  return bcrypt.hash(password, salt);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * Check if a string looks like a bcrypt hash
 */
export function isBcryptHash(str: string): boolean {
  return /^\$2[aby]?\$\d{1,2}\$[./A-Za-z0-9]{53}$/.test(str);
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = uppercase + lowercase + numbers + special;

  let password = '';

  // Ensure at least one of each required type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
