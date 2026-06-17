// Supabase helper functions for data operations
import { supabase, isSupabaseConfigured } from './supabase';
import { Service, AddOn, Booking, Availability, Customer, Feedback } from '@/types';

const defaultAvailability: Availability = {
  workingHours: {
    monday: { start: '07:00', end: '20:00', enabled: true },
    tuesday: { start: '07:00', end: '20:00', enabled: true },
    wednesday: { start: '07:00', end: '20:00', enabled: true },
    thursday: { start: '07:00', end: '20:00', enabled: true },
    friday: { start: '07:00', end: '20:00', enabled: true },
    saturday: { start: '07:00', end: '20:00', enabled: true },
    sunday: { start: '11:00', end: '20:00', enabled: true },
  },
  slotDuration: 30,
  paddingTime: 60, // 1 hour buffer between appointments
};

export async function getServicesSupabase(): Promise<Service[]> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('services').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(transformService);
}

export async function getServiceSupabase(id: string): Promise<Service | undefined> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('services').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return undefined; // Not found
    throw error;
  }
  return data ? transformService(data) : undefined;
}

export async function addServiceSupabase(service: Service): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const insertData: any = {
    id: service.id,
    name: service.name,
    description: service.description,
    duration: service.duration,
    price: service.price,
    image: service.image || null,
    vehicle_pricing: service.vehiclePricing || null,
    use_vehicle_pricing: service.useVehiclePricing || false,
  };
  // Only include addon_ids if provided (column may not exist in older schemas)
  if (service.addOnIds !== undefined) {
    insertData.addon_ids = service.addOnIds || null;
  }
  // Only include seat_row_pricing if provided (column may not exist yet)
  if (service.seatRowPricing !== undefined) {
    insertData.seat_row_pricing = service.seatRowPricing;
    insertData.use_seat_row_pricing = service.useSeatRowPricing || false;
  }
  const { error } = await supabase.from('services').insert(insertData);
  if (error) throw error;
}

export async function updateServiceSupabase(id: string, service: Partial<Service>): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const updateData: any = {};
  if (service.name !== undefined) updateData.name = service.name;
  if (service.description !== undefined) updateData.description = service.description;
  if (service.duration !== undefined) updateData.duration = service.duration;
  if (service.price !== undefined) updateData.price = service.price;
  if (service.image !== undefined) updateData.image = service.image;
  if (service.vehiclePricing !== undefined) updateData.vehicle_pricing = service.vehiclePricing;
  if (service.useVehiclePricing !== undefined) updateData.use_vehicle_pricing = service.useVehiclePricing;
  if (service.seatRowPricing !== undefined) updateData.seat_row_pricing = service.seatRowPricing;
  if (service.useSeatRowPricing !== undefined) updateData.use_seat_row_pricing = service.useSeatRowPricing;
  // Only update addon_ids if provided and column exists
  // Make it optional for backward compatibility
  if (service.addOnIds !== undefined) {
    updateData.addon_ids = service.addOnIds || null;
  }
  const { error } = await supabase.from('services').update(updateData).eq('id', id);
  if (error) throw error;
}

export async function deleteServiceSupabase(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
}

export async function getAddOnsSupabase(): Promise<AddOn[]> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('addons').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(transformAddOn);
}

export async function getAddOnSupabase(id: string): Promise<AddOn | undefined> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('addons').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return undefined;
    throw error;
  }
  return data ? transformAddOn(data) : undefined;
}

export async function addAddOnSupabase(addOn: AddOn): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('addons').insert({
    id: addOn.id,
    name: addOn.name,
    description: addOn.description,
    price: addOn.price,
    duration: addOn.duration || null,
  });
  if (error) throw error;
}

export async function updateAddOnSupabase(id: string, addOn: Partial<AddOn>): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const updateData: any = {};
  if (addOn.name !== undefined) updateData.name = addOn.name;
  if (addOn.description !== undefined) updateData.description = addOn.description;
  if (addOn.price !== undefined) updateData.price = addOn.price;
  if (addOn.duration !== undefined) updateData.duration = addOn.duration;
  const { error } = await supabase.from('addons').update(updateData).eq('id', id);
  if (error) throw error;
}

