import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const image = formData.get('image') as File | null;

    if (!title || !description) {
      return NextResponse.json(
        { success: false, message: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Prepare email options
    const mailOptions: any = {
      from: process.env.SMTP_USER || 'noreply@ghidas.com',
      to: 'it@ghidas.com',
      subject: `🆘 Support Request: ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🆘 New Support Request</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">📋 Issue Title</h2>
              <p style="color: #4b5563; font-size: 16px; margin: 10px 0;">${title}</p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">📝 Description</h2>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${description}</p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">ℹ️ Additional Information</h2>
              <p style="color: #6b7280; font-size: 13px; margin: 5px 0;">
                <strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { 
                  timeZone: 'Asia/Riyadh',
                  dateStyle: 'full',
                  timeStyle: 'long'
                })}<br/>
                <strong>System:</strong> QMS Dashboard v2.0<br/>
                ${image ? '<strong>Attachment:</strong> Screenshot attached' : '<strong>Attachment:</strong> None'}
              </p>
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
              <p style="color: #92400e; font-size: 13px; margin: 0;">
                <strong>⚠️ Note:</strong> Please respond to this support request as soon as possible.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
Support Request

Title: ${title}

Description:
${description}

Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' })}
System: QMS Dashboard v2.0
${image ? 'Attachment: Screenshot attached' : 'Attachment: None'}
      `,
    };

    // Handle image attachment
    if (image) {
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Save temporarily (optional - for debugging)
      const fileName = `support-${Date.now()}-${image.name}`;
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'support');
      
      try {
        const filePath = path.join(uploadsDir, fileName);
        await writeFile(filePath, buffer);
        console.log(`✅ Image saved: ${filePath}`);
      } catch (err) {
        console.warn('⚠️ Could not save image locally:', err);
      }

      // Attach to email
      mailOptions.attachments = [
        {
          filename: image.name,
          content: buffer,
          contentType: image.type,
        },
      ];
    }

    // Send email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: 'Support request sent successfully to it@ghidas.com',
    });

  } catch (error: any) {
    console.error('❌ Support email error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to send support request', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}
