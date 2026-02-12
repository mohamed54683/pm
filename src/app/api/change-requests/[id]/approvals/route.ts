import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth/jwt';
import { v4 as uuidv4 } from 'uuid';

// GET - Get approvals for a change request
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const id = request.url.split('/change-requests/')[1]?.split('/')[0];
      
      const approvals = await query<any[]>(`
        SELECT 
          a.*,
          u.name as approver_name, u.email as approver_email,
          ws.step_name, ws.step_order
        FROM cr_approvals a
        LEFT JOIN users u ON a.approver_id = u.id
        LEFT JOIN cr_workflow_steps ws ON a.workflow_step_id = ws.id
        WHERE a.cr_id = (SELECT id FROM change_requests WHERE id = ? OR uuid = ?)
        ORDER BY a.step_order, a.created_at
      `, [id, id]);

      return NextResponse.json({ success: true, data: approvals });
    } catch (error: any) {
      console.error('Error fetching approvals:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  },
  { requiredPermissions: ['change_requests.view'] }
);

// POST - Submit approval decision
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const id = request.url.split('/change-requests/')[1]?.split('/')[0];
      const userId = user.userId;
      const body = await request.json();
      const { decision, comments, conditions } = body;

      if (!decision || !['approved', 'rejected', 'deferred'].includes(decision)) {
        return NextResponse.json({ success: false, error: 'Invalid decision' }, { status: 400 });
      }

      // Get the CR
      const crResult = await query<any[]>(`
        SELECT * FROM change_requests WHERE (id = ? OR uuid = ?) AND deleted_at IS NULL
      `, [id, id]);

      if (crResult.length === 0) {
        return NextResponse.json({ success: false, error: 'Change request not found' }, { status: 404 });
      }

      const cr = crResult[0];

      // Find pending approval for this user
      const pendingApproval = await query<any[]>(`
        SELECT * FROM cr_approvals WHERE cr_id = ? AND approver_id = ? AND status = 'pending'
      `, [cr.id, userId]);

      if (pendingApproval.length === 0) {
        return NextResponse.json({ success: false, error: 'No pending approval found for you' }, { status: 400 });
      }

      // Update approval
      await query(`
        UPDATE cr_approvals 
        SET status = ?, decision = ?, decision_date = NOW(), comments = ?, conditions = ?
        WHERE id = ?
      `, [decision, decision, comments || null, conditions || null, pendingApproval[0].id]);

      // Log activity
      await query(`
        INSERT INTO cr_activity_log (uuid, cr_id, user_id, action, description)
        VALUES (?, ?, ?, ?, ?)
      `, [uuidv4(), cr.id, userId, decision, `Approval ${decision}: ${comments || ''}`]);

      // Update CR status based on approvals
      if (decision === 'rejected') {
        await query(`UPDATE change_requests SET status = 'rejected' WHERE id = ?`, [cr.id]);
      } else if (decision === 'approved') {
        // Check if all approvals are done
        const remaining = await query<any[]>(`
          SELECT COUNT(*) as count FROM cr_approvals WHERE cr_id = ? AND status = 'pending'
        `, [cr.id]);
        
        if (remaining[0].count === 0) {
          await query(`UPDATE change_requests SET status = 'approved', decision_date = NOW() WHERE id = ?`, [cr.id]);
        }
      }

      return NextResponse.json({ success: true, message: 'Approval submitted' });
    } catch (error: any) {
      console.error('Error submitting approval:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  },
  { requiredPermissions: ['change_requests.approve'] }
);
