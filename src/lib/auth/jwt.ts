/**
 * JWT Token Management
 * Access and Refresh token handling
 */

import * as jwt from 'jsonwebtoken';
import { AUTH_CONFIG } from './config';

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  permissions: string[];
  type: 'access' | 'refresh';
}

export interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: Date;
  refreshTokenExpiry: Date;
}

/**
 * Generate access token (15 minutes)
 */
export function generateAccessToken(payload: Omit<TokenPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    AUTH_CONFIG.jwt.accessTokenSecret,
    {
      expiresIn: AUTH_CONFIG.jwt.accessTokenExpiry as jwt.SignOptions['expiresIn'],
      issuer: AUTH_CONFIG.jwt.issuer,
      audience: AUTH_CONFIG.jwt.audience,
    }
  );
}

/**
 * Generate refresh token (7 days)
 */
export function generateRefreshToken(payload: Omit<TokenPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    AUTH_CONFIG.jwt.refreshTokenSecret,
    {
      expiresIn: AUTH_CONFIG.jwt.refreshTokenExpiry as jwt.SignOptions['expiresIn'],
      issuer: AUTH_CONFIG.jwt.issuer,
      audience: AUTH_CONFIG.jwt.audience,
    }
  );
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(payload: Omit<TokenPayload, 'type'>): TokenPair {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const now = new Date();
  const accessTokenExpiry = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
  const refreshTokenExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return {
    accessToken,
    refreshToken,
    accessTokenExpiry,
    refreshTokenExpiry,
  };
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, AUTH_CONFIG.jwt.accessTokenSecret, {
      issuer: AUTH_CONFIG.jwt.issuer,
      audience: AUTH_CONFIG.jwt.audience,
    }) as DecodedToken;

    if (decoded.type !== 'access') {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, AUTH_CONFIG.jwt.refreshTokenSecret, {
      issuer: AUTH_CONFIG.jwt.issuer,
      audience: AUTH_CONFIG.jwt.audience,
    }) as DecodedToken;

    if (decoded.type !== 'refresh') {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    return jwt.decode(token) as DecodedToken;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;
  return decoded.exp * 1000 < Date.now();
}

/**
 * Get remaining time until token expires (in seconds)
 */
export function getTokenRemainingTime(token: string): number {
  const decoded = decodeToken(token);
  if (!decoded) return 0;
  const remaining = decoded.exp - Math.floor(Date.now() / 1000);
  return Math.max(0, remaining);
}
