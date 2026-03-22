import { NextRequest, NextResponse } from 'next/server';
import { getBookings, addBooking, getService, getAddOns, createOrUpdateCustomer, getCustomerByEmail, applyDiscount } from '@/lib/data';
import { Booking } from '@/types';
import { formatTimeToAMPM, formatDuration } from '@/lib/utils';
import { Resend } from 'resend';

export async function GET() {
  const bookings = await getBookings();
  return NextResponse.json(bookings);
}

export async function POST(request: NextRequest) {
  try {
    const bookingData = await request.json();
    
    // Validate booking is at least 24 hours in advance (unless it's an emergency booking)
    const isEmergency = bookingData.isEmergency === true;
    if (!isEmergency) {
      const bookingDateTime = new Date(`${bookingData.date}T${bookingData.time}`);
      const now = new Date();
      const minBookingTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
      
      if (bookingDateTime < minBookingTime) {
        return NextResponse.json(
          { error: 'Bookings must be made at least 24 hours in advance' },
          { status: 400 }
        );
      }
    }
    
    // Calculate total price and duration
    const service = await getService(bookingData.serviceId);
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

  const addOns = (await getAddOns()).filter((a) => bookingData.addOnIds.includes(a.id));
  const addOnNames = addOns.map((a) => a.name);
  
  let totalDuration = service.duration;
  // Use vehicle pricing if enabled and vehicle size is provided
  let totalPrice = service.price;
  if (service.useVehiclePricing && service.vehiclePricing && bookingData.vehicleSize) {
    const vehiclePrice = service.vehiclePricing[bookingData.vehicleSize as keyof typeof service.vehiclePricing];
    if (vehiclePrice !== undefined) {
      totalPrice = vehiclePrice;
    }
  }

  addOns.forEach((addOn) => {
    totalPrice += addOn.price;
    if (addOn.duration) {
      totalDuration += addOn.duration;
    }
  });

  // Apply discount if provided
  let finalPrice = totalPrice;
  let discountApplied = 0;
  if (bookingData.discountAmount && bookingData.discountAmount > 0) {
    discountApplied = bookingData.discountAmount;
    finalPrice = Math.max(0, totalPrice - discountApplied);
    
    // Deduct points for discount (200 points = $10)
    const customer = await getCustomerByEmail(bookingData.customerEmail);
    if (customer) {
      await applyDiscount(customer.id, discountApplied);
    }
  }

  const booking: Booking = {
    id: Date.now().toString(),
    customerName: bookingData.customerName,
    customerEmail: bookingData.customerEmail,
    customerPhone: bookingData.customerPhone || '',
    location: bookingData.location || '',
    serviceId: service.id,
    serviceName: service.name,
    addOnIds: bookingData.addOnIds,
    addOnNames,
    date: bookingData.date,
    time: bookingData.time,
    duration: totalDuration,
    totalPrice: finalPrice,
    vehicleSize: bookingData.vehicleSize || undefined,
    createdAt: new Date().toISOString(),
  };

    // Save booking (writes may fail in serverless but function won't throw)
    await addBooking(booking);

    // Update customer loyalty points - award points based on scheduled booking amount (before discount)
    // 1 point per dollar of the booking value (not the final price paid)
    try {
      await createOrUpdateCustomer({
        name: bookingData.customerName,
        email: bookingData.customerEmail,
        phone: bookingData.customerPhone,
        amountSpent: totalPrice, // Use totalPrice (before discount) for points calculation
      });
    } catch (error: any) {
      console.error('Error updating customer:', error);
      // Continue even if customer update fails - booking is already saved
    }

  // Get Resend configuration
  const resendApiKey = process.env.RESEND_API_KEY;
  // Use Resend's default domain if FROM_EMAIL is Gmail (Gmail domain not allowed by Resend)
  const fromEmailEnv = process.env.FROM_EMAIL || '';
  const fromEmail = fromEmailEnv.includes('@gmail.com') ? 'onboarding@resend.dev' : (fromEmailEnv || 'onboarding@resend.dev');

  // Debug: Log Resend config status
  console.log('Resend Configuration Check:', {
    hasApiKey: !!resendApiKey,
    fromEmail: fromEmail,
    customerEmail: bookingData.customerEmail,
  });

  // Send email confirmation
  if (bookingData.customerEmail) {
    try {

      if (resendApiKey) {
        const dateObj = new Date(bookingData.date);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        // Initialize Resend
        const resend = new Resend(resendApiKey);

        // Email content (keeping exact same format)
        const addOnsList = addOnNames.length > 0 
          ? `\n\nAdd-ons: ${addOnNames.join(', ')}`
          : '';

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Booking Confirmation</h2>
            <p>Hi ${bookingData.customerName},</p>
            <p>Your booking has been confirmed!</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Service:</strong> ${service.name}</p>
              ${addOnsList ? `<p><strong>Add-ons:</strong> ${addOnNames.join(', ')}</p>` : ''}
              <p><strong>Date:</strong> ${formattedDate}</p>
              <p><strong>Time:</strong> ${formatTimeToAMPM(bookingData.time)}</p>
              <p><strong>Duration:</strong> ${formatDuration(totalDuration)}</p>
              <p><strong>Location:</strong> ${bookingData.location || 'Your location'}</p>
              <p><strong>Total:</strong> $${totalPrice.toFixed(2)}</p>
            </div>
            <p>We look forward to seeing you!</p>
            <p>Best regards,<br>Detail Labs</p>
          </div>
        `;

        const emailText = `
Booking Confirmation

Hi ${bookingData.customerName},

Your booking has been confirmed!

Service: ${service.name}
${addOnsList}
Date: ${formattedDate}
Time: ${formatTimeToAMPM(bookingData.time)}
Duration: ${formatDuration(totalDuration)}
Location: ${bookingData.location || 'Your location'}
Total: $${totalPrice.toFixed(2)}

We look forward to seeing you!

Best regards,
Detail Labs
        `;

        // Send email using Resend
        const { data, error } = await resend.emails.send({
          from: `Detail Labs <${fromEmail}>`,
          to: bookingData.customerEmail,
          subject: `Booking Confirmation - ${service.name}`,
          text: emailText,
          html: emailHtml,
        });

        if (error) {
          console.error('Resend error:', error);
          throw new Error(`Email sending failed: ${error.message}`);
        }

        console.log('Email sent successfully! Message ID:', data?.id);
        console.log('Email sent to:', bookingData.customerEmail);
      } else {
        console.error('Email not configured. Email confirmation skipped.');
        console.error('Missing RESEND_API_KEY environment variable');
      }
    } catch (error: any) {
      console.error('ERROR sending customer confirmation email:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response,
        command: error.command,
      });
      // Continue even if email fails - don't block booking creation
    }
  } else {
    console.log('No email provided, skipping email confirmation');
  }

  // Send admin notification email
  const adminEmail = process.env.ADMIN_EMAIL || process.env.NOTIFICATION_EMAIL;
  if (adminEmail && resendApiKey) {
    try {
      const dateObj = new Date(bookingData.date);
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Initialize Resend
      const resend = new Resend(resendApiKey);

      // Admin email content
      const addOnsList = addOnNames.length > 0 
        ? `\n\nAdd-ons: ${addOnNames.join(', ')}`
        : '';
      
      const vehicleInfo = booking.vehicleSize 
        ? `\nVehicle Size: ${booking.vehicleSize.charAt(0).toUpperCase() + booking.vehicleSize.slice(1).replace(/([A-Z])/g, ' $1')}`
        : '';

      const adminEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Booking Received</h2>
          <p>You have a new booking!</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Customer Name:</strong> ${bookingData.customerName}</p>
            <p><strong>Customer Email:</strong> ${bookingData.customerEmail}</p>
            ${bookingData.customerPhone ? `<p><strong>Customer Phone:</strong> ${bookingData.customerPhone}</p>` : ''}
            <p><strong>Service:</strong> ${service.name}</p>
            ${addOnNames.length > 0 ? `<p><strong>Add-ons:</strong> ${addOnNames.join(', ')}</p>` : ''}
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formatTimeToAMPM(bookingData.time)}</p>
            <p><strong>Duration:</strong> ${formatDuration(totalDuration)}</p>
            <p><strong>Location:</strong> ${bookingData.location || 'Customer location'}</p>
            ${vehicleInfo ? `<p><strong>${vehicleInfo.split(':')[0]}:</strong> ${vehicleInfo.split(':')[1].trim()}</p>` : ''}
            <p><strong>Total Price:</strong> $${totalPrice.toFixed(2)}</p>
            ${discountApplied > 0 ? `<p><strong>Discount Applied:</strong> -$${discountApplied.toFixed(2)}</p>` : ''}
            <p><strong>Final Price:</strong> $${finalPrice.toFixed(2)}</p>
            <p><strong>Booking ID:</strong> ${booking.id}</p>
          </div>
        </div>
      `;

      const adminEmailText = `
New Booking Received

You have a new booking!

Customer Name: ${bookingData.customerName}
Customer Email: ${bookingData.customerEmail}
${bookingData.customerPhone ? `Customer Phone: ${bookingData.customerPhone}\n` : ''}
Service: ${service.name}
${addOnsList}
Date: ${formattedDate}
Time: ${formatTimeToAMPM(bookingData.time)}
Duration: ${formatDuration(totalDuration)}
Location: ${bookingData.location || 'Customer location'}
${vehicleInfo}
Total Price: $${totalPrice.toFixed(2)}
${discountApplied > 0 ? `Discount Applied: -$${discountApplied.toFixed(2)}\n` : ''}Final Price: $${finalPrice.toFixed(2)}
Booking ID: ${booking.id}
      `;

      // Send admin notification email using Resend
      const { data, error } = await resend.emails.send({
        from: `Detail Labs <${fromEmail}>`,
        to: adminEmail,
        subject: `New Booking: ${service.name} - ${bookingData.customerName}`,
        text: adminEmailText,
        html: adminEmailHtml,
      });

      if (error) {
        console.error('Resend admin email error:', error);
        throw new Error(`Admin email sending failed: ${error.message}`);
      }

      console.log('Admin notification email sent successfully! Message ID:', data?.id);
      console.log('Admin email sent to:', adminEmail);
    } catch (error: any) {
      console.error('ERROR sending admin notification email:', error);
      console.error('Admin email error details:', {
        message: error.message,
        code: error.code,
        response: error.response,
      });
      // Continue even if admin email fails - booking is already saved
    }
  }

    return NextResponse.json(booking, { status: 201 });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create booking. Please try again.' },
      { status: 500 }
    );
  }
}

