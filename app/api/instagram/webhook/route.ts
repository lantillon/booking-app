import { NextRequest, NextResponse } from 'next/server';
import { getServices, getAddOns, getAvailability, getBookings, getAvailableTimeSlots, addBooking, getService } from '@/lib/data';
import { Booking } from '@/types';
import Anthropic from '@anthropic-ai/sdk';

// In-memory conversation state (for serverless, consider using Redis/Supabase)
const conversationStates = new Map<string, ConversationState>();

interface ConversationState {
  step: string;
  serviceId?: string;
  serviceName?: string;
  servicePrice?: number;
  serviceDuration?: number;
  vehicleSize?: string;
  addOnIds?: string[];
  addOnNames?: string[];
  addOnPrices?: number[];
  selectedDate?: string;
  selectedTime?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  location?: string;
  history: { role: string; content: string }[];
  lastActivity: number;
}

const defaultState = (): ConversationState => ({
  step: 'greeting',
  history: [],
  lastActivity: Date.now(),
});

// Webhook verification (GET)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN || 'classy_detail_verify_2026';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified!');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// Handle incoming messages (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Instagram webhook received:', JSON.stringify(body, null, 2));

    // Verify it's an Instagram event
    if (body.object !== 'instagram') {
      return NextResponse.json({ status: 'ignored' });
    }

    // Process each entry
    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        if (event.message?.text) {
          await handleMessage(event.sender.id, event.message.text);
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function handleMessage(senderId: string, messageText: string) {
  try {
    // Get or create conversation state
    let state = conversationStates.get(senderId) || defaultState();

    // Clear old conversations (30 min timeout)
    if (Date.now() - state.lastActivity > 30 * 60 * 1000) {
      state = defaultState();
    }
    state.lastActivity = Date.now();

    // Add user message to history
    state.history.push({ role: 'user', content: messageText });
    if (state.history.length > 20) {
      state.history = state.history.slice(-20);
    }

    // Get all data from your database
    const [services, addons, availability, bookings] = await Promise.all([
      getServices(),
      getAddOns(),
      getAvailability(),
      getBookings(),
    ]);

    // Build context for AI
    const response = await generateAIResponse(state, messageText, services, addons, availability, bookings);

    // Update state with AI response
    if (response.extracted) {
      const ext = response.extracted;
      if (ext.serviceId) state.serviceId = ext.serviceId;
      if (ext.serviceName) state.serviceName = ext.serviceName;
      if (ext.servicePrice) state.servicePrice = ext.servicePrice;
      if (ext.serviceDuration) state.serviceDuration = ext.serviceDuration;
      if (ext.vehicleSize) state.vehicleSize = ext.vehicleSize;
      if (ext.addOnIds?.length) state.addOnIds = ext.addOnIds;
      if (ext.addOnNames?.length) state.addOnNames = ext.addOnNames;
      if (ext.addOnPrices?.length) state.addOnPrices = ext.addOnPrices;
      if (ext.date) state.selectedDate = ext.date;
      if (ext.time) state.selectedTime = ext.time;
      if (ext.name) state.customerName = ext.name;
      if (ext.phone) state.customerPhone = ext.phone;
      if (ext.email) state.customerEmail = ext.email;
      if (ext.location) state.location = ext.location;
    }

    state.history.push({ role: 'assistant', content: response.reply });

    // Handle booking action
    if (response.action === 'book') {
      const bookingResult = await createBookingFromState(state);
      if (bookingResult.success) {
        await sendInstagramMessage(senderId, response.reply);
        state = defaultState(); // Reset after successful booking
      } else {
        await sendInstagramMessage(senderId, `Sorry, there was an issue: ${bookingResult.error}. Would you like to try again?`);
      }
    } else {
      await sendInstagramMessage(senderId, response.reply);
    }

    // Save state
    conversationStates.set(senderId, state);

  } catch (error) {
    console.error('Error handling message:', error);
    await sendInstagramMessage(senderId, "Sorry, I'm having technical difficulties. Please try again in a moment or say 'agent' to speak with someone.");
  }
}

async function generateAIResponse(
  state: ConversationState,
  userMessage: string,
  services: any[],
  addons: any[],
  availability: any,
  bookings: any[]
) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return { reply: "I'm not fully configured yet. Please contact us directly!", action: 'continue', extracted: {} };
  }

  const client = new Anthropic({ apiKey: anthropicKey });

  // Build service list with accurate pricing
  const serviceList = services.map((s, i) => {
    let pricing = `$${s.price}`;
    if (s.useVehiclePricing && s.vehiclePricing) {
      const vp = s.vehiclePricing;
      pricing = `Sedan $${vp.sedan || s.price}, SUV $${vp.suv || s.price}, Truck $${vp.truck || s.price}`;
      if (vp.largeSuv) pricing += `, Large SUV $${vp.largeSuv}`;
      if (vp.largeTruck) pricing += `, Large Truck $${vp.largeTruck}`;
    }
    return `• ${s.name} (ID: ${s.id})\n  Price: ${pricing}\n  Duration: ${s.duration} min\n  ${s.description || ''}`;
  }).join('\n\n');

  // Build addon list
  const addonList = addons.map(a =>
    `• ${a.name} (ID: ${a.id}) - $${a.price}${a.duration ? ` (+${a.duration} min)` : ''}\n  ${a.description || ''}`
  ).join('\n');

  // Build working hours
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const workingHoursText = days.map(d => {
    const day = availability.workingHours?.[d];
    if (day?.enabled) return `${d.slice(0,3).toUpperCase()}: ${day.start}-${day.end}`;
    return `${d.slice(0,3).toUpperCase()}: CLOSED`;
  }).join(', ');

  // Get booked slots (next 14 days)
  const today = new Date();
  const bookedSlots = bookings
    .filter(b => new Date(b.date) >= today)
    .map(b => `${b.date} at ${b.time}`)
    .slice(0, 15);

  // Current booking progress
  let bookingProgress = '';
  if (state.serviceName) bookingProgress += `✓ Service: ${state.serviceName} - $${state.servicePrice}\n`;
  if (state.vehicleSize) bookingProgress += `✓ Vehicle: ${state.vehicleSize}\n`;
  if (state.addOnNames?.length) {
    const addOnTotal = state.addOnPrices?.reduce((a, b) => a + b, 0) || 0;
    bookingProgress += `✓ Add-ons: ${state.addOnNames.join(', ')} (+$${addOnTotal})\n`;
  }
  if (state.selectedDate) bookingProgress += `✓ Date: ${state.selectedDate}\n`;
  if (state.selectedTime) bookingProgress += `✓ Time: ${state.selectedTime}\n`;
  if (state.customerName) bookingProgress += `✓ Name: ${state.customerName}\n`;
  if (state.customerPhone) bookingProgress += `✓ Phone: ${state.customerPhone}\n`;
  if (state.customerEmail) bookingProgress += `✓ Email: ${state.customerEmail}\n`;
  if (state.location) bookingProgress += `✓ Location: ${state.location}\n`;

  // Calculate total
  let total = state.servicePrice || 0;
  if (state.addOnPrices?.length) total += state.addOnPrices.reduce((a, b) => a + b, 0);

  const systemPrompt = `You are the booking assistant for Classy Detail, a premium mobile car detailing business. Help customers book appointments via Instagram DM.

## YOUR PERSONALITY
- Friendly, professional, helpful
- Concise responses (under 150 words)
- Use emojis naturally but sparingly
- Mobile detailing = we come to the customer's location

## SERVICES (USE EXACT IDs AND PRICES)
${serviceList || 'No services available'}

## ADD-ONS (OPTIONAL EXTRAS)
${addonList || 'No add-ons'}

## BUSINESS HOURS
${workingHoursText}

## ALREADY BOOKED (AVOID THESE)
${bookedSlots.length ? bookedSlots.join('\n') : 'No upcoming bookings'}

## CURRENT BOOKING PROGRESS
${bookingProgress || 'Just started'}
ESTIMATED TOTAL: $${total}

## INFORMATION TO COLLECT (in order)
1. Service (MUST use exact service ID from list above)
2. Vehicle size (if service has vehicle pricing): sedan, suv, truck, largeSuv, largeTruck
3. Add-ons (optional - customer can decline)
4. Date (YYYY-MM-DD format, must be open day)
5. Time (HH:MM 24hr format, within business hours)
6. Customer name
7. Phone number
8. Email address
9. Service location/address
10. Confirm and book

## CRITICAL RULES
- ONLY use service IDs, names, and prices from the list above
- For vehicle pricing, ask vehicle type BEFORE quoting final price
- Check business hours before confirming dates
- Avoid already booked time slots
- Bookings must be 24+ hours in advance
- When ALL info collected, show summary and ask for confirmation
- If customer says "agent" or wants human help, set action to "escalate"

## RESPOND WITH JSON ONLY
{
  "reply": "Your message to customer",
  "extracted": {
    "serviceId": "exact service ID or null",
    "serviceName": "service name or null",
    "servicePrice": number or null,
    "serviceDuration": number or null,
    "vehicleSize": "sedan|suv|truck|largeSuv|largeTruck or null",
    "addOnIds": ["addon IDs"] or [],
    "addOnNames": ["addon names"] or [],
    "addOnPrices": [prices] or [],
    "date": "YYYY-MM-DD or null",
    "time": "HH:MM or null",
    "name": "customer name or null",
    "phone": "phone or null",
    "email": "email or null",
    "location": "address or null"
  },
  "action": "continue|book|escalate"
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('AI error:', error);
  }

  return {
    reply: "I'd be happy to help you book a detailing appointment! What service are you interested in?",
    action: 'continue',
    extracted: {}
  };
}

async function createBookingFromState(state: ConversationState): Promise<{ success: boolean; error?: string; bookingId?: string }> {
  try {
    if (!state.serviceId || !state.selectedDate || !state.selectedTime ||
        !state.customerName || !state.customerEmail || !state.location) {
      return { success: false, error: 'Missing required information' };
    }

    // Get service to calculate proper pricing
    const service = await getService(state.serviceId);
    if (!service) {
      return { success: false, error: 'Service not found' };
    }

    // Calculate price based on vehicle size if applicable
    let servicePrice = service.price;
    if (service.useVehiclePricing && service.vehiclePricing && state.vehicleSize) {
      const vp = service.vehiclePricing as Record<string, number>;
      servicePrice = vp[state.vehicleSize] || service.price;
    }

    // Calculate total with add-ons
    const addOnTotal = state.addOnPrices?.reduce((a, b) => a + b, 0) || 0;
    const totalPrice = servicePrice + addOnTotal;

    // Calculate duration
    const addOnDuration = state.addOnIds?.length ?
      (await getAddOns()).filter(a => state.addOnIds?.includes(a.id)).reduce((acc, a) => acc + (a.duration || 0), 0) : 0;
    const totalDuration = service.duration + addOnDuration;

    const booking: Booking = {
      id: Date.now().toString(),
      customerName: state.customerName,
      customerEmail: state.customerEmail,
      customerPhone: state.customerPhone || '',
      location: state.location,
      serviceId: state.serviceId,
      serviceName: state.serviceName || service.name,
      addOnIds: state.addOnIds || [],
      addOnNames: state.addOnNames || [],
      date: state.selectedDate,
      time: state.selectedTime,
      duration: totalDuration,
      totalPrice: totalPrice,
      vehicleSize: state.vehicleSize,
      createdAt: new Date().toISOString(),
    };

    await addBooking(booking);
    return { success: true, bookingId: booking.id };

  } catch (error: any) {
    console.error('Booking creation error:', error);
    return { success: false, error: error.message };
  }
}

async function sendInstagramMessage(recipientId: string, messageText: string) {
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('META_PAGE_ACCESS_TOKEN not configured');
    return;
  }

  try {
    const response = await fetch('https://graph.facebook.com/v18.0/me/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: messageText },
        access_token: accessToken,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('Instagram send error:', result);
    } else {
      console.log('Message sent successfully');
    }
  } catch (error) {
    console.error('Error sending Instagram message:', error);
  }
}
