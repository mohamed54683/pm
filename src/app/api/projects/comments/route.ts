/**
 * Project Comments API - CRUD operations for comments on projects, phases, and tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// GET - Fetch comments
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const project_id = searchParams.get('project_id');
      const phase_id = searchParams.get('phase_id');
      const task_id = searchParams.get('task_id');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;

      let sql = `
        SELECT c.*, u.name as user_name, u.email as user_email
        FROM project_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.parent_comment_id IS NULL
      `;
      const params: any[] = [];

      if (task_id) {
        sql += ` AND c.task_id = ?`;
        params.push(task_id);
      } else if (phase_id) {
        sql += ` AND c.phase_id = ?`;
        params.push(phase_id);
      } else if (project_id) {
        sql += ` AND c.project_id = ? AND c.phase_id IS NULL AND c.task_id IS NULL`;
        params.push(project_id);
      } else {
        return NextResponse.json(
          { success: false, error: 'Project, phase, or task ID is required' },
          { status: 400 }
        );
      }

      sql += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const comments = await query<any[]>(sql, params);

      // Fetch replies for each comment
      for (const comment of comments) {
        const replies = await query<any[]>(
          `SELECT c.*, u.name as user_name, u.email as user_email
           FROM project_comments c
           JOIN users u ON c.user_id = u.id
           WHERE c.parent_comment_id = ?
           ORDER BY c.created_at ASC`,
          [comment.id]
        );
        comment.replies = replies;
      }

      return NextResponse.json({
        success: true,
        data: comments
      });

    } catch (error: any) {
      console.error('Error fetching comments:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.view'], checkCsrf: false }
);

// POST - Create a comment
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { project_id, phase_id, task_id, parent_comment_id, content } = body;

      if (!content || !content.trim()) {
        return NextResponse.json(
          { success: false, error: 'Comment content is required' },
          { status: 400 }
        );
      }

      if (!project_id && !phase_id && !task_id) {
        return NextResponse.json(
          { success: false, error: 'Project, phase, or task ID is required' },
          { status: 400 }
        );
      }

      const id = generateId('comment');

      await query(
        `INSERT INTO project_comments (id, project_id, phase_id, task_id, parent_comment_id, user_id, content)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          project_id || null,
          phase_id || null,
          task_id || null,
          parent_comment_id || null,
          user.userId,
          content.trim()
        ]
      );

      // Create notifications for mentioned users (basic @mention support)
      const mentions = content.match(/@(\w+)/g);
      if (mentions) {
        for (const mention of mentions) {
          const username = mention.substring(1);
          const users = await query<any[]>(
            'SELECT id FROM users WHERE name LIKE ? OR email LIKE ?',
            [`%${username}%`, `%${username}%`]
          );

          for (const mentionedUser of users) {
            if (mentionedUser.id !== user.userId) {
              await query(
                `INSERT INTO project_notifications (id, user_id, project_id, task_id, type, title, message)
                 VALUES (?, ?, ?, ?, 'mention', ?, ?)`,
                [
                  generateId('notif'),
                  mentionedUser.id,
                  project_id || null,
                  task_id || null,
                  'You were mentioned in a comment',
                  content.substring(0, 100)
                ]
              );
            }
          }
        }
      }

      // Log activity
      await query(
        `INSERT INTO project_activity_log (id, project_id, phase_id, task_id, user_id, action, entity_type, entity_id, description)
         VALUES (?, ?, ?, ?, ?, 'create', 'comment', ?, ?)`,
        [generateId('log'), project_id, phase_id, task_id, user.userId, id, 'Added a comment']
      );

      return NextResponse.json({
        success: true,
        data: { id },
        message: 'Comment added successfully'
      });

    } catch (error: any) {
      console.error('Error creating comment:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.view'] }
);

// PUT - Update a comment
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, content } = body;

      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Comment ID is required' },
          { status: 400 }
        );
      }

      if (!content || !content.trim()) {
        return NextResponse.json(
          { success: false, error: 'Comment content is required' },
          { status: 400 }
        );
      }

      // Check if user owns the comment
      const existing = await query<any[]>(
        'SELECT user_id FROM project_comments WHERE id = ?',
        [id]
      );

      if (!existing || existing.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Comment not found' },
          { status: 404 }
        );
      }

      if (existing[0].user_id !== user.userId) {
        return NextResponse.json(
          { success: false, error: 'You can only edit your own comments' },
          { status: 403 }
        );
      }

      await query(
        `UPDATE project_comments SET content = ?, is_edited = TRUE, edited_at = NOW() WHERE id = ?`,
        [content.trim(), id]
      );

      return NextResponse.json({
        success: true,
        message: 'Comment updated successfully'
      });

    } catch (error: any) {
      console.error('Error updating comment:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.view'] }
);

// DELETE - Delete a comment
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Comment ID is required' },
          { status: 400 }
        );
      }

      // Check if user owns the comment or has delete permission
      const existing = await query<any[]>(
        'SELECT user_id FROM project_comments WHERE id = ?',
        [id]
      );

      if (!existing || existing.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Comment not found' },
          { status: 404 }
        );
      }

      // Allow deletion by owner or if user has projects.delete permission
      const hasDeletePermission = user.permissions.includes('projects.delete');
      if (existing[0].user_id !== user.userId && !hasDeletePermission) {
        return NextResponse.json(
          { success: false, error: 'You can only delete your own comments' },
          { status: 403 }
        );
      }

      await query('DELETE FROM project_comments WHERE id = ?', [id]);

      return NextResponse.json({
        success: true,
        message: 'Comment deleted successfully'
      });

    } catch (error: any) {
      console.error('Error deleting comment:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.view'] }
);
