/**
 * Tasks Dashboard API - Metrics, KPIs, and analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';

export const GET = withAuth(
  async (request: NextRequest, { user }: { user: DecodedToken }): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const project_id = searchParams.get('project_id');
      const my_tasks = searchParams.get('my_tasks');

      let projectFilter = '';
      let userFilter = '';
      const params: (string | number)[] = [];

      if (project_id) {
        projectFilter = ' AND t.project_id = ?';
        params.push(project_id);
      }

      if (my_tasks === 'true') {
        userFilter = ' AND EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ?)';
        params.push(user.userId);
      }

      // Summary stats
      const summaryParams = [...params];
      const summary = await query<Record<string, unknown>[]>(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status NOT IN ('completed', 'archived') THEN 1 ELSE 0 END) as open,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'backlog' THEN 1 ELSE 0 END) as backlog,
          SUM(CASE WHEN status = 'to_do' THEN 1 ELSE 0 END) as to_do,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) as in_review,
          SUM(CASE WHEN status = 'blocked' OR is_blocked = 1 THEN 1 ELSE 0 END) as blocked,
          SUM(CASE WHEN due_date < CURDATE() AND status NOT IN ('completed', 'archived') THEN 1 ELSE 0 END) as overdue,
          SUM(CASE WHEN due_date = CURDATE() AND status NOT IN ('completed', 'archived') THEN 1 ELSE 0 END) as due_today,
          SUM(CASE WHEN due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND status NOT IN ('completed', 'archived') THEN 1 ELSE 0 END) as due_this_week,
          SUM(CASE WHEN priority = 'critical' AND status NOT IN ('completed', 'archived') THEN 1 ELSE 0 END) as critical,
          SUM(CASE WHEN priority = 'high' AND status NOT IN ('completed', 'archived') THEN 1 ELSE 0 END) as high_priority,
          ROUND(AVG(CASE WHEN status NOT IN ('completed', 'archived') THEN progress_percentage ELSE NULL END), 1) as avg_progress
        FROM tasks t WHERE t.deleted_at IS NULL ${projectFilter} ${userFilter}
      `, summaryParams);

      // Status distribution
      const statusParams = [...params];
      const statusDist = await query<Record<string, unknown>[]>(`
        SELECT status, COUNT(*) as count
        FROM tasks t WHERE t.deleted_at IS NULL ${projectFilter} ${userFilter}
        GROUP BY status ORDER BY FIELD(status, 'backlog', 'to_do', 'in_progress', 'in_review', 'blocked', 'completed', 'archived')
      `, statusParams);

      // Priority distribution
      const priorityParams = [...params];
      const priorityDist = await query<Record<string, unknown>[]>(`
        SELECT priority, COUNT(*) as count
        FROM tasks t WHERE t.deleted_at IS NULL AND status NOT IN ('completed', 'archived') ${projectFilter} ${userFilter}
        GROUP BY priority ORDER BY FIELD(priority, 'critical', 'high', 'medium', 'low', 'none')
      `, priorityParams);

      // Type distribution
      const typeParams = [...params];
      const typeDist = await query<Record<string, unknown>[]>(`
        SELECT type, COUNT(*) as count
        FROM tasks t WHERE t.deleted_at IS NULL ${projectFilter} ${userFilter}
        GROUP BY type
      `, typeParams);

      // Workload by user
      const workloadParams = [...params];
      const workload = await query<Record<string, unknown>[]>(`
        SELECT u.id, u.name, u.email,
          COUNT(DISTINCT t.id) as task_count,
          SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN t.due_date < CURDATE() AND t.status NOT IN ('completed', 'archived') THEN 1 ELSE 0 END) as overdue,
          SUM(t.estimated_hours) as total_estimated,
          SUM(CASE WHEN t.status NOT IN ('completed', 'archived') THEN t.remaining_hours ELSE 0 END) as remaining_hours
        FROM users u
        JOIN task_assignees ta ON u.id = ta.user_id
        JOIN tasks t ON ta.task_id = t.id
        WHERE t.deleted_at IS NULL AND t.status NOT IN ('completed', 'archived') ${projectFilter}
        GROUP BY u.id, u.name, u.email
        ORDER BY task_count DESC
        LIMIT 20
      `, workloadParams);

      // Completion trend (last 30 days)
      const trendParams = [...params];
      const completionTrend = await query<Record<string, unknown>[]>(`
        SELECT DATE(completed_at) as date, COUNT(*) as count
        FROM tasks t
        WHERE t.completed_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          AND t.deleted_at IS NULL ${projectFilter} ${userFilter}
        GROUP BY DATE(completed_at)
        ORDER BY date
      `, trendParams);

      // Created trend (last 30 days)
      const createdTrend = await query<Record<string, unknown>[]>(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM tasks t
        WHERE t.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          AND t.deleted_at IS NULL ${projectFilter} ${userFilter}
        GROUP BY DATE(created_at)
        ORDER BY date
      `, trendParams);

      // Average completion time
      const avgTime = await query<Record<string, unknown>[]>(`
        SELECT 
          ROUND(AVG(DATEDIFF(completed_at, created_at)), 1) as avg_days,
          MIN(DATEDIFF(completed_at, created_at)) as min_days,
          MAX(DATEDIFF(completed_at, created_at)) as max_days
        FROM tasks t
        WHERE t.completed_at IS NOT NULL AND t.deleted_at IS NULL ${projectFilter} ${userFilter}
      `, [...params]);

      // Time logged summary
      const timeLogged = await query<Record<string, unknown>[]>(`
        SELECT 
          SUM(te.hours) as total_hours,
          SUM(CASE WHEN te.work_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN te.hours ELSE 0 END) as this_week,
          SUM(CASE WHEN te.work_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN te.hours ELSE 0 END) as this_month
        FROM task_time_entries te
        JOIN tasks t ON te.task_id = t.id
        WHERE t.deleted_at IS NULL ${projectFilter} ${userFilter}
      `, [...params]);

      // Overdue tasks list
      const overdueParams = [...params];
      const overdueTasks = await query<Record<string, unknown>[]>(`
        SELECT t.id, t.task_key, t.title, t.priority, t.due_date, t.status,
          p.name as project_name, p.code as project_code,
          (SELECT u.name FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = t.id LIMIT 1) as assignee_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.deleted_at IS NULL 
          AND t.due_date < CURDATE() 
          AND t.status NOT IN ('completed', 'archived') ${projectFilter} ${userFilter}
        ORDER BY t.due_date ASC, FIELD(t.priority, 'critical', 'high', 'medium', 'low') ASC
        LIMIT 20
      `, overdueParams);

      // Recent activity
      const recentActivity = await query<Record<string, unknown>[]>(`
        SELECT h.*, t.task_key, t.title as task_title, u.name as user_name
        FROM task_history h
        JOIN tasks t ON h.task_id = t.id
        LEFT JOIN users u ON h.user_id = u.id
        WHERE t.deleted_at IS NULL ${projectFilter}
        ORDER BY h.created_at DESC
        LIMIT 20
      `, project_id ? [project_id] : []);

      return NextResponse.json({
        success: true,
        data: {
          summary: summary[0],
          statusDistribution: statusDist,
          priorityDistribution: priorityDist,
          typeDistribution: typeDist,
          workload,
          completionTrend,
          createdTrend,
          completionTime: avgTime[0],
          timeLogged: timeLogged[0],
          overdueTasks,
          recentActivity
        }
      });
    } catch (error) {
      console.error('Tasks dashboard error:', error);
      return NextResponse.json({ success: false, error: 'Failed to load dashboard' }, { status: 500 });
    }
  },
  { requiredPermissions: ['tasks.view'] }
);
