/**
 * Assets API - Full CRUD with filtering
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';

export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search') || '';
      const status = searchParams.get('status') || '';
      const branch_id = searchParams.get('branch_id') || '';
      const category_id = searchParams.get('category_id') || '';
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
      const offset = (page - 1) * limit;

      let sql = `
        SELECT a.*, c.name as category_name, b.name as branch_name, b.code as branch_code,
               d.name as department_name,
               CONCAT(u.first_name,' ',u.last_name) as assigned_to_name, u.email as assigned_to_email,
               CONCAT(cr.first_name,' ',cr.last_name) as created_by_name
        FROM assets a
        LEFT JOIN asset_categories c ON a.category_id = c.id
        LEFT JOIN branches b ON a.branch_id = b.id
        LEFT JOIN departments d ON a.department_id = d.id
        LEFT JOIN users u ON a.assigned_to = u.id
        LEFT JOIN users cr ON a.created_by = cr.id
        WHERE a.deleted_at IS NULL
      `;
      let countSql = 'SELECT COUNT(*) as total FROM assets a WHERE a.deleted_at IS NULL';
      const params: any[] = [];
      const countParams: any[] = [];

      if (search) {
        const s = `%${search}%`;
        sql += ' AND (a.name LIKE ? OR a.asset_tag LIKE ? OR a.serial_number LIKE ? OR a.model LIKE ?)';
        countSql += ' AND (a.name LIKE ? OR a.asset_tag LIKE ? OR a.serial_number LIKE ? OR a.model LIKE ?)';
        params.push(s, s, s, s);
        countParams.push(s, s, s, s);
      }
      if (status && status !== 'all') {
        sql += ' AND a.status = ?'; countSql += ' AND a.status = ?';
        params.push(status); countParams.push(status);
      }
      if (branch_id) {
        sql += ' AND a.branch_id = ?'; countSql += ' AND a.branch_id = ?';
        params.push(branch_id); countParams.push(branch_id);
      }
      if (category_id) {
        sql += ' AND a.category_id = ?'; countSql += ' AND a.category_id = ?';
        params.push(category_id); countParams.push(category_id);
      }

      sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [assets, countResult] = await Promise.all([
        query(sql, params),
        query(countSql, countParams),
      ]);
      const total = (countResult as any[])[0]?.total || 0;

      return NextResponse.json({ success: true, data: assets, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (error: unknown) {
      console.error('Error fetching assets:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch assets' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.view'] }
);

export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { asset_tag, name, description, category_id, branch_id, department_id, serial_number, model, manufacturer,
              purchase_date, purchase_cost, current_value, salvage_value, useful_life_months, depreciation_method,
              depreciation_start_date, warranty_expiry, status, condition_status, barcode, notes } = body;

      if (!asset_tag?.trim() || !name?.trim()) {
        return NextResponse.json({ success: false, error: 'Asset tag and name are required' }, { status: 400 });
      }
      const existing = await query<any[]>('SELECT id FROM assets WHERE asset_tag = ? AND deleted_at IS NULL', [asset_tag.trim()]);
      if (existing.length > 0) {
        return NextResponse.json({ success: false, error: 'Asset tag already exists' }, { status: 409 });
      }

      const result = await query<any>(
        `INSERT INTO assets (asset_tag, name, description, category_id, branch_id, department_id, serial_number, model, manufacturer,
          purchase_date, purchase_cost, current_value, salvage_value, useful_life_months, depreciation_method,
          depreciation_start_date, warranty_expiry, status, condition_status, barcode, notes, created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [asset_tag.trim(), name.trim(), description||null, category_id||null, branch_id||null, department_id||null,
         serial_number||null, model||null, manufacturer||null, purchase_date||null,
         purchase_cost||0, current_value||purchase_cost||0, salvage_value||0, useful_life_months||null,
         depreciation_method||'straight_line', depreciation_start_date||purchase_date||null,
         warranty_expiry||null, status||'available', condition_status||'new', barcode||null, notes||null, user.userId]
      );

      // Audit log
      await query(
        `INSERT INTO asset_audit_log (asset_id, entity_type, entity_id, action, new_values, performed_by)
         VALUES (?,?,?,?,?,?)`,
        [result.insertId, 'asset', result.insertId, 'created', JSON.stringify({ asset_tag, name, status: status||'available' }), user.userId]
      );

      return NextResponse.json({ success: true, data: { id: result.insertId }, message: 'Asset created' }, { status: 201 });
    } catch (error: unknown) {
      console.error('Error creating asset:', error);
      return NextResponse.json({ success: false, error: 'Failed to create asset' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.create'] }
);

export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, asset_tag, name, description, category_id, branch_id, department_id, serial_number, model, manufacturer,
              purchase_date, purchase_cost, current_value, salvage_value, useful_life_months, depreciation_method,
              depreciation_start_date, warranty_expiry, status, condition_status, barcode, notes } = body;

      if (!id || !asset_tag?.trim() || !name?.trim()) {
        return NextResponse.json({ success: false, error: 'ID, asset tag, and name are required' }, { status: 400 });
      }
      const dup = await query<any[]>('SELECT id FROM assets WHERE asset_tag = ? AND id != ? AND deleted_at IS NULL', [asset_tag.trim(), id]);
      if (dup.length > 0) {
        return NextResponse.json({ success: false, error: 'Asset tag already exists' }, { status: 409 });
      }

      await query(
        `UPDATE assets SET asset_tag=?, name=?, description=?, category_id=?, branch_id=?, department_id=?,
          serial_number=?, model=?, manufacturer=?, purchase_date=?, purchase_cost=?, current_value=?,
          salvage_value=?, useful_life_months=?, depreciation_method=?, depreciation_start_date=?,
          warranty_expiry=?, status=?, condition_status=?, barcode=?, notes=?
         WHERE id=? AND deleted_at IS NULL`,
        [asset_tag.trim(), name.trim(), description||null, category_id||null, branch_id||null, department_id||null,
         serial_number||null, model||null, manufacturer||null, purchase_date||null,
         purchase_cost||0, current_value||0, salvage_value||0, useful_life_months||null,
         depreciation_method||'straight_line', depreciation_start_date||null,
         warranty_expiry||null, status||'available', condition_status||'new', barcode||null, notes||null, id]
      );

      await query(
        `INSERT INTO asset_audit_log (asset_id, entity_type, entity_id, action, new_values, performed_by)
         VALUES (?,?,?,?,?,?)`,
        [id, 'asset', id, 'updated', JSON.stringify({ name, status }), user.userId]
      );

      return NextResponse.json({ success: true, message: 'Asset updated' });
    } catch (error: unknown) {
      console.error('Error updating asset:', error);
      return NextResponse.json({ success: false, error: 'Failed to update asset' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.edit'] }
);

export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

      const custody = await query<any[]>('SELECT id FROM asset_custody WHERE asset_id = ? AND status IN ("active","pending","approved") LIMIT 1', [id]);
      if (custody.length > 0) {
        return NextResponse.json({ success: false, error: 'Cannot delete asset with active custody' }, { status: 400 });
      }

      await query('UPDATE assets SET deleted_at = NOW() WHERE id = ?', [id]);
      await query(
        'INSERT INTO asset_audit_log (asset_id, entity_type, entity_id, action, performed_by) VALUES (?,?,?,?,?)',
        [id, 'asset', id, 'deleted', user.userId]
      );
      return NextResponse.json({ success: true, message: 'Asset deleted' });
    } catch (error: unknown) {
      console.error('Error deleting asset:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete asset' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.delete'] }
);
