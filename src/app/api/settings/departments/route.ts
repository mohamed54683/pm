/**
 * Departments API
 * CRUD operations with authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';

// GET - Fetch all departments
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
        SELECT d.id, d.uuid, d.name, d.analytic_account, d.status, d.description,
               d.manager_id, d.parent_id,
               d.created_at, d.updated_at,
               CONCAT(m.first_name, ' ', m.last_name) as manager_name,
               m.email as manager_email,
               p.name as parent_name
        FROM departments d
        LEFT JOIN users m ON d.manager_id = m.id
        LEFT JOIN departments p ON d.parent_id = p.id
        WHERE d.deleted_at IS NULL
      `;
      let countSql = `
        SELECT COUNT(*) as total FROM departments d WHERE d.deleted_at IS NULL
      `;
      const params: (string | number)[] = [];
      const countParams: (string | number)[] = [];

      if (search) {
        sql += ' AND (d.name LIKE ? OR d.analytic_account LIKE ?)';
        countSql += ' AND (d.name LIKE ? OR d.analytic_account LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
        countParams.push(`%${search}%`, `%${search}%`);
      }

      if (status && status !== 'all') {
        sql += ' AND d.status = ?';
        countSql += ' AND d.status = ?';
        params.push(status);
        countParams.push(status);
      }

      sql += ' ORDER BY d.name ASC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [departments, countResult] = await Promise.all([
        query(sql, params),
        query(countSql, countParams),
      ]);

      const total = (countResult as { total: number }[])[0]?.total || 0;

      return NextResponse.json({
        success: true,
        data: departments,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error: unknown) {
      console.error('Error fetching departments:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch departments' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['users.view'] }
);

// POST - Create new department
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { name, manager_id, parent_id, analytic_account, description, status } = body;

      if (!name || !name.trim()) {
        return NextResponse.json(
          { success: false, error: 'Department name is required' },
          { status: 400 }
        );
      }

      // Check for duplicate name
      const existing = await query<any[]>(
        'SELECT id FROM departments WHERE name = ? AND deleted_at IS NULL',
        [name.trim()]
      );
      if (existing.length > 0) {
        return NextResponse.json(
          { success: false, error: 'A department with this name already exists' },
          { status: 409 }
        );
      }

      const result = await query<any>(
        `INSERT INTO departments (name, manager_id, parent_id, analytic_account, description, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          name.trim(),
          manager_id || null,
          parent_id || null,
          analytic_account?.trim() || null,
          description?.trim() || null,
          status || 'active',
        ]
      );

      return NextResponse.json({
        success: true,
        data: { id: result.insertId },
        message: 'Department created successfully',
      }, { status: 201 });
    } catch (error: unknown) {
      console.error('Error creating department:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create department' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['users.create'] }
);

// PUT - Update department
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, name, manager_id, parent_id, analytic_account, description, status } = body;

      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Department ID is required' },
          { status: 400 }
        );
      }

      if (!name || !name.trim()) {
        return NextResponse.json(
          { success: false, error: 'Department name is required' },
          { status: 400 }
        );
      }

      // Prevent setting self as parent
      if (parent_id && parent_id === id) {
        return NextResponse.json(
          { success: false, error: 'A department cannot be its own parent' },
          { status: 400 }
        );
      }

      // Check for duplicate name (excluding self)
      const existing = await query<any[]>(
        'SELECT id FROM departments WHERE name = ? AND id != ? AND deleted_at IS NULL',
        [name.trim(), id]
      );
      if (existing.length > 0) {
        return NextResponse.json(
          { success: false, error: 'A department with this name already exists' },
          { status: 409 }
        );
      }

      await query(
        `UPDATE departments SET name = ?, manager_id = ?, parent_id = ?, analytic_account = ?, description = ?, status = ?
         WHERE id = ? AND deleted_at IS NULL`,
        [
          name.trim(),
          manager_id || null,
          parent_id || null,
          analytic_account?.trim() || null,
          description?.trim() || null,
          status || 'active',
          id,
        ]
      );

      return NextResponse.json({
        success: true,
        message: 'Department updated successfully',
      });
    } catch (error: unknown) {
      console.error('Error updating department:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update department' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['users.edit'] }
);

// DELETE - Soft delete department
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Department ID is required' },
          { status: 400 }
        );
      }

      // Check if department has children
      const children = await query<any[]>(
        'SELECT id FROM departments WHERE parent_id = ? AND deleted_at IS NULL',
        [id]
      );
      if (children.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete department with sub-departments. Remove or reassign them first.' },
          { status: 400 }
        );
      }

      await query(
        'UPDATE departments SET deleted_at = NOW() WHERE id = ?',
        [id]
      );

      return NextResponse.json({
        success: true,
        message: 'Department deleted successfully',
      });
    } catch (error: unknown) {
      console.error('Error deleting department:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete department' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['users.delete'] }
);
