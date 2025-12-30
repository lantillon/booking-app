import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    })

    return NextResponse.json(services)
  } catch (error: any) {
    console.error('Services error:', error)
    
    // Provide more helpful error message in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message || 'Database connection failed'
      : 'server_error'
    
    return NextResponse.json(
      { error: 'server_error', message: errorMessage },
      { status: 500 }
    )
  }
}

