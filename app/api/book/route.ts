import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { apiAuthMiddleware } from '@/lib/api-auth'

const bookSchema = z.object({
  hold_id: z.string().uuid(),
  customer_name: z.string().min(1),
  customer_phone: z.string().min(1),
  notes: z.string().optional().default(''),
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authError = apiAuthMiddleware(request)
    if (authError) return authError

    // Parse and validate request body
    const body = await request.json()
    const validation = bookSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'invalid_input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { hold_id, customer_name, customer_phone, notes } = validation.data

    // Use transaction to atomically: validate hold, create booking, delete hold
    const result = await prisma.$transaction(async (tx) => {
      // Find the hold
      const hold = await tx.hold.findUnique({
        where: { id: hold_id },
        include: { service: true },
      })

      if (!hold) {
        return { error: 'invalid_input', message: 'Hold not found' }
      }

      // Check if hold is expired
      const now = new Date()
      if (hold.expiresAt <= now) {
        // Clean up expired hold
        await tx.hold.delete({ where: { id: hold_id } })
        return { error: 'hold_expired' }
      }

      // Check if slot is still available (no overlapping bookings)
      const overlappingBookings = await tx.booking.findMany({
        where: {
          serviceId: hold.serviceId,
          OR: [
            {
              AND: [
                { startTime: { lte: hold.startTime } },
                { endTime: { gt: hold.startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: hold.endTime } },
                { endTime: { gte: hold.endTime } },
              ],
            },
            {
              AND: [
                { startTime: { gte: hold.startTime } },
                { endTime: { lte: hold.endTime } },
              ],
            },
          ],
        },
      })

      if (overlappingBookings.length > 0) {
        // Clean up hold since slot is taken
        await tx.hold.delete({ where: { id: hold_id } })
        return { error: 'slot_taken' }
      }

      // Create booking
      const booking = await tx.booking.create({
        data: {
          serviceId: hold.serviceId,
          startTime: hold.startTime,
          endTime: hold.endTime,
          customerName: customer_name,
          customerPhone: customer_phone,
          notes: notes || '',
        },
      })

      // Delete the hold
      await tx.hold.delete({ where: { id: hold_id } })

      return {
        booking_id: booking.id,
        start_time: booking.startTime.toISOString(),
        end_time: booking.endTime.toISOString(),
        service_name: hold.service.name,
      }
    }, {
      isolationLevel: 'Serializable',
    })

    if ('error' in result) {
      const status = result.error === 'hold_expired' || result.error === 'slot_taken' ? 409 : 400
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Book error:', error)
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

