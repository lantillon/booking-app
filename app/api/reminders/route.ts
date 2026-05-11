import { NextRequest, NextResponse } from 'next/server';
import { getBookings, getCustomers } from '@/lib/data';
import { sendSMS, generateAIMessage } from '@/lib/sms';
import { formatTimeToAMPM } from '@/lib/utils';

// Secret key to protect this endpoint (set in environment)
const CRON_SECRET = process.env.CRON_SECRET || 'default-secret-change-me';

export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = {
      reminders24h: [] as string[],
      reminders1h: [] as string[],
      reengagement: [] as string[],
      errors: [] as string[],
    };

    const now = new Date();
    const bookings = await getBookings();
    const customers = await getCustomers();

    // ============================================
    // 1. Send 24-hour reminders
    // ============================================
    const tomorrow = new Date(now);
    tomorrow.setHours(tomorrow.getHours() + 24);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    const bookings24h = bookings.filter((booking) => {
      if (!booking.customerPhone) return false;
      if (booking.date !== tomorrowDate) return false;

      // Check if the booking time is approximately 24 hours away
      const bookingDateTime = new Date(`${booking.date}T${booking.time}`);
      const hoursUntil = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntil >= 23 && hoursUntil <= 25;
    });

    for (const booking of bookings24h) {
      try {
        const message = await generateAIMessage('reminder_24h', {
          customerName: booking.customerName,
          serviceName: booking.serviceName,
          time: formatTimeToAMPM(booking.time),
        });
        const result = await sendSMS(booking.customerPhone!, message);
        if (result.success) {
          results.reminders24h.push(booking.customerName);
        } else {
          results.errors.push(`24h reminder failed for ${booking.customerName}: ${result.error}`);
        }
      } catch (error: any) {
        results.errors.push(`24h reminder error for ${booking.customerName}: ${error.message}`);
      }
    }

    // ============================================
    // 2. Send 1-hour reminders
    // ============================================
    const oneHourFromNow = new Date(now);
    oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

    const bookings1h = bookings.filter((booking) => {
      if (!booking.customerPhone) return false;

      const bookingDateTime = new Date(`${booking.date}T${booking.time}`);
      const minutesUntil = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60);
      return minutesUntil >= 55 && minutesUntil <= 65;
    });

    for (const booking of bookings1h) {
      try {
        const message = await generateAIMessage('reminder_1h', {
          customerName: booking.customerName,
          serviceName: booking.serviceName,
        });
        const result = await sendSMS(booking.customerPhone!, message);
        if (result.success) {
          results.reminders1h.push(booking.customerName);
        } else {
          results.errors.push(`1h reminder failed for ${booking.customerName}: ${result.error}`);
        }
      } catch (error: any) {
        results.errors.push(`1h reminder error for ${booking.customerName}: ${error.message}`);
      }
    }

    // ============================================
    // 3. Re-engagement campaigns
    // ============================================
    // Find customers who haven't booked in 30+ days
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const customer of customers) {
      if (!customer.phone) continue;

      // Find their most recent booking
      const customerBookings = bookings.filter(
        (b) => b.customerPhone === customer.phone || b.customerEmail === customer.email
      );

      if (customerBookings.length === 0) continue;

      const lastBooking = customerBookings.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];

      const lastBookingDate = new Date(lastBooking.date);
      const daysSinceLastBooking = Math.floor(
        (now.getTime() - lastBookingDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Send re-engagement if 30-45 days since last booking (only once in this window)
      // We check for a specific window to avoid sending multiple times
      if (daysSinceLastBooking >= 30 && daysSinceLastBooking <= 31) {
        try {
          const message = await generateAIMessage('reengagement', {
            customerName: customer.name,
            daysSinceLastBooking,
            totalBookings: customerBookings.length,
          });
          const result = await sendSMS(customer.phone, message);
          if (result.success) {
            results.reengagement.push(customer.name);
          } else {
            results.errors.push(`Re-engagement failed for ${customer.name}: ${result.error}`);
          }
        } catch (error: any) {
          results.errors.push(`Re-engagement error for ${customer.name}: ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results: {
        reminders24hSent: results.reminders24h.length,
        reminders24hCustomers: results.reminders24h,
        reminders1hSent: results.reminders1h.length,
        reminders1hCustomers: results.reminders1h,
        reengagementSent: results.reengagement.length,
        reengagementCustomers: results.reengagement,
        errors: results.errors,
      },
    });
  } catch (error: any) {
    console.error('Error in reminders API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process reminders' },
      { status: 500 }
    );
  }
}

// GET endpoint to check status (for testing)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'Reminders API is active',
    endpoints: {
      POST: 'Trigger reminders (requires Bearer token)',
    },
    config: {
      twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      aiConfigured: !!process.env.ANTHROPIC_API_KEY,
    },
  });
}
