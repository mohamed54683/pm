/**
 * Backlog Refinement API - Manage refinement sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { stripDangerousTags } from '@/lib/sanitize';
import { DecodedToken } from '@/lib/auth';

interface RefinementSession {
  id: number;
  project_id: number;
  project_name: string;
  session_date: string;
  facilitator_id: number | null;
  facilitator_name: string | null;
  notes: string | null;
  items_refined: string | null;
  action_items: string | null;
  created_at: string;
}

// GET - Get refinement sessions
export const GET = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const projectId = searchParams.get('project_id');
      const limit = parseInt(searchParams.get('limit') || '20');

      let sql = `
        SELECT br.*, p.name as project_name,
          CONCAT(u.first_name, ' ', u.last_name) as facilitator_name
        FROM backlog_refinement br
        LEFT JOIN projects p ON br.project_id = p.id
        LEFT JOIN users u ON br.facilitator_id = u.id
        WHERE 1=1
      `;
      const params: (string | number)[] = [];

      if (projectId) {
        sql += ` AND br.project_id = ?`;
        params.push(projectId);
      }

      sql += ` ORDER BY br.session_date DESC LIMIT ?`;
      params.push(limit);

      const sessions = await query<RefinementSession[]>(sql, params);

      return NextResponse.json({
        success: true,
        data: sessions.map(s => ({
          ...s,
          items_refined: s.items_refined ? JSON.parse(s.items_refined) : [],
          action_items: s.action_items ? JSON.parse(s.action_items) : []
        }))
      });
    } catch (error) {
      console.error('Get refinement sessions error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch refinement sessions', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.view'], checkCsrf: false }
);

// POST - Create refinement session
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { project_id, session_date, notes, items_refined, action_items } = body;

      if (!project_id || !session_date) {
        return NextResponse.json({ success: false, error: 'Project ID and session date are required' }, { status: 400 });
      }

      const result = await query<{ insertId: number }>(
        `INSERT INTO backlog_refinement (project_id, session_date, facilitator_id, notes, items_refined, action_items)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          project_id,
          session_date,
          user.userId,
          stripDangerousTags(notes || ''),
          items_refined ? JSON.stringify(items_refined) : null,
          action_items ? JSON.stringify(action_items) : null
        ]
      );

      // Update refinement notes on individual tasks if provided
      if (items_refined && Array.isArray(items_refined)) {
        for (const item of items_refined) {
          if (item.task_id && item.refinement_notes) {
            await query(
              `UPDATE tasks SET refinement_notes = ?, story_points = COALESCE(?, story_points) WHERE id = ?`,
              [stripDangerousTags(item.refinement_notes), item.story_points || null, item.task_id]
            );
          }
        }
      }

      return NextResponse.json({
        success: true,
        data: { id: result.insertId },
        message: 'Refinement session created'
      }, { status: 201 });
    } catch (error) {
      console.error('Create refinement session error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create refinement session', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.edit'] }
);

// PUT - Update refinement session
export const PUT = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, notes, items_refined, action_items } = body;

      if (!id) {
        return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
      }

      const updates: string[] = [];
      const values: (string | number | null)[] = [];

      if (notes !== undefined) { updates.push('notes = ?'); values.push(stripDangerousTags(notes)); }
      if (items_refined !== undefined) { updates.push('items_refined = ?'); values.push(JSON.stringify(items_refined)); }
      if (action_items !== undefined) { updates.push('action_items = ?'); values.push(JSON.stringify(action_items)); }

      if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        values.push(id);
        await query(`UPDATE backlog_refinement SET ${updates.join(', ')} WHERE id = ?`, values);
      }

      return NextResponse.json({ success: true, message: 'Refinement session updated' });
    } catch (error) {
      console.error('Update refinement session error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update refinement session', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.edit'] }
);

// DELETE - Delete refinement session
export const DELETE = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
      }

      await query(`DELETE FROM backlog_refinement WHERE id = ?`, [id]);

      return NextResponse.json({ success: true, message: 'Refinement session deleted' });
    } catch (error) {
      console.error('Delete refinement session error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete refinement session', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.delete'] }
);
