/**
 * Sprint Retrospective API - Manage retrospective items
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { stripDangerousTags } from '@/lib/sanitize';
import { DecodedToken } from '@/lib/auth';

interface RetroItem {
  id: number;
  sprint_id: number;
  category: string;
  content: string;
  owner_id: number | null;
  owner_first_name: string | null;
  owner_last_name: string | null;
  status: string;
  due_date: string | null;
  created_by: number;
  created_at: string;
}

// GET - Get retrospective items for sprint
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;

      // Get sprint
      const sprintResult = await query<{ id: number; what_went_well: string; what_to_improve: string; action_items: string }[]>(
        `SELECT id, what_went_well, what_to_improve, action_items FROM sprints WHERE id = ? OR uuid = ?`,
        [id, id]
      );

      if (!sprintResult.length) {
        return NextResponse.json({ success: false, error: 'Sprint not found' }, { status: 404 });
      }

      const sprint = sprintResult[0];

      // Get structured retrospective items
      const items = await query<RetroItem[]>(`
        SELECT ri.*, 
          u.first_name as owner_first_name, u.last_name as owner_last_name
        FROM sprint_retrospective_items ri
        LEFT JOIN users u ON ri.owner_id = u.id
        WHERE ri.sprint_id = ?
        ORDER BY ri.category, ri.created_at
      `, [sprint.id]);

      // Group by category
      const grouped = {
        went_well: items.filter(i => i.category === 'went_well'),
        to_improve: items.filter(i => i.category === 'to_improve'),
        action_items: items.filter(i => i.category === 'action_item')
      };

      // Summary of action items
      const actionItemsSummary = {
        total: grouped.action_items.length,
        open: grouped.action_items.filter(i => i.status === 'open').length,
        in_progress: grouped.action_items.filter(i => i.status === 'in_progress').length,
        completed: grouped.action_items.filter(i => i.status === 'completed').length
      };

      return NextResponse.json({
        success: true,
        data: {
          items: grouped,
          legacy: {
            what_went_well: sprint.what_went_well,
            what_to_improve: sprint.what_to_improve,
            action_items: sprint.action_items ? JSON.parse(sprint.action_items) : []
          },
          summary: actionItemsSummary
        }
      });
    } catch (error) {
      console.error('Get retrospective error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch retrospective', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['sprints.view'], checkCsrf: false }
);

// POST - Add retrospective item
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { category, content, owner_id, due_date } = body;

      if (!category || !content) {
        return NextResponse.json({ success: false, error: 'Category and content are required' }, { status: 400 });
      }

      if (!['went_well', 'to_improve', 'action_item'].includes(category)) {
        return NextResponse.json({ success: false, error: 'Invalid category' }, { status: 400 });
      }

      // Get sprint
      const sprintResult = await query<{ id: number }[]>(
        `SELECT id FROM sprints WHERE id = ? OR uuid = ?`,
        [id, id]
      );

      if (!sprintResult.length) {
        return NextResponse.json({ success: false, error: 'Sprint not found' }, { status: 404 });
      }

      const sprint = sprintResult[0];

      const result = await query<{ insertId: number }>(
        `INSERT INTO sprint_retrospective_items (sprint_id, category, content, owner_id, due_date, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sprint.id, category, stripDangerousTags(content), owner_id || null, due_date || null, user.userId]
      );

      return NextResponse.json({
        success: true,
        data: { id: result.insertId },
        message: 'Retrospective item added'
      }, { status: 201 });
    } catch (error) {
      console.error('Add retrospective item error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to add retrospective item', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['sprints.edit'] }
);

// PUT - Update retrospective item
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { item_id, content, owner_id, status, due_date } = body;

      if (!item_id) {
        return NextResponse.json({ success: false, error: 'Item ID is required' }, { status: 400 });
      }

      const updates: string[] = [];
      const values: (string | number | null)[] = [];

      if (content !== undefined) { updates.push('content = ?'); values.push(stripDangerousTags(content)); }
      if (owner_id !== undefined) { updates.push('owner_id = ?'); values.push(owner_id); }
      if (status !== undefined) { updates.push('status = ?'); values.push(status); }
      if (due_date !== undefined) { updates.push('due_date = ?'); values.push(due_date); }

      if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        values.push(item_id);
        await query(`UPDATE sprint_retrospective_items SET ${updates.join(', ')} WHERE id = ?`, values);
      }

      return NextResponse.json({ success: true, message: 'Retrospective item updated' });
    } catch (error) {
      console.error('Update retrospective item error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update retrospective item', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['sprints.edit'] }
);

// DELETE - Delete retrospective item
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const itemId = searchParams.get('item_id');

      if (!itemId) {
        return NextResponse.json({ success: false, error: 'Item ID is required' }, { status: 400 });
      }

      await query(`DELETE FROM sprint_retrospective_items WHERE id = ?`, [itemId]);

      return NextResponse.json({ success: true, message: 'Retrospective item deleted' });
    } catch (error) {
      console.error('Delete retrospective item error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete retrospective item', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['sprints.edit'] }
);
