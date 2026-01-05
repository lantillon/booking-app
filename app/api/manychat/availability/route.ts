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
    if (authError) {
      // Return ManyChat format even for auth errors
      return NextResponse.json(
        {
          version: 'v2',
          content: {
            messages: [
              {
                type: 'text',
                text: 'Authentication failed. Please check your API key.',
              },
            ],
          },
        },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const serviceIdParam = searchParams.get('service_id')
    const dateParam = searchParams.get('date')
    
    // Log what we received for debugging
    console.log('ManyChat request params:', { service_id: serviceIdParam, date: dateParam, fullUrl: request.url })
    
    // Check if parameters are missing
    if (!serviceIdParam) {
      return NextResponse.json(
        {
          version: 'v2',
          content: {
            messages: [
              {
                type: 'text',
                text: 'Missing service_id parameter. Make sure ManyChat is sending service_id={{selected_service_id}} in the URL.',
              },
            ],
          },
        },
        { status: 400 }
      )
    }
    
    if (!dateParam) {
      return NextResponse.json(
        {
          version: 'v2',
          content: {
            messages: [
              {
                type: 'text',
                text: 'Missing date parameter. Make sure ManyChat is sending date={{selected_date}} in the URL.',
              },
            ],
          },
        },
        { status: 400 }
      )
    }

    const params = {
      service_id: serviceIdParam,
      date: dateParam,
    }

    const validation = querySchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json(
        {
          version: 'v2',
          content: {
            messages: [
              {
                type: 'text',
                text: `Invalid input: ${validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
              },
            ],
          },
        },
        { status: 400 }
      )
    }

    const { service_id, date } = validation.data
    
    // Double-check service_id is valid
    if (!service_id || isNaN(service_id) || service_id <= 0) {
      return NextResponse.json(
        {
          version: 'v2',
          content: {
            messages: [
              {
                type: 'text',
                text: `Invalid service_id: ${serviceIdParam}. It must be a positive number.`,
              },
            ],
          },
        },
        { status: 400 }
      )
    }

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
    console.error('ManyChat availability error:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
    })

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
              // Always include the real error message so we can debug from ManyChat
              text: `Error: ${error?.message || 'Unknown error'}`,
            },
          ],
        },
      },
      { status: 500 }
    )
  }
}


