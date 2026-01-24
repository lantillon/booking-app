import { NextRequest, NextResponse } from 'next/server';
import { getService, updateService, deleteService } from '@/lib/data';
import { Service } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const service = await getService(params.id);
  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }
  return NextResponse.json(service);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates: Partial<Service> = await request.json();
    await updateService(params.id, updates);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating service:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update service' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await deleteService(params.id);
  return NextResponse.json({ success: true });
}


