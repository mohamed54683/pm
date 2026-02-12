import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth/jwt';

export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const reportType = searchParams.get('type') || 'summary';
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const projectId = searchParams.get('projectId');

      let dateFilter = '';
      const params: any[] = [];

      if (startDate && endDate) {
        dateFilter = ' AND cr.created_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      if (projectId) {
        dateFilter += ' AND cr.project_id = ?';
        params.push(projectId);
      }

      let data: any = {};

      switch (reportType) {
        case 'summary':
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
            FROM change_requests cr
            WHERE cr.deleted_at IS NULL ${dateFilter}
          `, params);
          data = summary[0];
          break;

        case 'by-category':
          data = await query<any[]>(`
            SELECT category, COUNT(*) as count
            FROM change_requests cr
            WHERE cr.deleted_at IS NULL ${dateFilter}
            GROUP BY category
          `, params);
          break;

        case 'by-priority':
          data = await query<any[]>(`
            SELECT priority, COUNT(*) as count
            FROM change_requests cr
            WHERE cr.deleted_at IS NULL ${dateFilter}
            GROUP BY priority
          `, params);
          break;

        case 'by-project':
          data = await query<any[]>(`
            SELECT p.name as project_name, COUNT(*) as count
            FROM change_requests cr
            LEFT JOIN projects p ON cr.project_id = p.id
            WHERE cr.deleted_at IS NULL ${dateFilter}
            GROUP BY cr.project_id, p.name
          `, params);
          break;

        case 'trend':
          data = await query<any[]>(`
            SELECT DATE(cr.created_at) as date, COUNT(*) as count
            FROM change_requests cr
            WHERE cr.deleted_at IS NULL ${dateFilter}
            GROUP BY DATE(cr.created_at)
            ORDER BY date
          `, params);
          break;

        default:
          return NextResponse.json({ success: false, error: 'Invalid report type' }, { status: 400 });
      }

      return NextResponse.json({ success: true, data });
    } catch (error: any) {
      console.error('Error generating report:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  },
  { requiredPermissions: ['change_requests.view'] }
);
