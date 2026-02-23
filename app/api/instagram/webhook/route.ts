import { NextRequest, NextResponse } from 'next/server';
import { getServices, getAddOns, getAvailability, getBookings, getAvailableTimeSlots, addBooking, getService } from '@/lib/data';
import { Booking } from '@/types';
import { supabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

// Track processed message IDs to prevent duplicate processing from Instagram retries
const processedMessages = new Set<string>();

// El Paso zip code coordinates (lat, lng)
const ZIP_COORDS: Record<string, { lat: number; lng: number }> = {
  // West side (Mondays only)
  '79835': { lat: 31.8084, lng: -106.5811 }, // Sunland Park
  '79912': { lat: 31.8406, lng: -106.5678 }, // West El Paso
  '79922': { lat: 31.8989, lng: -106.5700 }, // Canutillo area
  '79932': { lat: 31.8639, lng: -106.6228 }, // Westway
  '88063': { lat: 31.8300, lng: -106.6000 }, // Sunland Park NM
  // East/Central (any day)
  '79821': { lat: 31.3275, lng: -105.9367 }, // Anthony
  '79836': { lat: 31.5264, lng: -106.0828 }, // Clint
  '79838': { lat: 31.4869, lng: -106.1697 }, // Fabens
  '79849': { lat: 31.2097, lng: -105.7575 }, // San Elizario
  '79901': { lat: 31.7587, lng: -106.4869 }, // Downtown
  '79902': { lat: 31.7700, lng: -106.5050 }, // Kern Place
  '79903': { lat: 31.7850, lng: -106.4400 }, // Government Hill
  '79904': { lat: 31.8100, lng: -106.4450 }, // Fort Bliss
  '79905': { lat: 31.7550, lng: -106.4350 }, // South Central
  '79906': { lat: 31.8150, lng: -106.4250 }, // Fort Bliss
  '79907': { lat: 31.7000, lng: -106.3550 }, // Ysleta
  '79908': { lat: 31.8450, lng: -106.3800 }, // Fort Bliss
  '79911': { lat: 31.8800, lng: -106.5350 }, // West El Paso
  '79915': { lat: 31.7200, lng: -106.3200 }, // Ysleta
  '79924': { lat: 31.8800, lng: -106.4250 }, // Northeast
  '79925': { lat: 31.7850, lng: -106.3650 }, // East Central
  '79927': { lat: 31.6600, lng: -106.2700 }, // Socorro
  '79928': { lat: 31.6700, lng: -106.1850 }, // Horizon City (HOME BASE)
  '79930': { lat: 31.8150, lng: -106.4650 }, // Central
  '79934': { lat: 31.9150, lng: -106.4050 }, // Northeast
  '79935': { lat: 31.7700, lng: -106.3350 }, // East
  '79936': { lat: 31.7650, lng: -106.3000 }, // East
  '79938': { lat: 31.8000, lng: -106.2300 }, // Far East/Horizon
};

const WEST_SIDE_ZIPS = ['79835', '79912', '79922', '79932', '88063'];
const HOME_ZIP = '79928';
const MAX_MILES_FROM_HOME = 10;
const MAX_MILES_BETWEEN_BOOKINGS = 7;

// Calculate distance between two coordinates in miles (haversine formula)
function getDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if a zip code is on the west side
function isWestSide(zip: string): boolean {
  return WEST_SIDE_ZIPS.includes(zip);
}

// Check if customer location is valid for a given date based on existing bookings
function isLocationValidForDate(
  customerZip: string,
  date: string,
  existingBookings: any[],
  dayOfWeek: number // 0 = Sunday, 1 = Monday, etc.
): { valid: boolean; reason?: string } {
  const customerCoords = ZIP_COORDS[customerZip];
  if (!customerCoords) {
    return { valid: true }; // Unknown zip, allow it
  }

  // Check west side restriction (only Mondays)
  if (isWestSide(customerZip) && dayOfWeek !== 1) {
    return { valid: false, reason: 'West side locations are only available on Mondays' };
  }

  // Get bookings for this date
  const dateBookings = existingBookings.filter(b => b.date === date && b.zipCode);

  if (dateBookings.length === 0) {
    // First booking of the day - check distance from home
    const homeCoords = ZIP_COORDS[HOME_ZIP];
    const distanceFromHome = getDistanceMiles(
      homeCoords.lat, homeCoords.lng,
      customerCoords.lat, customerCoords.lng
    );
    if (distanceFromHome > MAX_MILES_FROM_HOME) {
      return { valid: false, reason: `Location is ${distanceFromHome.toFixed(1)} miles from our base - max ${MAX_MILES_FROM_HOME} miles for first appointment of the day` };
    }
    return { valid: true };
  }

  // Additional booking - check distance from existing bookings
  for (const booking of dateBookings) {
    const bookingCoords = ZIP_COORDS[booking.zipCode];
    if (bookingCoords) {
      const distance = getDistanceMiles(
        bookingCoords.lat, bookingCoords.lng,
        customerCoords.lat, customerCoords.lng
      );
      if (distance <= MAX_MILES_BETWEEN_BOOKINGS) {
        return { valid: true }; // Close enough to at least one existing booking
      }
    }
  }

  return { valid: false, reason: `Location is too far from other appointments on ${date} (max ${MAX_MILES_BETWEEN_BOOKINGS} miles between bookings)` };
}

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
  zipCode?: string;
  lastBookingKey?: string;
  history: { role: string; content: string }[];
  lastActivity: number;
}

