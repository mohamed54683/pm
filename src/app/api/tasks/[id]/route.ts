import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface QueryRow {
  [key: string]: string | number | null | undefined;
}

// GET - Single task with all details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tasks = await query<QueryRow[]>(`
      SELECT 
        t.*,
        p.code as project_code, p.name as project_name,
        s.name as sprint_name, s.status as sprint_status,
        CONCAT(a.first_name, ' ', a.last_name) as assignee_name, a.avatar_url as assignee_avatar, a.email as assignee_email,
        CONCAT(r.first_name, ' ', r.last_name) as reporter_name, r.avatar_url as reporter_avatar,
        parent.task_key as parent_key, parent.title as parent_title
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN sprints s ON t.sprint_id = s.id
      LEFT JOIN users a ON t.assignee_id = a.id
      LEFT JOIN users r ON t.reporter_id = r.id
      LEFT JOIN tasks parent ON t.parent_id = parent.id
      WHERE t.id = ? AND t.deleted_at IS NULL
    `, [id]);

    if (!tasks[0]) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    const task = tasks[0] as Record<string, unknown>;

    // Get subtasks
    const subtasks = await query<QueryRow[]>(`
      SELECT id, uuid, task_key, title, status, priority, assignee_id, story_points, due_date,
        CONCAT(u.first_name, ' ', u.last_name) as assignee_name
      FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.parent_id = ? AND t.deleted_at IS NULL
      ORDER BY t.position ASC
    `, [id]);
    task.subtasks = subtasks;

    // Get labels
    const labels = await query<QueryRow[]>(`
      SELECT l.id, l.name, l.color FROM labels l
      INNER JOIN task_labels tl ON l.id = tl.label_id WHERE tl.task_id = ?
    `, [id]);
    task.labels = labels;

    // Get dependencies
    const dependencies = await query<QueryRow[]>(`
      SELECT td.*, t.task_key, t.title, t.status
      FROM task_dependencies td
      INNER JOIN tasks t ON td.depends_on_id = t.id
      WHERE td.task_id = ?
    `, [id]);
    task.dependencies = dependencies;

    // Get checklists
    const checklists = await query<QueryRow[]>(`
      SELECT tc.*, 
        (SELECT COUNT(*) FROM checklist_items ci WHERE ci.checklist_id = tc.id) as total_items,
        (SELECT COUNT(*) FROM checklist_items ci WHERE ci.checklist_id = tc.id AND ci.is_completed = 1) as completed_items
      FROM task_checklists tc WHERE tc.task_id = ?
    `, [id]);

    for (const checklist of checklists) {
      const items = await query<QueryRow[]>(`
        SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY position ASC
      `, [checklist.id]);
      (checklist as Record<string, unknown>).items = items;
    }
    task.checklists = checklists;

    // Get comments
    const comments = await query<QueryRow[]>(`
      SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) as user_name, u.avatar_url
      FROM comments c LEFT JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ? AND c.deleted_at IS NULL
      ORDER BY c.created_at DESC
    `, [id]);
    task.comments = comments;

    // Get watchers
    const watchers = await query<QueryRow[]>(`
      SELECT u.id, u.email, CONCAT(u.first_name, ' ', u.last_name) as name, u.avatar_url
      FROM task_watchers tw INNER JOIN users u ON tw.user_id = u.id WHERE tw.task_id = ?
    `, [id]);
    task.watchers = watchers;

    // Get history (last 20 entries)
    const history = await query<QueryRow[]>(`
      SELECT th.*, CONCAT(u.first_name, ' ', u.last_name) as user_name
      FROM task_history th LEFT JOIN users u ON th.user_id = u.id
      WHERE th.task_id = ? ORDER BY th.created_at DESC LIMIT 20
    `, [id]);
    task.history = history;

    // Get time entries
    const timeEntries = await query<QueryRow[]>(`
      SELECT te.*, CONCAT(u.first_name, ' ', u.last_name) as user_name
      FROM time_entries te LEFT JOIN users u ON te.user_id = u.id
      WHERE te.task_id = ? ORDER BY te.entry_date DESC
    `, [id]);
    task.time_entries = timeEntries;

    return NextResponse.json({ success: true, data: task });
  } catch (error: unknown) {
    console.error('Get task error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load task';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const allowedFields = [
      'title', 'description', 'task_type', 'status', 'priority', 'story_points',
      'estimated_hours', 'actual_hours', 'remaining_hours', 'due_date', 'start_date',
      'completed_date', 'progress_percentage', 'sprint_id', 'parent_id', 'assignee_id',
      'position', 'acceptance_criteria'
    ];

    const setClause: string[] = [];
    const params_arr: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`);
        params_arr.push(value as string | number | null);
      }
    }

    if (setClause.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields' }, { status: 400 });
    }

    // Handle status change to done
    if (body.status === 'done' && !body.completed_date) {
      setClause.push('completed_date = CURRENT_DATE');
      setClause.push('progress_percentage = 100');
    }

    await query(`
      UPDATE tasks SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `, [...params_arr, id]);

    return NextResponse.json({ success: true, message: 'Task updated' });
  } catch (error: unknown) {
    console.error('Update task error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update task';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE - Soft delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await query(`UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
    // Also soft delete subtasks
    await query(`UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE parent_id = ?`, [id]);

    return NextResponse.json({ success: true, message: 'Task deleted' });
  } catch (error: unknown) {
    console.error('Delete task error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete task';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
