/**
 * Branches API - CRUD
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
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
      const offset = (page - 1) * limit;

      let sql = `
        SELECT b.*, CONCAT(m.first_name,' ',m.last_name) as manager_name, m.email as manager_email
        FROM branches b
        LEFT JOIN users m ON b.manager_id = m.id
        WHERE b.deleted_at IS NULL
      `;
      let countSql = 'SELECT COUNT(*) as total FROM branches b WHERE b.deleted_at IS NULL';
      const params: any[] = [];
      const countParams: any[] = [];

      if (search) {
        sql += ' AND (b.name LIKE ? OR b.code LIKE ? OR b.city LIKE ?)';
        countSql += ' AND (b.name LIKE ? OR b.code LIKE ? OR b.city LIKE ?)';
        const s = `%${search}%`;
        params.push(s, s, s);
        countParams.push(s, s, s);
      }
      if (status && status !== 'all') {
        sql += ' AND b.status = ?';
        countSql += ' AND b.status = ?';
        params.push(status);
        countParams.push(status);
      }

      sql += ' ORDER BY b.name ASC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [branches, countResult] = await Promise.all([
        query(sql, params),
        query(countSql, countParams),
      ]);
      const total = (countResult as any[])[0]?.total || 0;

      return NextResponse.json({ success: true, data: branches, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (error: unknown) {
      console.error('Error fetching branches:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch branches' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.view'] }
);

export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { name, code, address, city, country, phone, email, manager_id, status } = body;
      if (!name?.trim() || !code?.trim()) {
        return NextResponse.json({ success: false, error: 'Branch name and code are required' }, { status: 400 });
      }
      const existing = await query<any[]>('SELECT id FROM branches WHERE code = ? AND deleted_at IS NULL', [code.trim()]);
      if (existing.length > 0) {
        return NextResponse.json({ success: false, error: 'Branch code already exists' }, { status: 409 });
      }
      const result = await query<any>(
        'INSERT INTO branches (name, code, address, city, country, phone, email, manager_id, status) VALUES (?,?,?,?,?,?,?,?,?)',
        [name.trim(), code.trim(), address||null, city||null, country||null, phone||null, email||null, manager_id||null, status||'active']
      );
      return NextResponse.json({ success: true, data: { id: result.insertId }, message: 'Branch created' }, { status: 201 });
    } catch (error: unknown) {
      console.error('Error creating branch:', error);
      return NextResponse.json({ success: false, error: 'Failed to create branch' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.create'] }
);

export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, name, code, address, city, country, phone, email, manager_id, status } = body;
      if (!id || !name?.trim() || !code?.trim()) {
        return NextResponse.json({ success: false, error: 'ID, name, and code are required' }, { status: 400 });
      }
      const dup = await query<any[]>('SELECT id FROM branches WHERE code = ? AND id != ? AND deleted_at IS NULL', [code.trim(), id]);
      if (dup.length > 0) {
        return NextResponse.json({ success: false, error: 'Branch code already exists' }, { status: 409 });
      }
      await query(
        'UPDATE branches SET name=?, code=?, address=?, city=?, country=?, phone=?, email=?, manager_id=?, status=? WHERE id=? AND deleted_at IS NULL',
        [name.trim(), code.trim(), address||null, city||null, country||null, phone||null, email||null, manager_id||null, status||'active', id]
      );
      return NextResponse.json({ success: true, message: 'Branch updated' });
    } catch (error: unknown) {
      console.error('Error updating branch:', error);
      return NextResponse.json({ success: false, error: 'Failed to update branch' }, { status: 500 });
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
      const assets = await query<any[]>('SELECT id FROM assets WHERE branch_id = ? AND deleted_at IS NULL LIMIT 1', [id]);
      if (assets.length > 0) {
        return NextResponse.json({ success: false, error: 'Cannot delete branch with assets' }, { status: 400 });
      }
      await query('UPDATE branches SET deleted_at = NOW() WHERE id = ?', [id]);
      return NextResponse.json({ success: true, message: 'Branch deleted' });
    } catch (error: unknown) {
      console.error('Error deleting branch:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete branch' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.delete'] }
);
