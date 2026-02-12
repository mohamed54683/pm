/**
 * Releases API - Full CRUD operations for release management
 * Includes progress tracking, sprint linking, auto-generated notes
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { sanitizeString, stripDangerousTags } from '@/lib/sanitize';
import { DecodedToken } from '@/lib/auth';

interface Release {
  id: number;
  uuid: string;
  project_id: number;
  project_name: string;
  project_code: string;
  version: string;
  name: string | null;
  description: string | null;
  release_type: string;
  status: string;
  approval_status: string;
  release_date: string | null;
  actual_release_date: string | null;
  release_notes: string | null;
  auto_release_notes: string | null;
  scope_changes_count: number;
  created_by: number;
  created_at: string;
  total_tasks: number;
  completed_tasks: number;
  total_sprints: number;
}

// GET - Fetch releases with full details
export const GET = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const projectId = searchParams.get('project_id');
      const status = searchParams.get('status');
      const limit = parseInt(searchParams.get('limit') || '50');

      let sql = `
        SELECT r.*, 
          p.name as project_name, p.code as project_code,
          (SELECT COUNT(*) FROM tasks t WHERE t.release_id = r.id AND t.deleted_at IS NULL) as total_tasks,
          (SELECT COUNT(*) FROM tasks t WHERE t.release_id = r.id AND t.status = 'done' AND t.deleted_at IS NULL) as completed_tasks,
          (SELECT COUNT(*) FROM release_sprints rs WHERE rs.release_id = r.id) as total_sprints
        FROM releases r
        LEFT JOIN projects p ON r.project_id = p.id
        WHERE 1=1
      `;
      const params: (string | number)[] = [];

      if (projectId) {
        sql += ` AND r.project_id = ?`;
        params.push(projectId);
      }

      if (status && status !== 'all') {
        sql += ` AND r.status = ?`;
        params.push(status);
      }

      sql += ` ORDER BY r.release_date DESC, r.created_at DESC LIMIT ?`;
      params.push(limit);

      const releases = await query<Release[]>(sql, params);

      // Get summary
      const summaryResult = await query<Record<string, unknown>[]>(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'planning' THEN 1 ELSE 0 END) as planning,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'released' THEN 1 ELSE 0 END) as released,
          SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived
        FROM releases r
        ${projectId ? 'WHERE r.project_id = ?' : ''}
      `, projectId ? [projectId] : []);

      // Add progress percentage to each release
      const releasesWithProgress = releases.map(r => ({
        ...r,
        progress: r.total_tasks > 0 ? Math.round((r.completed_tasks / r.total_tasks) * 100) : 0
      }));

      return NextResponse.json({
        success: true,
        data: releasesWithProgress,
        summary: summaryResult[0]
      });
    } catch (error) {
      console.error('Releases API error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch releases', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['releases.view'], checkCsrf: false }
);

// POST - Create a new release
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { project_id, version, name, description, release_type, release_date, sprint_ids, task_ids } = body;

      if (!project_id || !version) {
        return NextResponse.json({ success: false, error: 'Project ID and version are required' }, { status: 400 });
      }

      // Sanitize inputs
      const sanitizedVersion = sanitizeString(version);
      const sanitizedName = name ? sanitizeString(name) : null;
      const sanitizedDescription = description ? stripDangerousTags(description) : null;

      const result = await query<{ insertId: number }>(
        `INSERT INTO releases (uuid, project_id, version, name, description, release_type, status, release_date, created_by)
         VALUES (UUID(), ?, ?, ?, ?, ?, 'planning', ?, ?)`,
        [project_id, sanitizedVersion, sanitizedName, sanitizedDescription, release_type || 'minor', release_date || null, user.userId]
      );

      const releaseId = result.insertId;

      // Link sprints if provided
      if (sprint_ids && Array.isArray(sprint_ids)) {
        for (const sprintId of sprint_ids) {
          await query(
            `INSERT INTO release_sprints (release_id, sprint_id, added_by) VALUES (?, ?, ?)`,
            [releaseId, sprintId, user.userId]
          );
        }
      }

      // Link tasks if provided
      if (task_ids && Array.isArray(task_ids)) {
        await query(
          `UPDATE tasks SET release_id = ? WHERE id IN (${task_ids.map(() => '?').join(',')})`,
          [releaseId, ...task_ids]
        );
      }

      // Log activity
      await query(
        `INSERT INTO activity_log (user_id, project_id, action, entity_type, entity_id, description)
         VALUES (?, ?, 'created', 'release', ?, ?)`,
        [user.userId, project_id, releaseId, `Created release: ${sanitizedVersion}`]
      );

      return NextResponse.json({
        success: true,
        data: { id: releaseId, version: sanitizedVersion }
      }, { status: 201 });
    } catch (error) {
      console.error('Create release error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create release', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['releases.create'] }
);

// PUT - Update a release
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { 
        id, version, name, description, release_type, status, release_date, 
        release_notes, approval_status, sprint_ids, task_ids,
        action // 'update', 'approve', 'reject', 'release', 'generate_notes'
      } = body;

      if (!id) {
        return NextResponse.json({ success: false, error: 'Release ID is required' }, { status: 400 });
      }

      // Get current release
      const releaseResult = await query<{ id: number; project_id: number; status: string }[]>(
        `SELECT id, project_id, status FROM releases WHERE id = ?`,
        [id]
      );

      if (!releaseResult.length) {
        return NextResponse.json({ success: false, error: 'Release not found' }, { status: 404 });
      }

      const release = releaseResult[0];

      switch (action) {
        case 'approve':
          await query(`UPDATE releases SET approval_status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ?`,
            [user.userId, id]);
          break;

        case 'reject':
          await query(`UPDATE releases SET approval_status = 'rejected' WHERE id = ?`, [id]);
          break;

        case 'release':
          // Generate auto release notes
          const autoNotes = await generateReleaseNotes(id);
          await query(`
            UPDATE releases SET 
              status = 'released', 
              actual_release_date = CURDATE(),
              auto_release_notes = ?
            WHERE id = ?
          `, [autoNotes, id]);
          break;

        case 'generate_notes':
          const generatedNotes = await generateReleaseNotes(id);
          await query(`UPDATE releases SET auto_release_notes = ? WHERE id = ?`, [generatedNotes, id]);
          return NextResponse.json({ success: true, data: { notes: generatedNotes } });

        default:
          // Regular update
          const updates: string[] = [];
          const values: (string | number | null)[] = [];

          if (version) { updates.push('version = ?'); values.push(sanitizeString(version)); }
          if (name !== undefined) { updates.push('name = ?'); values.push(name ? sanitizeString(name) : null); }
          if (description !== undefined) { updates.push('description = ?'); values.push(description ? stripDangerousTags(description) : null); }
          if (release_type) { updates.push('release_type = ?'); values.push(release_type); }
          if (status) { updates.push('status = ?'); values.push(status); }
          if (release_date !== undefined) { updates.push('release_date = ?'); values.push(release_date); }
          if (release_notes !== undefined) { updates.push('release_notes = ?'); values.push(stripDangerousTags(release_notes)); }
          if (approval_status) { updates.push('approval_status = ?'); values.push(approval_status); }

          if (updates.length > 0) {
            updates.push('updated_at = NOW()');
            values.push(id);
            await query(`UPDATE releases SET ${updates.join(', ')} WHERE id = ?`, values);
          }

          // Update sprint links if provided
          if (sprint_ids !== undefined) {
            await query(`DELETE FROM release_sprints WHERE release_id = ?`, [id]);
            if (Array.isArray(sprint_ids)) {
              for (const sprintId of sprint_ids) {
                await query(
                  `INSERT INTO release_sprints (release_id, sprint_id, added_by) VALUES (?, ?, ?)`,
                  [id, sprintId, user.userId]
                );
              }
            }
          }

          // Update task links if provided
          if (task_ids !== undefined) {
            // First remove release from tasks not in new list
            await query(`UPDATE tasks SET release_id = NULL WHERE release_id = ?`, [id]);
            // Then add release to specified tasks
            if (Array.isArray(task_ids) && task_ids.length > 0) {
              await query(
                `UPDATE tasks SET release_id = ? WHERE id IN (${task_ids.map(() => '?').join(',')})`,
                [id, ...task_ids]
              );
              // Increment scope changes count
              await query(`UPDATE releases SET scope_changes_count = scope_changes_count + 1 WHERE id = ?`, [id]);
            }
          }
      }

      return NextResponse.json({ success: true, message: 'Release updated successfully' });
    } catch (error) {
      console.error('Update release error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update release', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['releases.edit'] }
);

// DELETE - Delete a release
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json({ success: false, error: 'Release ID is required' }, { status: 400 });
      }

      // Get release info
      const releaseInfo = await query<{ project_id: number; version: string }[]>(
        `SELECT project_id, version FROM releases WHERE id = ?`,
        [id]
      );

      if (!releaseInfo.length) {
        return NextResponse.json({ success: false, error: 'Release not found' }, { status: 404 });
      }

      // Remove release from tasks
      await query(`UPDATE tasks SET release_id = NULL WHERE release_id = ?`, [id]);

      // Delete sprint links
      await query(`DELETE FROM release_sprints WHERE release_id = ?`, [id]);

      // Delete release
      await query(`DELETE FROM releases WHERE id = ?`, [id]);

      // Log activity
      await query(
        `INSERT INTO activity_log (user_id, project_id, action, entity_type, entity_id, description)
         VALUES (?, ?, 'deleted', 'release', ?, ?)`,
        [user.userId, releaseInfo[0].project_id, id, `Deleted release: ${releaseInfo[0].version}`]
      );

      return NextResponse.json({ success: true, message: 'Release deleted successfully' });
    } catch (error) {
      console.error('Delete release error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete release', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['releases.delete'] }
);

// Helper function to generate release notes from completed tasks
async function generateReleaseNotes(releaseId: number): Promise<string> {
  const tasks = await query<{ type: string; task_key: string; title: string }[]>(`
    SELECT type, task_key, title
    FROM tasks
    WHERE release_id = ? AND status = 'done' AND deleted_at IS NULL
    ORDER BY type, task_key
  `, [releaseId]);

  const grouped: Record<string, Array<{ task_key: string; title: string }>> = {};
  
  tasks.forEach(task => {
    const type = task.type || 'other';
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push({ task_key: task.task_key, title: task.title });
  });

  const typeLabels: Record<string, string> = {
    feature: '✨ Features',
    story: '📖 Stories',
    bug: '🐛 Bug Fixes',
    task: '✅ Tasks',
    improvement: '⚡ Improvements',
    other: '📋 Other'
  };

  let notes = '';
  
  for (const [type, items] of Object.entries(grouped)) {
    notes += `### ${typeLabels[type] || type}\n\n`;
    items.forEach(item => {
      notes += `- ${item.task_key}: ${item.title}\n`;
    });
    notes += '\n';
  }

  return notes || 'No completed tasks in this release.';
}
