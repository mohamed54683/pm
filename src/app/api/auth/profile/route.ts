/**
 * Profile API - Get and update current user profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth';

// GET - Get current user profile
export const GET = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const authReq = request as AuthenticatedRequest;
      const userId = authReq.user?.userId;

      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401 }
        );
      }

      const users = await query<Record<string, unknown>[]>(`
        SELECT 
          u.id, u.uuid, u.email, u.first_name, u.last_name, u.display_name,
          u.avatar_url, u.phone, u.job_title, u.department,
          u.timezone, u.locale, u.date_format, u.time_format,
          u.status, u.last_login_at, u.created_at
        FROM users u
        WHERE u.id = ? AND u.deleted_at IS NULL
      `, [userId]);

      if (users.length === 0) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: users[0]
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: [], checkCsrf: false }
);

// PUT - Update current user profile
export const PUT = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const authReq = request as AuthenticatedRequest;
      const userId = authReq.user?.userId;

      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401 }
        );
      }

      const body = await request.json();
      const {
        first_name,
        last_name,
        display_name,
        phone,
        job_title,
        department,
        timezone,
        locale,
        date_format,
        time_format
      } = body;

      await query(`
        UPDATE users SET
          first_name = ?,
          last_name = ?,
          display_name = ?,
          phone = ?,
          job_title = ?,
          department = ?,
          timezone = ?,
          locale = ?,
          date_format = ?,
          time_format = ?,
          updated_at = NOW()
        WHERE id = ? AND deleted_at IS NULL
      `, [
        first_name || null,
        last_name || null,
        display_name || null,
        phone || null,
        job_title || null,
        department || null,
        timezone || 'UTC',
        locale || 'en',
        date_format || 'YYYY-MM-DD',
        time_format || '24h',
        userId
      ]);

      return NextResponse.json({
        success: true,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: [], checkCsrf: true }
);
