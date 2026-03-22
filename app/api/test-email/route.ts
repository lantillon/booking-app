import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    // Get Resend configuration
    const resendApiKey = process.env.RESEND_API_KEY;
    // Use Resend's default domain if FROM_EMAIL is Gmail (Gmail domain not allowed by Resend)
    const fromEmailEnv = process.env.FROM_EMAIL || '';
    const fromEmail = fromEmailEnv.includes('@gmail.com') ? 'onboarding@resend.dev' : (fromEmailEnv || 'onboarding@resend.dev');
    const { testEmail } = await request.json();

    // Check if API key is present
    if (!resendApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Resend configuration incomplete',
        missing: {
          RESEND_API_KEY: !resendApiKey,
        },
      }, { status: 400 });
    }

    // Initialize Resend
    const resend = new Resend(resendApiKey);

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

      const { data, error } = await resend.emails.send({
        from: `Detail Labs <${fromEmail}>`,
        to: testEmail,
        subject: 'Test Email - Booking Site',
        html: testEmailHtml,
        text: 'This is a test email from your booking site. If you received this, your email configuration is working correctly!',
      });

      if (error) {
        return NextResponse.json({
          success: false,
          error: 'Failed to send test email',
          message: error.message,
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully!',
        messageId: data?.id,
        config: {
          fromEmail: fromEmail,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Resend configuration is valid',
      config: {
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
