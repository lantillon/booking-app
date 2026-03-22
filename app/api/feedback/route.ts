import { NextRequest, NextResponse } from 'next/server';
import { addFeedback, getFeedbacks } from '@/lib/data';
import { Feedback } from '@/types';

export async function GET() {
  try {
    const feedbacks = await getFeedbacks();
    return NextResponse.json(feedbacks);
  } catch (error: any) {
    console.error('Error fetching feedbacks:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch feedbacks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, customerEmail, bookingId, rating, comment } = body;

    if (!customerName || !customerEmail || !comment) {
      return NextResponse.json(
        { error: 'Missing required fields: customerName, customerEmail, and comment are required' },
        { status: 400 }
      );
    }

    const feedback: Feedback = {
      id: Date.now().toString(),
      customerName,
      customerEmail,
      bookingId: bookingId || undefined,
      rating: rating ? parseInt(rating) : undefined,
      comment,
      createdAt: new Date().toISOString(),
    };

    await addFeedback(feedback);

    return NextResponse.json({ success: true, feedback });
  } catch (error: any) {
    console.error('Error adding feedback:', error);
    return NextResponse.json({ error: error.message || 'Failed to add feedback' }, { status: 500 });
  }
}
