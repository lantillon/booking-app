import { format, parseISO, startOfDay, addMinutes, isWithinInterval, isAfter, isBefore } from 'date-fns'
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'
import { prisma } from './prisma'

const TIMEZONE = 'America/Denver'
const SLOT_GRANULARITY = 30 // minutes
const BUSINESS_HOURS = {
  start: 9, // 9 AM
  end: 18, // 6 PM
}
const DAYS_OF_WEEK = [1, 2, 3, 4, 5, 6] // Mon-Sat (0 = Sunday)

export interface TimeSlot {
  start: string // ISO8601
  end: string // ISO8601
}

export interface AvailabilityResponse {
  service_id: number
  date: string
  slots: TimeSlot[]
  choices: Array<{ title: string; value: string }>
}

/**
 * Generate all possible time slots for a given date in business hours
 */
function generateTimeSlots(date: Date, durationMinutes: number): TimeSlot[] {
  const slots: TimeSlot[] = []
  const zonedDate = utcToZonedTime(date, TIMEZONE)
  const dayStart = startOfDay(zonedDate)
  
  // Check if date is within business days (Mon-Sat)
  const dayOfWeek = zonedDate.getDay()
  if (!DAYS_OF_WEEK.includes(dayOfWeek)) {
    return []
  }

  // Generate slots from 9 AM to 6 PM
  let currentTime = addMinutes(dayStart, BUSINESS_HOURS.start * 60)
  const endTime = addMinutes(dayStart, BUSINESS_HOURS.end * 60)

  while (currentTime < endTime) {
    const slotEnd = addMinutes(currentTime, durationMinutes)
    
    // Don't create slots that extend past business hours
    if (slotEnd <= endTime) {
      // Convert to UTC for storage
      const utcStart = zonedTimeToUtc(currentTime, TIMEZONE)
      const utcEnd = zonedTimeToUtc(slotEnd, TIMEZONE)
      
      slots.push({
        start: utcStart.toISOString(),
        end: utcEnd.toISOString(),
      })
    }
    
    currentTime = addMinutes(currentTime, SLOT_GRANULARITY)
  }

  return slots
}

/**
 * Check if two time ranges overlap
 */
export function timeRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1
}

/**
 * Get available time slots for a service on a specific date
 */
export async function getAvailability(
  serviceId: number,
  date: string // YYYY-MM-DD
): Promise<AvailabilityResponse> {
  // Parse the date and create start/end of day in Denver timezone
  const dateObj = parseISO(date)
  const zonedDate = utcToZonedTime(dateObj, TIMEZONE)
  const dayStart = startOfDay(zonedDate)
  const dayEnd = addMinutes(dayStart, 24 * 60) // End of day

  // Convert to UTC for database queries
  const utcDayStart = zonedTimeToUtc(dayStart, TIMEZONE)
  const utcDayEnd = zonedTimeToUtc(dayEnd, TIMEZONE)

  // Get service details
  const service = await prisma.service.findUnique({
    where: { id: serviceId, isActive: true },
  })

  if (!service) {
    throw new Error('Service not found or inactive')
  }

  // Generate all possible slots
  const allSlots = generateTimeSlots(dateObj, service.durationMinutes)

  // Get existing bookings for this service on this date
  const bookings = await prisma.booking.findMany({
    where: {
      serviceId,
      startTime: {
        gte: utcDayStart,
        lt: utcDayEnd,
      },
    },
  })

  // Get active holds (not expired) for this service on this date
  const now = new Date()
  const holds = await prisma.hold.findMany({
    where: {
      serviceId,
      startTime: {
        gte: utcDayStart,
        lt: utcDayEnd,
      },
      expiresAt: {
        gt: now,
      },
    },
  })

  // Filter out slots that overlap with bookings or active holds
  const availableSlots = allSlots.filter((slot) => {
    const slotStart = parseISO(slot.start)
    const slotEnd = parseISO(slot.end)

    // Check against bookings
    const hasBookingOverlap = bookings.some((booking) =>
      timeRangesOverlap(slotStart, slotEnd, booking.startTime, booking.endTime)
    )

    if (hasBookingOverlap) return false

    // Check against active holds
    const hasHoldOverlap = holds.some((hold) =>
      timeRangesOverlap(slotStart, slotEnd, hold.startTime, hold.endTime)
    )

    return !hasHoldOverlap
  })

  // Format choices for ManyChat buttons
  const choices = availableSlots.map((slot) => {
    const slotStart = parseISO(slot.start)
    const zonedStart = utcToZonedTime(slotStart, TIMEZONE)
    const timeStr = format(zonedStart, 'h:mm a')
    
    return {
      title: timeStr,
      value: `${slot.start}|${slot.end}`,
    }
  })

  return {
    service_id: serviceId,
    date,
    slots: availableSlots,
    choices,
  }
}

