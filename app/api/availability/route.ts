import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiAuthMiddleware } from '@/lib/api-auth'
import { getAvailability } from '@/lib/availability'

const querySchema = z.object({
  service_id: z.string().transform(Number),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authError = apiAuthMiddleware(request)
    if (authError) return authError

    // Parse and validate query parameters
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

    // Get availability
    const availability = await getAvailability(service_id, date)

    return NextResponse.json(availability)
  } catch (error: any) {
    console.error('Availability error:', error)
    
    if (error.message === 'Service not found or inactive') {
      return NextResponse.json(
        { error: 'invalid_input', message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