export async function deleteAddOnSupabase(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('addons').delete().eq('id', id);
  if (error) throw error;
}

export async function getBookingsSupabase(): Promise<Booking[]> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(transformBooking);
}

export async function getBookingSupabase(id: string): Promise<Booking | undefined> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return undefined;
    throw error;
  }
  return data ? transformBooking(data) : undefined;
}

export async function addBookingSupabase(booking: Booking): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  // Build insert object with only fields that exist in the database
  // Note: customer_email, vehicle_size, seat_rows, zip_code may not exist in older schemas
  const insertData: Record<string, any> = {
    id: booking.id,
    customer_name: booking.customerName,
    customer_phone: booking.customerPhone || null,
    location: booking.location || '',
    service_id: booking.serviceId,
    service_name: booking.serviceName,
    addon_ids: booking.addOnIds || [],
    addon_names: booking.addOnNames || [],
    date: booking.date,
    time: booking.time,
    duration: booking.duration,
    total_price: booking.totalPrice,
  };

  // Add optional fields - these columns may not exist in older schemas
  // Use empty string for customer_email if not provided (for NOT NULL constraint)
  insertData.customer_email = booking.customerEmail || '';

  // These fields may not exist - try to add them but handle gracefully
  if (booking.vehicleSize) insertData.vehicle_size = booking.vehicleSize;
  if (booking.seatRows) insertData.seat_rows = booking.seatRows;
  if (booking.zipCode) insertData.zip_code = booking.zipCode;
  if (booking.smsOptIn !== undefined) insertData.sms_opt_in = booking.smsOptIn;

  const { error } = await supabase.from('bookings').insert(insertData);
  if (error) {
    console.error('Supabase booking insert error:', error);
    // If error is about missing columns, retry without optional fields
    if (error.message?.includes('column') && error.message?.includes('does not exist')) {
      console.log('Retrying insert without optional columns...');
      const basicData = {
        id: booking.id,
        customer_name: booking.customerName,
        customer_email: booking.customerEmail || '',
        customer_phone: booking.customerPhone || null,
        location: booking.location || '',
        service_id: booking.serviceId,
        service_name: booking.serviceName,
        addon_ids: booking.addOnIds || [],
        addon_names: booking.addOnNames || [],
        date: booking.date,
        time: booking.time,
        duration: booking.duration,
        total_price: booking.totalPrice,
      };
      const { error: retryError } = await supabase.from('bookings').insert(basicData);
      if (retryError) {
        console.error('Supabase booking insert retry error:', retryError);
        throw retryError;
      }
      return;
    }
    throw error;
  }
}

export async function deleteBookingSupabase(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) throw error;
}

export async function getAvailabilitySupabase(): Promise<Availability> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('availability').select('*').eq('id', 'singleton').single();
  if (error) {
    if (error.code === 'PGRST116') return defaultAvailability;
    throw error;
  }
  return {
    workingHours: data.working_hours as Availability['workingHours'],
    slotDuration: data.slot_duration,
    paddingTime: data.padding_time,
  };
}

export async function updateAvailabilitySupabase(availability: Availability): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('availability')
    .upsert({
      id: 'singleton',
      working_hours: availability.workingHours,
      slot_duration: availability.slotDuration,
      padding_time: availability.paddingTime,
    });
  if (error) throw error;
}

export async function getCustomersSupabase(): Promise<Customer[]> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(transformCustomer);
}

export async function getCustomerByEmailSupabase(email: string): Promise<Customer | undefined> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('customers').select('*').eq('email', email.toLowerCase()).single();
  if (error) {
    if (error.code === 'PGRST116') return undefined;
    throw error;
  }
  return data ? transformCustomer(data) : undefined;
}

