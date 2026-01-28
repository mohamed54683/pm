import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth/jwt';

// GET - Fetch activity log
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const entityId = searchParams.get('entity_id');
    const entityType = searchParams.get('entity_type');
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let sql = `
      SELECT 
        pal.id,
        pal.project_id,
        pal.entity_id,
        pal.entity_type,
        pal.action,
        pal.details,
        pal.created_at,
        u.id as user_id,
        u.name as user_name,
        u.profile_image as user_avatar,
        CASE 
          WHEN pal.entity_type = 'task' THEN (SELECT title FROM tasks WHERE id = pal.entity_id)
          WHEN pal.entity_type = 'project' THEN (SELECT name FROM projects WHERE id = pal.entity_id)
          WHEN pal.entity_type = 'phase' THEN (SELECT name FROM project_phases WHERE id = pal.entity_id)
          WHEN pal.entity_type = 'milestone' THEN (SELECT title FROM project_milestones WHERE id = pal.entity_id)
          WHEN pal.entity_type = 'sprint' THEN (SELECT name FROM sprints WHERE id = pal.entity_id)
          ELSE NULL
        END as entity_title
      FROM project_activity_log pal
      LEFT JOIN users u ON pal.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (projectId) {
      sql += ' AND pal.project_id = ?';
      params.push(projectId);
    }

    if (entityId) {
      sql += ' AND pal.entity_id = ?';
      params.push(entityId);
    }

    if (entityType) {
      sql += ' AND pal.entity_type = ?';
      params.push(entityType);
    }

    if (action) {
      sql += ' AND pal.action = ?';
      params.push(action);
    }

    sql += ' ORDER BY pal.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const activities = await query(sql, params);

    // Parse JSON details
    const formattedActivities = (activities as any[]).map(a => ({
      ...a,
      details: a.details ? JSON.parse(a.details) : null
    }));

    return NextResponse.json({ success: true, data: formattedActivities });
  } catch (error: any) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const GET = withAuth(handleGet, { requiredPermissions: ['projects.view'] });
