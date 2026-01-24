import { NextRequest, NextResponse } from 'next/server';
import { getAvailableTimeSlots } from '@/lib/data';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get('date');
  const duration = searchParams.get('duration');
  
  if (!date) {
    return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
  }

  const serviceDuration = duration ? parseInt(duration, 10) : undefined;
  const slots = await getAvailableTimeSlots(date, serviceDuration);
  return NextResponse.json(slots);
}


