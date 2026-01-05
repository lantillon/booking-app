import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiAuthMiddleware } from '@/lib/api-auth'
import { getAvailability } from '@/lib/availability'

// ManyChat dynamic block response format
// Docs: https://manychat.com/features/dynamic-content (structure: version + content.messages)

const querySchema = z.object({
  service_id: z.string().transform(Number),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Re‑use the same API key auth as the main availability endpoint
    const authError = apiAuthMiddleware(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const params = {
      service_id: searchParams.get('service_id'),
      date: searchParams.get('date'),
    }

    const validation = querySchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'invalid_input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { service_id, date } = validation.data

    // Get our standard availability structure
    const availability = await getAvailability(service_id, date)

    // Map to ManyChat dynamic block format
    // Minimal structure: version + content.messages with text + buttons
    const manychatPayload = {
      version: 'v2',
      content: {
        messages: [
          {
            type: 'text',
            text:
              availability.choices.length > 0
                ? 'Select an available time:'
                : 'No available times for this date. Please choose another date.',
            buttons: availability.choices.map((choice) => ({
              type: 'reply',
              caption: choice.title,
              payload: choice.value,
            })),
          },
        ],
      },
    }

    return NextResponse.json(manychatPayload)
  } catch (error: any) {
    console.error('ManyChat availability error:', error)

    if (error.message === 'Service not found or inactive') {
      return NextResponse.json(
        {
          version: 'v2',
          content: {
            messages: [
              {
                type: 'text',
                text: 'Service not found or inactive.',
              },
            ],
          },
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        version: 'v2',
        content: {
          messages: [
            {
              type: 'text',
              text: 'Sorry, something went wrong while fetching availability.',
            },
          ],
        },
      },
      { status: 500 }
    )
  }
}


