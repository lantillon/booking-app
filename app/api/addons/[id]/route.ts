import { NextRequest, NextResponse } from 'next/server';
import { getAddOn, updateAddOn, deleteAddOn } from '@/lib/data';
import { AddOn } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const addOn = await getAddOn(params.id);
  if (!addOn) {
    return NextResponse.json({ error: 'Add-on not found' }, { status: 404 });
  }
  return NextResponse.json(addOn);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const updates: Partial<AddOn> = await request.json();
  await updateAddOn(params.id, updates);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await deleteAddOn(params.id);
  return NextResponse.json({ success: true });
}


