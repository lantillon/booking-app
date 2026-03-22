import { NextRequest, NextResponse } from 'next/server';
import { getBooking, getService, getAddOns } from '@/lib/data';
import { formatTimeToAMPM, formatDuration } from '@/lib/utils';
import { Resend } from 'resend';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const booking = await getBooking(params.id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Get service and add-ons details
    const service = await getService(booking.serviceId);
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const allAddOns = await getAddOns();
    const addOns = allAddOns.filter((a) => booking.addOnIds.includes(a.id));
    const addOnNames = addOns.map((a) => a.name);

    // Calculate total duration
    let totalDuration = service.duration;
    addOns.forEach((addOn) => {
      totalDuration += addOn.duration || 0;
    });

    // Get Resend configuration
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmailEnv = process.env.FROM_EMAIL || '';
    const fromEmail = fromEmailEnv.includes('@gmail.com') ? 'onboarding@resend.dev' : (fromEmailEnv || 'onboarding@resend.dev');

    if (!resendApiKey) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    if (!booking.customerEmail) {
      return NextResponse.json({ error: 'Customer email not found' }, { status: 400 });
    }

    // Format date
    const dateObj = new Date(booking.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Initialize Resend
    const resend = new Resend(resendApiKey);

    // Email content (same format as booking confirmation)
    const addOnsList = addOnNames.length > 0 
      ? `\n\nAdd-ons: ${addOnNames.join(', ')}`
      : '';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Booking Confirmation</h2>
        <p>Hi ${booking.customerName},</p>
        <p>Your booking has been confirmed!</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Service:</strong> ${service.name}</p>
          ${addOnsList ? `<p><strong>Add-ons:</strong> ${addOnNames.join(', ')}</p>` : ''}
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formatTimeToAMPM(booking.time)}</p>
          <p><strong>Duration:</strong> ${formatDuration(totalDuration)}</p>
          <p><strong>Location:</strong> ${booking.location || 'Your location'}</p>
          <p><strong>Total:</strong> $${booking.totalPrice.toFixed(2)}</p>
        </div>
        <p>We look forward to seeing you!</p>
        <p>Best regards,<br>Detail Labs</p>
      </div>
    `;

    const emailText = `
Booking Confirmation

Hi ${booking.customerName},

Your booking has been confirmed!

Service: ${service.name}
${addOnsList}
Date: ${formattedDate}
Time: ${formatTimeToAMPM(booking.time)}
Duration: ${formatDuration(totalDuration)}
Location: ${booking.location || 'Your location'}
Total: $${booking.totalPrice.toFixed(2)}

We look forward to seeing you!

Best regards,
Detail Labs
    `;

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: `Detail Labs <${fromEmail}>`,
      to: booking.customerEmail,
      subject: `Booking Confirmation - ${service.name}`,
      text: emailText,
      html: emailHtml,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to send email',
        message: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Confirmation email sent successfully',
      messageId: data?.id 
    });
  } catch (error: any) {
    console.error('Error resending confirmation email:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to resend confirmation email',
      message: error.message 
    }, { status: 500 });
  }
}
