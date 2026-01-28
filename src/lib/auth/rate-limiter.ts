/**
 * Rate Limiting Module
 * Protection against brute force and abuse
 */

import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { AUTH_CONFIG } from './config';

// In-memory rate limiters (use Redis in production for distributed systems)
const loginLimiter = new RateLimiterMemory({
  points: AUTH_CONFIG.rateLimit.login.points,
  duration: AUTH_CONFIG.rateLimit.login.duration,
  blockDuration: AUTH_CONFIG.rateLimit.login.blockDuration,
});

const apiLimiter = new RateLimiterMemory({
  points: AUTH_CONFIG.rateLimit.api.points,
  duration: AUTH_CONFIG.rateLimit.api.duration,
});

const passwordResetLimiter = new RateLimiterMemory({
  points: AUTH_CONFIG.rateLimit.passwordReset.points,
  duration: AUTH_CONFIG.rateLimit.passwordReset.duration,
});

export interface RateLimitResult {
  allowed: boolean;
  remainingPoints: number;
  msBeforeNext: number;
  consumedPoints: number;
}

/**
 * Check login rate limit
 */
export async function checkLoginRateLimit(identifier: string): Promise<RateLimitResult> {
  try {
    const result = await loginLimiter.consume(identifier);
    return {
      allowed: true,
      remainingPoints: result.remainingPoints,
      msBeforeNext: result.msBeforeNext,
      consumedPoints: result.consumedPoints,
    };
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      return {
        allowed: false,
        remainingPoints: error.remainingPoints,
        msBeforeNext: error.msBeforeNext,
        consumedPoints: error.consumedPoints,
      };
    }
    throw error;
  }
}

/**
 * Check API rate limit
 */
export async function checkApiRateLimit(identifier: string): Promise<RateLimitResult> {
  try {
    const result = await apiLimiter.consume(identifier);
    return {
      allowed: true,
      remainingPoints: result.remainingPoints,
      msBeforeNext: result.msBeforeNext,
      consumedPoints: result.consumedPoints,
    };
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      return {
        allowed: false,
        remainingPoints: error.remainingPoints,
        msBeforeNext: error.msBeforeNext,
        consumedPoints: error.consumedPoints,
      };
    }
    throw error;
  }
}

/**
 * Check password reset rate limit
 */
export async function checkPasswordResetRateLimit(identifier: string): Promise<RateLimitResult> {
  try {
    const result = await passwordResetLimiter.consume(identifier);
    return {
      allowed: true,
      remainingPoints: result.remainingPoints,
      msBeforeNext: result.msBeforeNext,
      consumedPoints: result.consumedPoints,
    };
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      return {
        allowed: false,
        remainingPoints: error.remainingPoints,
        msBeforeNext: error.msBeforeNext,
        consumedPoints: error.consumedPoints,
      };
    }
    throw error;
  }
}

/**
 * Reset rate limit for an identifier (e.g., after successful login)
 */
export async function resetLoginRateLimit(identifier: string): Promise<void> {
  await loginLimiter.delete(identifier);
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': AUTH_CONFIG.rateLimit.api.points.toString(),
    'X-RateLimit-Remaining': result.remainingPoints.toString(),
    'X-RateLimit-Reset': Math.ceil(result.msBeforeNext / 1000).toString(),
  };
}
