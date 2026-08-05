import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('customer_name, customer_phone')
    .not('customer_phone', 'is', null)
    .order('customer_name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get unique customers by phone number
  const uniqueCustomers = new Map();
  for (const row of data || []) {
    if (row.customer_phone && !uniqueCustomers.has(row.customer_phone)) {
      uniqueCustomers.set(row.customer_phone, {
        name: row.customer_name,
        phone: row.customer_phone,
      });
    }
  }

  const customers = Array.from(uniqueCustomers.values());

  return NextResponse.json({ customers, count: customers.length });
}
