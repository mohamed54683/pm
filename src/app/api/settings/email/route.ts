import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET - Fetch email settings
export async function GET(request: NextRequest) {
  try {
    const settings = await query('SELECT * FROM email_settings LIMIT 1');
    
    if (Array.isArray(settings) && settings.length > 0) {
      return NextResponse.json({
        success: true,
        data: settings[0],
        message: 'Email settings fetched successfully'
      });
    }

    // Return default settings if none exist
    return NextResponse.json({
      success: true,
      data: {
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        smtp_username: '',
        smtp_password: '',
        from_email: '',
        from_name: 'GHIDAS',
        use_ssl: true,
        is_active: false
      },
      message: 'Using default email settings'
    });
  } catch (error: any) {
    console.error('Error fetching email settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch email settings' 
      },
      { status: 500 }
    );
  }
}

// POST - Create or update email settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      smtp_host, 
      smtp_port, 
      smtp_username, 
      smtp_password,
      from_email,
      from_name,
      use_ssl
    } = body;

    // Validation
    if (!smtp_host || !smtp_port || !from_email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'SMTP host, port, and from email are required' 
        },
        { status: 400 }
      );
    }

    // Check if settings exist
    const existingSettings = await query('SELECT id FROM email_settings LIMIT 1');

    if (Array.isArray(existingSettings) && existingSettings.length > 0) {
      // Update existing settings
      await query(
        `UPDATE email_settings 
         SET smtp_host = ?, smtp_port = ?, smtp_username = ?, 
             smtp_password = ?, from_email = ?, from_name = ?, 
             use_ssl = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          smtp_host, 
          smtp_port, 
          smtp_username || '', 
          smtp_password || '',
          from_email,
          from_name || 'GHIDAS',
          use_ssl ? 1 : 0,
          (existingSettings[0] as any).id
        ]
      );

      return NextResponse.json({
        success: true,
        message: 'Email settings updated successfully'
      });
    } else {
      // Create new settings
      await query(
        `INSERT INTO email_settings 
         (smtp_host, smtp_port, smtp_username, smtp_password, 
          from_email, from_name, use_ssl, is_active, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [
          smtp_host, 
          smtp_port, 
          smtp_username || '', 
          smtp_password || '',
          from_email,
          from_name || 'GHIDAS',
          use_ssl ? 1 : 0
        ]
      );

      return NextResponse.json({
        success: true,
        message: 'Email settings created successfully'
      });
    }
  } catch (error: any) {
    console.error('Error saving email settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to save email settings' 
      },
      { status: 500 }
    );
  }
}

// PUT - Test email connection
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { test } = body;

    if (test !== true) {
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Get email settings
    const settings = await query('SELECT * FROM email_settings WHERE is_active = 1 LIMIT 1');
    
    if (!Array.isArray(settings) || settings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No email settings configured' },
        { status: 400 }
      );
    }

    const config = settings[0] as any;

    // Simple test - just validate settings exist
    // In production, you would actually send a test email
    if (config.smtp_host && config.smtp_port && config.from_email) {
      return NextResponse.json({
        success: true,
        message: 'Email settings validated successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Incomplete email configuration' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error testing email connection:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to test connection' },
      { status: 500 }
    );
  }
}
