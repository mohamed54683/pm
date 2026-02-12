/**
 * Release Detail API - Get individual release with full details
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';

interface ReleaseDetail {
  id: number;
  uuid: string;
  project_id: number;
  project_name: string;
  project_code: string;
  version: string;
  name: string | null;
  description: string | null;
  release_type: string;
  status: string;
  approval_status: string;
  approved_by: number | null;
  approved_at: string | null;
  release_date: string | null;
  actual_release_date: string | null;
  release_notes: string | null;
  auto_release_notes: string | null;
  scope_changes_count: number;
  created_by: number;
  created_at: string;
}

// GET - Get release details
export const GET = withAuth(
  async (request: NextRequest, user: unknown, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;

      const releaseResult = await query<ReleaseDetail[]>(`
        SELECT r.*, 
          p.name as project_name, p.code as project_code
        FROM releases r
        LEFT JOIN projects p ON r.project_id = p.id
        WHERE r.id = ? OR r.uuid = ?
      `, [id, id]);

      if (!releaseResult.length) {
        return NextResponse.json({ success: false, error: 'Release not found' }, { status: 404 });
      }

      const release = releaseResult[0];

      // Get linked sprints
      const sprints = await query<Record<string, unknown>[]>(`
        SELECT s.id, s.uuid, s.name, s.status, s.start_date, s.end_date, s.velocity,
          (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.deleted_at IS NULL) as total_tasks,
          (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.status = 'done' AND t.deleted_at IS NULL) as completed_tasks
        FROM sprints s
        JOIN release_sprints rs ON s.id = rs.sprint_id
        WHERE rs.release_id = ?
        ORDER BY s.start_date
      `, [release.id]);

      // Get tasks in release
      const tasks = await query<Record<string, unknown>[]>(`
        SELECT t.id, t.uuid, t.task_key, t.title, t.type, t.status, t.priority,
          t.story_points,
          u.first_name as assignee_first_name, u.last_name as assignee_last_name
        FROM tasks t
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.release_id = ? AND t.deleted_at IS NULL
        ORDER BY t.type, t.status, t.task_key
      `, [release.id]);

      // Calculate metrics
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t: Record<string, unknown>) => t.status === 'done').length;
      const totalPoints = tasks.reduce((sum: number, t: Record<string, unknown>) => sum + ((t.story_points as number) || 0), 0);
      const completedPoints = tasks.filter((t: Record<string, unknown>) => t.status === 'done')
        .reduce((sum: number, t: Record<string, unknown>) => sum + ((t.story_points as number) || 0), 0);

      // Group tasks by type
      const tasksByType: Record<string, unknown[]> = {};
      tasks.forEach((task: Record<string, unknown>) => {
        const type = (task.type as string) || 'other';
        if (!tasksByType[type]) {
          tasksByType[type] = [];
        }
        tasksByType[type].push(task);
      });

      // Group tasks by status
      const tasksByStatus: Record<string, number> = {};
      tasks.forEach((task: Record<string, unknown>) => {
        const status = task.status as string;
        tasksByStatus[status] = (tasksByStatus[status] || 0) + 1;
      });

      return NextResponse.json({
        success: true,
        data: {
          ...release,
          sprints,
          tasks: tasksByType,
          metrics: {
            totalTasks,
            completedTasks,
            progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            totalPoints,
            completedPoints,
            pointsProgress: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
            tasksByStatus,
            scopeStability: release.scope_changes_count === 0 ? 'stable' : 
                            release.scope_changes_count <= 3 ? 'minor_changes' : 'unstable'
          }
        }
      });
    } catch (error) {
      console.error('Get release detail error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch release', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['releases.view'], checkCsrf: false }
);
