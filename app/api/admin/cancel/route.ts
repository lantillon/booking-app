import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const cancelSchema = z.object({
  booking_id: z.string().uuid(),
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = cancelSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'invalid_input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { booking_id } = validation.data

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
    console.error('Admin cancel error:', error)
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

