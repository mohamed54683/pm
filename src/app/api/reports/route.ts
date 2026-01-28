import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface QueryRow {
  [key: string]: string | number | null | undefined;
}

// GET - Reports and analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'summary';
    const projectId = searchParams.get('projectId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (reportType === 'summary') {
      // Executive summary
      const projectSummary = await query<QueryRow[]>(`
        SELECT 
          COUNT(*) as total_projects,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_projects,
          SUM(CASE WHEN health = 'on_track' THEN 1 ELSE 0 END) as on_track,
          SUM(CASE WHEN health = 'at_risk' THEN 1 ELSE 0 END) as at_risk,
          SUM(CASE WHEN health = 'off_track' THEN 1 ELSE 0 END) as off_track,
          ROUND(AVG(progress_percentage), 1) as avg_progress,
          COALESCE(SUM(actual_cost), 0) as total_actual_cost,
          COALESCE(SUM(budget), 0) as total_budget
        FROM projects WHERE deleted_at IS NULL
      `);

      const taskSummary = await query<QueryRow[]>(`
        SELECT 
          COUNT(*) as total_tasks,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed_tasks,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
          SUM(CASE WHEN due_date < CURRENT_DATE AND status NOT IN ('done', 'cancelled') THEN 1 ELSE 0 END) as overdue_tasks,
          COALESCE(SUM(estimated_hours), 0) as total_estimated_hours,
          COALESCE(SUM(actual_hours), 0) as total_actual_hours
        FROM tasks WHERE deleted_at IS NULL
      `);

      const resourceSummary = await query<QueryRow[]>(`
        SELECT 
          COUNT(*) as total_resources,
          (SELECT COALESCE(SUM(hours), 0) FROM time_entries WHERE entry_date >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)) as hours_this_week,
          (SELECT COALESCE(SUM(hours), 0) FROM time_entries WHERE entry_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)) as hours_this_month
        FROM users WHERE deleted_at IS NULL AND is_active = 1
      `);

      const riskSummary = await query<QueryRow[]>(`
        SELECT 
          COUNT(*) as total_risks,
          SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_risks,
          SUM(CASE WHEN severity IN ('critical', 'high') THEN 1 ELSE 0 END) as high_severity_risks
        FROM risks WHERE deleted_at IS NULL
      `);

      return NextResponse.json({
        success: true,
        data: {
          projects: projectSummary[0] || {},
          tasks: taskSummary[0] || {},
          resources: resourceSummary[0] || {},
          risks: riskSummary[0] || {}
        }
      });
    }

    if (reportType === 'earned-value') {
      // Earned Value Report
      let projectFilter = '';
      const params: (string | number)[] = [];
      if (projectId) {
        projectFilter = 'WHERE p.id = ?';
        params.push(projectId);
      } else {
        projectFilter = 'WHERE p.deleted_at IS NULL AND p.status = \'active\'';
      }

      const evData = await query<QueryRow[]>(`
        SELECT 
          p.id, p.code, p.name, p.budget as BAC,
          p.actual_cost as AC,
          p.progress_percentage,
          -- Planned Value (PV) = BAC * (elapsed time / total duration)
          ROUND(p.budget * (DATEDIFF(CURRENT_DATE, p.actual_start_date) / NULLIF(DATEDIFF(p.planned_end_date, p.planned_start_date), 0)), 2) as PV,
          -- Earned Value (EV) = BAC * progress%
          ROUND(p.budget * (p.progress_percentage / 100), 2) as EV,
          -- Get latest EVM snapshot if exists
          ev.planned_value as snapshot_pv,
          ev.earned_value as snapshot_ev,
          ev.actual_cost as snapshot_ac,
          ev.cpi, ev.spi, ev.cv, ev.sv, ev.eac, ev.etc, ev.vac,
          ev.snapshot_date
        FROM projects p
        LEFT JOIN (
          SELECT * FROM earned_value_snapshots WHERE id IN (
            SELECT MAX(id) FROM earned_value_snapshots GROUP BY project_id
          )
        ) ev ON p.id = ev.project_id
        ${projectFilter}
        ORDER BY p.name
      `, params);

      // Calculate EVM metrics for each project
      const evmReports = evData.map(p => {
        const BAC = Number(p.BAC) || 0;
        const AC = Number(p.AC) || 0;
        const progress = Number(p.progress_percentage) || 0;
        const EV = BAC * (progress / 100);
        const PV = Number(p.PV) || 0;

        const CV = EV - AC; // Cost Variance
        const SV = EV - PV; // Schedule Variance
        const CPI = AC > 0 ? EV / AC : 1; // Cost Performance Index
        const SPI = PV > 0 ? EV / PV : 1; // Schedule Performance Index
        const EAC = CPI > 0 ? BAC / CPI : BAC; // Estimate at Completion
        const ETC = EAC - AC; // Estimate to Complete
        const VAC = BAC - EAC; // Variance at Completion
        const TCPI = (BAC - EV) / (BAC - AC); // To Complete Performance Index

        return {
          project_id: p.id,
          project_code: p.code,
          project_name: p.name,
          BAC,
          PV: Math.round(PV),
          EV: Math.round(EV),
          AC: Math.round(AC),
          CV: Math.round(CV),
          SV: Math.round(SV),
          CPI: Math.round(CPI * 100) / 100,
          SPI: Math.round(SPI * 100) / 100,
          EAC: Math.round(EAC),
          ETC: Math.round(ETC),
          VAC: Math.round(VAC),
          TCPI: Math.round(TCPI * 100) / 100,
          progress_percentage: progress,
          status: CPI >= 1 && SPI >= 1 ? 'on_track' : (CPI < 0.9 || SPI < 0.9 ? 'off_track' : 'at_risk')
        };
      });

      return NextResponse.json({ success: true, data: evmReports });
    }

    if (reportType === 'resource-utilization') {
      const utilization = await query<QueryRow[]>(`
        SELECT 
          u.id, CONCAT(u.first_name, ' ', u.last_name) as name, u.job_title,
          u.work_hours_per_day * u.work_days_per_week * 4 as monthly_capacity,
          (SELECT COALESCE(SUM(hours), 0) FROM time_entries WHERE user_id = u.id AND entry_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)) as hours_logged,
          (SELECT COALESCE(SUM(estimated_hours), 0) FROM tasks WHERE assignee_id = u.id AND status NOT IN ('done', 'cancelled') AND deleted_at IS NULL) as allocated_hours,
          (SELECT COUNT(*) FROM tasks WHERE assignee_id = u.id AND status = 'in_progress' AND deleted_at IS NULL) as active_tasks
        FROM users u
        WHERE u.deleted_at IS NULL AND u.is_active = 1
        ORDER BY u.first_name
      `);

      return NextResponse.json({ success: true, data: utilization });
    }

    if (reportType === 'project-status') {
      let dateFilter = '';
      const params: (string | number)[] = [];
      if (startDate && endDate) {
        dateFilter = 'AND p.created_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      const statusReport = await query<QueryRow[]>(`
        SELECT 
          p.id, p.code, p.name, p.status, p.health, p.priority,
          p.progress_percentage, p.planned_start_date, p.planned_end_date,
          p.actual_start_date, p.actual_end_date, p.budget, p.actual_cost,
          CONCAT(m.first_name, ' ', m.last_name) as manager_name,
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND deleted_at IS NULL) as total_tasks,
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done' AND deleted_at IS NULL) as completed_tasks,
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND due_date < CURRENT_DATE AND status NOT IN ('done', 'cancelled') AND deleted_at IS NULL) as overdue_tasks,
          (SELECT COUNT(*) FROM risks WHERE project_id = p.id AND status = 'open' AND deleted_at IS NULL) as open_risks,
          (SELECT COUNT(*) FROM issues WHERE project_id = p.id AND status = 'open' AND deleted_at IS NULL) as open_issues
        FROM projects p
        LEFT JOIN users m ON p.manager_id = m.id
        WHERE p.deleted_at IS NULL ${dateFilter}
        ORDER BY p.priority DESC, p.name
      `, params);

      return NextResponse.json({ success: true, data: statusReport });
    }

    return NextResponse.json({ success: false, error: 'Invalid report type' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Reports API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate report';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
