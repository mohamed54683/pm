import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET - Fetch permissions for a specific role
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roleName = searchParams.get('role');

    if (!roleName) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Role name is required' 
        },
        { status: 400 }
      );
    }

    // Fetch role by name
    const roleResult = await query(
      'SELECT * FROM roles WHERE name = ? LIMIT 1',
      [roleName]
    );

    if (!Array.isArray(roleResult) || roleResult.length === 0) {
      // Return default permissions for unknown roles (treat as Viewer)
      return NextResponse.json({
        success: true,
        data: {
          id: 0,
          name: roleName,
          description: 'Default permissions',
          permissions: ['projects.view', 'tasks.view', 'documents.view', 'reports.view']
        },
        message: 'Default permissions returned for unknown role'
      });
    }

    const role = roleResult[0] as any;

    // Parse permissions
    const permissions = role.permissions 
      ? (typeof role.permissions === 'string' 
        ? JSON.parse(role.permissions) 
        : role.permissions)
      : [];

    return NextResponse.json({
      success: true,
      data: {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: permissions
      },
      message: 'Permissions fetched successfully'
    });
  } catch (error: any) {
    console.error('Error fetching role permissions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch permissions' 
      },
      { status: 500 }
    );
  }
}
