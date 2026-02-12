/**
 * Task Comments API - Comments with @mentions
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { stripDangerousTags } from '@/lib/sanitize';
import { DecodedToken } from '@/lib/auth';

// GET - Fetch comments for a task
export const GET = withAuth(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      
      const comments = await query<Record<string, unknown>[]>(
        `SELECT c.*, u.name as user_name, u.avatar as user_avatar, u.email as user_email,
          parent.content as parent_content, parent_user.name as parent_user_name
         FROM task_comments c
         JOIN users u ON c.user_id = u.id
         LEFT JOIN task_comments parent ON c.parent_id = parent.id
         LEFT JOIN users parent_user ON parent.user_id = parent_user.id
         WHERE c.task_id = ? AND c.deleted_at IS NULL
         ORDER BY c.created_at ASC`,
        [id]
      );

      return NextResponse.json({ success: true, data: comments });
    } catch (error) {
      console.error('Comments GET error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch comments' }, { status: 500 });
    }
  },
  { requiredPermissions: ['tasks.view'] }
);

// POST - Add a comment
export const POST = withAuth(
  async (request: NextRequest, { user, params }: { user: DecodedToken; params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { content, parent_id } = body;

      if (!content?.trim()) {
        return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
      }

      // Extract @mentions
      const mentionPattern = /@\[([^\]]+)\]\((\d+)\)/g;
      const mentions: { userId: number; name: string }[] = [];
      let match;
      while ((match = mentionPattern.exec(content)) !== null) {
        mentions.push({ userId: parseInt(match[2]), name: match[1] });
      }

      const result = await query<Record<string, unknown>>(
        `INSERT INTO task_comments (uuid, task_id, user_id, parent_id, content, mentions, created_at)
         VALUES (UUID(), ?, ?, ?, ?, ?, NOW())`,
        [id, user.userId, parent_id || null, stripDangerousTags(content), JSON.stringify(mentions)]
      );

      const commentId = (result as any).insertId;

      // Log activity
      await query(
        `INSERT INTO task_history (task_id, user_id, action, new_value, created_at)
         VALUES (?, ?, 'commented', ?, NOW())`,
        [id, user.userId, content.substring(0, 200)]
      );

      // Get the created comment with user info
      const comments = await query<Record<string, unknown>[]>(
        `SELECT c.*, u.name as user_name, u.avatar as user_avatar
         FROM task_comments c JOIN users u ON c.user_id = u.id
         WHERE c.id = ?`,
        [commentId]
      );

      return NextResponse.json({
        success: true,
        data: comments[0],
        message: 'Comment added'
      });
    } catch (error) {
      console.error('Comment POST error:', error);
      return NextResponse.json({ success: false, error: 'Failed to add comment' }, { status: 500 });
    }
  },
  { requiredPermissions: ['tasks.view'] }
);

// PUT - Edit a comment
export const PUT = withAuth(
  async (request: NextRequest, { user, params }: { user: DecodedToken; params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { comment_id, content } = body;

      if (!comment_id || !content?.trim()) {
        return NextResponse.json({ success: false, error: 'Comment ID and content required' }, { status: 400 });
      }

      // Check ownership
      const existing = await query<Record<string, unknown>[]>(
        `SELECT user_id FROM task_comments WHERE id = ? AND deleted_at IS NULL`, [comment_id]
      );
      if (!existing.length || existing[0].user_id !== user.userId) {
        return NextResponse.json({ success: false, error: 'Cannot edit this comment' }, { status: 403 });
      }

      await query(
        `UPDATE task_comments SET content = ?, is_edited = 1, edited_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [stripDangerousTags(content), comment_id]
      );

      return NextResponse.json({ success: true, message: 'Comment updated' });
    } catch (error) {
      console.error('Comment PUT error:', error);
      return NextResponse.json({ success: false, error: 'Failed to update comment' }, { status: 500 });
    }
  },
  { requiredPermissions: ['tasks.view'] }
);

// DELETE - Delete a comment
export const DELETE = withAuth(
  async (request: NextRequest, { user }: { user: DecodedToken }): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const comment_id = searchParams.get('comment_id');

      if (!comment_id) {
        return NextResponse.json({ success: false, error: 'Comment ID required' }, { status: 400 });
      }

      // Check ownership
      const existing = await query<Record<string, unknown>[]>(
        `SELECT user_id FROM task_comments WHERE id = ? AND deleted_at IS NULL`, [comment_id]
      );
      if (!existing.length || existing[0].user_id !== user.userId) {
        return NextResponse.json({ success: false, error: 'Cannot delete this comment' }, { status: 403 });
      }

      await query(`UPDATE task_comments SET deleted_at = NOW() WHERE id = ?`, [comment_id]);

      return NextResponse.json({ success: true, message: 'Comment deleted' });
    } catch (error) {
      console.error('Comment DELETE error:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete comment' }, { status: 500 });
    }
  },
  { requiredPermissions: ['tasks.view'] }
);