export async function getCustomerSupabase(id: string): Promise<Customer | undefined> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return undefined;
    throw error;
  }
  return data ? transformCustomer(data) : undefined;
}

export async function createOrUpdateCustomerSupabase(customerData: {
  name: string;
  email: string;
  phone?: string;
  amountSpent: number;
}): Promise<Customer> {
  if (!supabase) throw new Error('Supabase not configured');
  const pointsToAward = Math.floor(customerData.amountSpent);
  
  // Try to get existing customer
  const existing = await getCustomerByEmailSupabase(customerData.email);
  
  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('customers')
      .update({
        name: customerData.name,
        phone: customerData.phone || existing.phone,
        total_spent: existing.totalSpent + customerData.amountSpent,
        points: existing.points + pointsToAward,
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return transformCustomer(data);
  } else {
    // Create new
    const newCustomer: Customer = {
      id: Date.now().toString(),
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      totalSpent: customerData.amountSpent,
      points: pointsToAward,
      createdAt: new Date().toISOString(),
    };
    const { error } = await supabase.from('customers').insert({
      id: newCustomer.id,
      name: newCustomer.name,
      email: newCustomer.email,
      phone: newCustomer.phone || null,
      total_spent: newCustomer.totalSpent,
      points: newCustomer.points,
    });
    if (error) throw error;
    return newCustomer;
  }
}

export async function applyDiscountSupabase(customerId: string, discountAmount: number): Promise<boolean> {
  if (!supabase) throw new Error('Supabase not configured');
  const customer = await getCustomerSupabase(customerId);
  if (!customer) return false;
  
  const pointsNeeded = (discountAmount / 10) * 200;
  if (customer.points >= pointsNeeded) {
    const { error } = await supabase
      .from('customers')
      .update({ points: customer.points - pointsNeeded })
      .eq('id', customerId);
    if (error) throw error;
    return true;
  }
  return false;
}

// Transform functions to convert database schema to TypeScript types
function transformService(row: any): Service {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    duration: row.duration,
    price: parseFloat(row.price),
    image: row.image || undefined,
    vehiclePricing: row.vehicle_pricing || undefined,
    useVehiclePricing: row.use_vehicle_pricing || false,
    seatRowPricing: row.seat_row_pricing || undefined,
    useSeatRowPricing: row.use_seat_row_pricing || false,
    addOnIds: row.addon_ids || undefined,
  };
}

function transformAddOn(row: any): AddOn {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: parseFloat(row.price),
    duration: row.duration || undefined,
  };
}

function transformBooking(row: any): Booking {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerEmail: row.customer_email || undefined,
    customerPhone: row.customer_phone || undefined,
    location: row.location,
    serviceId: row.service_id,
    serviceName: row.service_name,
    addOnIds: row.addon_ids || [],
    addOnNames: row.addon_names || [],
    date: row.date,
    time: row.time,
    duration: row.duration,
    totalPrice: parseFloat(row.total_price),
    vehicleSize: row.vehicle_size || undefined,
    seatRows: row.seat_rows || undefined,
    zipCode: row.zip_code || undefined,
    smsOptIn: row.sms_opt_in || false,
    createdAt: row.created_at,
  };
}

function transformCustomer(row: any): Customer {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || undefined,
    totalSpent: parseFloat(row.total_spent),
    points: row.points,
    createdAt: row.created_at,
  };
}

function transformFeedback(row: any): Feedback {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    bookingId: row.booking_id || undefined,
    rating: row.rating || undefined,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

export async function getFeedbacksSupabase(): Promise<Feedback[]> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(transformFeedback);
}

export async function addFeedbackSupabase(feedback: Feedback): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('feedback').insert({
    id: feedback.id,
    customer_name: feedback.customerName,
    customer_email: feedback.customerEmail,
    booking_id: feedback.bookingId || null,
    rating: feedback.rating || null,
    comment: feedback.comment,
  });
  if (error) throw error;
}