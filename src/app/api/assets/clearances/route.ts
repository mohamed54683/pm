/**
 * Asset Clearance API - Employee No-Liability Certificates
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';

export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status') || '';
      const employee_id = searchParams.get('employee_id') || '';
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
      const offset = (page - 1) * limit;

      let sql = `
        SELECT cl.*, CONCAT(e.first_name,' ',e.last_name) as employee_name, e.email as employee_email,
               e.department as employee_dept, e.job_title as employee_title,
               CONCAT(ab.first_name,' ',ab.last_name) as approved_by_name,
               CONCAT(hr.first_name,' ',hr.last_name) as hr_approved_by_name
        FROM asset_clearances cl
        LEFT JOIN users e ON cl.employee_id = e.id
        LEFT JOIN users ab ON cl.approved_by = ab.id
        LEFT JOIN users hr ON cl.hr_approved_by = hr.id
        WHERE 1=1
      `;
      let countSql = 'SELECT COUNT(*) as total FROM asset_clearances cl WHERE 1=1';
      const params: any[] = [];
      const countParams: any[] = [];

      if (status && status !== 'all') {
        sql += ' AND cl.status = ?'; countSql += ' AND cl.status = ?';
        params.push(status); countParams.push(status);
      }
      if (employee_id) {
        sql += ' AND cl.employee_id = ?'; countSql += ' AND cl.employee_id = ?';
        params.push(employee_id); countParams.push(employee_id);
      }

      sql += ' ORDER BY cl.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [records, countResult] = await Promise.all([query(sql, params), query(countSql, countParams)]);
      const total = (countResult as any[])[0]?.total || 0;

      return NextResponse.json({ success: true, data: records, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (error: unknown) {
      console.error('Error fetching clearances:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch clearances' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.view'] }
);

export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { employee_id, clearance_type, request_date, remarks } = body;

      if (!employee_id || !clearance_type || !request_date) {
        return NextResponse.json({ success: false, error: 'Employee, clearance type, and request date are required' }, { status: 400 });
      }

      // Check pending assets
      const custodyRows = await query<any[]>(
        'SELECT COUNT(*) as cnt FROM asset_custody WHERE employee_id = ? AND status IN ("active","approved","pending")', [employee_id]
      );
      const pendingAssets = custodyRows[0]?.cnt || 0;
      const totalRows = await query<any[]>(
        'SELECT COUNT(*) as cnt FROM asset_custody WHERE employee_id = ?', [employee_id]
      );
      const returnedRows = await query<any[]>(
        'SELECT COUNT(*) as cnt FROM asset_custody WHERE employee_id = ? AND status = "released"', [employee_id]
      );

      const countRows = await query<any[]>('SELECT COUNT(*) as cnt FROM asset_clearances');
      const num = `CLR-${String((countRows[0]?.cnt || 0) + 1).padStart(5, '0')}`;

      const initialStatus = pendingAssets > 0 ? 'blocked' : 'pending';

      const result = await query<any>(
        `INSERT INTO asset_clearances (employee_id, clearance_number, clearance_type, status, request_date,
          pending_assets, total_assets_held, assets_returned, remarks)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [employee_id, num, clearance_type, initialStatus, request_date,
         pendingAssets, totalRows[0]?.cnt||0, returnedRows[0]?.cnt||0, remarks||null]
      );

      await query(
        'INSERT INTO asset_audit_log (entity_type, entity_id, action, new_values, performed_by) VALUES (?,?,?,?,?)',
        ['clearance', result.insertId, 'clearance_created', JSON.stringify({ clearance_number: num, status: initialStatus }), user.userId]
      );

      return NextResponse.json({ success: true, data: { id: result.insertId, clearance_number: num, status: initialStatus }, message: pendingAssets > 0 ? `Clearance blocked: ${pendingAssets} assets pending return` : 'Clearance request created' }, { status: 201 });
    } catch (error: unknown) {
      console.error('Error creating clearance:', error);
      return NextResponse.json({ success: false, error: 'Failed to create clearance' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.create'] }
);

export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, status, remarks } = body;

      if (!id || !status) {
        return NextResponse.json({ success: false, error: 'ID and status are required' }, { status: 400 });
      }

      const clRows = await query<any[]>('SELECT * FROM asset_clearances WHERE id = ?', [id]);
      if (!clRows.length) return NextResponse.json({ success: false, error: 'Clearance not found' }, { status: 404 });

      let updateFields = 'status = ?';
      const updateParams: any[] = [status];

      if (status === 'approved') {
        // Re-check pending assets
        const pending = await query<any[]>(
          'SELECT COUNT(*) as cnt FROM asset_custody WHERE employee_id = ? AND status IN ("active","approved","pending")', [clRows[0].employee_id]
        );
        if ((pending[0]?.cnt || 0) > 0) {
          return NextResponse.json({ success: false, error: `Cannot approve: ${pending[0].cnt} assets still pending` }, { status: 400 });
        }
        updateFields += ', approved_by = ?, approved_date = CURDATE()';
        updateParams.push(user.userId);
      }
      if (status === 'in_review') {
        updateFields += ', hr_approved_by = ?, hr_approved_at = NOW()';
        updateParams.push(user.userId);
      }
      if (remarks) { updateFields += ', remarks = ?'; updateParams.push(remarks); }

      updateParams.push(id);
      await query(`UPDATE asset_clearances SET ${updateFields} WHERE id = ?`, updateParams);

      return NextResponse.json({ success: true, message: `Clearance ${status}` });
    } catch (error: unknown) {
      console.error('Error updating clearance:', error);
      return NextResponse.json({ success: false, error: 'Failed to update clearance' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.edit'] }
);
