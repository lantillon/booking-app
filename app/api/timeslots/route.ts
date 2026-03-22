import { NextRequest, NextResponse } from 'next/server';
import { getAvailableTimeSlots } from '@/lib/data';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get('date');
  const duration = searchParams.get('duration');
  const emergency = searchParams.get('emergency') === 'true';
  
  if (!date) {
    return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
  }

  const serviceDuration = duration ? parseInt(duration, 10) : undefined;
  const slots = await getAvailableTimeSlots(date, serviceDuration);
  
  // For emergency bookings, return all slots without filtering by 24-hour restriction
  // (The 24-hour filtering is done in the frontend for regular bookings)
  return NextResponse.json(slots);
}


