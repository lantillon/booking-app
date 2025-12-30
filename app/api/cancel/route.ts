import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { apiAuthMiddleware } from '@/lib/api-auth'

const cancelSchema = z.object({
  booking_id: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authError = apiAuthMiddleware(request)
    if (authError) return authError

    // Parse and validate request body
    const body = await request.json()
    const validation = cancelSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'invalid_input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { booking_id } = validation.data

    // Delete booking
    const booking = await prisma.booking.delete({
      where: { id: booking_id },
      include: { service: true },
    }).catch(() => null)

    if (!booking) {
      return NextResponse.json(
        { error: 'invalid_input', message: 'Booking not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled',
      booking_id: booking.id,
    })
  } catch (error: any) {
    console.error('Cancel error:', error)
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

