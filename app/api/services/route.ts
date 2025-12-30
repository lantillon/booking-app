import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Log environment check (without exposing secrets)
    console.log('DATABASE_URL present:', !!process.env.DATABASE_URL)
    
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    })

    console.log(`Found ${services.length} active services`)
    return NextResponse.json(services)
  } catch (error: any) {
    // Log full error details for Vercel function logs
    console.error('Services API Error:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
    })
    
    // Return error details that will show in Vercel logs
    return NextResponse.json(
      { 
        error: 'server_error', 
        message: error.message || 'Database connection failed',
        code: error.code || 'UNKNOWN'
      },
      { status: 500 }
    )
  }
}

