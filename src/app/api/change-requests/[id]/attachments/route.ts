import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth/jwt';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// GET - Get attachments
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const id = request.url.split('/change-requests/')[1]?.split('/')[0];
      
      const attachments = await query<any[]>(`
        SELECT a.*, u.name as uploaded_by_name
        FROM cr_attachments a
        LEFT JOIN users u ON a.uploaded_by = u.id
        WHERE a.cr_id = (SELECT id FROM change_requests WHERE id = ? OR uuid = ?)
        ORDER BY a.created_at DESC
      `, [id, id]);

      return NextResponse.json({ success: true, data: attachments });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  },
  { requiredPermissions: ['change_requests.view'] }
);

// POST - Upload attachment
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const id = request.url.split('/change-requests/')[1]?.split('/')[0];
      const userId = user.userId;
      
      const crResult = await query<any[]>(`
        SELECT id FROM change_requests WHERE (id = ? OR uuid = ?) AND deleted_at IS NULL
      `, [id, id]);

      if (crResult.length === 0) {
        return NextResponse.json({ success: false, error: 'Change request not found' }, { status: 404 });
      }

      const formData = await request.formData();
      const file = formData.get('file') as File;
      const category = formData.get('category') as string || 'general';

      if (!file) {
        return NextResponse.json({ success: false, error: 'File required' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uuid = uuidv4();
      const ext = path.extname(file.name);
      const filename = `${uuid}${ext}`;
      const uploadDir = path.join(process.cwd(), 'uploads', 'cr');
      
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);

      await query(`
        INSERT INTO cr_attachments (uuid, cr_id, file_name, original_name, file_path, file_type, file_size, category, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [uuid, crResult[0].id, filename, file.name, `/uploads/cr/${filename}`, file.type, file.size, category, userId]);

      return NextResponse.json({ success: true, message: 'File uploaded' }, { status: 201 });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  },
  { requiredPermissions: ['change_requests.edit'] }
);
