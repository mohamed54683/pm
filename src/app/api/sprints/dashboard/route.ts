/**
 * Sprint Dashboard/Metrics API - Get sprint metrics and velocity data
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';

// GET - Get sprint metrics dashboard
export const GET = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const projectId = searchParams.get('project_id');

      // Base filter
      const projectFilter = projectId ? 'AND s.project_id = ?' : '';
      const params = projectId ? [projectId] : [];

      // Sprint counts by status
      const statusCounts = await query<Record<string, unknown>[]>(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'planning' THEN 1 ELSE 0 END) as planning,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
        FROM sprints s
        WHERE 1=1 ${projectFilter}
      `, params);

      // Total points committed and completed for active sprints
      const pointsStats = await query<{ total_committed: number; total_completed: number }[]>(`
        SELECT 
          COALESCE(SUM(s.committed_points), 0) as total_committed,
          COALESCE(SUM(s.completed_points), 0) as total_completed
        FROM sprints s
        WHERE s.status = 'active' ${projectFilter}
      `, params);

      // Calculate at-risk sprints (sprints where completion is behind schedule)
      const atRiskCount = await query<{ count: number }[]>(`
        SELECT COUNT(*) as count
        FROM sprints s
        WHERE s.status = 'active' ${projectFilter}
          AND (
            (DATEDIFF(COALESCE(s.extended_to, s.end_date), CURDATE()) <= 2 
             AND s.completed_points < s.committed_points * 0.7)
            OR (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id 
                AND t.blocked_reason IS NOT NULL AND t.deleted_at IS NULL) > 2
          )
      `, params);

      // Health summary for all active sprints
      const healthQuery = await query<Record<string, unknown>[]>(`
        SELECT 
          s.id,
          s.committed_points,
          s.completed_points,
          DATEDIFF(COALESCE(s.extended_to, s.end_date), CURDATE()) as days_remaining,
          (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id 
           AND t.blocked_reason IS NOT NULL AND t.deleted_at IS NULL) as blocked_count
        FROM sprints s
        WHERE s.status = 'active' ${projectFilter}
      `, params);

      let healthy = 0, at_risk = 0, critical = 0;
      for (const sprint of healthQuery) {
        const health = calculateSprintHealthCategory(sprint);
        if (health === 'healthy') healthy++;
        else if (health === 'at_risk') at_risk++;
        else critical++;
      }

      // Velocity trend (last 6 completed sprints)
      const velocityTrend = await query<{ sprint_name: string; velocity: number }[]>(`
        SELECT s.name as sprint_name, COALESCE(s.velocity, 0) as velocity
        FROM sprints s
        WHERE s.status = 'completed' AND s.velocity IS NOT NULL ${projectFilter}
        ORDER BY s.actual_end_date DESC
        LIMIT 6
      `, params);

      // Average velocity
      const avgVelocityResult = await query<{ avg_velocity: number; sprints_count: number }[]>(`
        SELECT AVG(velocity) as avg_velocity, COUNT(*) as sprints_count
        FROM sprints s
        WHERE s.status = 'completed' AND s.velocity IS NOT NULL ${projectFilter}
      `, params);

      // Upcoming deadlines (active sprints ordered by end date)
      const upcomingDeadlines = await query<{ id: number; name: string; end_date: string; days_remaining: number }[]>(`
        SELECT 
          s.id,
          s.name,
          DATE_FORMAT(COALESCE(s.extended_to, s.end_date), '%Y-%m-%d') as end_date,
          DATEDIFF(COALESCE(s.extended_to, s.end_date), CURDATE()) as days_remaining
        FROM sprints s
        WHERE s.status = 'active' ${projectFilter}
        ORDER BY end_date ASC
        LIMIT 5
      `, params);

      // Completion rate trend
      const completionTrend = await query<{ name: string; total_tasks: number; completed_tasks: number; rate: number }[]>(`
        SELECT s.name,
          (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.deleted_at IS NULL) as total_tasks,
          (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.status = 'done' AND t.deleted_at IS NULL) as completed_tasks,
          ROUND(
            (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.status = 'done' AND t.deleted_at IS NULL) * 100.0 /
              NULLIF((SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.deleted_at IS NULL), 0)
          , 1) as rate
        FROM sprints s
        WHERE s.status = 'completed' ${projectFilter}
        ORDER BY s.actual_end_date DESC
        LIMIT 6
      `, params);

      // Scope change analysis
      const scopeChanges = await query<{ sprint_name: string; tasks_added: number; tasks_removed: number }[]>(`
        SELECT s.name as sprint_name,
          (SELECT COUNT(*) FROM sprint_activity_log sal WHERE sal.sprint_id = s.id AND sal.action = 'task_added') as tasks_added,
          (SELECT COUNT(*) FROM sprint_activity_log sal WHERE sal.sprint_id = s.id AND sal.action = 'task_removed') as tasks_removed
        FROM sprints s
        WHERE s.status IN ('active', 'completed') ${projectFilter}
        ORDER BY s.start_date DESC
        LIMIT 6
      `, params);

      // Carry-over tasks
      const carryOverStats = await query<{ avg_carryover: number }[]>(`
        SELECT AVG(
          (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.status != 'done' AND t.deleted_at IS NULL)
        ) as avg_carryover
        FROM sprints s
        WHERE s.status = 'completed' ${projectFilter}
      `, params);

      // Task cycle time
      const cycleTimeResult = await query<{ avg_cycle_time: number }[]>(`
        SELECT AVG(DATEDIFF(t.updated_at, t.created_at)) as avg_cycle_time
        FROM tasks t
        JOIN sprints s ON t.sprint_id = s.id
        WHERE t.status = 'done' AND t.deleted_at IS NULL ${projectFilter}
      `, params);

      // Current sprint health
      const currentSprintHealth = await query<Record<string, unknown>[]>(`
        SELECT s.id, s.name, s.goal, s.end_date, s.extended_to,
          DATEDIFF(COALESCE(s.extended_to, s.end_date), CURDATE()) as days_remaining,
          s.committed_points,
          (SELECT COALESCE(SUM(story_points), 0) FROM tasks t WHERE t.sprint_id = s.id AND t.status = 'done' AND t.deleted_at IS NULL) as completed_points,
          (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.blocked_reason IS NOT NULL AND t.deleted_at IS NULL) as blocked_count
        FROM sprints s
        WHERE s.status = 'active' ${projectFilter}
        LIMIT 5
      `, params);

      // Return data in the format the frontend expects
      return NextResponse.json({
        success: true,
        data: {
          // Fields expected by the frontend SprintDashboard interface
          active_sprints_count: Number(statusCounts[0]?.active) || 0,
          total_points_committed: Number(pointsStats[0]?.total_committed) || 0,
          total_points_completed: Number(pointsStats[0]?.total_completed) || 0,
          average_velocity: Number(avgVelocityResult[0]?.avg_velocity) || 0,
          at_risk_sprints: Number(atRiskCount[0]?.count) || 0,
          velocity_trend: velocityTrend.reverse(),
          upcoming_deadlines: upcomingDeadlines,
          health_summary: { healthy, at_risk, critical },
          // Additional data for extended dashboard features
          counts: statusCounts[0],
          velocity: {
            trend: velocityTrend,
            average: avgVelocityResult[0]?.avg_velocity || 0,
            sprintsAnalyzed: avgVelocityResult[0]?.sprints_count || 0
          },
          completionRate: {
            trend: completionTrend.reverse(),
            average: completionTrend.length > 0 
              ? Math.round(completionTrend.reduce((sum, c) => sum + (c.rate || 0), 0) / completionTrend.length)
              : 0
          },
          scopeChanges: scopeChanges.reverse(),
          carryOver: {
            average: Math.round(carryOverStats[0]?.avg_carryover || 0)
          },
          cycleTime: {
            averageDays: Math.round(cycleTimeResult[0]?.avg_cycle_time || 0)
          },
          currentSprints: currentSprintHealth.map(sprint => ({
            ...sprint,
            health: calculateSprintHealth(sprint)
          }))
        }
      });
    } catch (error) {
      console.error('Get sprint dashboard error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch sprint dashboard', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['sprints.view'], checkCsrf: false }
);

function calculateSprintHealthCategory(sprint: Record<string, unknown>): 'healthy' | 'at_risk' | 'critical' {
  const daysRemaining = Number(sprint.days_remaining) || 0;
  const committed = Number(sprint.committed_points) || 0;
  const completed = Number(sprint.completed_points) || 0;
  const blocked = Number(sprint.blocked_count) || 0;
  
  if (blocked > 3 || daysRemaining < 0) return 'critical';
  if (blocked > 1 || (daysRemaining <= 2 && completed < committed * 0.7)) return 'at_risk';
  return 'healthy';
}

function calculateSprintHealth(sprint: Record<string, unknown>): string {
  const daysRemaining = (sprint.days_remaining as number) || 0;
  const committed = (sprint.committed_points as number) || 0;
  const completed = (sprint.completed_points as number) || 0;
  const blocked = (sprint.blocked_count as number) || 0;
  
  if (blocked > 2) return 'at_risk';
  if (daysRemaining < 0) return 'overdue';
  if (committed > 0 && completed / committed >= 0.8) return 'on_track';
  if (daysRemaining <= 2 && completed / committed < 0.7) return 'at_risk';
  return 'on_track';
}
