/**
 * Documents API - CRUD operations for PMP database
 * Fixed to match actual database schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface QueryRow {
  [key: string]: string | number | null | undefined;
}

// GET - List documents and folders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const folderId = searchParams.get('folderId');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    // Build where clause for documents (documents table has deleted_at)
    let whereClause = 'd.deleted_at IS NULL';
    const params: (string | number)[] = [];

    if (projectId) {
      whereClause += ' AND d.project_id = ?';
      params.push(projectId);
    }
    if (folderId) {
      whereClause += ' AND d.folder_id = ?';
      params.push(folderId);
    } else if (!search) {
      whereClause += ' AND d.folder_id IS NULL';
    }
    if (type) {
      whereClause += ' AND d.file_type = ?';
      params.push(type);
    }
    if (search) {
      whereClause += ' AND d.name LIKE ?';
      params.push(`%${search}%`);
    }

    // Build folder query params
    const folderParams: (string | number)[] = [];
    if (projectId) folderParams.push(projectId);
    if (folderId) folderParams.push(folderId);

    // Get folders (folders table does NOT have deleted_at)
    const folders = await query<QueryRow[]>(`
      SELECT
        f.id, f.uuid, f.name, f.path, f.parent_id, f.project_id,
        f.created_at, 'folder' as item_type,
        (SELECT COUNT(*) FROM documents WHERE folder_id = f.id AND deleted_at IS NULL) as document_count,
        (SELECT COUNT(*) FROM folders WHERE parent_id = f.id) as subfolder_count
      FROM folders f
      WHERE 1=1
        ${projectId ? 'AND f.project_id = ?' : ''}
        ${folderId ? 'AND f.parent_id = ?' : 'AND f.parent_id IS NULL'}
      ORDER BY f.name
    `, folderParams);

    // Get documents (uses file_type and uploaded_by per schema)
    const documents = await query<QueryRow[]>(`
      SELECT
        d.id, d.uuid, d.name, d.file_type, d.file_path,
        d.file_size, d.mime_type, d.version, d.status, d.project_id, d.folder_id,
        d.created_at, d.updated_at, 'document' as item_type,
        u.name as uploaded_by_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE ${whereClause}
      ORDER BY d.name
    `, params);

    // Get breadcrumb path if in folder
    let breadcrumb: QueryRow[] = [];
    if (folderId) {
      breadcrumb = await query<QueryRow[]>(`
        WITH RECURSIVE folder_path AS (
          SELECT id, name, parent_id, 1 as level FROM folders WHERE id = ?
          UNION ALL
          SELECT f.id, f.name, f.parent_id, fp.level + 1
          FROM folders f INNER JOIN folder_path fp ON f.id = fp.parent_id
        )
        SELECT id, name FROM folder_path ORDER BY level DESC
      `, [folderId]);
    }

    return NextResponse.json({
      success: true,
      data: {
        folders,
        documents,
        breadcrumb
      }
    });
  } catch (error: unknown) {
    console.error('Documents API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load documents';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST - Create document or folder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (type === 'folder') {
      const { name, parent_id, project_id, path } = body;
      if (!name) {
        return NextResponse.json({ success: false, error: 'Name required' }, { status: 400 });
      }

      const uuid = crypto.randomUUID();
      const result = await query<{ insertId: number }>(`
        INSERT INTO folders (uuid, name, path, parent_id, project_id)
        VALUES (?, ?, ?, ?, ?)
      `, [uuid, name, path || null, parent_id || null, project_id || null]);

      return NextResponse.json({
        success: true,
        data: { id: result.insertId, uuid, name, type: 'folder' }
      }, { status: 201 });
    } else {
      const {
        name, file_type, file_path, file_size, mime_type,
        project_id, folder_id, task_id, uploaded_by
      } = body;

      if (!name || !file_path) {
        return NextResponse.json({ success: false, error: 'Name and file path required' }, { status: 400 });
      }

      const uuid = crypto.randomUUID();
      const result = await query<{ insertId: number }>(`
        INSERT INTO documents (
          uuid, name, file_type, file_path, file_size, mime_type,
          version, status, project_id, folder_id, task_id, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, 1, 'draft', ?, ?, ?, ?)
      `, [
        uuid, name, file_type || 'general',
        file_path, file_size || 0, mime_type || 'application/octet-stream',
        project_id || null, folder_id || null, task_id || null, uploaded_by || null
      ]);

      return NextResponse.json({
        success: true,
        data: { id: result.insertId, uuid, name, type: 'document' }
      }, { status: 201 });
    }
  } catch (error: unknown) {
    console.error('Create document error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE - Soft delete a document (hard delete folder)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'document';

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    if (type === 'folder') {
      // Check if folder has contents
      const contents = await query<{ cnt: number }[]>(`
        SELECT
          (SELECT COUNT(*) FROM documents WHERE folder_id = ?) +
          (SELECT COUNT(*) FROM folders WHERE parent_id = ?) as cnt
      `, [id, id]);

      if (contents[0]?.cnt > 0) {
        return NextResponse.json({
          success: false,
          error: 'Folder is not empty. Delete contents first.'
        }, { status: 400 });
      }

      await query(`DELETE FROM folders WHERE id = ?`, [id]);
    } else {
      // Soft delete document
      await query(`UPDATE documents SET deleted_at = NOW() WHERE id = ?`, [id]);
    }

    return NextResponse.json({ success: true, message: `${type} deleted successfully` });
  } catch (error: unknown) {
    console.error('Delete document error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
