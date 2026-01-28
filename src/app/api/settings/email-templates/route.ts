import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET - Fetch all email templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    let sql = 'SELECT * FROM email_templates WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY created_at DESC';

    const templates = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: templates,
      message: 'Email templates fetched successfully'
    });
  } catch (error: any) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch email templates' 
      },
      { status: 500 }
    );
  }
}

// POST - Create new email template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, subject, body: emailBody, category, status } = body;

    // Validation
    if (!name || !subject) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Template name and subject are required' 
        },
        { status: 400 }
      );
    }

    // Check if template name already exists
    const existingTemplate = await query(
      'SELECT id FROM email_templates WHERE name = ?',
      [name]
    );

    if (Array.isArray(existingTemplate) && existingTemplate.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Template name already exists' 
        },
        { status: 400 }
      );
    }

    // Insert new template
    const result = await query(
      `INSERT INTO email_templates (name, subject, body, category, status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        name, 
        subject, 
        emailBody || '', 
        category || 'General', 
        status || 'Draft'
      ]
    );

    return NextResponse.json({
      success: true,
      data: { 
        id: (result as any).insertId,
        name,
        subject,
        category: category || 'General',
        status: status || 'Draft'
      },
      message: 'Email template created successfully'
    });
  } catch (error: any) {
    console.error('Error creating email template:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create email template' 
      },
      { status: 500 }
    );
  }
}

// PUT - Update email template
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, subject, body: emailBody, category, status } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    let sql = 'UPDATE email_templates SET ';
    const params: any[] = [];
    const updates: string[] = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (subject) {
      updates.push('subject = ?');
      params.push(subject);
    }
    if (emailBody !== undefined) {
      updates.push('body = ?');
      params.push(emailBody);
    }
    if (category) {
      updates.push('category = ?');
      params.push(category);
    }
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push('updated_at = NOW()');
    sql += updates.join(', ') + ' WHERE id = ?';
    params.push(id);

    await query(sql, params);

    return NextResponse.json({
      success: true,
      message: 'Email template updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating email template:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update email template' },
      { status: 500 }
    );
  }
}

// DELETE - Delete email template
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    await query('DELETE FROM email_templates WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Email template deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting email template:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete email template' },
      { status: 500 }
    );
  }
}
