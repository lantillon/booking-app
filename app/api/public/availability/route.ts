import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getAvailability } from '@/lib/availability'
import { z } from 'zod'

const querySchema = z.object({
  service_id: z.string().transform(Number),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// Public proxy route that handles API key server-side
export async function GET(request: NextRequest) {
  try {
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
    const availability = await getAvailability(service_id, date)

    return NextResponse.json(availability)
  } catch (error: any) {
    console.error('Public availability error:', error)
    
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

