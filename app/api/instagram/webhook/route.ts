import { NextRequest, NextResponse } from 'next/server';
import { getServices, getAddOns, getAvailability, getBookings, getAvailableTimeSlots, addBooking, getService, deleteBooking } from '@/lib/data';
import { Booking } from '@/types';
import { supabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

// Track processed message IDs to prevent duplicate processing from Instagram retries
const processedMessages = new Set<string>();

// El Paso zip code coordinates (lat, lng)
const ZIP_COORDS: Record<string, { lat: number; lng: number }> = {
  // West side
  '79835': { lat: 31.8084, lng: -106.5811 }, // Sunland Park
  '79912': { lat: 31.8406, lng: -106.5678 }, // West El Paso
  '79922': { lat: 31.8989, lng: -106.5700 }, // Canutillo area
  '79932': { lat: 31.8639, lng: -106.6228 }, // Westway
  '88063': { lat: 31.8300, lng: -106.6000 }, // Sunland Park NM
  // East/Central
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
  vehicleYear?: number;
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
  humanTakeover?: boolean;
  humanTakeoverAt?: number;
  humanTakeoverDuration?: number;
  instagramName?: string;
  instagramUsername?: string;
  // Reschedule tracking
  isRescheduling?: boolean;
  existingBookingId?: string;
  existingBookingDate?: string;
  existingBookingTime?: string;
}

// 24 hours in milliseconds
const HUMAN_TAKEOVER_DURATION = 24 * 60 * 60 * 1000;

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

    // Verify it's an Instagram event (can also be 'page' for some webhook types)
    if (body.object !== 'instagram' && body.object !== 'page') {
      console.log('Ignoring non-Instagram/page event:', body.object);
      return NextResponse.json({ status: 'ignored' });
    }

    // Get the page/business Instagram ID from env or detect from webhook
    const pageId = process.env.INSTAGRAM_PAGE_ID;

    // Process each entry (with message deduplication)
    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        const senderId = event.sender?.id;
        const recipientId = event.recipient?.id;
        const messageId = event.message?.mid;

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

        // Check if this message is from the business owner (human takeover)
        const isFromBusiness = pageId && senderId === pageId;

        if (isFromBusiness && recipientId) {
          const messageText = event.message?.text || '';

          // Check for pause command (!pause) - pauses bot for 1 hour
          if (messageText.toLowerCase().includes('!pause')) {
            console.log('Manual pause requested for customer:', recipientId);
            await markHumanTakeover(recipientId, 60 * 60 * 1000); // 1 hour
            continue;
          }

          // Check for resume command (!resume) - resumes bot immediately
          if (messageText.toLowerCase().includes('!resume')) {
            console.log('Manual resume requested for customer:', recipientId);
            await clearHumanTakeover(recipientId);
            continue;
          }

          // Regular business messages - don't pause, just ignore
          console.log('Business message (no pause):', recipientId);
          continue;
        }

        // Skip if no senderId
        if (!senderId) {
          console.log('No senderId, skipping');
          continue;
        }

        // Handle reactions (just acknowledge, don't respond)
        if (event.reaction) {
          console.log('Reaction received, ignoring:', event.reaction);
          continue;
        }

        // Handle read receipts (ignore)
        if (event.read) {
          console.log('Read receipt, ignoring');
          continue;
        }

        // Handle postbacks (button clicks)
        if (event.postback) {
          console.log('Postback received:', event.postback);
          await handleMessage(senderId, event.postback.payload || event.postback.title || 'Button clicked');
          continue;
        }

        // Handle messages
        if (event.message) {
          let messageText = event.message.text || '';
          let imageUrl: string | undefined;

          // Check for attachments
          if (event.message.attachments) {
            for (const att of event.message.attachments) {
              if (att.type === 'image' && att.payload?.url) {
                imageUrl = att.payload.url;
              } else if (att.type === 'story_mention' || att.type === 'share') {
                // Story mention or share - treat as engagement
                if (!messageText) {
                  messageText = att.type === 'story_mention'
                    ? 'Customer mentioned you in their story'
                    : 'Customer shared something with you';
                }
              } else if (att.type === 'audio' || att.type === 'video' || att.type === 'file') {
                // Audio/video/file - acknowledge but can't process
                if (!messageText) {
                  messageText = `Customer sent a ${att.type}`;
                }
              }
            }
          }

          // Handle quick replies
          if (event.message.quick_reply?.payload) {
            messageText = event.message.quick_reply.payload;
          }

          // Only process if we have something to respond to
          if (messageText || imageUrl) {
            await handleMessage(senderId, messageText || 'Customer sent a message', imageUrl);
          } else {
            console.log('Message with no processable content:', JSON.stringify(event.message));
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Mark a conversation as taken over by human (with custom duration)
async function markHumanTakeover(customerId: string, duration?: number): Promise<void> {
  const state = await getConversationState(customerId);
  state.humanTakeover = true;
  state.humanTakeoverAt = Date.now();
  state.humanTakeoverDuration = duration || HUMAN_TAKEOVER_DURATION;
  await saveConversationState(customerId, state);
}

// Clear human takeover (resume bot immediately)
async function clearHumanTakeover(customerId: string): Promise<void> {
  const state = await getConversationState(customerId);
  state.humanTakeover = false;
  state.humanTakeoverAt = undefined;
  state.humanTakeoverDuration = undefined;
  await saveConversationState(customerId, state);
}

// Fetch Instagram user profile (name, username)
async function getInstagramUserProfile(userId: string): Promise<{ name?: string; username?: string }> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN;
  if (!accessToken) {
    return {};
  }

  try {
    const response = await fetch(
      `https://graph.instagram.com/${userId}?fields=name,username&access_token=${accessToken}`
    );

    if (!response.ok) {
      console.error('Failed to fetch Instagram profile:', await response.text());
      return {};
    }

    const data = await response.json();
    return {
      name: data.name || undefined,
      username: data.username || undefined,
    };
  } catch (error) {
    console.error('Error fetching Instagram profile:', error);
    return {};
  }
}

async function handleMessage(senderId: string, messageText: string, imageUrl?: string) {
  try {
    // Get or create conversation state from Supabase
    let state = await getConversationState(senderId);
    state.lastActivity = Date.now();

    // Fetch Instagram profile if not already fetched
    if (!state.instagramName && !state.instagramUsername) {
      const profile = await getInstagramUserProfile(senderId);
      if (profile.name) state.instagramName = profile.name;
      if (profile.username) state.instagramUsername = profile.username;
      // Pre-fill customer name from Instagram if available
      if (profile.name && !state.customerName) {
        state.customerName = profile.name;
      }
      console.log('Fetched Instagram profile:', profile);
    }

    // Check if manual pause is active (triggered by !pause command)
    if (state.humanTakeover && state.humanTakeoverAt) {
      const timeSinceTakeover = Date.now() - state.humanTakeoverAt;
      const duration = state.humanTakeoverDuration || HUMAN_TAKEOVER_DURATION;
      if (timeSinceTakeover < duration) {
        const remainingMins = Math.ceil((duration - timeSinceTakeover) / 60000);
        console.log(`Bot paused for ${remainingMins} more minutes for:`, senderId);
        // Still save the message to history for context
        const historyContent = imageUrl ? `${messageText} [Customer sent an image]` : messageText;
        state.history.push({ role: 'user', content: historyContent });
        if (state.history.length > 20) {
          state.history = state.history.slice(-20);
        }
        await saveConversationState(senderId, state);
        return; // Don't respond - bot is paused
      } else {
        console.log('Pause expired for:', senderId, '- bot resuming');
        state.humanTakeover = false;
        state.humanTakeoverAt = undefined;
        state.humanTakeoverDuration = undefined;
      }
    }

    // Add user message to history (note if image was included)
    const historyContent = imageUrl ? `${messageText} [Customer sent an image]` : messageText;
    state.history.push({ role: 'user', content: historyContent });
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
    const response = await generateAIResponse(state, messageText, services, addons, availability, bookings, imageUrl);

    // Update state with AI response
    if (response.extracted) {
      const ext = response.extracted;
      if (ext.serviceId) state.serviceId = ext.serviceId;
      if (ext.serviceName) state.serviceName = ext.serviceName;
      if (ext.servicePrice) state.servicePrice = ext.servicePrice;
      if (ext.serviceDuration) state.serviceDuration = ext.serviceDuration;
      if (ext.vehicleSize) state.vehicleSize = ext.vehicleSize;
      if (ext.vehicleYear) state.vehicleYear = ext.vehicleYear;
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
      // Reschedule tracking
      if (ext.isRescheduling !== undefined) state.isRescheduling = ext.isRescheduling;
      if (ext.existingBookingId) state.existingBookingId = ext.existingBookingId;
      if (ext.existingBookingDate) state.existingBookingDate = ext.existingBookingDate;
      if (ext.existingBookingTime) state.existingBookingTime = ext.existingBookingTime;
    }

    // Check if vehicle is too old (2015 or older) - hand over to human
    if (state.vehicleYear && state.vehicleYear <= 2015 && !state.humanTakeover) {
      state.humanTakeover = true;
      state.humanTakeoverAt = Date.now();
      state.humanTakeoverDuration = HUMAN_TAKEOVER_DURATION;
      await sendInstagramMessage(senderId, "Thanks for reaching out! Let me connect you with our owner who can help you directly. They'll message you shortly! 🙌");
      await saveConversationState(senderId, state);
      return;
    }

    state.history.push({ role: 'assistant', content: response.reply });

    // Handle reschedule action - delete old booking first, then create new one
    if (response.action === 'reschedule') {
      const allBookings = await getBookings();
      const today = new Date().toISOString().split('T')[0];
      const normalizePhone = (p?: string) => p?.replace(/\D/g, '') || '';

      // Try to find the existing booking to reschedule
      let bookingToDelete = state.existingBookingId
        ? allBookings.find(b => b.id === state.existingBookingId)
        : null;

      // Fallback: if no booking ID, try to find by customer phone + future date
      if (!bookingToDelete && state.customerPhone) {
        const customerFutureBookings = allBookings.filter(b =>
          b.date >= today &&
          normalizePhone(b.customerPhone) === normalizePhone(state.customerPhone)
        );
        // If they only have one future booking, use that
        if (customerFutureBookings.length === 1) {
          bookingToDelete = customerFutureBookings[0];
          state.existingBookingId = bookingToDelete.id;
          console.log('Found booking by phone fallback:', bookingToDelete.id);
        }
      }

      if (!bookingToDelete) {
        await sendInstagramMessage(senderId, "I couldn't find your existing appointment to reschedule. Can you confirm which appointment you'd like to change?");
        await saveConversationState(senderId, state);
        return;
      }

      console.log('Processing reschedule: deleting old booking', bookingToDelete.id);

      // Copy service info from existing booking if not already set
      if (!state.serviceId) {
        state.serviceId = bookingToDelete.serviceId;
        state.serviceName = bookingToDelete.serviceName;
        state.serviceDuration = bookingToDelete.duration;
      }
      if (!state.location) state.location = bookingToDelete.location;
      if (!state.customerPhone) state.customerPhone = bookingToDelete.customerPhone;
      if (!state.customerEmail) state.customerEmail = bookingToDelete.customerEmail;
      if (!state.vehicleSize) state.vehicleSize = bookingToDelete.vehicleSize;
      if (!state.zipCode) state.zipCode = bookingToDelete.zipCode;
      if (!state.addOnIds?.length && bookingToDelete.addOnIds?.length) {
        state.addOnIds = bookingToDelete.addOnIds;
        state.addOnNames = bookingToDelete.addOnNames;
      }

      try {
        // Delete the old booking first
        await deleteBooking(bookingToDelete.id);
        console.log('Old booking deleted successfully:', bookingToDelete.id);

        // Now create the new booking
        const bookingResult = await createBookingFromState(state);
        if (bookingResult.success) {
          await sendInstagramMessage(senderId, response.reply);
          // Reset all booking state after successful reschedule
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
          state.isRescheduling = undefined;
          state.existingBookingId = undefined;
          state.existingBookingDate = undefined;
          state.existingBookingTime = undefined;
        } else {
          await sendInstagramMessage(senderId, `Sorry, there was an issue creating your new appointment: ${bookingResult.error}. Your old appointment has been cancelled. Please try booking again.`);
        }
      } catch (error) {
        console.error('Error during reschedule:', error);
        await sendInstagramMessage(senderId, "Sorry, there was a problem rescheduling your appointment. Please contact us at 915-270-2659 for help.");
      }
    }
    // Handle booking action (with duplicate protection)
    else if (response.action === 'book' && !state.lastBookingKey) {
      // Create a unique key for this booking to prevent duplicates (use phone, not email)
      const bookingKey = `${state.serviceId}_${state.selectedDate}_${state.selectedTime}_${state.customerPhone}`;
      state.lastBookingKey = bookingKey;

      // Check if this exact booking already exists (use phone number for matching)
      const existingBookings = await getBookings();
      const normalizePhone = (p?: string) => p?.replace(/\D/g, '') || '';
      const isDuplicate = existingBookings.some(b =>
        b.serviceId === state.serviceId &&
        b.date === state.selectedDate &&
        b.time === state.selectedTime &&
        normalizePhone(b.customerPhone) === normalizePhone(state.customerPhone)
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
  bookings: any[],
  imageUrl?: string
) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return { reply: "I'm not fully configured yet. Please contact us directly!", action: 'continue', extracted: {} };
  }

  const client = new Anthropic({ apiKey: anthropicKey });

  // Build service list with accurate pricing
  const serviceList = services.map((s, i) => {
    let pricing = `$${s.price}`;
    if (s.useSeatRowPricing && s.seatRowPricing) {
      const srp = s.seatRowPricing;
      pricing = `2 seat rows $${srp.twoRows}, 3 seat rows $${srp.threeRows}`;
    } else if (s.useVehiclePricing && s.vehiclePricing) {
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
    let slots = await getAvailableTimeSlots(dateStr);
    // Block Feb 10-14, 2026 and June 21-22, 2026
    const blockedDates = ['2026-02-10', '2026-02-11', '2026-02-12', '2026-02-13', '2026-02-14', '2026-06-21', '2026-06-22'];
    // Block mornings (7:30 AM and 11:30 AM) on June 23, 2026
    const morningsBlockedDates = ['2026-06-23'];
    if (morningsBlockedDates.includes(dateStr)) {
      slots = slots.filter(s => s !== '07:30' && s !== '11:30');
    }
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
  if (state.instagramName) bookingProgress += `Instagram Name: ${state.instagramName}\n`;
  if (state.instagramUsername) bookingProgress += `Instagram Username: @${state.instagramUsername}\n`;
  if (state.vehicleYear) bookingProgress += `✓ Vehicle Year: ${state.vehicleYear}\n`;
  if (state.serviceName) bookingProgress += `✓ Service: ${state.serviceName} - $${state.servicePrice}\n`;
  if (state.vehicleSize) bookingProgress += `✓ Vehicle Type: ${state.vehicleSize}\n`;
  if (state.addOnNames?.length) {
    const addOnTotal = state.addOnPrices?.reduce((a, b) => a + b, 0) || 0;
    bookingProgress += `✓ Add-ons: ${state.addOnNames.join(', ')} (+$${addOnTotal})\n`;
  }
  if (state.selectedDate) bookingProgress += `✓ Date: ${state.selectedDate}\n`;
  if (state.selectedTime) bookingProgress += `✓ Time: ${state.selectedTime}\n`;
  if (state.customerName) bookingProgress += `✓ Name: ${state.customerName}${state.instagramName && state.customerName === state.instagramName ? ' (from Instagram)' : ''}\n`;
  if (state.customerPhone) bookingProgress += `✓ Phone: ${state.customerPhone}\n`;
  if (state.customerEmail) bookingProgress += `✓ Email: ${state.customerEmail}\n`;
  if (state.location) bookingProgress += `✓ Location: ${state.location}\n`;
  if (state.zipCode) bookingProgress += `✓ Zip Code: ${state.zipCode}\n`;

  // Build location-based availability info
  let locationInfo = '';
  if (state.zipCode) {
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

## TODAY'S DATE (USE THIS AS YOUR SOURCE OF TRUTH)
**TODAY: ${todayDay}, ${todayStr}** (current time: ${today.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })})
**TOMORROW: ${tomorrowDay}, ${tomorrowStr}**

CRITICAL: Always use the day-date pairs from the LIVE AVAILABILITY section below. Each line shows the EXACT day name with its corresponding date (e.g., "Monday 2026-03-10").
- When customer says "Monday" → find the next Monday in LIVE AVAILABILITY and use that exact date
- When customer says "this weekend" → find Saturday/Sunday in LIVE AVAILABILITY
- When customer says "next week" → look at dates 7+ days from today
- NEVER guess or calculate dates yourself — ONLY use the day-date pairs shown in LIVE AVAILABILITY

## YOUR ROLE
You are primarily an INFORMATION ASSISTANT. Your default mode is answering questions about services, pricing, availability, and what we do. Do NOT try to start the booking process unless the customer explicitly asks to book, schedule, or make an appointment.

## YOUR PERSONALITY
- Friendly, conversational, professional
- Keep responses as SHORT as possible — only say what's needed to answer the question. No filler, no fluff. Aim for 1-3 sentences max unless the customer needs a detailed answer.
- Use emojis naturally but sparingly
- Sound like a real person, not a robot
- Mobile detailing = we come to the customer's location
- If the customer writes in Spanish, respond entirely in Spanish. Match the customer's language automatically.

## ABOUT DETAIL LABS
We are a premium mobile car detailing business. We come to the customer's location with all professional-grade equipment and products. Our main service is a complete Interior Detail.

## INTERIOR DETAIL SERVICE
- Complete interior deep clean
- Includes: vacuum, wipe down of all surfaces, carpet/cloth spot treatment, upholstery cleaning, steam cleaning, floor mat cleaning, headliner cleaning, interior window cleaning, leather conditioning, and door/trunk jamb cleaning
- **Pricing based on seat rows:**
  - 2 seat rows (sedans, coupes, most cars): $85
  - 3 seat rows (SUVs, minivans, larger vehicles): $90
- **Duration: 2 hours** (blocks 2 hours on the calendar + 30 min buffer after)
- We come to YOU
- Payment: We accept cash, credit card, Cash App, and Zelle

## VEHICLE YEAR REQUIREMENT (CRITICAL!)
**ALWAYS ask for the vehicle year BEFORE giving any price quote.**
- Ask: "What year is your vehicle?" or "What year is your [car type]?"
- We typically service vehicles from **2016 or newer**
- If the vehicle is **2015 or older**, the conversation will be handed over to the owner for a custom quote
- You MUST have the vehicle year before quoting any price
- Also ask "Does your vehicle have 2 or 3 rows of seats?" for Interior Detail pricing

## SCHEDULING RULES
- **WEEKDAYS (Mon-Fri)**: We offer 3 appointment times: 7:30 AM, 11:30 AM, and 5:00 PM
- **SATURDAY**: 3 slots available: 7:30 AM, 11:30 AM, and 5:00 PM
- **SUNDAY**: 2 slots available: 11:30 AM and 5:00 PM only (no morning slot)
- Each appointment blocks its full service duration on the calendar (e.g., Interior Detail = 2 hours)
- Add-ons add to the total duration (e.g., Extraction adds 30-45 min)
- There is a **1-hour buffer** between all appointments for travel/setup
- Always tell customers how long their service will take

## PAINT CORRECTION SERVICES (ONLY IF CUSTOMER ASKS)
**IMPORTANT: Do NOT proactively offer or mention paint correction. Only discuss if the customer specifically asks about it.**

Paint correction removes swirls, scratches, oxidation, and imperfections to restore paint clarity.

If customer asks, gather these details before quoting:
1. Vehicle (year, make, model)
2. Paint color
3. Current condition (light swirls, heavy scratches, oxidation?)
4. Their goal

**PRICING (quote-based, adjust for vehicle size/condition):**
- Single-stage polish: $350-$550
- Two-stage correction: $500-$850
- Multi-stage/heavy correction: $700-$1200+

Includes free interior detail with paint correction.

## CERAMIC COATING (ONLY IF CUSTOMER ASKS)
**Do NOT proactively offer ceramic coating. Only discuss if customer asks.**
**Do NOT offer the 1-2 year paint protection/sealant option. Instead, recommend the Exterior add-on for customers wanting basic exterior care.**

Pricing (applied after paint correction):
- Mid-tier (3-5 year): $650-$1000
- Professional (5-7+ year): $1000-$1700

## EXTERIOR ADD-ON
When customers ask about exterior cleaning, washing, or basic paint protection, recommend the **Exterior add-on** from the add-ons list. This is our go-to option for exterior care without full paint correction or ceramic coating.

## SERVICES (USE EXACT IDs AND PRICES)
${serviceList || 'No services available'}

## ADD-ONS (OPTIONAL EXTRAS)
${addonList || 'No add-ons'}

## BUSINESS HOURS
${workingHoursText}

## LOCATION-BASED SCHEDULING (IMPORTANT!)
We are a mobile service based in East El Paso (79928). To minimize drive time:
- First appointment of the day: must be within 10 miles of our base
- Additional appointments: must be within 7 miles of other bookings that day

**IMPORTANT: Ask for the customer's zip code EARLY in the conversation before discussing specific dates.**

${locationInfo}

## BLOCKED DATES (DO NOT BOOK)
February 10-14, 2026 are BLOCKED. Do not offer any appointments on these dates. If customer asks for these dates, say you're unavailable and offer the next available day.

**June 21-22, 2026: FULLY BLOCKED** - No appointments available.
**June 23, 2026: MORNING BLOCKED** - Only 5:00 PM is available. Do not offer 7:30 AM or 11:30 AM.

## LIVE AVAILABILITY (next 14 days — AUTHORITATIVE DAY-DATE MAPPING)
Format: [DayName] [YYYY-MM-DD]: [available times]
USE THESE DAY-DATE PAIRS EXACTLY when customer mentions a day of the week:
${availableSlotsText.join('\n')}

## WHEN CUSTOMER ASKS ABOUT AVAILABILITY
When a customer asks "when are you available?", "what days are open?", "do you have availability on [day]?", or similar:
- We have 3 possible time slots: 7:30 AM, 11:30 AM, and 5:00 PM (Sunday only has 11:30 AM and 5:00 PM)
- Show them the ACTUAL available time slots from the LIVE AVAILABILITY section above
- ONLY mention times that are listed — never make up or guess times
- Format nicely, e.g. "This Thursday we have openings at 7:30 AM and 5:00 PM"
- If a day shows FULLY BOOKED / CLOSED, tell them that day is not available

## WHEN CUSTOMER WANTS TO BOOK
Only start collecting booking information when the customer explicitly says they want to book, schedule, or make an appointment. Then collect in this order:
1. **Vehicle Year** (MUST collect first - ask "What year is your vehicle?") - DECLINE if 2015 or older
2. **Zip code** (MUST collect to determine available days - ask "What's your zip code?")
3. Service (MUST use exact service ID from list above)
4. **Seat rows** (for Interior Detail): Ask "Does your vehicle have 2 or 3 rows of seats?" - 2 rows = sedans/coupes ($85), 3 rows = SUVs/minivans ($90)
5. Vehicle size (if service has vehicle pricing instead of seat row pricing): sedan, suv, truck, largeSuv, largeTruck
6. Add-ons (optional - customer can decline)
7. Date (YYYY-MM-DD format - MUST check LOCATION-BASED SCHEDULING rules first!)
8. Time (only 07:30, 11:30, or 17:00 — must be available in LIVE AVAILABILITY)
9. Phone number
10. Full service address
11. Confirm and book

**CRITICAL: You MUST ask for vehicle year BEFORE giving any price. If vehicle is 2015 or older, conversation will be handed to the owner.**

**NAME HANDLING:** Use the customer's Instagram name automatically. Do NOT ask for their name — it's already captured from their Instagram profile. If no Instagram name is available, just use their Instagram username.

**EMAIL IS OPTIONAL:** Do NOT ask for email. Only ask if the customer wants a confirmation email sent.

**LOCATION RULES TO ENFORCE:**
- If customer wants a day that doesn't match their location requirements, explain why and offer valid alternatives

## THIS CUSTOMER'S BOOKINGS
${(() => {
  const customerBookings = bookings.filter(b =>
    (state.customerName && b.customerName?.toLowerCase() === state.customerName.toLowerCase()) ||
    (state.customerEmail && b.customerEmail?.toLowerCase() === state.customerEmail.toLowerCase()) ||
    (state.customerPhone && b.customerPhone === state.customerPhone) ||
    (state.instagramName && b.customerName?.toLowerCase() === state.instagramName.toLowerCase())
  );
  if (customerBookings.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const futureBookings = customerBookings.filter(b => b.date >= today);
    const pastBookings = customerBookings.filter(b => b.date < today);
    let result = '';
    if (futureBookings.length > 0) {
      result += '**UPCOMING (can be rescheduled):**\n';
      result += futureBookings.map(b => `• ID: ${b.id} | ${b.serviceName} on ${b.date} at ${b.time} - $${b.totalPrice}`).join('\n');
    }
    if (pastBookings.length > 0) {
      result += (result ? '\n\n' : '') + '**PAST:**\n';
      result += pastBookings.slice(-3).map(b => `• ${b.serviceName} on ${b.date} at ${b.time} - $${b.totalPrice}`).join('\n');
    }
    return result || 'No bookings found';
  }
  return 'No bookings found for this customer yet';
})()}

## HANDLING RESCHEDULES
When a customer wants to reschedule an existing appointment:
1. **Find their existing booking** from the UPCOMING bookings list above (look for the booking ID)
2. **Confirm which booking** they want to reschedule (especially if they have multiple)
3. **Collect the new date and time** - same rules as new bookings (check LIVE AVAILABILITY)
4. **Confirm the change** - summarize: "I'll move your [service] from [old date/time] to [new date/time]. Does that work?"
5. **Use action "reschedule"** when ready to complete - this will DELETE the old booking and CREATE the new one

**IMPORTANT FOR RESCHEDULES:**
- Set isRescheduling: true when customer indicates they want to reschedule
- Set existingBookingId to the ID of the booking they want to change (from UPCOMING list)
- Set existingBookingDate and existingBookingTime from the old booking
- Reuse their existing info (phone, location, service) unless they want to change it
- When all new info is confirmed, use action: "reschedule" (NOT "book")

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

## WHEN CUSTOMER SENDS AN IMAGE
If a customer sends a photo, analyze it and respond helpfully:

**Interior photos:**
- Assess the condition (light cleaning needed, heavy staining, pet hair, etc.)
- Recommend appropriate services and add-ons
- Give a price estimate based on what you see
- **IMPORTANT: If you see stains on CLOTH seats, the Extraction add-on is REQUIRED** - explain that our standard interior detail won't fully remove stains from fabric, and extraction is needed to deep clean and lift the stains out
- Example for stained cloth seats: "I can see some staining on your cloth seats. For this, you'll need our Interior Detail plus the Extraction add-on - that's what pulls the stains out of the fabric. Without extraction, the stains won't fully come out. Total would be around $X."
- Example for leather/no stains: "Your interior looks like it just needs a standard deep clean. Our Interior Detail ($X) will have it looking great!"

**Exterior/paint photos:**
- Ask what they're looking for help with
- Only discuss paint correction if they specifically ask about scratches, swirls, or paint issues
- Example: "Thanks for the photo! What are you looking to have done? We mainly do interior detailing."

**Other photos:**
- Respond appropriately based on context
- If unclear, ask what they'd like help with

## CRITICAL RULES
- Default to INFO mode — answer questions, be helpful, don't push booking
- ONLY use service IDs, names, and prices from the list above
- ONLY offer the 3 fixed time slots: 7:30 AM, 11:30 AM, or 5:00 PM (Sunday only has 11:30 AM and 5:00 PM) — never invent times
- ONLY offer time slots that appear in LIVE AVAILABILITY
- For vehicle pricing, ask vehicle type BEFORE quoting final price
- NEVER book a date or time that has already passed. Check the current date and time above.
- Bookings must be at least 24 hours in advance — no same-day bookings
- When ALL booking info collected, show summary and ask for confirmation
- If customer says "agent" or wants human help, offer the owner's phone number (915-270-2659) and set action to "escalate"

## RESPOND WITH JSON ONLY
{
  "reply": "Your message to customer",
  "extracted": {
    "vehicleYear": number or null (e.g., 2020, 2018 - MUST extract when customer mentions year),
    "serviceId": "exact service ID or null",
    "serviceName": "service name or null",
    "servicePrice": number or null,
    "serviceDuration": number or null,
    "vehicleSize": "sedan|suv|truck|largeSuv|largeTruck or null",
    "addOnIds": ["addon IDs"] or [],
    "addOnNames": ["addon names"] or [],
    "addOnPrices": [prices] or [],
    "date": "YYYY-MM-DD or null (the NEW date for reschedules)",
    "time": "HH:MM or null (the NEW time for reschedules)",
    "name": "only if customer provides a DIFFERENT name than their Instagram name",
    "phone": "phone or null (REQUIRED for booking)",
    "email": "email or null (OPTIONAL - only if customer provides it)",
    "location": "address or null (REQUIRED for booking)",
    "zipCode": "5-digit zip code or null",
    "isRescheduling": true/false (set true when customer wants to reschedule),
    "existingBookingId": "booking ID from UPCOMING list (REQUIRED for reschedule)",
    "existingBookingDate": "original date being rescheduled (YYYY-MM-DD)",
    "existingBookingTime": "original time being rescheduled (HH:MM)"
  },
  "action": "continue|book|reschedule|escalate"
}`;

  try {
    // Build messages array, handling images for the current message
    let messages: any[] = state.history
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
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    console.log('Messages array for Claude:', JSON.stringify(messages, null, 2));

    // Ensure we have at least one user message
    if (messages.length === 0) {
      messages = [{ role: 'user' as const, content: userMessage }];
    }

    // If there's an image, modify the last user message to include it
    if (imageUrl && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user') {
        try {
          // Fetch image and convert to base64
          const imageResponse = await fetch(imageUrl);
          const arrayBuffer = await imageResponse.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

          // Replace text content with multimodal content
          lastMessage.content = [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: contentType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: userMessage || 'Customer sent this image. Please analyze it and respond appropriately based on the context of a mobile car detailing business. If it shows a car interior, assess the condition and recommend services. If it shows paint/exterior, assess for paint correction needs.',
            },
          ];
        } catch (imgError) {
          console.error('Error fetching image:', imgError);
          // Fall back to text-only if image fetch fails
        }
      }
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: systemPrompt,
      messages,
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('AI raw response:', text);

    // Try to extract JSON - find the last complete JSON object
    let jsonStr = '';
    let braceCount = 0;
    let inString = false;
    let escape = false;
    let startIdx = -1;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (char === '\\' && inString) {
        escape = true;
        continue;
      }

      if (char === '"' && !escape) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') {
          if (braceCount === 0) startIdx = i;
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0 && startIdx !== -1) {
            jsonStr = text.slice(startIdx, i + 1);
          }
        }
      }
    }

    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.reply) {
          return parsed;
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
      }
    }

    // If no valid JSON, try to use the raw text as a reply
    if (text && text.length > 0 && text.length < 2000) {
      console.log('Using raw text as fallback reply, length:', text.length);
      const cleanedText = text.replace(/```json|```/g, '').replace(/^\s*\{[\s\S]*$/, '').trim();
      if (cleanedText.length > 0 && cleanedText.length < 1500) {
        return {
          reply: cleanedText,
          action: 'continue',
          extracted: {}
        };
      }
    }

    console.error('No valid response from AI, text length:', text?.length);
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const statusCode = error?.status || error?.statusCode;

    console.error('AI error:', {
      message: errorMessage,
      status: statusCode,
      type: error?.error?.type,
      fullError: error
    });

    // Check for billing/authentication errors
    if (statusCode === 401 || statusCode === 403) {
      console.error('🚨 ANTHROPIC API KEY INVALID OR EXPIRED');
      await notifyOwnerOfApiError('API key invalid or expired. Check your Anthropic API key.');
      return {
        reply: "I'm temporarily unavailable. Please call or text us at 915-270-2659 for immediate assistance!",
        action: 'escalate',
        extracted: {}
      };
    }

    if (statusCode === 402 || errorMessage.includes('credit') || errorMessage.includes('balance') || errorMessage.includes('billing')) {
      console.error('🚨 ANTHROPIC API OUT OF CREDITS');
      await notifyOwnerOfApiError('Anthropic API out of credits! Add funds at console.anthropic.com/settings/billing');
      return {
        reply: "I'm temporarily unavailable. Please call or text us at 915-270-2659 for immediate assistance!",
        action: 'escalate',
        extracted: {}
      };
    }

    if (statusCode === 429) {
      console.error('🚨 ANTHROPIC API RATE LIMITED');
      return {
        reply: "I'm getting a lot of messages right now! Give me a moment and try again, or call us at 915-270-2659.",
        action: 'continue',
        extracted: {}
      };
    }

    if (statusCode === 529 || statusCode === 503 || errorMessage.includes('overloaded')) {
      console.error('🚨 ANTHROPIC API OVERLOADED');
      return {
        reply: "I'm experiencing high demand right now. Please try again in a moment or call us at 915-270-2659!",
        action: 'continue',
        extracted: {}
      };
    }
  }

  return {
    reply: "Hey! How can I help you today? I can answer questions about our detailing services or help you book an appointment.",
    action: 'continue',
    extracted: {}
  };
}

// Notify owner of critical API errors (only once per hour to avoid spam)
let lastApiErrorNotification = 0;
async function notifyOwnerOfApiError(errorMessage: string): Promise<void> {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  // Only notify once per hour
  if (now - lastApiErrorNotification < oneHour) {
    console.log('Skipping API error notification (already sent within the hour)');
    return;
  }

  lastApiErrorNotification = now;

  // Try to send SMS via Twilio if configured
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  const ownerPhone = process.env.OWNER_PHONE || '9152702659';

  if (twilioSid && twilioToken && twilioPhone) {
    try {
      const client = require('twilio')(twilioSid, twilioToken);
      await client.messages.create({
        body: `🚨 Detail Labs Bot Alert: ${errorMessage}`,
        from: twilioPhone,
        to: `+1${ownerPhone.replace(/\D/g, '')}`
      });
      console.log('Owner notified via SMS about API error');
    } catch (smsError) {
      console.error('Failed to send SMS notification:', smsError);
    }
  } else {
    console.log('Twilio not configured - cannot send SMS notification');
  }
}

async function createBookingFromState(state: ConversationState): Promise<{ success: boolean; error?: string; bookingId?: string }> {
  try {
    // Required: service, date, time, phone, location
    if (!state.serviceId || !state.selectedDate || !state.selectedTime ||
        !state.customerPhone || !state.location) {
      return { success: false, error: 'Missing required information (need phone and address)' };
    }

    // Use Instagram name, or username as fallback, or "Instagram Customer" as last resort
    const customerName = state.customerName || state.instagramName ||
      (state.instagramUsername ? `@${state.instagramUsername}` : 'Instagram Customer');

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

    // Get add-ons for price and duration calculation
    const allAddOns = state.addOnIds?.length ? await getAddOns() : [];
    const selectedAddOns = allAddOns.filter(a => state.addOnIds?.includes(a.id));

    // Calculate total with add-ons (use stored prices if available, otherwise look them up)
    let addOnTotal = 0;
    if (state.addOnPrices?.length) {
      addOnTotal = state.addOnPrices.reduce((a, b) => a + b, 0);
    } else if (selectedAddOns.length) {
      addOnTotal = selectedAddOns.reduce((acc, a) => acc + a.price, 0);
    }
    const totalPrice = servicePrice + addOnTotal;

    // Calculate duration
    const addOnDuration = selectedAddOns.reduce((acc, a) => acc + (a.duration || 0), 0);
    const totalDuration = service.duration + addOnDuration;

    // Validate that the time slot has enough space for the service + add-ons
    const availableSlots = await getAvailableTimeSlots(state.selectedDate, totalDuration);
    if (!availableSlots.includes(state.selectedTime)) {
      return { success: false, error: `The ${state.selectedTime} slot doesn't have enough time for your ${totalDuration}-minute service. Please choose an earlier time slot.` };
    }

    // Get add-on names (use stored names if available, otherwise look them up)
    const addOnNames = state.addOnNames?.length
      ? state.addOnNames
      : selectedAddOns.map(a => a.name);

    const booking: Booking = {
      id: Date.now().toString(),
      customerName: customerName,
      customerEmail: state.customerEmail, // Optional - may be undefined
      customerPhone: state.customerPhone,
      location: state.location,
      serviceId: state.serviceId,
      serviceName: state.serviceName || service.name,
      addOnIds: state.addOnIds || [],
      addOnNames: addOnNames,
      date: state.selectedDate,
      time: state.selectedTime,
      duration: totalDuration,
      totalPrice: totalPrice,
      vehicleSize: state.vehicleSize,
      zipCode: state.zipCode,
      smsOptIn: true, // DM customers implicitly consent to messages
      createdAt: new Date().toISOString(),
    };

    console.log('Creating DM booking:', JSON.stringify(booking, null, 2));
    await addBooking(booking);
    console.log('DM booking created successfully:', booking.id);
    return { success: true, bookingId: booking.id };

  } catch (error: any) {
    console.error('Booking creation error:', error);
    return { success: false, error: error.message };
  }
}

async function sendInstagramMessage(recipientId: string, messageText: string) {
  // Try Instagram User Access Token first (new API), fallback to Page Access Token (legacy)
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('No Instagram access token configured');
    return;
  }

  // Use Instagram Graph API endpoint for IGAA tokens, Facebook Graph API for EAA tokens
  const isInstagramToken = accessToken.startsWith('IGAA');
  const baseUrl = isInstagramToken
    ? 'https://graph.instagram.com/v21.0/me/messages'
    : `https://graph.facebook.com/v21.0/me/messages`;

  try {
    const response = await fetch(`${baseUrl}?access_token=${accessToken}`, {
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
