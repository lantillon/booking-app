import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { parseISO } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { timeRangesOverlap } from '@/lib/availability'

const holdSchema = z.object({
  service_id: z.number(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  session_id: z.string(),
})

const HOLD_DURATION_MINUTES = 8

// Public proxy route that handles API key server-side
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = holdSchema.safeParse({
      service_id: Number(body.service_id),
      start: body.start,
      end: body.end,
      session_id: body.session_id,
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: 'invalid_input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { service_id, start, end, session_id } = validation.data
    const startTime = parseISO(start)
    const endTime = parseISO(end)

    const service = await prisma.service.findUnique({
      where: { id: service_id, isActive: true },
    })

    if (!service) {
      return NextResponse.json(
        { error: 'invalid_input', message: 'Service not found or inactive' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const overlappingBookings = await tx.booking.findMany({
        where: {
          serviceId: service_id,
          OR: [
            {
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gt: startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: endTime } },
                { endTime: { gte: endTime } },
              ],
            },
            {
              AND: [
                { startTime: { gte: startTime } },
                { endTime: { lte: endTime } },
              ],
            },
          ],
        },
      })

      if (overlappingBookings.length > 0) {
        return { error: 'slot_taken' }
      }

      const now = new Date()
      const overlappingHolds = await tx.hold.findMany({
        where: {
          serviceId: service_id,
          expiresAt: { gt: now },
          OR: [
            {
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gt: startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: endTime } },
                { endTime: { gte: endTime } },
              ],
            },
            {
              AND: [
                { startTime: { gte: startTime } },
                { endTime: { lte: endTime } },
              ],
            },
          ],
        },
      })

      if (overlappingHolds.length > 0) {
        return { error: 'slot_taken' }
      }

      const expiresAt = new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000)
      const hold = await tx.hold.create({
        data: {
          serviceId: service_id,
          startTime,
          endTime,
          sessionId: session_id,
          expiresAt,
        },
      })

      return { hold_id: hold.id, expires_at: expiresAt.toISOString() }
    }, {
      isolationLevel: 'Serializable',
    })

    if ('error' in result) {
      return NextResponse.json(result, { status: 409 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Public hold error:', error)
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

