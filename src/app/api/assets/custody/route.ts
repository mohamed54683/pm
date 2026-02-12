/**
 * Asset Custody API - Employee Asset Assignments
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
      const asset_id = searchParams.get('asset_id') || '';
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
      const offset = (page - 1) * limit;

      let sql = `
        SELECT cu.*, a.name as asset_name, a.asset_tag, a.serial_number,
               CONCAT(e.first_name,' ',e.last_name) as employee_name, e.email as employee_email, e.department as employee_dept,
               CONCAT(ab.first_name,' ',ab.last_name) as approved_by_name,
               CONCAT(hb.first_name,' ',hb.last_name) as handed_over_by_name
        FROM asset_custody cu
        LEFT JOIN assets a ON cu.asset_id = a.id
        LEFT JOIN users e ON cu.employee_id = e.id
        LEFT JOIN users ab ON cu.approved_by = ab.id
        LEFT JOIN users hb ON cu.handed_over_by = hb.id
        WHERE 1=1
      `;
      let countSql = 'SELECT COUNT(*) as total FROM asset_custody cu WHERE 1=1';
      const params: any[] = [];
      const countParams: any[] = [];

      if (status && status !== 'all') {
        sql += ' AND cu.status = ?'; countSql += ' AND cu.status = ?';
        params.push(status); countParams.push(status);
      }
      if (employee_id) {
        sql += ' AND cu.employee_id = ?'; countSql += ' AND cu.employee_id = ?';
        params.push(employee_id); countParams.push(employee_id);
      }
      if (asset_id) {
        sql += ' AND cu.asset_id = ?'; countSql += ' AND cu.asset_id = ?';
        params.push(asset_id); countParams.push(asset_id);
      }

      sql += ' ORDER BY cu.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [records, countResult] = await Promise.all([query(sql, params), query(countSql, countParams)]);
      const total = (countResult as any[])[0]?.total || 0;

      return NextResponse.json({ success: true, data: records, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (error: unknown) {
      console.error('Error fetching custody records:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch custody records' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.view'] }
);

export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { asset_id, employee_id, custody_type, request_date, expected_return_date, reason, condition_on_handover, notes } = body;

      if (!asset_id || !employee_id || !request_date) {
        return NextResponse.json({ success: false, error: 'Asset, employee, and request date are required' }, { status: 400 });
      }

      // Check asset is available
      const assetRows = await query<any[]>('SELECT status FROM assets WHERE id = ? AND deleted_at IS NULL', [asset_id]);
      if (!assetRows.length) return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
      if (assetRows[0].status !== 'available') {
        return NextResponse.json({ success: false, error: `Asset is currently ${assetRows[0].status}` }, { status: 400 });
      }

      // Generate custody number
      const countRows = await query<any[]>('SELECT COUNT(*) as cnt FROM asset_custody');
      const num = `CUS-${String((countRows[0]?.cnt || 0) + 1).padStart(5, '0')}`;

      const result = await query<any>(
        `INSERT INTO asset_custody (asset_id, employee_id, custody_number, custody_type, request_date, expected_return_date,
          reason, condition_on_handover, requested_by, notes)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [asset_id, employee_id, num, custody_type||'permanent', request_date, expected_return_date||null,
         reason||null, condition_on_handover||null, user.userId, notes||null]
      );

      await query(
        'INSERT INTO asset_audit_log (asset_id, entity_type, entity_id, action, new_values, performed_by) VALUES (?,?,?,?,?,?)',
        [asset_id, 'custody', result.insertId, 'custody_requested', JSON.stringify({ custody_number: num, employee_id }), user.userId]
      );

      return NextResponse.json({ success: true, data: { id: result.insertId, custody_number: num }, message: 'Custody request created' }, { status: 201 });
    } catch (error: unknown) {
      console.error('Error creating custody:', error);
      return NextResponse.json({ success: false, error: 'Failed to create custody request' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.create'] }
);

export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, status, condition_on_return, revocation_reason, notes } = body;

      if (!id || !status) {
        return NextResponse.json({ success: false, error: 'ID and status are required' }, { status: 400 });
      }

      const custodyRows = await query<any[]>('SELECT * FROM asset_custody WHERE id = ?', [id]);
      if (!custodyRows.length) return NextResponse.json({ success: false, error: 'Custody record not found' }, { status: 404 });
      const c = custodyRows[0];

      let updateFields = 'status = ?';
      const updateParams: any[] = [status];

      if (status === 'approved') {
        updateFields += ', approved_by = ?, approved_date = CURDATE()';
        updateParams.push(user.userId);
      }
      if (status === 'active') {
        updateFields += ', handed_over_by = ?, handover_date = CURDATE()';
        updateParams.push(user.userId);
        await query('UPDATE assets SET status = "assigned", assigned_to = ? WHERE id = ?', [c.employee_id, c.asset_id]);
      }
      if (status === 'released') {
        updateFields += ', returned_to = ?, actual_return_date = CURDATE()';
        if (condition_on_return) { updateFields += ', condition_on_return = ?'; updateParams.push(condition_on_return); }
        updateParams.push(user.userId);
        await query('UPDATE assets SET status = "available", assigned_to = NULL WHERE id = ?', [c.asset_id]);
      }
      if (status === 'revoked') {
        if (revocation_reason) { updateFields += ', revocation_reason = ?'; updateParams.push(revocation_reason); }
        await query('UPDATE assets SET status = "available", assigned_to = NULL WHERE id = ?', [c.asset_id]);
      }
      if (notes) { updateFields += ', notes = ?'; updateParams.push(notes); }

      updateParams.push(id);
      await query(`UPDATE asset_custody SET ${updateFields} WHERE id = ?`, updateParams);

      await query(
        'INSERT INTO asset_audit_log (asset_id, entity_type, entity_id, action, new_values, performed_by) VALUES (?,?,?,?,?,?)',
        [c.asset_id, 'custody', id, `custody_${status}`, JSON.stringify({ status }), user.userId]
      );

      return NextResponse.json({ success: true, message: `Custody ${status}` });
    } catch (error: unknown) {
      console.error('Error updating custody:', error);
      return NextResponse.json({ success: false, error: 'Failed to update custody' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.edit'] }
);
