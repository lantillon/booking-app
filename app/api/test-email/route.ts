import { NextRequest, NextResponse } from 'next/server';
import * as nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    // Get SMTP configuration
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;
    const fromEmail = process.env.FROM_EMAIL || smtpUser;
    const { testEmail } = await request.json();

    // Check if all required variables are present
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      return NextResponse.json({
        success: false,
        error: 'SMTP configuration incomplete',
        missing: {
          SMTP_HOST: !smtpHost,
          SMTP_PORT: !smtpPort,
          SMTP_USER: !smtpUser,
          SMTP_PASSWORD: !smtpPass,
        },
      }, { status: 400 });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpPort === '465', // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Verify connection
    try {
      await transporter.verify();
    } catch (verifyError: any) {
      return NextResponse.json({
        success: false,
        error: 'SMTP connection failed',
        message: verifyError.message,
        code: verifyError.code,
      }, { status: 400 });
    }

    // Send test email if email provided
    if (testEmail) {
      const testEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test Email</h2>
          <p>This is a test email from your booking site.</p>
          <p>If you received this, your email configuration is working correctly!</p>
          <p>Time sent: ${new Date().toLocaleString()}</p>
        </div>
      `;

      const info = await transporter.sendMail({
        from: `"Detail Labs" <${fromEmail}>`,
        to: testEmail,
        subject: 'Test Email - Booking Site',
        html: testEmailHtml,
        text: 'This is a test email from your booking site. If you received this, your email configuration is working correctly!',
      });

      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully!',
        messageId: info.messageId,
        config: {
          host: smtpHost,
          port: smtpPort,
          user: smtpUser,
          fromEmail: fromEmail,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'SMTP configuration is valid',
      config: {
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        fromEmail: fromEmail,
      },
    });
  } catch (error: any) {
    console.error('Test email error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send test email',
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}
