import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface QueryRow {
  [key: string]: string | number | null | undefined;
}

// GET - Resource workload analysis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const userId = searchParams.get('userId');

    let userFilter = '';
    const params: (string | number)[] = [startDate, endDate];

    if (userId) {
      userFilter = 'AND u.id = ?';
      params.push(userId);
    }

    // Get workload per user
    const workload = await query<QueryRow[]>(`
      SELECT 
        u.id, u.uuid, CONCAT(u.first_name, ' ', u.last_name) as name, u.avatar_url,
        u.job_title, u.work_hours_per_day, u.work_days_per_week,
        -- Capacity calculation (working days * hours per day)
        (DATEDIFF(?, ?) * (u.work_days_per_week / 7) * u.work_hours_per_day) as capacity_hours,
        -- Allocated hours from tasks
        (SELECT COALESCE(SUM(t.estimated_hours), 0) FROM tasks t 
         WHERE t.assignee_id = u.id 
         AND t.status NOT IN ('done', 'cancelled') 
         AND t.deleted_at IS NULL
         AND (t.start_date IS NULL OR t.start_date <= ?)
         AND (t.due_date IS NULL OR t.due_date >= ?)) as allocated_hours,
        -- Hours logged this period
        (SELECT COALESCE(SUM(te.hours), 0) FROM time_entries te 
         WHERE te.user_id = u.id AND te.entry_date BETWEEN ? AND ?) as logged_hours,
        -- Task counts
        (SELECT COUNT(*) FROM tasks t WHERE t.assignee_id = u.id AND t.status = 'in_progress' AND t.deleted_at IS NULL) as in_progress_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.assignee_id = u.id AND t.status = 'backlog' AND t.deleted_at IS NULL) as backlog_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.assignee_id = u.id AND t.due_date < CURRENT_DATE AND t.status NOT IN ('done', 'cancelled') AND t.deleted_at IS NULL) as overdue_tasks
      FROM users u
      WHERE u.deleted_at IS NULL AND u.status = 'active' ${userFilter}
      ORDER BY u.first_name, u.last_name
    `, [endDate, startDate, endDate, startDate, startDate, endDate, ...params.slice(2)]);

    // Calculate utilization for each user
    const workloadWithUtilization = workload.map(user => {
      const capacity = Number(user.capacity_hours) || 1;
      const allocated = Number(user.allocated_hours) || 0;
      const utilization = Math.round((allocated / capacity) * 100);
      
      let status = 'optimal';
      if (utilization > 100) status = 'over-allocated';
      else if (utilization > 80) status = 'high';
      else if (utilization < 50) status = 'under-utilized';

      return {
        ...user,
        utilization_percentage: utilization,
        available_hours: Math.max(0, capacity - allocated),
        status
      };
    });

    // Get allocations by project
    const projectAllocations = await query<QueryRow[]>(`
      SELECT 
        p.id, p.code, p.name, p.status,
        COUNT(DISTINCT t.assignee_id) as team_size,
        SUM(t.estimated_hours) as total_estimated_hours,
        SUM(t.actual_hours) as total_actual_hours
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id AND t.deleted_at IS NULL AND t.status NOT IN ('done', 'cancelled')
      WHERE p.deleted_at IS NULL AND p.status = 'active'
      GROUP BY p.id, p.code, p.name, p.status
      ORDER BY total_estimated_hours DESC
    `);

    // Summary stats
    const totalCapacity = workloadWithUtilization.reduce((sum, u) => sum + (Number(u.capacity_hours) || 0), 0);
    const totalAllocated = workloadWithUtilization.reduce((sum, u) => sum + (Number(u.allocated_hours) || 0), 0);
    const overAllocated = workloadWithUtilization.filter(u => u.status === 'over-allocated').length;
    const underUtilized = workloadWithUtilization.filter(u => u.status === 'under-utilized').length;

    return NextResponse.json({
      success: true,
      data: {
        resources: workloadWithUtilization,
        projectAllocations,
        summary: {
          totalResources: workloadWithUtilization.length,
          totalCapacity: Math.round(totalCapacity),
          totalAllocated: Math.round(totalAllocated),
          overallUtilization: Math.round((totalAllocated / totalCapacity) * 100) || 0,
          overAllocatedCount: overAllocated,
          underUtilizedCount: underUtilized
        }
      },
      period: { startDate, endDate }
    });
  } catch (error: unknown) {
    console.error('Workload API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load workload';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
