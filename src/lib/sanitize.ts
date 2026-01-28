/**
 * Input Sanitization Utility
 * Prevents XSS attacks by sanitizing user input
 */

// HTML entities to escape
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize a string by escaping HTML entities
 * Returns null if input is null/undefined
 */
export function sanitizeString(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  return escapeHtml(input.trim());
}

/**
 * Sanitize an object's string properties
 * Recursively sanitizes nested objects
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = escapeHtml(value);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string'
          ? escapeHtml(item)
          : item !== null && typeof item === 'object'
          ? sanitizeObject(item as Record<string, unknown>)
          : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Validate and sanitize common input types
 */
export const validators = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  positiveNumber: (num: unknown): boolean => {
    const n = Number(num);
    return !isNaN(n) && n > 0;
  },

  nonNegativeNumber: (num: unknown): boolean => {
    const n = Number(num);
    return !isNaN(n) && n >= 0;
  },

  date: (dateStr: string): boolean => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  },

  uuid: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },

  safeString: (str: string, maxLength: number = 1000): boolean => {
    return typeof str === 'string' && str.length <= maxLength;
  },
};

/**
 * Strip potentially dangerous content from rich text
 * Use this for description/content fields that might contain formatted text
 */
export function stripDangerousTags(html: string | null | undefined): string | null {
  if (html === null || html === undefined) return null;

  // Remove script tags and their content
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  clean = clean.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '');

  // Remove javascript: URLs
  clean = clean.replace(/javascript\s*:/gi, '');

  // Remove data: URLs (can be used for XSS)
  clean = clean.replace(/data\s*:/gi, '');

  // Remove vbscript: URLs
  clean = clean.replace(/vbscript\s*:/gi, '');

  return clean.trim();
}

export default {
  escapeHtml,
  sanitizeString,
  sanitizeObject,
  stripDangerousTags,
  validators,
};
