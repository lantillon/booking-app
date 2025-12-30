import { NextRequest, NextResponse } from 'next/server'

const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100

// Simple in-memory rate limiter (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  record.count++
  return true
}

export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-BOOKING-KEY')
  const expectedKey = process.env.BOOKING_API_KEY

  if (!expectedKey) {
    console.error('BOOKING_API_KEY not set in environment')
    return false
  }

  return apiKey === expectedKey
}

export function apiAuthMiddleware(
  request: NextRequest
): NextResponse | null {
  // Check API key
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    )
  }

  // Check rate limit
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded' },
      { status: 429 }
    )
  }

  return null
}

