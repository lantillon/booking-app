import { NextRequest, NextResponse } from 'next/server';
import { getServices, addService } from '@/lib/data';
import { Service } from '@/types';

export async function GET() {
  try {
    const services = await getServices();
    // Sort by ID (timestamp) in ascending order - oldest services first
    const sortedServices = services.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    return NextResponse.json(sortedServices);
  } catch (error: any) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const service: Service = await request.json();
    await addService(service);
    return NextResponse.json(service, { status: 201 });
  } catch (error: any) {
    console.error('Error creating service:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create service' },
      { status: 500 }
    );
  }
}


