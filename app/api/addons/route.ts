import { NextRequest, NextResponse } from 'next/server';
import { getAddOns, addAddOn } from '@/lib/data';
import { AddOn } from '@/types';

export async function GET() {
  try {
    const addOns = await getAddOns();
    return NextResponse.json(addOns);
  } catch (error: any) {
    console.error('Error fetching addons:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch addons' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const addOn: AddOn = await request.json();
  await addAddOn(addOn);
  return NextResponse.json(addOn, { status: 201 });
}


