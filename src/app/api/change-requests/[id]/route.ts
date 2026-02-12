import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth/jwt';
import { v4 as uuidv4 } from 'uuid';

// GET - Get single change request
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const id = request.url.split('/change-requests/')[1]?.split('/')[0];

      const results = await query<any[]>(`
        SELECT 
          cr.*,
          p.name as project_name, p.project_key,
          u.name as requester_name, u.email as requester_email
        FROM change_requests cr
        LEFT JOIN projects p ON cr.project_id = p.id
        LEFT JOIN users u ON cr.requested_by = u.id
        WHERE (cr.id = ? OR cr.uuid = ?) AND cr.deleted_at IS NULL
      `, [id, id]);

      if (results.length === 0) {
        return NextResponse.json({ success: false, error: 'Change request not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: results[0] });
    } catch (error: any) {
      console.error('Error fetching change request:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  },
  { requiredPermissions: ['change_requests.view'] }
);

// PUT - Update change request
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const id = request.url.split('/change-requests/')[1]?.split('/')[0];
      const userId = user.userId;
      const body = await request.json();

      // Check if exists
      const existing = await query<any[]>(`
        SELECT * FROM change_requests WHERE (id = ? OR uuid = ?) AND deleted_at IS NULL
      `, [id, id]);

      if (existing.length === 0) {
        return NextResponse.json({ success: false, error: 'Change request not found' }, { status: 404 });
      }

      const cr = existing[0];

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      const allowedFields = [
        'title', 'description', 'justification', 'category', 'current_state',
        'proposed_change', 'benefits', 'scope_impact', 'schedule_impact_days',
        'cost_impact', 'risk_impact', 'quality_impact', 'resource_impact',
        'priority', 'impact_level', 'urgency', 'target_decision_date'
      ];

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(body[field] === '' ? null : body[field]);
        }
      }

      // Handle status changes
      if (body.submit && cr.status === 'draft') {
        updateFields.push('status = ?', 'submitted_date = ?', 'submitted_at = ?');
        updateValues.push('submitted', new Date().toISOString().split('T')[0], new Date());
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = ?');
        updateValues.push(new Date());
        updateValues.push(cr.id);

        await query(`
          UPDATE change_requests SET ${updateFields.join(', ')} WHERE id = ?
        `, updateValues);

        // Log activity
        await query(`
          INSERT INTO cr_activity_log (uuid, cr_id, user_id, action, description)
          VALUES (?, ?, ?, ?, ?)
        `, [uuidv4(), cr.id, userId, 'updated', 'Change request updated']);
      }

      return NextResponse.json({ success: true, message: 'Change request updated' });
    } catch (error: any) {
      console.error('Error updating change request:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  },
  { requiredPermissions: ['change_requests.edit'] }
);

// DELETE - Soft delete change request
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const id = request.url.split('/change-requests/')[1]?.split('/')[0];

      const result = await query<any>(`
        UPDATE change_requests SET deleted_at = NOW() 
        WHERE (id = ? OR uuid = ?)
      `, [id, id]);

      if (result.affectedRows === 0) {
        return NextResponse.json({ success: false, error: 'Change request not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: 'Change request deleted' });
    } catch (error: any) {
      console.error('Error deleting change request:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  },
  { requiredPermissions: ['change_requests.delete'] }
);
