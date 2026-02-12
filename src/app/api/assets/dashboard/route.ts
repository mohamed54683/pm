/**
 * Asset Dashboard API - KPIs and summary data
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';

export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const [
        totalAssets,
        statusBreakdown,
        branchBreakdown,
        categoryBreakdown,
        recentTransfers,
        activeCustody,
        pendingClearances,
        totalValue,
        recentActivity
      ] = await Promise.all([
        query<any[]>('SELECT COUNT(*) as cnt FROM assets WHERE deleted_at IS NULL'),
        query<any[]>('SELECT status, COUNT(*) as cnt FROM assets WHERE deleted_at IS NULL GROUP BY status'),
        query<any[]>(`SELECT b.name, COUNT(a.id) as cnt, SUM(a.current_value) as total_value
          FROM assets a LEFT JOIN branches b ON a.branch_id = b.id
          WHERE a.deleted_at IS NULL GROUP BY a.branch_id, b.name ORDER BY cnt DESC LIMIT 10`),
        query<any[]>(`SELECT c.name, COUNT(a.id) as cnt
          FROM assets a LEFT JOIN asset_categories c ON a.category_id = c.id
          WHERE a.deleted_at IS NULL GROUP BY a.category_id, c.name ORDER BY cnt DESC LIMIT 10`),
        query<any[]>(`SELECT COUNT(*) as cnt FROM asset_transfers WHERE status = 'pending'`),
        query<any[]>(`SELECT COUNT(*) as cnt FROM asset_custody WHERE status = 'active'`),
        query<any[]>(`SELECT COUNT(*) as cnt FROM asset_clearances WHERE status IN ('pending','blocked','in_review')`),
        query<any[]>('SELECT SUM(current_value) as total, SUM(purchase_cost) as purchase_total, SUM(accumulated_depreciation) as dep_total FROM assets WHERE deleted_at IS NULL'),
        query<any[]>(`SELECT al.*, a.name as asset_name, a.asset_tag,
          CONCAT(u.first_name,' ',u.last_name) as performed_by_name
          FROM asset_audit_log al
          LEFT JOIN assets a ON al.asset_id = a.id
          LEFT JOIN users u ON al.performed_by = u.id
          ORDER BY al.created_at DESC LIMIT 15`)
      ]);

      return NextResponse.json({
        success: true,
        data: {
          summary: {
            total_assets: totalAssets[0]?.cnt || 0,
            total_current_value: totalValue[0]?.total || 0,
            total_purchase_value: totalValue[0]?.purchase_total || 0,
            total_depreciation: totalValue[0]?.dep_total || 0,
            pending_transfers: recentTransfers[0]?.cnt || 0,
            active_custody: activeCustody[0]?.cnt || 0,
            pending_clearances: pendingClearances[0]?.cnt || 0,
          },
          status_breakdown: statusBreakdown,
          branch_breakdown: branchBreakdown,
          category_breakdown: categoryBreakdown,
          recent_activity: recentActivity,
        }
      });
    } catch (error: unknown) {
      console.error('Error fetching dashboard:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch dashboard data' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.view'] }
);
