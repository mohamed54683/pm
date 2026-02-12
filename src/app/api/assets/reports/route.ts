/**
 * Asset Reports API
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';

export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const reportType = searchParams.get('type') || 'register';
      const branch_id = searchParams.get('branch_id') || '';
      const category_id = searchParams.get('category_id') || '';

      let data: any = [];

      switch (reportType) {
        case 'register': { // Full asset register
          let sql = `
            SELECT a.asset_tag, a.name, a.serial_number, a.model, a.manufacturer,
                   a.purchase_date, a.purchase_cost, a.current_value, a.accumulated_depreciation,
                   a.status, a.condition_status, c.name as category, b.name as branch, d.name as department,
                   CONCAT(u.first_name,' ',u.last_name) as assigned_to
            FROM assets a
            LEFT JOIN asset_categories c ON a.category_id = c.id
            LEFT JOIN branches b ON a.branch_id = b.id
            LEFT JOIN departments d ON a.department_id = d.id
            LEFT JOIN users u ON a.assigned_to = u.id
            WHERE a.deleted_at IS NULL
          `;
          const p: any[] = [];
          if (branch_id) { sql += ' AND a.branch_id = ?'; p.push(branch_id); }
          if (category_id) { sql += ' AND a.category_id = ?'; p.push(category_id); }
          sql += ' ORDER BY a.asset_tag';
          data = await query(sql, p);
          break;
        }
        case 'movement': { // Asset movement history
          data = await query(`
            SELECT t.transfer_number, t.transfer_date, t.received_date, t.status, t.reason,
                   a.asset_tag, a.name as asset_name,
                   fb.name as from_branch, tb.name as to_branch,
                   CONCAT(req.first_name,' ',req.last_name) as requested_by
            FROM asset_transfers t
            LEFT JOIN assets a ON t.asset_id = a.id
            LEFT JOIN branches fb ON t.from_branch_id = fb.id
            LEFT JOIN branches tb ON t.to_branch_id = tb.id
            LEFT JOIN users req ON t.requested_by = req.id
            ORDER BY t.transfer_date DESC LIMIT 500
          `);
          break;
        }
        case 'custody': { // Custody by employee
          data = await query(`
            SELECT cu.custody_number, cu.custody_type, cu.status, cu.handover_date, cu.actual_return_date,
                   a.asset_tag, a.name as asset_name,
                   CONCAT(e.first_name,' ',e.last_name) as employee, e.department, e.job_title
            FROM asset_custody cu
            LEFT JOIN assets a ON cu.asset_id = a.id
            LEFT JOIN users e ON cu.employee_id = e.id
            ORDER BY cu.created_at DESC LIMIT 500
          `);
          break;
        }
        case 'depreciation': { // Depreciation summary
          data = await query(`
            SELECT a.asset_tag, a.name, a.purchase_cost, a.current_value, a.salvage_value,
                   a.accumulated_depreciation, a.depreciation_method, a.useful_life_months,
                   a.purchase_date, a.depreciation_start_date,
                   c.name as category, b.name as branch
            FROM assets a
            LEFT JOIN asset_categories c ON a.category_id = c.id
            LEFT JOIN branches b ON a.branch_id = b.id
            WHERE a.deleted_at IS NULL AND a.depreciation_method != 'none'
            ORDER BY a.accumulated_depreciation DESC
          `);
          break;
        }
        case 'clearance': { // Clearance status
          data = await query(`
            SELECT cl.clearance_number, cl.clearance_type, cl.status, cl.request_date, cl.approved_date,
                   cl.pending_assets, cl.total_assets_held, cl.assets_returned,
                   CONCAT(e.first_name,' ',e.last_name) as employee, e.email, e.department
            FROM asset_clearances cl
            LEFT JOIN users e ON cl.employee_id = e.id
            ORDER BY cl.created_at DESC LIMIT 500
          `);
          break;
        }
        case 'audit': { // Audit trail
          data = await query(`
            SELECT al.entity_type, al.action, al.created_at, al.notes,
                   a.asset_tag, a.name as asset_name,
                   CONCAT(u.first_name,' ',u.last_name) as performed_by
            FROM asset_audit_log al
            LEFT JOIN assets a ON al.asset_id = a.id
            LEFT JOIN users u ON al.performed_by = u.id
            ORDER BY al.created_at DESC LIMIT 500
          `);
          break;
        }
      }

      return NextResponse.json({ success: true, data, reportType });
    } catch (error: unknown) {
      console.error('Error generating report:', error);
      return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.view'] }
);
