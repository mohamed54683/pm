import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth/jwt';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// GET - Get signatures
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const id = request.url.split('/change-requests/')[1]?.split('/')[0];
      
      const signatures = await query<any[]>(`
        SELECT s.*, u.name as signer_name, u.email as signer_email
        FROM cr_signatures s
        LEFT JOIN users u ON s.signer_id = u.id
        WHERE s.cr_id = (SELECT id FROM change_requests WHERE id = ? OR uuid = ?)
        ORDER BY s.created_at DESC
      `, [id, id]);

      return NextResponse.json({ success: true, data: signatures });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  },
  { requiredPermissions: ['change_requests.view'] }
);

// POST - Add digital signature
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const id = request.url.split('/change-requests/')[1]?.split('/')[0];
      const userId = user.userId;
      const body = await request.json();
      const { signature_type, signature_data, reason } = body;

      const crResult = await query<any[]>(`
        SELECT * FROM change_requests WHERE (id = ? OR uuid = ?) AND deleted_at IS NULL
      `, [id, id]);

      if (crResult.length === 0) {
        return NextResponse.json({ success: false, error: 'Change request not found' }, { status: 404 });
      }

      const cr = crResult[0];
      
      // Create hash of CR content for integrity
      const contentHash = crypto.createHash('sha256')
        .update(JSON.stringify({
          id: cr.id,
          title: cr.title,
          description: cr.description,
          status: cr.status
        }))
        .digest('hex');

      const uuid = uuidv4();
      await query(`
        INSERT INTO cr_signatures (uuid, cr_id, signer_id, signature_type, signature_data, signature_hash, reason, signed_at, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)
      `, [uuid, cr.id, userId, signature_type || 'approval', signature_data || null, contentHash, reason || null, request.headers.get('x-forwarded-for') || 'unknown']);

      // Log activity
      await query(`
        INSERT INTO cr_activity_log (uuid, cr_id, user_id, action, description)
        VALUES (?, ?, ?, ?, ?)
      `, [uuidv4(), cr.id, userId, 'signed', `Digital signature added: ${signature_type || 'approval'}`]);

      return NextResponse.json({ success: true, message: 'Signature recorded' }, { status: 201 });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  },
  { requiredPermissions: ['change_requests.approve'] }
);
