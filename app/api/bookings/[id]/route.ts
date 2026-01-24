import { NextRequest, NextResponse } from 'next/server';
import { getBooking, deleteBooking } from '@/lib/data';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const booking = await getBooking(params.id);
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  return NextResponse.json(booking);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await deleteBooking(params.id);
  return NextResponse.json({ success: true });
}


