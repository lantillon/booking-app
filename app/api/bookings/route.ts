import { NextRequest, NextResponse } from 'next/server';
import { getBookings, addBooking, getService, getAddOns, createOrUpdateCustomer, getCustomerByEmail, applyDiscount } from '@/lib/data';
import { Booking } from '@/types';
import { formatTimeToAMPM, formatDuration } from '@/lib/utils';
import * as nodemailer from 'nodemailer';

export async function GET() {
  const bookings = await getBookings();
  return NextResponse.json(bookings);
}

export async function POST(request: NextRequest) {
  try {
    const bookingData = await request.json();
    
    // Validate booking is at least 24 hours in advance
    const bookingDateTime = new Date(`${bookingData.date}T${bookingData.time}`);
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    if (bookingDateTime < minBookingTime) {
      return NextResponse.json(
        { error: 'Bookings must be made at least 24 hours in advance' },
        { status: 400 }
      );
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

  // Get SMTP configuration (shared for both customer and admin emails)
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.FROM_EMAIL || smtpUser;

  // Send email confirmation
  if (bookingData.customerEmail) {
    try {

      if (smtpHost && smtpPort && smtpUser && smtpPass) {
        const dateObj = new Date(bookingData.date);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        // Create transporter with better Gmail compatibility
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort),
          secure: smtpPort === '465', // true for 465, false for other ports
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: {
            // Do not fail on invalid certs
            rejectUnauthorized: false,
          },
          // Additional options for better compatibility
          requireTLS: smtpPort === '587',
        });

        // Verify connection before sending
        try {
          await transporter.verify();
          console.log('SMTP connection verified successfully');
        } catch (verifyError: any) {
          console.error('SMTP verification failed:', verifyError);
          throw new Error(`SMTP connection failed: ${verifyError.message}`);
        }

        // Email content
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

        // Send email
        const info = await transporter.sendMail({
          from: `"Detail Labs" <${fromEmail}>`,
          to: bookingData.customerEmail,
          subject: `Booking Confirmation - ${service.name}`,
          text: emailText,
          html: emailHtml,
        });

        console.log('Email sent successfully! Message ID:', info.messageId);
      } else {
        console.warn('Email not configured. Email confirmation skipped.');
        console.warn('Missing:', {
          smtpHost: !smtpHost,
          smtpPort: !smtpPort,
          smtpUser: !smtpUser,
          smtpPass: !smtpPass,
        });
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
      });
      // Continue even if email fails
    }
  } else {
    console.log('No email provided, skipping email confirmation');
  }

  // Send admin notification email
  const adminEmail = process.env.ADMIN_EMAIL || process.env.NOTIFICATION_EMAIL;
  if (adminEmail && smtpHost && smtpPort && smtpUser && smtpPass) {
    try {
      const dateObj = new Date(bookingData.date);
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Create transporter (reuse the same one)
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpPort === '465',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          // Do not fail on invalid certs
          rejectUnauthorized: false,
        },
        // Additional options for better compatibility
        requireTLS: smtpPort === '587',
      });

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

      // Send admin notification email
      await transporter.sendMail({
        from: `"Detail Labs" <${fromEmail}>`,
        to: adminEmail,
        subject: `New Booking: ${service.name} - ${bookingData.customerName}`,
        text: adminEmailText,
        html: adminEmailHtml,
      });

      console.log('Admin notification email sent successfully!');
    } catch (error: any) {
      console.error('Error sending admin notification email:', error);
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

