import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth/jwt';

function generateId(prefix: string = 'lbl'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// GET - List labels
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const taskId = searchParams.get('task_id');

    if (taskId) {
      // Get labels for a specific task
      const labels = await query(
        `SELECT l.* FROM labels l
         JOIN task_labels tl ON l.id = tl.label_id
         WHERE tl.task_id = ?
         ORDER BY l.name`,
        [taskId]
      );
      return NextResponse.json({ success: true, data: labels });
    }

    // List all labels (optionally filtered by project)
    let sql = `
      SELECT l.*, 
             (SELECT COUNT(*) FROM task_labels tl WHERE tl.label_id = l.id) as usage_count
      FROM labels l
      WHERE 1=1
    `;
    const params: any[] = [];

    if (projectId) {
      sql += ' AND (l.project_id = ? OR l.project_id IS NULL)';
      params.push(projectId);
    }

    sql += ' ORDER BY l.name';

    const labels = await query(sql, params);

    return NextResponse.json({ success: true, data: labels });
  } catch (error: any) {
    console.error('Error fetching labels:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create label or assign to task
async function handlePost(request: NextRequest, user: DecodedToken) {
  try {
    const body = await request.json();
    const { name, color, project_id, task_id, label_id } = body;

    // If task_id and label_id are provided, assign label to task
    if (task_id && label_id) {
      await query(
        `INSERT IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)`,
        [task_id, label_id]
      );
      return NextResponse.json({ success: true, message: 'Label assigned to task' });
    }

    // Create new label
    if (!name) {
      return NextResponse.json({ success: false, error: 'Label name is required' }, { status: 400 });
    }

    const id = generateId('lbl');
    const labelColor = color || generateRandomColor();

    await query(
      `INSERT INTO labels (id, name, color, project_id) VALUES (?, ?, ?, ?)`,
      [id, name, labelColor, project_id || null]
    );

    // If task_id is provided, also assign to task
    if (task_id) {
      await query(
        `INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)`,
        [task_id, id]
      );
    }

    const labels = await query('SELECT * FROM labels WHERE id = ?', [id]);

    return NextResponse.json({ success: true, data: (labels as any[])[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating label:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update label
async function handlePut(request: NextRequest, user: DecodedToken) {
  try {
    const body = await request.json();
    const { id, name, color } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Label ID is required' }, { status: 400 });
    }

    const updateFields: string[] = [];
    const params: any[] = [];

    if (name) {
      updateFields.push('name = ?');
      params.push(name);
    }
    if (color) {
      updateFields.push('color = ?');
      params.push(color);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400 });
    }

    params.push(id);
    await query(`UPDATE labels SET ${updateFields.join(', ')} WHERE id = ?`, params);

    const labels = await query('SELECT * FROM labels WHERE id = ?', [id]);

    return NextResponse.json({ success: true, data: (labels as any[])[0] });
  } catch (error: any) {
    console.error('Error updating label:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete label or remove from task
async function handleDelete(request: NextRequest, user: DecodedToken) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const taskId = searchParams.get('task_id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Label ID is required' }, { status: 400 });
    }

    if (taskId) {
      // Remove label from task
      await query('DELETE FROM task_labels WHERE task_id = ? AND label_id = ?', [taskId, id]);
      return NextResponse.json({ success: true, message: 'Label removed from task' });
    }

    // Delete label entirely
    await query('DELETE FROM labels WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: 'Label deleted' });
  } catch (error: any) {
    console.error('Error deleting label:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function generateRandomColor(): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export const GET = withAuth(handleGet, { requiredPermissions: ['projects.view'] });
export const POST = withAuth(handlePost, { requiredPermissions: ['projects.create'] });
export const PUT = withAuth(handlePut, { requiredPermissions: ['projects.edit'] });
export const DELETE = withAuth(handleDelete, { requiredPermissions: ['projects.delete'] });
