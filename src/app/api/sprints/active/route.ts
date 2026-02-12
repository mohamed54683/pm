/**
 * Active Sprint API - Get current active sprint(s)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';

interface ActiveSprint {
  id: number;
  uuid: string;
  name: string;
  goal: string | null;
  project_id: number;
  project_name: string;
  project_code: string;
  start_date: string;
  end_date: string;
  extended_to: string | null;
  paused_at: string | null;
  scope_locked: boolean;
  announcements: string | null;
  committed_points: number;
  completed_points: number;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  blocked_tasks: number;
  days_remaining: number;
  completion_rate: number;
}

// GET - Get active sprint(s)
export const GET = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const projectId = searchParams.get('project_id');

      let sql = `
        SELECT s.*, 
          p.name as project_name, p.code as project_code,
          (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.deleted_at IS NULL) as total_tasks,
          (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.status = 'done' AND t.deleted_at IS NULL) as completed_tasks,
          (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.status = 'in_progress' AND t.deleted_at IS NULL) as in_progress_tasks,
          (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.blocked_reason IS NOT NULL AND t.deleted_at IS NULL) as blocked_tasks,
          (SELECT COALESCE(SUM(t.story_points), 0) FROM tasks t WHERE t.sprint_id = s.id AND t.deleted_at IS NULL) as total_points,
          (SELECT COALESCE(SUM(t.story_points), 0) FROM tasks t WHERE t.sprint_id = s.id AND t.status = 'done' AND t.deleted_at IS NULL) as completed_points_calc,
          DATEDIFF(COALESCE(s.extended_to, s.end_date), CURDATE()) as days_remaining
        FROM sprints s
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE s.status = 'active'
      `;
      const params: (string | number)[] = [];

      if (projectId) {
        sql += ` AND s.project_id = ?`;
        params.push(projectId);
      }

      sql += ` ORDER BY s.start_date DESC`;

      const sprints = await query<ActiveSprint[]>(sql, params);

      // Get tasks for each sprint grouped by status
      const sprintsWithTasks = await Promise.all(sprints.map(async (sprint) => {
        const tasks = await query<Record<string, unknown>[]>(`
          SELECT t.id, t.uuid, t.task_key, t.title, t.status, t.priority, t.type,
            t.story_points, t.blocked_reason, t.order_index,
            u.first_name as assignee_first_name, u.last_name as assignee_last_name
          FROM tasks t
          LEFT JOIN users u ON t.assignee_id = u.id
          WHERE t.sprint_id = ? AND t.deleted_at IS NULL
          ORDER BY t.order_index, t.id
        `, [sprint.id]);

        // Group by status for Kanban view
        const tasksByStatus = {
          backlog: tasks.filter((t: Record<string, unknown>) => t.status === 'backlog'),
          todo: tasks.filter((t: Record<string, unknown>) => t.status === 'todo'),
          in_progress: tasks.filter((t: Record<string, unknown>) => t.status === 'in_progress'),
          in_review: tasks.filter((t: Record<string, unknown>) => t.status === 'in_review'),
          done: tasks.filter((t: Record<string, unknown>) => t.status === 'done')
        };

        return {
          ...sprint,
          tasks: tasksByStatus,
          metrics: {
            daysRemaining: Math.max(0, sprint.days_remaining || 0),
            completionRate: sprint.total_tasks > 0 
              ? Math.round((sprint.completed_tasks / sprint.total_tasks) * 100) 
              : 0,
            pointsCompletionRate: sprint.total_points > 0
              ? Math.round((sprint.completed_points_calc / sprint.total_points) * 100)
              : 0,
            isPaused: !!sprint.paused_at
          }
        };
      }));

      // Summary across all active sprints
      const summary = {
        totalActiveSprints: sprints.length,
        totalTasks: sprints.reduce((sum, s) => sum + s.total_tasks, 0),
        totalCompleted: sprints.reduce((sum, s) => sum + s.completed_tasks, 0),
        totalBlocked: sprints.reduce((sum, s) => sum + s.blocked_tasks, 0),
        totalPoints: sprints.reduce((sum, s) => sum + (s.committed_points || 0), 0),
        completedPoints: sprints.reduce((sum, s) => sum + (s.completed_points || 0), 0)
      };

      return NextResponse.json({
        success: true,
        data: sprintsWithTasks,
        summary
      });
    } catch (error) {
      console.error('Get active sprints error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch active sprints', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['sprints.view'], checkCsrf: false }
);
