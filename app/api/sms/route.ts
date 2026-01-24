import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    const { to, message } = await request.json();

    // Check if Twilio is configured
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.warn('Twilio not configured. SMS sending skipped.');
      return NextResponse.json({ 
        success: false, 
        message: 'SMS service not configured' 
      }, { status: 200 }); // Return 200 so booking still succeeds
    }

    // Initialize Twilio client
    const client = twilio(accountSid, authToken);

    // Format phone number (remove any non-digit characters except +)
    const formattedPhone = to.replace(/\D/g, '').replace(/^1/, ''); // Remove leading 1 for US numbers
    const fullPhoneNumber = formattedPhone.startsWith('+') ? formattedPhone : `+1${formattedPhone}`;

    // Send SMS
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: fullPhoneNumber,
    });

    return NextResponse.json({ 
      success: true, 
      messageSid: result.sid 
    });
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    // Don't fail the booking if SMS fails
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 200 });
  }
}



