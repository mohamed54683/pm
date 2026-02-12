import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth/jwt';

function generateId(prefix: string = 'sp'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// GET - List sprints or get single sprint
async function handleGet(request: NextRequest, user: DecodedToken) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');
    const includeTasks = searchParams.get('include_tasks') === 'true';
    const includeBurndown = searchParams.get('include_burndown') === 'true';

    if (id) {
      // Get single sprint
      const sprints = await query(
        `SELECT s.*, 
                COUNT(DISTINCT st.task_id) as total_tasks,
                SUM(st.story_points) as total_story_points,
                SUM(CASE WHEN t.status = 'completed' THEN st.story_points ELSE 0 END) as completed_story_points,
                SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                DATEDIFF(s.end_date, CURDATE()) as days_remaining
         FROM sprints s
         LEFT JOIN sprint_tasks st ON s.id = st.sprint_id AND st.removed_at IS NULL
         LEFT JOIN tasks t ON st.task_id = t.id
         WHERE s.id = ?
         GROUP BY s.id`,
        [id]
      );

      if (!sprints || (sprints as any[]).length === 0) {
        return NextResponse.json({ success: false, error: 'Sprint not found' }, { status: 404 });
      }

      const sprint = (sprints as any[])[0];

      // Get sprint tasks if requested
      if (includeTasks) {
        const tasks = await query(
          `SELECT t.*, st.story_points, st.added_at,
                  u.name as assignee_name
           FROM sprint_tasks st
           JOIN tasks t ON st.task_id = t.id
           LEFT JOIN task_assignees ta ON t.id = ta.task_id
           LEFT JOIN users u ON ta.user_id = u.id
           WHERE st.sprint_id = ? AND st.removed_at IS NULL
           ORDER BY t.order_index`,
          [id]
        );
        sprint.tasks = tasks;
      }

      // Get burndown data if requested
      if (includeBurndown) {
        const burndown = await query(
          `SELECT * FROM sprint_burndown WHERE sprint_id = ? ORDER BY date`,
          [id]
        );
        sprint.burndown_data = burndown;
      }

      return NextResponse.json({ success: true, data: sprint });
    }

    // List sprints
    let sql = `
      SELECT s.*, 
             COUNT(DISTINCT st.task_id) as total_tasks,
             SUM(st.story_points) as total_story_points,
             SUM(CASE WHEN t.status = 'completed' THEN st.story_points ELSE 0 END) as completed_story_points,
             SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
             DATEDIFF(s.end_date, CURDATE()) as days_remaining
      FROM sprints s
      LEFT JOIN sprint_tasks st ON s.id = st.sprint_id AND st.removed_at IS NULL
      LEFT JOIN tasks t ON st.task_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (projectId) {
      sql += ' AND s.project_id = ?';
      params.push(projectId);
    }

    if (status) {
      sql += ' AND s.status = ?';
      params.push(status);
    }

    sql += ' GROUP BY s.id ORDER BY s.start_date DESC';

    const sprints = await query(sql, params);

    return NextResponse.json({ success: true, data: sprints });
  } catch (error: any) {
    console.error('Error fetching sprints:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create sprint
async function handlePost(request: NextRequest, user: DecodedToken) {
  try {
    const body = await request.json();
    const { project_id, name, goal, start_date, end_date, capacity_hours } = body;

    if (!project_id || !name || !start_date || !end_date) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project ID, name, start date and end date are required' 
      }, { status: 400 });
    }

    const id = generateId('sp');

    await query(
      `INSERT INTO sprints (id, project_id, name, goal, start_date, end_date, capacity_hours, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'planning', ?)`,
      [id, project_id, name, goal || null, start_date, end_date, capacity_hours || null, user.userId]
    );

    // Log activity
    await query(
      `INSERT INTO project_activity_log (id, project_id, entity_id, entity_type, action, details, user_id)
       VALUES (?, ?, ?, 'sprint', 'created', ?, ?)`,
      [generateId('act'), project_id, id, JSON.stringify({ name, start_date, end_date }), user.userId]
    );

    const sprints = await query('SELECT * FROM sprints WHERE id = ?', [id]);

    return NextResponse.json({ success: true, data: (sprints as any[])[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating sprint:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update sprint
async function handlePut(request: NextRequest, user: DecodedToken) {
  try {
    const body = await request.json();
    const { id, add_tasks, remove_tasks, start_sprint, complete_sprint, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Sprint ID is required' }, { status: 400 });
    }

    // Get current sprint
    const sprints = await query('SELECT * FROM sprints WHERE id = ?', [id]);
    if (!sprints || (sprints as any[]).length === 0) {
      return NextResponse.json({ success: false, error: 'Sprint not found' }, { status: 404 });
    }
    const sprint = (sprints as any[])[0];

    // Handle special actions
    if (start_sprint) {
      await query(
        `UPDATE sprints SET status = 'active', updated_at = NOW() WHERE id = ?`,
        [id]
      );

      // Update project's current sprint
      await query(
        `UPDATE projects SET current_sprint_id = ? WHERE id = ?`,
        [id, sprint.project_id]
      );
    } else if (complete_sprint) {
      // Calculate velocity
      const velocityResult = await query(
        `SELECT SUM(CASE WHEN t.status = 'completed' THEN st.story_points ELSE 0 END) as completed
         FROM sprint_tasks st
         JOIN tasks t ON st.task_id = t.id
         WHERE st.sprint_id = ? AND st.removed_at IS NULL`,
        [id]
      );
      const velocityCompleted = (velocityResult as any[])[0]?.completed || 0;

      await query(
        `UPDATE sprints SET status = 'completed', velocity_completed = ?, updated_at = NOW() WHERE id = ?`,
        [velocityCompleted, id]
      );

      // Clear current sprint from project
      await query(
        `UPDATE projects SET current_sprint_id = NULL WHERE id = ? AND current_sprint_id = ?`,
        [sprint.project_id, id]
      );
    }

    // Add tasks to sprint
    if (add_tasks && Array.isArray(add_tasks)) {
      for (const task of add_tasks) {
        await query(
          `INSERT INTO sprint_tasks (sprint_id, task_id, story_points, added_by)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE removed_at = NULL, story_points = VALUES(story_points)`,
          [id, task.task_id, task.story_points || null, user.userId]
        );

        // Update task's sprint_id
        await query('UPDATE tasks SET sprint_id = ? WHERE id = ?', [id, task.task_id]);
      }
    }

    // Remove tasks from sprint
    if (remove_tasks && Array.isArray(remove_tasks)) {
      for (const taskId of remove_tasks) {
        await query(
          `UPDATE sprint_tasks SET removed_at = NOW(), removed_by = ? WHERE sprint_id = ? AND task_id = ?`,
          [user.userId, id, taskId]
        );

        // Clear task's sprint_id
        await query('UPDATE tasks SET sprint_id = NULL WHERE id = ?', [taskId]);
      }
    }

    // Regular field updates
    const allowedFields = ['name', 'goal', 'start_date', 'end_date', 'capacity_hours', 'velocity_planned', 'retrospective_notes'];
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
        `UPDATE sprints SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );
    }

    // Fetch updated sprint with stats
    const updatedSprints = await query(
      `SELECT s.*, 
              COUNT(DISTINCT st.task_id) as total_tasks,
              SUM(st.story_points) as total_story_points,
              SUM(CASE WHEN t.status = 'completed' THEN st.story_points ELSE 0 END) as completed_story_points,
              SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
       FROM sprints s
       LEFT JOIN sprint_tasks st ON s.id = st.sprint_id AND st.removed_at IS NULL
       LEFT JOIN tasks t ON st.task_id = t.id
       WHERE s.id = ?
       GROUP BY s.id`,
      [id]
    );

    return NextResponse.json({ success: true, data: (updatedSprints as any[])[0] });
  } catch (error: any) {
    console.error('Error updating sprint:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete sprint
async function handleDelete(request: NextRequest, user: DecodedToken) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Sprint ID is required' }, { status: 400 });
    }

    // Clear sprint_id from tasks
    await query('UPDATE tasks SET sprint_id = NULL WHERE sprint_id = ?', [id]);

    // Clear current_sprint_id from projects
    await query('UPDATE projects SET current_sprint_id = NULL WHERE current_sprint_id = ?', [id]);

    // Delete sprint (cascade will handle sprint_tasks and sprint_burndown)
    await query('DELETE FROM sprints WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: 'Sprint deleted' });
  } catch (error: any) {
    console.error('Error deleting sprint:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const GET = withAuth(handleGet, { requiredPermissions: ['projects.view'] });
export const POST = withAuth(handlePost, { requiredPermissions: ['projects.create'] });
export const PUT = withAuth(handlePut, { requiredPermissions: ['projects.edit'] });
export const DELETE = withAuth(handleDelete, { requiredPermissions: ['projects.delete'] });
