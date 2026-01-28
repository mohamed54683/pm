/**
 * Secure Cookie Management
 * HttpOnly, Secure, SameSite cookies
 */

import { NextResponse } from 'next/server';
import { AUTH_CONFIG } from './config';
import { TokenPair } from './jwt';

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  maxAge: number;
}

/**
 * Get secure cookie options for access token
 */
export function getAccessTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: AUTH_CONFIG.cookie.httpOnly,
    secure: AUTH_CONFIG.cookie.secure,
    sameSite: AUTH_CONFIG.cookie.sameSite,
    path: AUTH_CONFIG.cookie.path,
    maxAge: AUTH_CONFIG.cookie.maxAge.accessToken,
  };
}

/**
 * Get secure cookie options for refresh token
 */
export function getRefreshTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: AUTH_CONFIG.cookie.httpOnly,
    secure: AUTH_CONFIG.cookie.secure,
    sameSite: AUTH_CONFIG.cookie.sameSite,
    path: AUTH_CONFIG.cookie.path,
    maxAge: AUTH_CONFIG.cookie.maxAge.refreshToken,
  };
}

/**
 * Set authentication cookies on response
 */
export function setAuthCookies(response: NextResponse, tokens: TokenPair): NextResponse {
  const accessOptions = getAccessTokenCookieOptions();
  const refreshOptions = getRefreshTokenCookieOptions();

  response.cookies.set(AUTH_CONFIG.cookie.accessTokenName, tokens.accessToken, accessOptions);
  response.cookies.set(AUTH_CONFIG.cookie.refreshTokenName, tokens.refreshToken, refreshOptions);

  // Set a non-httpOnly cookie for client-side auth state check
  response.cookies.set('qms_authenticated', 'true', {
    httpOnly: false,
    secure: AUTH_CONFIG.cookie.secure,
    sameSite: AUTH_CONFIG.cookie.sameSite,
    path: AUTH_CONFIG.cookie.path,
    maxAge: AUTH_CONFIG.cookie.maxAge.accessToken,
  });

  return response;
}

/**
 * Clear authentication cookies on response
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
  const expiredOptions = {
    httpOnly: true,
    secure: AUTH_CONFIG.cookie.secure,
    sameSite: AUTH_CONFIG.cookie.sameSite as 'strict',
    path: AUTH_CONFIG.cookie.path,
    maxAge: 0,
  };

  response.cookies.set(AUTH_CONFIG.cookie.accessTokenName, '', expiredOptions);
  response.cookies.set(AUTH_CONFIG.cookie.refreshTokenName, '', expiredOptions);
  response.cookies.set('qms_authenticated', '', { ...expiredOptions, httpOnly: false });

  // Clear legacy cookie
  response.cookies.set('isAuthenticated', '', { ...expiredOptions, httpOnly: false });

  return response;
}

/**
 * Get access token from request cookies
 */
export function getAccessTokenFromCookies(cookies: { get: (name: string) => { value: string } | undefined }): string | null {
  return cookies.get(AUTH_CONFIG.cookie.accessTokenName)?.value || null;
}

/**
 * Get refresh token from request cookies
 */
export function getRefreshTokenFromCookies(cookies: { get: (name: string) => { value: string } | undefined }): string | null {
  return cookies.get(AUTH_CONFIG.cookie.refreshTokenName)?.value || null;
}
