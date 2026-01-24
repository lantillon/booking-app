import { NextRequest, NextResponse } from 'next/server';
import { getCustomerByEmail, getCustomers } from '@/lib/data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (email) {
    const customer = await getCustomerByEmail(email);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    return NextResponse.json(customer);
  }

  const customers = await getCustomers();
  return NextResponse.json(customers);
}


