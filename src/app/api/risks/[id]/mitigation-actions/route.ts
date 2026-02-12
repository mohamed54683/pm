/**
 * Risk Mitigation Actions API
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { stripDangerousTags } from '@/lib/sanitize';
import { DecodedToken } from '@/lib/auth';

// GET - Fetch mitigation actions for a risk
export const GET = withAuth(
  async (request: NextRequest, _user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      
      const actions = await query<Record<string, unknown>[]>(`
        SELECT ma.*, u.name as responsible_name, u.email as responsible_email
        FROM risk_mitigation_actions ma
        LEFT JOIN users u ON ma.responsible_id = u.id
        WHERE ma.risk_id = ?
        ORDER BY 
          CASE ma.status WHEN 'in_progress' THEN 1 WHEN 'pending' THEN 2 WHEN 'completed' THEN 3 WHEN 'cancelled' THEN 4 END,
          ma.target_date ASC
      `, [id]);

      return NextResponse.json({ success: true, data: actions });
    } catch (error) {
      console.error('Get mitigation actions error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch mitigation actions' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['risks.view'], checkCsrf: false }
);

// POST - Create a new mitigation action
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { action_description, responsible_id, target_date, notes } = body;

      if (!action_description) {
        return NextResponse.json({ success: false, error: 'Action description is required' }, { status: 400 });
      }

      const sanitizedDesc = stripDangerousTags(action_description);
      const sanitizedNotes = notes ? stripDangerousTags(notes) : null;

      const result = await query<{ insertId: number }>(
        `INSERT INTO risk_mitigation_actions (uuid, risk_id, action_description, responsible_id, target_date, notes, status)
         VALUES (UUID(), ?, ?, ?, ?, ?, 'pending')`,
        [id, sanitizedDesc, responsible_id || null, target_date || null, sanitizedNotes]
      );

      // Log activity
      await query(
        `INSERT INTO risk_activity_log (uuid, risk_id, user_id, action, description)
         VALUES (UUID(), ?, ?, 'action_added', ?)`,
        [id, user.userId, `Added mitigation action: ${sanitizedDesc.substring(0, 100)}`]
      );

      return NextResponse.json({
        success: true,
        data: { id: result.insertId }
      }, { status: 201 });
    } catch (error) {
      console.error('Create mitigation action error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create mitigation action' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['risks.edit'] }
);

// PUT - Update a mitigation action
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { action_id, action_description, responsible_id, target_date, completion_date, status, notes } = body;

      if (!action_id) {
        return NextResponse.json({ success: false, error: 'Action ID is required' }, { status: 400 });
      }

      const sanitizedDesc = action_description ? stripDangerousTags(action_description) : null;
      const sanitizedNotes = notes !== undefined ? stripDangerousTags(notes || '') : null;

      await query(`
        UPDATE risk_mitigation_actions SET
          action_description = COALESCE(?, action_description),
          responsible_id = COALESCE(?, responsible_id),
          target_date = COALESCE(?, target_date),
          completion_date = COALESCE(?, completion_date),
          status = COALESCE(?, status),
          notes = COALESCE(?, notes),
          updated_at = NOW()
        WHERE id = ? AND risk_id = ?
      `, [sanitizedDesc, responsible_id, target_date, completion_date, status, sanitizedNotes, action_id, id]);

      // Log if status changed to completed
      if (status === 'completed') {
        await query(
          `INSERT INTO risk_activity_log (uuid, risk_id, user_id, action, description)
           VALUES (UUID(), ?, ?, 'action_completed', ?)`,
          [id, user.userId, `Completed mitigation action #${action_id}`]
        );
      }

      return NextResponse.json({ success: true, message: 'Mitigation action updated' });
    } catch (error) {
      console.error('Update mitigation action error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update mitigation action' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['risks.edit'] }
);

// DELETE - Delete a mitigation action
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      const { searchParams } = new URL(request.url);
      const action_id = searchParams.get('action_id');

      if (!action_id) {
        return NextResponse.json({ success: false, error: 'Action ID is required' }, { status: 400 });
      }

      await query(`DELETE FROM risk_mitigation_actions WHERE id = ? AND risk_id = ?`, [action_id, id]);

      await query(
        `INSERT INTO risk_activity_log (uuid, risk_id, user_id, action, description)
         VALUES (UUID(), ?, ?, 'action_deleted', ?)`,
        [id, user.userId, `Deleted mitigation action #${action_id}`]
      );

      return NextResponse.json({ success: true, message: 'Mitigation action deleted' });
    } catch (error) {
      console.error('Delete mitigation action error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete mitigation action' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['risks.edit'] }
);
