/**
 * Secure Users API
 * CRUD operations with authentication, RBAC, and no password exposure
 * Fixed to use junction table for roles (user_roles)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, forbiddenResponse } from '@/lib/middleware/auth';
import { hashPassword, validatePassword, DecodedToken } from '@/lib/auth';

// Input validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET - Fetch all users (requires users.view permission)
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const role = searchParams.get('role');
      const status = searchParams.get('status');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
      const offset = (page - 1) * limit;

      // Build query with safe fields only - join with roles via user_roles
      let sql = `
        SELECT u.id, u.uuid, u.name, u.email, u.phone, u.avatar, u.status,
               u.created_at, u.updated_at,
               COALESCE(r.name, 'Viewer') as role
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.deleted_at IS NULL
      `;
      let countSql = `
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.deleted_at IS NULL
      `;
      const params: (string | number)[] = [];
      const countParams: (string | number)[] = [];

      if (role && role !== 'all') {
        sql += ' AND r.name = ?';
        countSql += ' AND r.name = ?';
        params.push(role);
        countParams.push(role);
      }

      if (status && status !== 'all') {
        sql += ' AND u.status = ?';
        countSql += ' AND u.status = ?';
        params.push(status);
        countParams.push(status);
      }

      // Add pagination
      sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      // Execute queries
      const [users, countResult] = await Promise.all([
        query(sql, params),
        query(countSql, countParams),
      ]);

      const total = (countResult as { total: number }[])[0]?.total || 0;

      return NextResponse.json({
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        message: 'Users fetched successfully',
      });
    } catch (error: unknown) {
      console.error('Error fetching users:', error);
      const err = error as Error;
      return NextResponse.json(
        {
          success: false,
          error: err.message || 'Failed to fetch users',
        },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['users.view'] }
);

// POST - Create new user (requires users.create permission)
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { first_name, last_name, email, password, role, status } = body;

      // Validation
      if (!first_name || !email || !password || !role) {
        return NextResponse.json(
          {
            success: false,
            error: 'First name, email, password, and role are required',
          },
          { status: 400 }
        );
      }

      // Validate email format
      if (!EMAIL_REGEX.test(email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }

      // Validate password complexity
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Password does not meet requirements',
            details: passwordValidation.errors,
          },
          { status: 400 }
        );
      }

      // Check if email already exists
      const existingUser = await query(
        'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL',
        [email]
      );

      if (Array.isArray(existingUser) && existingUser.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Email already exists' },
          { status: 400 }
        );
      }

      // Hash password before storing
      const hashedPassword = await hashPassword(password);

      // Get role ID
      const roleResult = await query<{ id: number }[]>(
        'SELECT id FROM roles WHERE name = ?',
        [role]
      );

      if (!roleResult || roleResult.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid role specified' },
          { status: 400 }
        );
      }

      const roleId = roleResult[0].id;

      // Insert new user with hashed password
      const uuid = crypto.randomUUID();
      const result = await query<{ insertId: number }>(
        `INSERT INTO users (uuid, first_name, last_name, email, password, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [uuid, first_name, last_name || null, email, hashedPassword, status || 'active']
      );

      const userId = result.insertId;

      // Assign role to user
      await query(
        'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
        [userId, roleId]
      );

      return NextResponse.json({
        success: true,
        data: {
          id: userId,
          uuid,
          first_name,
          last_name,
          email,
          role,
          status: status || 'active',
        },
        message: 'User created successfully',
      });
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      const err = error as Error;
      return NextResponse.json(
        { success: false, error: err.message || 'Failed to create user' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['users.create'] }
);

// PUT - Update user (requires users.edit permission)
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, first_name, last_name, email, role, status, password } = body;

      if (!id) {
        return NextResponse.json(
          { success: false, error: 'User ID is required' },
          { status: 400 }
        );
      }

      // Prevent users from escalating their own privileges
      if (user.userId === id && role && role !== user.role) {
        if (!user.permissions.includes('users.edit')) {
          return forbiddenResponse('Cannot change your own role');
        }
      }

      const updates: string[] = [];
      const params: (string | number | null)[] = [];

      if (first_name) {
        updates.push('first_name = ?');
        params.push(first_name);
      }

      if (last_name !== undefined) {
        updates.push('last_name = ?');
        params.push(last_name);
      }

      if (email) {
        if (!EMAIL_REGEX.test(email)) {
          return NextResponse.json(
            { success: false, error: 'Invalid email format' },
            { status: 400 }
          );
        }
        updates.push('email = ?');
        params.push(email);
      }

      if (status) {
        updates.push('status = ?');
        params.push(status);
      }

      // Handle password update with hashing
      if (password) {
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
          return NextResponse.json(
            {
              success: false,
              error: 'Password does not meet requirements',
              details: passwordValidation.errors,
            },
            { status: 400 }
          );
        }

        const hashedPassword = await hashPassword(password);
        updates.push('password = ?');
        params.push(hashedPassword);
      }

      if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        params.push(id);
        await query(sql, params);
      }

      // Update role if provided
      if (role) {
        const roleResult = await query<{ id: number }[]>(
          'SELECT id FROM roles WHERE name = ?',
          [role]
        );

        if (roleResult && roleResult.length > 0) {
          const roleId = roleResult[0].id;
          // Remove existing roles and assign new one
          await query('DELETE FROM user_roles WHERE user_id = ?', [id]);
          await query(
            'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
            [id, roleId]
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: 'User updated successfully',
      });
    } catch (error: unknown) {
      console.error('Error updating user:', error);
      const err = error as Error;
      return NextResponse.json(
        { success: false, error: err.message || 'Failed to update user' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['users.edit'] }
);

// DELETE - Soft delete user (requires users.delete permission)
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json(
          { success: false, error: 'User ID is required' },
          { status: 400 }
        );
      }

      // Prevent users from deleting themselves
      if (user.userId === parseInt(id)) {
        return forbiddenResponse('Cannot delete your own account');
      }

      // Soft delete user
      await query('UPDATE users SET deleted_at = NOW() WHERE id = ?', [id]);

      // Remove user roles
      await query('DELETE FROM user_roles WHERE user_id = ?', [id]);

      return NextResponse.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error: unknown) {
      console.error('Error deleting user:', error);
      const err = error as Error;
      return NextResponse.json(
        { success: false, error: err.message || 'Failed to delete user' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['users.delete'] }
);
