import { NextRequest, NextResponse } from 'next/server';
import { getAvailability, updateAvailability } from '@/lib/data';
import { Availability } from '@/types';

export async function GET() {
  const availability = await getAvailability();
  return NextResponse.json(availability);
}

// Handle both PUT and POST for better compatibility with Netlify
async function handleUpdate(request: NextRequest) {
  try {
    const availability: Availability = await request.json();
    
    // Validate required fields
    if (!availability || !availability.workingHours) {
      return NextResponse.json(
        { success: false, error: 'Invalid availability data' },
        { status: 400 }
      );
    }
    
    await updateAvailability(availability);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating availability:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update availability',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  return handleUpdate(request);
}

// Also support POST for Netlify compatibility
export async function POST(request: NextRequest) {
  return handleUpdate(request);
}


