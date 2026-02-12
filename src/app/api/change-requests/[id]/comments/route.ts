import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth/jwt';
import { v4 as uuidv4 } from 'uuid';

// GET - Get comments
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const id = request.url.split('/change-requests/')[1]?.split('/')[0];
      
      const comments = await query<any[]>(`
        SELECT c.*, u.name as user_name, u.email as user_email
        FROM cr_comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.cr_id = (SELECT id FROM change_requests WHERE id = ? OR uuid = ?)
        ORDER BY c.created_at DESC
      `, [id, id]);

      return NextResponse.json({ success: true, data: comments });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  },
  { requiredPermissions: ['change_requests.view'] }
);

// POST - Add comment
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const id = request.url.split('/change-requests/')[1]?.split('/')[0];
      const userId = user.userId;
      const body = await request.json();
      const { content, is_internal } = body;

      if (!content) {
        return NextResponse.json({ success: false, error: 'Content required' }, { status: 400 });
      }

      const crResult = await query<any[]>(`
        SELECT id FROM change_requests WHERE (id = ? OR uuid = ?) AND deleted_at IS NULL
      `, [id, id]);

      if (crResult.length === 0) {
        return NextResponse.json({ success: false, error: 'Change request not found' }, { status: 404 });
      }

      const uuid = uuidv4();
      await query(`
        INSERT INTO cr_comments (uuid, cr_id, user_id, content, is_internal)
        VALUES (?, ?, ?, ?, ?)
      `, [uuid, crResult[0].id, userId, content, is_internal ? 1 : 0]);

      return NextResponse.json({ success: true, message: 'Comment added' }, { status: 201 });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  },
  { requiredPermissions: ['change_requests.view'] }
);
