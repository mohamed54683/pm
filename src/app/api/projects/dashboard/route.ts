/**
 * Project Dashboard API - Dashboard statistics and analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';

// GET - Fetch dashboard statistics
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const user_id = searchParams.get('user_id');

      // Project statistics
      const projectStats = await query<any[]>(`
        SELECT 
          COUNT(*) as total_projects,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_projects,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_projects,
          SUM(CASE WHEN status = 'on_hold' THEN 1 ELSE 0 END) as on_hold_projects,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_projects
        FROM projects
        WHERE is_template = FALSE
      `);

      // Task statistics
      const taskStats = await query<any[]>(`
        SELECT 
          COUNT(*) as total_tasks,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
          SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) as in_review_tasks,
          SUM(CASE WHEN status = 'not_started' THEN 1 ELSE 0 END) as not_started_tasks,
          SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked_tasks,
          SUM(CASE WHEN due_date < CURDATE() AND status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as overdue_tasks
        FROM tasks
      `);

      // User's tasks - use provided user_id or authenticated user
      const targetUserId = user_id || user.userId;
      const userTasks = await query<any[]>(`
        SELECT 
          COUNT(*) as assigned_to_me,
          SUM(CASE WHEN t.created_by = ? THEN 1 ELSE 0 END) as created_by_me,
          SUM(CASE WHEN t.due_date = CURDATE() AND t.status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as due_today,
          SUM(CASE WHEN t.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND t.status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as due_this_week
        FROM task_assignees ta
        JOIN tasks t ON ta.task_id = t.id
        WHERE ta.user_id = ?
      `, [targetUserId, targetUserId]);

      // Upcoming deadlines (next 7 days)
      const upcomingDeadlines = await query<any[]>(`
        SELECT m.*, p.name as project_name, ph.name as phase_name
        FROM project_milestones m
        LEFT JOIN projects p ON m.project_id = p.id
        LEFT JOIN project_phases ph ON m.phase_id = ph.id
        WHERE m.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
          AND m.status = 'pending'
        ORDER BY m.due_date
        LIMIT 10
      `);

      // Overdue milestones
      const overdueMilestones = await query<any[]>(`
        SELECT m.*, p.name as project_name
        FROM project_milestones m
        LEFT JOIN projects p ON m.project_id = p.id
        WHERE m.due_date < CURDATE() AND m.status = 'pending'
        ORDER BY m.due_date DESC
        LIMIT 5
      `);

      // Recent activity
      const recentActivity = await query<any[]>(`
        SELECT pal.*, p.name as project_name, t.title as task_title, u.name as user_name
        FROM project_activity_log pal
        LEFT JOIN projects p ON pal.project_id = p.id
        LEFT JOIN tasks t ON pal.task_id = t.id
        LEFT JOIN users u ON pal.user_id = u.id
        ORDER BY pal.created_at DESC
        LIMIT 20
      `);

      // Project progress breakdown
      const projectProgress = await query<any[]>(`
        SELECT 
          p.id,
          p.name,
          p.status,
          p.priority,
          p.progress_percentage,
          p.start_date,
          p.end_date,
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'completed') as completed_task_count,
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND due_date < CURDATE() AND status NOT IN ('completed', 'cancelled')) as overdue_task_count,
          DATEDIFF(p.end_date, CURDATE()) as days_remaining
        FROM projects p
        WHERE p.is_template = FALSE AND p.status IN ('active', 'on_hold')
        ORDER BY p.end_date
        LIMIT 10
      `);

      // Resource utilization
      const resourceUtilization = await query<any[]>(`
        SELECT 
          u.id as user_id,
          u.name as user_name,
          u.email,
          COUNT(DISTINCT ta.task_id) as assigned_tasks,
          SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as tasks_in_progress,
          SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as tasks_completed,
          COALESCE(SUM(t.estimated_hours), 0) as total_estimated_hours,
          COALESCE(SUM(t.actual_hours), 0) as total_actual_hours
        FROM users u
        LEFT JOIN task_assignees ta ON u.id = ta.user_id
        LEFT JOIN tasks t ON ta.task_id = t.id
        WHERE u.status = 'Active'
        GROUP BY u.id, u.name, u.email
        HAVING assigned_tasks > 0
        ORDER BY assigned_tasks DESC
        LIMIT 10
      `);

      // Tasks by priority
      const tasksByPriority = await query<any[]>(`
        SELECT 
          priority,
          COUNT(*) as count,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM tasks
        WHERE status NOT IN ('cancelled')
        GROUP BY priority
      `);

      // Tasks completed over time (last 30 days)
      const completionTrend = await query<any[]>(`
        SELECT 
          DATE(completed_date) as date,
          COUNT(*) as completed_count
        FROM tasks
        WHERE completed_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(completed_date)
        ORDER BY date
      `);

      return NextResponse.json({
        success: true,
        data: {
          project_stats: projectStats[0] || {},
          task_stats: taskStats[0] || {},
          user_tasks: userTasks[0] || { assigned_to_me: 0, created_by_me: 0, due_today: 0, due_this_week: 0 },
          upcoming_deadlines: upcomingDeadlines,
          overdue_milestones: overdueMilestones,
          recent_activity: recentActivity.map(a => ({
            ...a,
            old_value: a.old_value ? JSON.parse(a.old_value) : null,
            new_value: a.new_value ? JSON.parse(a.new_value) : null
          })),
          project_progress: projectProgress,
          resource_utilization: resourceUtilization,
          tasks_by_priority: tasksByPriority,
          completion_trend: completionTrend
        }
      });

    } catch (error: any) {
      console.error('Error fetching dashboard:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.view'], checkCsrf: false }
);
