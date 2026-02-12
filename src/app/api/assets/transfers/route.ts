/**
 * Asset Transfers API
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
      const asset_id = searchParams.get('asset_id') || '';
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
      const offset = (page - 1) * limit;

      let sql = `
        SELECT t.*, a.name as asset_name, a.asset_tag,
               fb.name as from_branch_name, tb.name as to_branch_name,
               fd.name as from_dept_name, td.name as to_dept_name,
               CONCAT(req.first_name,' ',req.last_name) as requested_by_name,
               CONCAT(app.first_name,' ',app.last_name) as approved_by_name,
               CONCAT(rec.first_name,' ',rec.last_name) as received_by_name
        FROM asset_transfers t
        LEFT JOIN assets a ON t.asset_id = a.id
        LEFT JOIN branches fb ON t.from_branch_id = fb.id
        LEFT JOIN branches tb ON t.to_branch_id = tb.id
        LEFT JOIN departments fd ON t.from_department_id = fd.id
        LEFT JOIN departments td ON t.to_department_id = td.id
        LEFT JOIN users req ON t.requested_by = req.id
        LEFT JOIN users app ON t.approved_by = app.id
        LEFT JOIN users rec ON t.received_by = rec.id
        WHERE 1=1
      `;
      let countSql = 'SELECT COUNT(*) as total FROM asset_transfers t WHERE 1=1';
      const params: any[] = [];
      const countParams: any[] = [];

      if (status && status !== 'all') {
        sql += ' AND t.status = ?'; countSql += ' AND t.status = ?';
        params.push(status); countParams.push(status);
      }
      if (asset_id) {
        sql += ' AND t.asset_id = ?'; countSql += ' AND t.asset_id = ?';
        params.push(asset_id); countParams.push(asset_id);
      }

      sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [transfers, countResult] = await Promise.all([query(sql, params), query(countSql, countParams)]);
      const total = (countResult as any[])[0]?.total || 0;

      return NextResponse.json({ success: true, data: transfers, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (error: unknown) {
      console.error('Error fetching transfers:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch transfers' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.view'] }
);

export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { asset_id, from_branch_id, to_branch_id, from_department_id, to_department_id,
              reason_code, reason, transfer_date, depreciation_action, notes } = body;

      if (!asset_id || !transfer_date) {
        return NextResponse.json({ success: false, error: 'Asset and transfer date are required' }, { status: 400 });
      }

      // Get asset current depreciation value
      const assetRows = await query<any[]>('SELECT accumulated_depreciation, current_value FROM assets WHERE id = ?', [asset_id]);
      const depValue = assetRows[0]?.accumulated_depreciation || 0;

      // Generate transfer number
      const countRows = await query<any[]>('SELECT COUNT(*) as cnt FROM asset_transfers');
      const num = `TRF-${String((countRows[0]?.cnt || 0) + 1).padStart(5, '0')}`;

      const result = await query<any>(
        `INSERT INTO asset_transfers (asset_id, transfer_number, from_branch_id, to_branch_id, from_department_id, to_department_id,
          reason_code, reason, transfer_date, depreciation_action, depreciation_value_at_transfer, requested_by, notes)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [asset_id, num, from_branch_id||null, to_branch_id||null, from_department_id||null, to_department_id||null,
         reason_code||null, reason||null, transfer_date, depreciation_action||'continue', depValue, user.userId, notes||null]
      );

      // Mark asset as in_transfer
      await query('UPDATE assets SET status = "in_transfer" WHERE id = ?', [asset_id]);

      await query(
        'INSERT INTO asset_audit_log (asset_id, entity_type, entity_id, action, new_values, performed_by) VALUES (?,?,?,?,?,?)',
        [asset_id, 'transfer', result.insertId, 'transfer_requested', JSON.stringify({ transfer_number: num }), user.userId]
      );

      return NextResponse.json({ success: true, data: { id: result.insertId, transfer_number: num }, message: 'Transfer initiated' }, { status: 201 });
    } catch (error: unknown) {
      console.error('Error creating transfer:', error);
      return NextResponse.json({ success: false, error: 'Failed to create transfer' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.create'] }
);

export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, status, notes } = body;

      if (!id || !status) {
        return NextResponse.json({ success: false, error: 'ID and status are required' }, { status: 400 });
      }

      const transfer = await query<any[]>('SELECT * FROM asset_transfers WHERE id = ?', [id]);
      if (!transfer.length) {
        return NextResponse.json({ success: false, error: 'Transfer not found' }, { status: 404 });
      }
      const t = transfer[0];

      let updateFields = 'status = ?';
      const updateParams: any[] = [status];

      if (status === 'approved') {
        updateFields += ', approved_by = ?, approved_at = NOW()';
        updateParams.push(user.userId);
      }
      if (status === 'received') {
        updateFields += ', received_by = ?, received_date = CURDATE()';
        updateParams.push(user.userId);
        // Update asset branch/department
        await query('UPDATE assets SET branch_id = ?, department_id = ?, status = "available" WHERE id = ?',
          [t.to_branch_id, t.to_department_id || t.from_department_id, t.asset_id]);
      }
      if (status === 'rejected' || status === 'cancelled') {
        await query('UPDATE assets SET status = "available" WHERE id = ?', [t.asset_id]);
      }
      if (notes) {
        updateFields += ', notes = ?';
        updateParams.push(notes);
      }

      updateParams.push(id);
      await query(`UPDATE asset_transfers SET ${updateFields} WHERE id = ?`, updateParams);

      await query(
        'INSERT INTO asset_audit_log (asset_id, entity_type, entity_id, action, new_values, performed_by) VALUES (?,?,?,?,?,?)',
        [t.asset_id, 'transfer', id, `transfer_${status}`, JSON.stringify({ status }), user.userId]
      );

      return NextResponse.json({ success: true, message: `Transfer ${status}` });
    } catch (error: unknown) {
      console.error('Error updating transfer:', error);
      return NextResponse.json({ success: false, error: 'Failed to update transfer' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.edit'] }
);
