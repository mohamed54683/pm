import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET - Fetch all roles
export async function GET(request: NextRequest) {
  try {
    const rolesResult = await query('SELECT * FROM roles ORDER BY created_at DESC');
    
    // Ensure permissions is always an array
    const roles = Array.isArray(rolesResult) ? rolesResult.map((role: any) => ({
      ...role,
      permissions: role.permissions ? (typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions) : []
    })) : [];

    return NextResponse.json({
      success: true,
      data: roles,
      message: 'Roles fetched successfully'
    });
  } catch (error: any) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch roles' 
      },
      { status: 500 }
    );
  }
}

// POST - Create new role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, permissions } = body;

    // Validation
    if (!name) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Role name is required' 
        },
        { status: 400 }
      );
    }

    // Check if role already exists
    const existingRole = await query(
      'SELECT id FROM roles WHERE name = ?',
      [name]
    );

    if (Array.isArray(existingRole) && existingRole.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Role name already exists' 
        },
        { status: 400 }
      );
    }

    // Insert new role
    const result = await query(
      `INSERT INTO roles (name, description, permissions, user_count, created_at) 
       VALUES (?, ?, ?, 0, NOW())`,
      [name, description || null, JSON.stringify(permissions || [])]
    );

    return NextResponse.json({
      success: true,
      data: { 
        id: (result as any).insertId,
        name,
        description,
        permissions: permissions || [],
        user_count: 0
      },
      message: 'Role created successfully'
    });
  } catch (error: any) {
    console.error('Error creating role:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create role' 
      },
      { status: 500 }
    );
  }
}

// PUT - Update role
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, permissions } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Role ID is required' },
        { status: 400 }
      );
    }

    let sql = 'UPDATE roles SET ';
    const params: any[] = [];
    const updates: string[] = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (permissions !== undefined) {
      updates.push('permissions = ?');
      params.push(JSON.stringify(permissions));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    sql += updates.join(', ') + ' WHERE id = ?';
    params.push(id);

    await query(sql, params);

    // Update user count
    const countResult = await query(
      'SELECT COUNT(*) as count FROM users WHERE role = (SELECT name FROM roles WHERE id = ?)',
      [id]
    );
    
    if (Array.isArray(countResult) && countResult.length > 0) {
      await query(
        'UPDATE roles SET user_count = ? WHERE id = ?',
        [(countResult[0] as any).count, id]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating role:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update role' },
      { status: 500 }
    );
  }
}

// DELETE - Delete role
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Role ID is required' },
        { status: 400 }
      );
    }

    // Check if role is assigned to any users
    const usersWithRole = await query(
      'SELECT COUNT(*) as count FROM users WHERE role = (SELECT name FROM roles WHERE id = ?)',
      [id]
    );

    if (Array.isArray(usersWithRole) && usersWithRole.length > 0 && (usersWithRole[0] as any).count > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete role. It is assigned to ${(usersWithRole[0] as any).count} user(s)` 
        },
        { status: 400 }
      );
    }

    await query('DELETE FROM roles WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting role:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete role' },
      { status: 500 }
    );
  }
}
