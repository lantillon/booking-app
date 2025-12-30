import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseISO, startOfDay, endOfDay } from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'

const TIMEZONE = 'America/Denver'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const serviceId = searchParams.get('service_id')

    const where: any = {}

    if (date) {
      const dateObj = parseISO(date)
      const zonedDate = new Date(dateObj)
      const dayStart = startOfDay(zonedDate)
      const dayEnd = endOfDay(zonedDate)
      const utcDayStart = zonedTimeToUtc(dayStart, TIMEZONE)
      const utcDayEnd = zonedTimeToUtc(dayEnd, TIMEZONE)

      where.startTime = {
        gte: utcDayStart,
        lte: utcDayEnd,
      }
    }

    if (serviceId) {
      where.serviceId = Number(serviceId)
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        service: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Admin bookings GET error:', error)
    return NextResponse.json(
      { error: 'server_error' },
      { status: 500 }
    )
  }
}