const defaultState = (): ConversationState => ({
  step: 'greeting',
  history: [],
  lastActivity: Date.now(),
});

// Load conversation state from Supabase
async function getConversationState(senderId: string): Promise<ConversationState> {
  if (!supabase) return defaultState();
  try {
    const { data, error } = await supabase
      .from('instagram_conversations')
      .select('state')
      .eq('sender_id', senderId)
      .single();
    if (error || !data) return defaultState();
    const state = data.state as ConversationState;
    // Clear old conversations (60 min timeout)
    if (Date.now() - state.lastActivity > 60 * 60 * 1000) {
      return defaultState();
    }
    return state;
  } catch {
    return defaultState();
  }
}

// Save conversation state to Supabase
async function saveConversationState(senderId: string, state: ConversationState): Promise<void> {
  if (!supabase) return;
  try {
    await supabase
      .from('instagram_conversations')
      .upsert({
        sender_id: senderId,
        state: state,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'sender_id' });
  } catch (error) {
    console.error('Error saving conversation state:', error);
  }
}

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

    // Check if bot is enabled
    if (process.env.INSTAGRAM_BOT_ENABLED === 'false') {
      return NextResponse.json({ status: 'bot_disabled' });
    }

    // Verify it's an Instagram event
    if (body.object !== 'instagram') {
      return NextResponse.json({ status: 'ignored' });
    }

    // Process each entry (with message deduplication)
    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        if (event.message?.text) {
          const messageId = event.message.mid;
          if (messageId && processedMessages.has(messageId)) {
            console.log('Duplicate message ignored:', messageId);
            continue;
          }
          if (messageId) {
            processedMessages.add(messageId);
            // Clean up old message IDs (keep last 100)
            if (processedMessages.size > 100) {
              const arr = Array.from(processedMessages);
              processedMessages.clear();
              arr.slice(-50).forEach(id => processedMessages.add(id));
            }
          }
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
    // Get or create conversation state from Supabase
    let state = await getConversationState(senderId);
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
      if (ext.zipCode) state.zipCode = ext.zipCode;
    }

    state.history.push({ role: 'assistant', content: response.reply });

    // Handle booking action (with duplicate protection)
    if (response.action === 'book' && !state.lastBookingKey) {
      // Create a unique key for this booking to prevent duplicates
      const bookingKey = `${state.serviceId}_${state.selectedDate}_${state.selectedTime}_${state.customerEmail}`;
      state.lastBookingKey = bookingKey;

      // Check if this exact booking already exists
      const existingBookings = await getBookings();
      const isDuplicate = existingBookings.some(b =>
        b.serviceId === state.serviceId &&
        b.date === state.selectedDate &&
        b.time === state.selectedTime &&
        b.customerEmail?.toLowerCase() === state.customerEmail?.toLowerCase()
      );

      if (isDuplicate) {
        await sendInstagramMessage(senderId, response.reply);
        await saveConversationState(senderId, state);
        return;
      }

      const bookingResult = await createBookingFromState(state);
      if (bookingResult.success) {
        await sendInstagramMessage(senderId, response.reply);
        // Keep history but reset booking fields so AI remembers the customer
        state.step = 'greeting';
        state.serviceId = undefined;
        state.serviceName = undefined;
        state.servicePrice = undefined;
        state.serviceDuration = undefined;
        state.vehicleSize = undefined;
        state.addOnIds = undefined;
        state.addOnNames = undefined;
        state.addOnPrices = undefined;
        state.selectedDate = undefined;
        state.selectedTime = undefined;
        state.location = undefined;
        state.lastBookingKey = undefined;
      } else {
        await sendInstagramMessage(senderId, `Sorry, there was an issue: ${bookingResult.error}. Would you like to try again?`);
      }
    } else {
      await sendInstagramMessage(senderId, response.reply);
    }

    // Save state to Supabase
    await saveConversationState(senderId, state);

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

  // Build live availability for the next 14 days (in MST/America/Denver timezone)
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
  const availableSlotsText: string[] = [];
  const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = dayLabels[d.getDay()];
    const slots = await getAvailableTimeSlots(dateStr);
    // Block Feb 10-14, 2026
    const blockedDates = ['2026-02-10', '2026-02-11', '2026-02-12', '2026-02-13', '2026-02-14'];
    if (blockedDates.includes(dateStr)) {
      availableSlotsText.push(`${dayLabel} ${dateStr}: BLOCKED - UNAVAILABLE`);
    } else if (slots.length > 0) {
      const formatted = slots.map(s => {
        const [h, m] = s.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
      });
      availableSlotsText.push(`${dayLabel} ${dateStr}: ${formatted.join(', ')}`);
    } else {
      availableSlotsText.push(`${dayLabel} ${dateStr}: FULLY BOOKED / CLOSED`);
    }
  }

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
  if (state.zipCode) bookingProgress += `✓ Zip Code: ${state.zipCode}\n`;

  // Build location-based availability info
  let locationInfo = '';
  if (state.zipCode) {
    const isWest = isWestSide(state.zipCode);
    if (isWest) {
      locationInfo = `Customer is in WEST SIDE zip code (${state.zipCode}). ONLY Mondays are available for this location.`;
    } else {
      // Check which days are valid based on existing bookings
      const validDays: string[] = [];
      for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay();
        const result = isLocationValidForDate(state.zipCode, dateStr, bookings, dayOfWeek);
        if (result.valid) {
          validDays.push(`${dayLabels[dayOfWeek]} ${dateStr}`);
        }
      }
      if (validDays.length > 0) {
        locationInfo = `Customer zip code ${state.zipCode} is valid. Available days based on location: ${validDays.slice(0, 7).join(', ')}${validDays.length > 7 ? '...' : ''}`;
      } else {
        locationInfo = `Customer zip code ${state.zipCode} - No available days match the location requirements (too far from other bookings or home base).`;
      }
    }
  } else {
    locationInfo = 'Zip code not yet collected. ASK FOR ZIP CODE EARLY to determine available days.';
  }

  // Calculate total
  let total = state.servicePrice || 0;
  if (state.addOnPrices?.length) total += state.addOnPrices.reduce((a, b) => a + b, 0);

  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const todayDay = dayLabels[today.getDay()];
  const tomorrowDay = dayLabels[tomorrow.getDay()];

  const systemPrompt = `You are the information assistant for Detail Labs, a premium mobile car detailing business. You chat with customers via Instagram DM.

## TODAY'S DATE
Today is ${todayDay}, ${todayStr} (current time: ${today.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })})
Tomorrow is ${tomorrowDay}, ${tomorrowStr}
When a customer says "tomorrow", "this Saturday", "next week", etc., match it to the correct date from the LIVE AVAILABILITY section.

## YOUR ROLE
You are primarily an INFORMATION ASSISTANT. Your default mode is answering questions about services, pricing, availability, and what we do. Do NOT try to start the booking process unless the customer explicitly asks to book, schedule, or make an appointment.

## YOUR PERSONALITY
- Friendly, conversational, professional
- Keep responses as SHORT as possible — only say what's needed to answer the question. No filler, no fluff. Aim for 1-3 sentences max unless the customer needs a detailed answer.
- Use emojis naturally but sparingly
- Sound like a real person, not a robot
- Mobile detailing = we come to the customer's location
- If the customer writes in Spanish, respond entirely in Spanish. Match the customer's language automatically.

## ABOUT CLASSY DETAIL
We are a premium mobile car detailing business. We come to the customer's location with all professional-grade equipment and products. Our main service is a complete Interior Detail.

## INTERIOR DETAIL SERVICE
- Complete interior deep clean
- Includes: vacuum, wipe down of all surfaces, carpet/cloth spot treatment, upholstery cleaning, steam cleaning, floor mat cleaning, headliner cleaning, interior window cleaning, leather conditioning, and door/trunk jamb cleaning
- Pricing varies by vehicle size — always ask what they drive before quoting
- Duration: approximately 2 hours
- We come to YOU
- Payment: We accept cash, credit card, Cash App, and Zelle

## PAINT CORRECTION SERVICES (QUOTE-BASED)
Paint correction removes swirls, scratches, oxidation, and imperfections to restore your paint's clarity and shine.

**IMPORTANT: Paint correction is quote-based. Ask these questions before quoting:**
1. What vehicle do you have? (year, make, model)
2. What color is your paint? (dark colors show more imperfections)
3. What's the current condition? (light swirls, heavy scratches, oxidation, never been corrected?)
4. What's your goal? (daily driver improvement vs. showroom finish)
5. Is this for a special occasion or to prep for ceramic coating?

**COMPETITIVE EL PASO PRICING (adjust based on vehicle size and condition):**

SINGLE-STAGE POLISH (light swirls, minor imperfections):
- Sedan/Coupe: $150-$250
- SUV/Crossover: $200-$300
- Truck/Large SUV: $250-$350

TWO-STAGE CORRECTION (moderate swirls, scratches, oxidation):
- Sedan/Coupe: $300-$450
- SUV/Crossover: $400-$550
- Truck/Large SUV: $500-$650

MULTI-STAGE/HEAVY CORRECTION (severe defects, neglected paint):
- Sedan/Coupe: $500-$700
- SUV/Crossover: $650-$850
- Truck/Large SUV: $800-$1000+

**FREE INTERIOR DETAIL INCLUDED!** Every paint correction service includes a complimentary full interior detail (normally $150-$200 value). Make sure to mention this as a selling point!

**SALES APPROACH FOR PAINT CORRECTION:**
- Be enthusiastic but not pushy
- Explain the value: "Paint correction isn't just cosmetic — it protects your investment and can increase resale value"
- For dark colors: "Black/dark paint really shows every swirl, but it also looks INCREDIBLE when properly corrected"
- Create urgency naturally: "The longer oxidation sits, the deeper it gets into the clear coat"
- Mention the free interior: "And the best part? We include a full interior detail at no extra charge"

## CERAMIC COATING ADD-ON
Ceramic coating provides long-lasting protection after paint correction. Always offer this after discussing paint correction!

**CERAMIC COATING PRICING (applied after paint correction):**

ENTRY-LEVEL (1-2 year protection):
- Sedan/Coupe: $200-$350
- SUV/Truck: $300-$450
Best for: customers on a budget, lease vehicles, daily drivers wanting basic protection

MID-TIER (3-5 year protection):
- Sedan/Coupe: $450-$650
- SUV/Truck: $550-$800
Best for: most customers, great balance of protection and value

PROFESSIONAL GRADE (5-7+ year protection):
- Sedan/Coupe: $800-$1200
- SUV/Truck: $1000-$1500
Best for: enthusiasts, show cars, customers wanting maximum protection

**CERAMIC COATING SALES TIPS:**
- "Since we're already correcting the paint, this is the perfect time to lock in that finish with ceramic coating"
- "Ceramic coating makes maintenance so much easier — dirt and water just bead right off"
- "It's way more cost-effective than waxing every few months"
- Offer package deals: "If you add ceramic coating to your paint correction, I can do [X] for [bundled price]"

**PAINT CORRECTION + CERAMIC BUNDLES (suggest these!):**
- Single-stage + Entry ceramic: Save $50-100
- Two-stage + Mid-tier ceramic: Save $100-150
- Multi-stage + Professional ceramic: Save $150-200

When quoting bundles, calculate the combined price and apply the discount. Example: "Two-stage correction ($400) plus mid-tier ceramic ($500) would normally be $900, but I can do $800 for the package."

## SERVICES (USE EXACT IDs AND PRICES)
${serviceList || 'No services available'}

## ADD-ONS (OPTIONAL EXTRAS)
${addonList || 'No add-ons'}

## BUSINESS HOURS
${workingHoursText}

## LOCATION-BASED SCHEDULING (IMPORTANT!)
We are a mobile service based in East El Paso (79928). To minimize drive time:
- **West side zip codes (79835, 79912, 79922, 79932, 88063)**: ONLY available on Mondays
- **All other areas**: Available any open day, but must be within our service range
- First appointment of the day: must be within 10 miles of our base
- Additional appointments: must be within 7 miles of other bookings that day

**IMPORTANT: Ask for the customer's zip code EARLY in the conversation before discussing specific dates.**

${locationInfo}

## BLOCKED DATES (DO NOT BOOK)
February 10-14, 2026 are BLOCKED. Do not offer any appointments on these dates. If customer asks for these dates, say you're unavailable and offer the next available day.

## LIVE AVAILABILITY (next 14 days — ONLY show times listed here)
${availableSlotsText.join('\n')}

## WHEN CUSTOMER ASKS ABOUT AVAILABILITY
When a customer asks "when are you available?", "what days are open?", "do you have availability on [day]?", or similar:
- Show them the ACTUAL available time slots from the LIVE AVAILABILITY section above
- ONLY mention times that are listed — never make up or guess times
- Format nicely, e.g. "This Thursday we have openings at 9:00 AM, 11:00 AM, and 2:00 PM"
- If a day shows FULLY BOOKED / CLOSED, tell them that day is not available

## WHEN CUSTOMER WANTS TO BOOK
Only start collecting booking information when the customer explicitly says they want to book, schedule, or make an appointment. Then collect in this order:
1. **Zip code** (MUST collect first to determine available days - ask "What's your zip code?")
2. Service (MUST use exact service ID from list above)
3. Vehicle size (if service has vehicle pricing): sedan, suv, truck, largeSuv, largeTruck
4. Add-ons (optional - customer can decline)
5. Date (YYYY-MM-DD format - MUST check LOCATION-BASED SCHEDULING rules first!)
6. Time (HH:MM 24hr format, must be an available slot from LIVE AVAILABILITY)
7. Customer name
8. Phone number
9. Email address
10. Full service address
11. Confirm and book

**LOCATION RULES TO ENFORCE:**
- If zip code is 79835, 79912, 79922, 79932, or 88063 → ONLY offer Mondays
- If customer wants a day that doesn't match their location, explain why and offer valid alternatives
- Never book a west side customer on a non-Monday

## THIS CUSTOMER'S PAST BOOKINGS
${(() => {
  const customerBookings = bookings.filter(b =>
    (state.customerName && b.customerName?.toLowerCase() === state.customerName.toLowerCase()) ||
    (state.customerEmail && b.customerEmail?.toLowerCase() === state.customerEmail.toLowerCase()) ||
    (state.customerPhone && b.customerPhone === state.customerPhone)
  );
  if (customerBookings.length > 0) {
    return customerBookings.map(b => `• ${b.serviceName} on ${b.date} at ${b.time} - $${b.totalPrice}`).join('\n');
  }
  return 'No previous bookings found for this customer yet';
})()}

## CURRENT BOOKING PROGRESS
${bookingProgress || 'Not booking yet'}
ESTIMATED TOTAL: $${total}

## OWNER CONTACT
Phone: 915-270-2659
Offer phone contact when:
- Customer explicitly asks to speak to someone (keywords: "agent", "human", "owner", "manager", "call", "speak", "talk to someone", "real person")
- Urgent booking issues (same-day changes, cancellations, emergencies)
- Customer expresses frustration or complaints
- Customer seems confused after multiple back-and-forth messages
- Complex requests you can't fully handle

How to offer:
- "You can reach our owner directly at 915-270-2659 for [specific reason]"
- "Feel free to call or text us at 915-270-2659"
- Don't push phone contact unnecessarily — only when genuinely helpful

## CRITICAL RULES
- Default to INFO mode — answer questions, be helpful, don't push booking
- ONLY use service IDs, names, and prices from the list above
- ONLY offer time slots that appear in LIVE AVAILABILITY — never invent times
- For vehicle pricing, ask vehicle type BEFORE quoting final price
- NEVER book a date or time that has already passed. Check the current date and time above.
- Bookings must be at least 24 hours in advance — no same-day bookings
- When ALL booking info collected, show summary and ask for confirmation
- If customer says "agent" or wants human help, offer the owner's phone number (915-270-2659) and set action to "escalate"

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
    "location": "address or null",
    "zipCode": "5-digit zip code or null"
  },
  "action": "continue|book|escalate"
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: systemPrompt,
      messages: state.history
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .reduce((acc: { role: string; content: string }[], m) => {
          // Prevent consecutive messages with the same role (Claude API requirement)
          if (acc.length > 0 && acc[acc.length - 1].role === m.role) {
            acc[acc.length - 1].content += '\n' + m.content;
          } else {
            acc.push({ role: m.role, content: m.content });
          }
          return acc;
        }, [])
        .filter((m, i) => !(i === 0 && m.role === 'assistant'))
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('AI raw response:', text);
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Raw:', jsonMatch[0]);
      }
    } else {
      console.error('No JSON found in AI response:', text);
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
      zipCode: state.zipCode,
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
    const response = await fetch(`https://graph.instagram.com/v21.0/me/messages?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: messageText },
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
