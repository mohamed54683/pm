import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth/jwt';

// GET - Get activity log
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const id = request.url.split('/change-requests/')[1]?.split('/')[0];
      
      const activities = await query<any[]>(`
        SELECT a.*, u.name as user_name, u.email as user_email
        FROM cr_activity_log a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.cr_id = (SELECT id FROM change_requests WHERE id = ? OR uuid = ?)
        ORDER BY a.created_at DESC
      `, [id, id]);

      return NextResponse.json({ success: true, data: activities });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  },
  ['change_requests.view']
);
