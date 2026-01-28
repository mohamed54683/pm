/**
 * Task Checklists API - CRUD operations for task checklists/subtasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// GET - Fetch checklists for a task
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const task_id = searchParams.get('task_id');

      if (!task_id) {
        return NextResponse.json(
          { success: false, error: 'Task ID is required' },
          { status: 400 }
        );
      }

      const checklists = await query<any[]>(
        `SELECT tc.*, u.name as completed_by_name
         FROM task_checklists tc
         LEFT JOIN users u ON tc.completed_by = u.id
         WHERE tc.task_id = ?
         ORDER BY tc.order_index`,
        [task_id]
      );

      return NextResponse.json({
        success: true,
        data: checklists
      });

    } catch (error: any) {
      console.error('Error fetching checklists:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.view'], checkCsrf: false }
);

// POST - Create a new checklist item
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { task_id, title, items } = body;

      if (!task_id) {
        return NextResponse.json(
          { success: false, error: 'Task ID is required' },
          { status: 400 }
        );
      }

      // Get max order index
      const maxOrder = await query<any[]>(
        'SELECT MAX(order_index) as max_order FROM task_checklists WHERE task_id = ?',
        [task_id]
      );
      let orderIndex = (maxOrder[0]?.max_order || 0) + 1;

      const createdIds: string[] = [];

      // Handle batch creation (multiple items)
      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (item.title) {
            const id = generateId('check');
            await query(
              `INSERT INTO task_checklists (id, task_id, title, order_index) VALUES (?, ?, ?, ?)`,
              [id, task_id, item.title, orderIndex++]
            );
            createdIds.push(id);
          }
        }
      } else if (title) {
        // Single item creation
        const id = generateId('check');
        await query(
          `INSERT INTO task_checklists (id, task_id, title, order_index) VALUES (?, ?, ?, ?)`,
          [id, task_id, title, orderIndex]
        );
        createdIds.push(id);
      } else {
        return NextResponse.json(
          { success: false, error: 'Title or items are required' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { ids: createdIds },
        message: 'Checklist item(s) created successfully'
      });

    } catch (error: any) {
      console.error('Error creating checklist:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.edit'] }
);

// PUT - Update a checklist item (toggle completion, rename, reorder)
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, title, is_completed, order_index } = body;

      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Checklist ID is required' },
          { status: 400 }
        );
      }

      const updateFields: string[] = [];
      const params: any[] = [];

      if (title !== undefined) {
        updateFields.push('title = ?');
        params.push(title);
      }

      if (is_completed !== undefined) {
        updateFields.push('is_completed = ?');
        params.push(is_completed);

        if (is_completed) {
          updateFields.push('completed_by = ?');
          updateFields.push('completed_at = NOW()');
          params.push(user.userId);
        } else {
          updateFields.push('completed_by = NULL');
          updateFields.push('completed_at = NULL');
        }
      }

      if (order_index !== undefined) {
        updateFields.push('order_index = ?');
        params.push(order_index);
      }

      if (updateFields.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid fields to update' },
          { status: 400 }
        );
      }

      params.push(id);
      await query(
        `UPDATE task_checklists SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      // Update task progress based on checklist completion
      const checklistData = await query<any[]>(
        'SELECT task_id FROM task_checklists WHERE id = ?',
        [id]
      );

      if (checklistData && checklistData.length > 0) {
        await updateTaskProgressFromChecklist(checklistData[0].task_id);
      }

      return NextResponse.json({
        success: true,
        message: 'Checklist item updated successfully'
      });

    } catch (error: any) {
      console.error('Error updating checklist:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.edit'] }
);

// DELETE - Delete a checklist item
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Checklist ID is required' },
          { status: 400 }
        );
      }

      // Get task_id before deletion
      const checklistData = await query<any[]>(
        'SELECT task_id FROM task_checklists WHERE id = ?',
        [id]
      );

      await query('DELETE FROM task_checklists WHERE id = ?', [id]);

      // Update task progress
      if (checklistData && checklistData.length > 0) {
        await updateTaskProgressFromChecklist(checklistData[0].task_id);
      }

      return NextResponse.json({
        success: true,
        message: 'Checklist item deleted successfully'
      });

    } catch (error: any) {
      console.error('Error deleting checklist:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.edit'] }
);

// Helper to update task progress based on checklist completion
async function updateTaskProgressFromChecklist(taskId: string): Promise<void> {
  const result = await query<any[]>(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed
     FROM task_checklists WHERE task_id = ?`,
    [taskId]
  );

  if (result && result.length > 0 && result[0].total > 0) {
    const progress = (result[0].completed / result[0].total) * 100;
    await query(
      'UPDATE tasks SET progress_percentage = ? WHERE id = ?',
      [progress, taskId]
    );
  }
}
