/**
 * Asset Categories API - CRUD
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
      const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);

      let sql = `
        SELECT c.*, p.name as parent_name
        FROM asset_categories c
        LEFT JOIN asset_categories p ON c.parent_id = p.id
        WHERE c.deleted_at IS NULL
      `;
      const params: any[] = [];

      if (search) {
        sql += ' AND (c.name LIKE ? OR c.code LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      if (status && status !== 'all') {
        sql += ' AND c.status = ?';
        params.push(status);
      }
      sql += ' ORDER BY c.name ASC LIMIT ?';
      params.push(limit);

      const categories = await query(sql, params);
      return NextResponse.json({ success: true, data: categories });
    } catch (error: unknown) {
      console.error('Error fetching categories:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.view'] }
);

export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { name, code, parent_id, description, depreciation_method, useful_life_months, status } = body;
      if (!name?.trim()) {
        return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 });
      }
      const result = await query<any>(
        `INSERT INTO asset_categories (name, code, parent_id, description, depreciation_method, useful_life_months, status)
         VALUES (?,?,?,?,?,?,?)`,
        [name.trim(), code||null, parent_id||null, description||null, depreciation_method||'straight_line', useful_life_months||60, status||'active']
      );
      return NextResponse.json({ success: true, data: { id: result.insertId }, message: 'Category created' }, { status: 201 });
    } catch (error: unknown) {
      console.error('Error creating category:', error);
      return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.create'] }
);

export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, name, code, parent_id, description, depreciation_method, useful_life_months, status } = body;
      if (!id || !name?.trim()) {
        return NextResponse.json({ success: false, error: 'ID and name are required' }, { status: 400 });
      }
      if (parent_id && parent_id === id) {
        return NextResponse.json({ success: false, error: 'Category cannot be its own parent' }, { status: 400 });
      }
      await query(
        `UPDATE asset_categories SET name=?, code=?, parent_id=?, description=?, depreciation_method=?, useful_life_months=?, status=?
         WHERE id=? AND deleted_at IS NULL`,
        [name.trim(), code||null, parent_id||null, description||null, depreciation_method||'straight_line', useful_life_months||60, status||'active', id]
      );
      return NextResponse.json({ success: true, message: 'Category updated' });
    } catch (error: unknown) {
      console.error('Error updating category:', error);
      return NextResponse.json({ success: false, error: 'Failed to update category' }, { status: 500 });
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
      const children = await query<any[]>('SELECT id FROM asset_categories WHERE parent_id = ? AND deleted_at IS NULL LIMIT 1', [id]);
      if (children.length > 0) {
        return NextResponse.json({ success: false, error: 'Remove sub-categories first' }, { status: 400 });
      }
      const assets = await query<any[]>('SELECT id FROM assets WHERE category_id = ? AND deleted_at IS NULL LIMIT 1', [id]);
      if (assets.length > 0) {
        return NextResponse.json({ success: false, error: 'Cannot delete category with assets' }, { status: 400 });
      }
      await query('UPDATE asset_categories SET deleted_at = NOW() WHERE id = ?', [id]);
      return NextResponse.json({ success: true, message: 'Category deleted' });
    } catch (error: unknown) {
      console.error('Error deleting category:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete category' }, { status: 500 });
    }
  },
  { requiredPermissions: ['users.delete'] }
);
