import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth/jwt';

// GET - Dashboard statistics
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const userId = user.userId;

      // Status breakdown
      const statusBreakdown = await query<any[]>(`
        SELECT 
          status,
          COUNT(*) as count
        FROM change_requests
        WHERE deleted_at IS NULL
        GROUP BY status
      `, []);

      // Priority breakdown
      const priorityBreakdown = await query<any[]>(`
        SELECT 
          priority,
          COUNT(*) as count
        FROM change_requests
        WHERE deleted_at IS NULL
        GROUP BY priority
      `, []);

      // Category breakdown
      const categoryBreakdown = await query<any[]>(`
        SELECT 
          category,
          COUNT(*) as count
        FROM change_requests
        WHERE deleted_at IS NULL
        GROUP BY category
      `, []);

      // Monthly submission trend (last 12 months)
      const monthlyTrend = await query<any[]>(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COUNT(*) as submitted,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM change_requests
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) AND deleted_at IS NULL
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month
      `, []);

      // Average approval duration (in days)
      const avgDuration = await query<any[]>(`
        SELECT 
          AVG(DATEDIFF(decision_date, submitted_date)) as avg_approval_days
        FROM change_requests
        WHERE status IN ('approved', 'rejected') 
          AND decision_date IS NOT NULL 
          AND submitted_date IS NOT NULL
          AND deleted_at IS NULL
      `, []);

      // Pending approvals for current user
      const pendingMyApproval = await query<any[]>(`
        SELECT COUNT(*) as count
        FROM cr_approvals ca
        JOIN change_requests cr ON ca.cr_id = cr.id
        WHERE ca.approver_id = ? AND ca.status = 'pending' AND cr.deleted_at IS NULL
      `, [userId]);

      // My submitted requests
      const myRequests = await query<any[]>(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
          SUM(CASE WHEN status IN ('submitted', 'under_review') THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM change_requests
        WHERE requested_by = ? AND deleted_at IS NULL
      `, [userId]);

      // Recent change requests
      const recentRequests = await query<any[]>(`
        SELECT 
          cr.id, cr.uuid, cr.change_key, cr.title, cr.status, cr.priority,
          cr.created_at, p.name as project_name,
          u.name as requester_name
        FROM change_requests cr
        LEFT JOIN projects p ON cr.project_id = p.id
        LEFT JOIN users u ON cr.requested_by = u.id
        WHERE cr.deleted_at IS NULL
        ORDER BY cr.created_at DESC
        LIMIT 10
      `, []);

      // Top projects by change requests
      const topProjects = await query<any[]>(`
        SELECT 
          p.id, p.name,
          COUNT(*) as total_requests,
          SUM(CASE WHEN cr.status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN cr.status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM change_requests cr
        JOIN projects p ON cr.project_id = p.id
        WHERE cr.deleted_at IS NULL
        GROUP BY p.id, p.name
        ORDER BY total_requests DESC
        LIMIT 5
      `, []);

      // Impact analysis
      const impactAnalysis = await query<any[]>(`
        SELECT 
          impact_level,
          COUNT(*) as count,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(COALESCE(cost_impact, 0)) as total_cost_impact,
          SUM(COALESCE(schedule_impact_days, 0)) as total_schedule_impact
        FROM change_requests
        WHERE deleted_at IS NULL
        GROUP BY impact_level
      `, []);

      // Summary counts
      const summary = await query<any[]>(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
          SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
          SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN status = 'implemented' THEN 1 ELSE 0 END) as implemented,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed
        FROM change_requests
        WHERE deleted_at IS NULL
      `, []);

      return NextResponse.json({
        success: true,
        data: {
          summary: summary[0] || {},
          statusBreakdown,
          priorityBreakdown,
          categoryBreakdown,
          monthlyTrend,
          avgApprovalDays: avgDuration[0]?.avg_approval_days || 0,
          pendingMyApproval: pendingMyApproval[0]?.count || 0,
          myRequests: myRequests[0] || {},
          recentRequests,
          topProjects,
          impactAnalysis
        }
      });
    } catch (error: any) {
      console.error('Error fetching CR dashboard:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  },
  { requiredPermissions: ['change_requests.view'] }
);
