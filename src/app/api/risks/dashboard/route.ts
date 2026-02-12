/**
 * Risk Dashboard API - KPIs and analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';

// GET - Fetch dashboard stats and analytics
export const GET = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const project_id = searchParams.get('project_id');

      let projectFilter = '';
      const params: (string | number)[] = [];
      if (project_id) {
        projectFilter = ' AND project_id = ?';
        params.push(project_id);
      }

      // Overall summary
      const summary = await query<Record<string, unknown>[]>(`
        SELECT
          COUNT(*) as total_risks,
          SUM(CASE WHEN status NOT IN ('closed', 'mitigated') THEN 1 ELSE 0 END) as open_risks,
          SUM(CASE WHEN status IN ('closed', 'mitigated') THEN 1 ELSE 0 END) as closed_risks,
          SUM(CASE WHEN priority = 'critical' AND status NOT IN ('closed', 'mitigated') THEN 1 ELSE 0 END) as critical_open,
          SUM(CASE WHEN priority = 'high' AND status NOT IN ('closed', 'mitigated') THEN 1 ELSE 0 END) as high_open,
          SUM(CASE WHEN priority = 'medium' AND status NOT IN ('closed', 'mitigated') THEN 1 ELSE 0 END) as medium_open,
          SUM(CASE WHEN priority = 'low' AND status NOT IN ('closed', 'mitigated') THEN 1 ELSE 0 END) as low_open,
          SUM(CASE WHEN status = 'escalated' THEN 1 ELSE 0 END) as escalated,
          SUM(CASE WHEN next_review_date <= CURDATE() AND status NOT IN ('closed', 'mitigated') THEN 1 ELSE 0 END) as overdue_reviews,
          SUM(CASE WHEN next_review_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND status NOT IN ('closed', 'mitigated') THEN 1 ELSE 0 END) as reviews_due_this_week,
          AVG(CASE WHEN status NOT IN ('closed', 'mitigated') THEN risk_score ELSE NULL END) as avg_open_risk_score,
          MAX(CASE WHEN status NOT IN ('closed', 'mitigated') THEN risk_score ELSE NULL END) as max_risk_score
        FROM risks WHERE deleted_at IS NULL${projectFilter}
      `, params);

      // Risk matrix heat map data (5x5 grid)
      const matrixData = await query<Record<string, unknown>[]>(`
        SELECT probability, impact, COUNT(*) as count,
          GROUP_CONCAT(CONCAT(risk_key, ':', title) SEPARATOR '|||') as risk_list
        FROM risks 
        WHERE deleted_at IS NULL AND status NOT IN ('closed', 'mitigated')${projectFilter}
        GROUP BY probability, impact
      `, params);

      // Build 5x5 matrix
      const probabilities = ['very_low', 'low', 'medium', 'high', 'very_high'];
      const impacts = ['very_low', 'low', 'medium', 'high', 'very_high'];
      const matrix: Record<string, Record<string, { count: number; risks: string[] }>> = {};
      
      for (const p of probabilities) {
        matrix[p] = {};
        for (const i of impacts) {
          matrix[p][i] = { count: 0, risks: [] };
        }
      }

      for (const row of matrixData) {
        const p = row.probability as string;
        const i = row.impact as string;
        if (matrix[p] && matrix[p][i]) {
          matrix[p][i].count = row.count as number;
          matrix[p][i].risks = (row.risk_list as string)?.split('|||') || [];
        }
      }

      // Status distribution
      const statusDist = await query<Record<string, unknown>[]>(`
        SELECT status, COUNT(*) as count
        FROM risks WHERE deleted_at IS NULL${projectFilter}
        GROUP BY status
        ORDER BY count DESC
      `, params);

      // Category distribution
      const categoryDist = await query<Record<string, unknown>[]>(`
        SELECT category, COUNT(*) as count,
          SUM(CASE WHEN status NOT IN ('closed', 'mitigated') THEN 1 ELSE 0 END) as open_count
        FROM risks WHERE deleted_at IS NULL${projectFilter}
        GROUP BY category
        ORDER BY count DESC
      `, params);

      // Response strategy distribution
      const strategyDist = await query<Record<string, unknown>[]>(`
        SELECT response_strategy, COUNT(*) as count
        FROM risks WHERE deleted_at IS NULL AND status NOT IN ('closed', 'mitigated')${projectFilter}
        GROUP BY response_strategy
        ORDER BY count DESC
      `, params);

      // Top risks by score
      const topRisks = await query<Record<string, unknown>[]>(`
        SELECT r.id, r.risk_key, r.title, r.risk_score, r.priority, r.status, r.probability, r.impact,
          p.name as project_name, u.name as owner_name
        FROM risks r
        LEFT JOIN projects p ON r.project_id = p.id
        LEFT JOIN users u ON r.owner_id = u.id
        WHERE r.deleted_at IS NULL AND r.status NOT IN ('closed', 'mitigated')${projectFilter}
        ORDER BY r.risk_score DESC, r.priority DESC
        LIMIT 10
      `, params);

      // Risks needing attention (overdue reviews, critical, escalated)
      const attentionNeeded = await query<Record<string, unknown>[]>(`
        SELECT r.id, r.risk_key, r.title, r.risk_score, r.priority, r.status,
          r.next_review_date, r.due_date,
          CASE 
            WHEN r.next_review_date < CURDATE() THEN 'overdue_review'
            WHEN r.status = 'escalated' THEN 'escalated'
            WHEN r.priority = 'critical' THEN 'critical'
            WHEN r.due_date < CURDATE() THEN 'overdue'
            ELSE 'high_priority'
          END as attention_reason,
          p.name as project_name, u.name as owner_name
        FROM risks r
        LEFT JOIN projects p ON r.project_id = p.id
        LEFT JOIN users u ON r.owner_id = u.id
        WHERE r.deleted_at IS NULL 
          AND r.status NOT IN ('closed', 'mitigated')
          AND (
            r.next_review_date < CURDATE()
            OR r.status = 'escalated'
            OR r.priority IN ('critical', 'high')
            OR r.due_date < CURDATE()
          )${projectFilter}
        ORDER BY 
          CASE 
            WHEN r.status = 'escalated' THEN 1
            WHEN r.priority = 'critical' THEN 2
            WHEN r.next_review_date < CURDATE() THEN 3
            WHEN r.due_date < CURDATE() THEN 4
            ELSE 5
          END,
          r.risk_score DESC
        LIMIT 15
      `, params);

      // Recent activity
      const recentActivity = await query<Record<string, unknown>[]>(`
        SELECT ral.*, r.risk_key, r.title as risk_title, u.name as user_name
        FROM risk_activity_log ral
        LEFT JOIN risks r ON ral.risk_id = r.id
        LEFT JOIN users u ON ral.user_id = u.id
        WHERE r.deleted_at IS NULL${projectFilter.replace('project_id', 'r.project_id')}
        ORDER BY ral.created_at DESC
        LIMIT 20
      `, params);

      // Mitigation progress
      const mitigationProgress = await query<Record<string, unknown>[]>(`
        SELECT 
          COUNT(*) as total_actions,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_actions,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_actions,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_actions,
          SUM(CASE WHEN target_date < CURDATE() AND status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as overdue_actions
        FROM risk_mitigation_actions ma
        INNER JOIN risks r ON ma.risk_id = r.id
        WHERE r.deleted_at IS NULL${projectFilter.replace('project_id', 'r.project_id')}
      `, params);

      // Trend data (last 30 days - new risks created)
      const trend = await query<Record<string, unknown>[]>(`
        SELECT DATE(created_at) as date, COUNT(*) as new_risks
        FROM risks
        WHERE deleted_at IS NULL AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)${projectFilter}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, params);

      return NextResponse.json({
        success: true,
        data: {
          summary: summary[0],
          matrix,
          statusDistribution: statusDist,
          categoryDistribution: categoryDist,
          strategyDistribution: strategyDist,
          topRisks,
          attentionNeeded,
          recentActivity,
          mitigationProgress: mitigationProgress[0],
          trend
        }
      });
    } catch (error) {
      console.error('Risk dashboard error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch dashboard data', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['risks.view'], checkCsrf: false }
);
