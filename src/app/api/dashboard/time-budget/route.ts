/**
 * Dashboard Time & Budget Metrics API
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';

interface QueryRow {
  [key: string]: string | number | null | undefined;
}

export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const project_id = searchParams.get('project_id');
      const period = searchParams.get('period') || 'month'; // week, month, quarter, year
      
      // Calculate date range
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'quarter':
          startDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default: // month
          startDate = new Date(now.setMonth(now.getMonth() - 1));
      }
      
      const startDateStr = startDate.toISOString().split('T')[0];
      
      // Time metrics
      const timeParams = project_id ? [startDateStr, project_id] : [startDateStr];
      const timeMetrics = await query<QueryRow[]>(`
        SELECT 
          COALESCE(SUM(hours), 0) as total_hours,
          COALESCE(SUM(CASE WHEN is_billable = 1 THEN hours ELSE 0 END), 0) as billable_hours,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN hours ELSE 0 END), 0) as approved_hours,
          COALESCE(SUM(CASE WHEN status = 'submitted' THEN hours ELSE 0 END), 0) as pending_hours,
          COUNT(DISTINCT user_id) as active_users,
          COUNT(*) as total_entries
        FROM time_entries
        WHERE date >= ?
        ${project_id ? 'AND project_id = ?' : ''}
      `, timeParams);

      // Budget metrics
      const budgetParams = project_id ? [project_id] : [];
      const budgetMetrics = await query<QueryRow[]>(`
        SELECT 
          COALESCE(SUM(total_budget), 0) as total_budget,
          COALESCE(SUM(approved_budget), 0) as approved_budget,
          COALESCE(SUM(committed), 0) as committed,
          COALESCE(SUM(actual_spent), 0) as actual_spent,
          COALESCE(SUM(remaining), 0) as remaining,
          COUNT(*) as total_budgets
        FROM project_budgets
        WHERE status = 'active'
        ${project_id ? 'AND project_id = ?' : ''}
      `, budgetParams);

      // Expense metrics
      const expenseParams = project_id ? [startDateStr, project_id] : [startDateStr];
      const expenseMetrics = await query<QueryRow[]>(`
        SELECT 
          COALESCE(SUM(amount), 0) as total_expenses,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as approved_expenses,
          COALESCE(SUM(CASE WHEN status = 'submitted' THEN amount ELSE 0 END), 0) as pending_expenses,
          COALESCE(SUM(CASE WHEN is_billable = 1 THEN amount ELSE 0 END), 0) as billable_expenses,
          COUNT(*) as total_count
        FROM expenses
        WHERE expense_date >= ?
        ${project_id ? 'AND project_id = ?' : ''}
      `, expenseParams);

      // Time by project (top 5)
      const timeByProject = await query<QueryRow[]>(`
        SELECT p.name as project_name, p.id as project_id,
          COALESCE(SUM(te.hours), 0) as hours
        FROM time_entries te
        LEFT JOIN projects p ON te.project_id = p.id
        WHERE te.date >= ?
        GROUP BY p.id, p.name
        ORDER BY hours DESC
        LIMIT 5
      `, [startDateStr]);

      // Expenses by category
      const expensesByCategory = await query<QueryRow[]>(`
        SELECT expense_type as category,
          COALESCE(SUM(amount), 0) as amount,
          COUNT(*) as count
        FROM expenses
        WHERE expense_date >= ?
        GROUP BY expense_type
        ORDER BY amount DESC
      `, [startDateStr]);

      // Approval queue counts
      const approvalQueue = await query<QueryRow[]>(`
        SELECT 
          (SELECT COUNT(*) FROM time_entries WHERE status = 'submitted') as pending_time_entries,
          (SELECT COUNT(*) FROM timesheets WHERE status = 'submitted') as pending_timesheets,
          (SELECT COUNT(*) FROM expenses WHERE status = 'submitted') as pending_expenses,
          (SELECT COUNT(*) FROM project_budgets WHERE status = 'pending') as pending_budgets
      `, []);

      // Daily time entries (last 7 days)
      const dailyTime = await query<QueryRow[]>(`
        SELECT DATE(date) as day,
          COALESCE(SUM(hours), 0) as hours
        FROM time_entries
        WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(date)
        ORDER BY day
      `, []);

      // Budget utilization by project
      const budgetUtilization = await query<QueryRow[]>(`
        SELECT p.name as project_name, 
          pb.total_budget,
          pb.actual_spent,
          ROUND((pb.actual_spent / NULLIF(pb.total_budget, 0)) * 100, 1) as utilization_pct
        FROM project_budgets pb
        LEFT JOIN projects p ON pb.project_id = p.id
        WHERE pb.status = 'active' AND pb.total_budget > 0
        ORDER BY utilization_pct DESC
        LIMIT 5
      `, []);

      return NextResponse.json({
        success: true,
        data: {
          time: timeMetrics[0],
          budget: budgetMetrics[0],
          expenses: expenseMetrics[0],
          timeByProject,
          expensesByCategory,
          approvalQueue: approvalQueue[0],
          dailyTime,
          budgetUtilization,
          period,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Dashboard metrics error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch metrics', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.view'], checkCsrf: false }
);
