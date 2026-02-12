import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth/jwt';

function generateId(prefix: string = 'te'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// GET - List time entries or get single entry
async function handleGet(request: NextRequest, user: DecodedToken) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const projectId = searchParams.get('project_id');
    const taskId = searchParams.get('task_id');
    const userId = searchParams.get('user_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const isRunning = searchParams.get('is_running');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (id) {
      const entries = await query(
        `SELECT te.*, t.title as task_title, p.name as project_name, u.name as user_name
         FROM time_entries te
         LEFT JOIN tasks t ON te.task_id = t.id
         LEFT JOIN projects p ON te.project_id = p.id
         LEFT JOIN users u ON te.user_id = u.id
         WHERE te.id = ?`,
        [id]
      );

      if (!entries || (entries as any[]).length === 0) {
        return NextResponse.json({ success: false, error: 'Time entry not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: (entries as any[])[0] });
    }

    // Build query with filters
    let sql = `
      SELECT te.*, t.title as task_title, p.name as project_name, u.name as user_name
      FROM time_entries te
      LEFT JOIN tasks t ON te.task_id = t.id
      LEFT JOIN projects p ON te.project_id = p.id
      LEFT JOIN users u ON te.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (projectId) {
      sql += ' AND te.project_id = ?';
      params.push(projectId);
    }

    if (taskId) {
      sql += ' AND te.task_id = ?';
      params.push(taskId);
    }

    if (userId) {
      sql += ' AND te.user_id = ?';
      params.push(userId);
    } else {
      // By default, show current user's entries
      sql += ' AND te.user_id = ?';
      params.push(user.userId);
    }

    if (startDate) {
      sql += ' AND DATE(te.start_time) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND DATE(te.start_time) <= ?';
      params.push(endDate);
    }

    if (isRunning === 'true') {
      sql += ' AND te.is_running = TRUE';
    }

    // Get total count
    const countResult = await query(
      sql.replace('SELECT te.*, t.title as task_title, p.name as project_name, u.name as user_name', 'SELECT COUNT(*) as total'),
      params
    );
    const total = (countResult as any[])[0]?.total || 0;

    // Add pagination
    sql += ' ORDER BY te.start_time DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const entries = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: entries,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching time entries:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create time entry or start timer
async function handlePost(request: NextRequest, user: DecodedToken) {
  try {
    const body = await request.json();
    const { 
      task_id, 
      project_id, 
      start_time, 
      end_time, 
      duration_minutes, 
      description, 
      is_billable = true,
      billing_rate,
      start_timer = false
    } = body;

    if (!project_id) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
    }

    const id = generateId('te');
    
    if (start_timer) {
      // Stop any running timer for this user
      await query(
        `UPDATE time_entries 
         SET is_running = FALSE, 
             end_time = NOW(),
             duration_minutes = TIMESTAMPDIFF(MINUTE, start_time, NOW())
         WHERE user_id = ? AND is_running = TRUE`,
        [user.userId]
      );

      // Start new timer
      await query(
        `INSERT INTO time_entries (id, task_id, project_id, user_id, start_time, is_billable, billing_rate, is_running, entry_type, description)
         VALUES (?, ?, ?, ?, NOW(), ?, ?, TRUE, 'timer', ?)`,
        [id, task_id || null, project_id, user.userId, is_billable, billing_rate || null, description || null]
      );
    } else {
      // Manual entry
      const actualDuration = duration_minutes || 
        (start_time && end_time ? Math.round((new Date(end_time).getTime() - new Date(start_time).getTime()) / 60000) : null);

      await query(
        `INSERT INTO time_entries (id, task_id, project_id, user_id, start_time, end_time, duration_minutes, description, is_billable, billing_rate, is_running, entry_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, 'manual')`,
        [id, task_id || null, project_id, user.userId, start_time || new Date().toISOString(), end_time || null, actualDuration, description || null, is_billable, billing_rate || null]
      );
    }

    // Log activity
    await query(
      `INSERT INTO project_activity_log (id, project_id, entity_id, entity_type, action, details, user_id)
       VALUES (?, ?, ?, 'time_entry', 'created', ?, ?)`,
      [generateId('act'), project_id, id, JSON.stringify({ description, duration_minutes }), user.userId]
    );

    // Fetch and return the created entry
    const entries = await query(
      `SELECT te.*, t.title as task_title, p.name as project_name
       FROM time_entries te
       LEFT JOIN tasks t ON te.task_id = t.id
       LEFT JOIN projects p ON te.project_id = p.id
       WHERE te.id = ?`,
      [id]
    );

    return NextResponse.json({ success: true, data: (entries as any[])[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating time entry:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update time entry or stop timer
async function handlePut(request: NextRequest, user: DecodedToken) {
  try {
    const body = await request.json();
    const { id, stop_timer, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Time entry ID is required' }, { status: 400 });
    }

    if (stop_timer) {
      // Stop the running timer
      await query(
        `UPDATE time_entries 
         SET is_running = FALSE, 
             end_time = NOW(),
             duration_minutes = TIMESTAMPDIFF(MINUTE, start_time, NOW()),
             updated_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [id, user.userId]
      );
    } else {
      // Regular update
      const allowedFields = ['task_id', 'start_time', 'end_time', 'duration_minutes', 'description', 'is_billable', 'billing_rate'];
      const updateFields: string[] = [];
      const params: any[] = [];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          params.push(updates[field]);
        }
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = NOW()');
        params.push(id);

        await query(
          `UPDATE time_entries SET ${updateFields.join(', ')} WHERE id = ?`,
          params
        );
      }
    }

    // Fetch updated entry
    const entries = await query(
      `SELECT te.*, t.title as task_title, p.name as project_name
       FROM time_entries te
       LEFT JOIN tasks t ON te.task_id = t.id
       LEFT JOIN projects p ON te.project_id = p.id
       WHERE te.id = ?`,
      [id]
    );

    return NextResponse.json({ success: true, data: (entries as any[])[0] });
  } catch (error: any) {
    console.error('Error updating time entry:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete time entry
async function handleDelete(request: NextRequest, user: DecodedToken) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Time entry ID is required' }, { status: 400 });
    }

    // Check ownership
    const entries = await query('SELECT * FROM time_entries WHERE id = ?', [id]);
    if (!entries || (entries as any[]).length === 0) {
      return NextResponse.json({ success: false, error: 'Time entry not found' }, { status: 404 });
    }

    const entry = (entries as any[])[0];
    if (entry.user_id !== user.userId && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Not authorized to delete this entry' }, { status: 403 });
    }

    await query('DELETE FROM time_entries WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: 'Time entry deleted' });
  } catch (error: any) {
    console.error('Error deleting time entry:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const GET = withAuth(handleGet, { requiredPermissions: ['projects.view'] });
export const POST = withAuth(handlePost, { requiredPermissions: ['projects.view'] });
export const PUT = withAuth(handlePut, { requiredPermissions: ['projects.view'] });
export const DELETE = withAuth(handleDelete, { requiredPermissions: ['projects.view'] });
