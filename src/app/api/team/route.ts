/**
 * Team API - List and manage team members
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface QueryRow {
  [key: string]: string | number | null | undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limitNum = parseInt(searchParams.get('limit') || '50', 10);
    const offsetNum = (page - 1) * limitNum;

    // Build WHERE conditions
    const conditions: string[] = ['u.deleted_at IS NULL'];
    const params: (string | number)[] = [];
    
    if (search) {
      const searchPattern = '%' + search + '%';
      conditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)');
      params.push(searchPattern, searchPattern, searchPattern);
    }
    if (department && department !== 'all') {
      conditions.push('u.department = ?');
      params.push(department);
    }
    if (status && status !== 'all') {
      conditions.push('u.status = ?');
      params.push(status);
    }
    
    const whereClause = conditions.join(' AND ');

    // Main query with inline LIMIT/OFFSET
    const sql = `
      SELECT 
        u.id, u.uuid, u.email, u.first_name, u.last_name,
        COALESCE((SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = u.id LIMIT 1), 'member') as role,
        u.status, u.job_title, u.department, u.phone,
        u.avatar_url, 0 as hourly_rate, u.created_at, u.last_login_at as last_login,
        (SELECT COUNT(DISTINCT pm.project_id) FROM project_members pm WHERE pm.user_id = u.id) as projects_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.assignee_id = u.id AND t.status != 'done') as tasks_count
      FROM users u
      WHERE ${whereClause}
      ORDER BY u.first_name, u.last_name
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `;

    const members = await query<QueryRow[]>(sql, params);

    // Count query - use a copy of params
    const countSql = `SELECT COUNT(*) as total FROM users u WHERE ${whereClause}`;
    const countParams = [...params];
    const countResult = await query<{ total: number }[]>(countSql, countParams);

    // Stats - no params needed
    const statsResult = await query<QueryRow[]>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status != 'active' THEN 1 ELSE 0 END) as inactive
      FROM users
      WHERE deleted_at IS NULL
    `);

    const byRole = await query<{ role: string; count: number }[]>(`
      SELECT COALESCE(r.name, 'member') as role, COUNT(DISTINCT u.id) as count 
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.deleted_at IS NULL
      GROUP BY r.name
      ORDER BY count DESC
    `);

    const byDepartment = await query<{ department: string; count: number }[]>(`
      SELECT department, COUNT(*) as count 
      FROM users 
      WHERE deleted_at IS NULL AND department IS NOT NULL AND department != '' 
      GROUP BY department 
      ORDER BY count DESC
    `);

    const stats = {
      total: Number(statsResult[0]?.total) || 0,
      active: Number(statsResult[0]?.active) || 0,
      inactive: Number(statsResult[0]?.inactive) || 0,
      byRole,
      byDepartment
    };

    return NextResponse.json({
      success: true,
      data: {
        members,
        stats,
        pagination: {
          page,
          limit: limitNum,
          total: Number(countResult[0]?.total) || 0,
          pages: Math.ceil((Number(countResult[0]?.total) || 0) / limitNum)
        }
      }
    });
  } catch (error: unknown) {
    console.error('Team API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load team';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Member ID required' }, { status: 400 });
    }

    const allowedFields = ['first_name', 'last_name', 'status', 'job_title', 'department', 'phone'];
    const setClause: string[] = [];
    const params: (string | number)[] = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(field + ' = ?');
        params.push(updates[field]);
      }
    }

    if (setClause.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    setClause.push('updated_at = NOW()');
    params.push(id);

    await query('UPDATE users SET ' + setClause.join(', ') + ' WHERE id = ?', params);

    return NextResponse.json({ success: true, message: 'Member updated successfully' });
  } catch (error: unknown) {
    console.error('Update member error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update member';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
