import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

interface SMSResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

// Send SMS via internal API
export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  try {
    // Use absolute URL for server-side calls
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message }),
    });
    return await response.json();
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return { success: false, error: error.message };
  }
}

// Generate AI-powered personalized message
export async function generateAIMessage(
  type: 'confirmation' | 'reminder_24h' | 'reminder_1h' | 'followup' | 'reengagement',
  context: {
    customerName: string;
    serviceName?: string;
    date?: string;
    time?: string;
    daysSinceLastBooking?: number;
    totalBookings?: number;
  }
): Promise<string> {
  // Fallback messages if AI is not available
  const fallbackMessages: Record<string, string> = {
    confirmation: `Hi ${context.customerName}! Your ${context.serviceName} appointment is confirmed for ${context.date} at ${context.time}. We'll see you then! - Detail Labs`,
    reminder_24h: `Hi ${context.customerName}! Reminder: Your ${context.serviceName} appointment is tomorrow at ${context.time}. See you soon! - Detail Labs`,
    reminder_1h: `Hi ${context.customerName}! Your ${context.serviceName} appointment starts in 1 hour. We're ready for you! - Detail Labs`,
    followup: `Hi ${context.customerName}! Thank you for choosing Detail Labs! We hope your vehicle looks amazing. Book your next appointment anytime at our website!`,
    reengagement: `Hi ${context.customerName}! We miss you at Detail Labs! It's been a while since your last visit. Book today and keep your ride looking fresh!`,
  };

  if (!anthropic) {
    return fallbackMessages[type] || fallbackMessages.confirmation;
  }

  const prompts: Record<string, string> = {
    confirmation: `Write a brief, friendly SMS confirmation for a car detailing appointment. Customer: ${context.customerName}, Service: ${context.serviceName}, Date: ${context.date}, Time: ${context.time}. Keep it under 160 characters. Be professional but warm. Sign off as "Detail Labs".`,

    reminder_24h: `Write a brief, friendly SMS reminder for a car detailing appointment happening tomorrow. Customer: ${context.customerName}, Service: ${context.serviceName}, Time: ${context.time}. Keep it under 160 characters. Be helpful and excited. Sign off as "Detail Labs".`,

    reminder_1h: `Write a very brief SMS reminder that an appointment starts in 1 hour. Customer: ${context.customerName}, Service: ${context.serviceName}. Keep it under 120 characters. Be energetic. Sign off as "Detail Labs".`,

    followup: `Write a brief thank-you SMS sent after a car detailing service. Customer: ${context.customerName}. Ask them to book again and maybe leave a review. Keep it under 160 characters. Be grateful and friendly. Sign off as "Detail Labs".`,

    reengagement: `Write a brief, friendly SMS to re-engage a past customer who hasn't booked in ${context.daysSinceLastBooking} days. Customer: ${context.customerName}, they've had ${context.totalBookings} bookings with us before. Encourage them to book again with a personal touch. Keep it under 160 characters. Sign off as "Detail Labs".`,
  };

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: prompts[type] || prompts.confirmation,
        },
      ],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (textContent && textContent.type === 'text') {
      return textContent.text.trim();
    }
    return fallbackMessages[type];
  } catch (error) {
    console.error('Error generating AI message:', error);
    return fallbackMessages[type];
  }
}

// Send booking confirmation SMS
export async function sendBookingConfirmation(
  phone: string,
  customerName: string,
  serviceName: string,
  date: string,
  time: string
): Promise<SMSResult> {
  const message = await generateAIMessage('confirmation', {
    customerName,
    serviceName,
    date,
    time,
  });
  return sendSMS(phone, message);
}

// Format time to readable format
function formatTimeToAMPM(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

// Format date to readable format
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
