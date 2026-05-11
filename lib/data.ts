import fs from 'fs';
import path from 'path';
import { Service, AddOn, Booking, Availability, Customer, Feedback } from '@/types';
import { isSupabaseConfigured } from './supabase';
import {
  getServicesSupabase,
  getServiceSupabase,
  addServiceSupabase,
  updateServiceSupabase,
  deleteServiceSupabase,
  getAddOnsSupabase,
  getAddOnSupabase,
  addAddOnSupabase,
  updateAddOnSupabase,
  deleteAddOnSupabase,
  getBookingsSupabase,
  getBookingSupabase,
  addBookingSupabase,
  deleteBookingSupabase,
  getAvailabilitySupabase,
  updateAvailabilitySupabase,
  getCustomersSupabase,
  getCustomerByEmailSupabase,
  getCustomerSupabase,
  createOrUpdateCustomerSupabase,
  applyDiscountSupabase,
  getFeedbacksSupabase,
  addFeedbackSupabase,
} from './data-supabase';

// Determine the correct data file path
// In serverless (Netlify/Vercel), use /tmp which is writable
// Otherwise use project root
const isServerless = !!(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const dataFilePath = isServerless
  ? path.join('/tmp', 'data.json')
  : path.join(process.cwd(), 'data.json');
const fallbackDataPath = path.join(process.cwd(), 'data.json'); // For reading initial data

export interface DataStore {
  services: Service[];
  addOns: AddOn[];
  bookings: Booking[];
  availability: Availability;
  customers: Customer[];
  feedback: Feedback[];
}

function readData(): DataStore {
  try {
    // In serverless, try reading from /tmp first, then fallback to project root for initial data
    if (isServerless) {
      // Try /tmp first (where we write)
      if (fs.existsSync(dataFilePath)) {
        const fileContents = fs.readFileSync(dataFilePath, 'utf8');
        const data = JSON.parse(fileContents);
        if (!data.customers) {
          data.customers = [];
        }
        return data;
      }
      // If /tmp doesn't have data, try reading from project root (read-only, for initial data)
      if (fs.existsSync(fallbackDataPath)) {
        const fileContents = fs.readFileSync(fallbackDataPath, 'utf8');
        const data = JSON.parse(fileContents);
        if (!data.customers) {
          data.customers = [];
        }
        // Copy to /tmp for future writes
        try {
          fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
        } catch (e) {
          // Ignore if we can't write to /tmp
        }
        return data;
      }
    } else {
      // Non-serverless: read from project root
      if (fs.existsSync(dataFilePath)) {
        const fileContents = fs.readFileSync(dataFilePath, 'utf8');
        const data = JSON.parse(fileContents);
        if (!data.customers) {
          data.customers = [];
        }
        return data;
      }
    }
    // Return default data if file doesn't exist
    throw new Error('Data file not found');
  } catch (error) {
    return {
      services: [],
      addOns: [],
      bookings: [],
      customers: [],
      feedback: [],
      availability: {
        workingHours: {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '09:00', end: '17:00', enabled: false },
          sunday: { start: '09:00', end: '17:00', enabled: false },
        },
        slotDuration: 30,
        paddingTime: 60, // 60 minutes (1 hour) buffer between appointments
      },
    };
  }
}

function writeData(data: DataStore): void {
  // In serverless, only write to /tmp (which is writable)
  // Never try to write to /var/task or project root in serverless
  if (isServerless) {
    // In serverless, dataFilePath should already be /tmp/data.json
    try {
      // Ensure /tmp directory exists (it should, but just in case)
      const dir = path.dirname(dataFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
      return; // Success
    } catch (error: any) {
      // If we can't write to /tmp, log but don't throw
      // This allows the API to continue working even if persistence fails
      console.error('Error writing to /tmp/data.json:', error);
      console.warn('Warning: Unable to persist data. Data will be lost between function invocations.');
      return; // Don't throw - allow operation to continue
    }
  } else {
    // Non-serverless: write to project root
    try {
      const dir = path.dirname(dataFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error: any) {
      throw new Error(`Failed to write data file: ${error.message}`);
    }
  }
}

// Services
export async function getServices(): Promise<Service[]> {
  if (isSupabaseConfigured) {
    return await getServicesSupabase();
  }
  return readData().services;
}

export async function getService(id: string): Promise<Service | undefined> {
  if (isSupabaseConfigured) {
    return await getServiceSupabase(id);
  }
  return readData().services.find((s) => s.id === id);
}

export async function addService(service: Service): Promise<void> {
  if (isSupabaseConfigured) {
    return await addServiceSupabase(service);
  }
  const data = readData();
  data.services.push(service);
  writeData(data);
}

export async function updateService(id: string, service: Partial<Service>): Promise<void> {
  if (isSupabaseConfigured) {
    return await updateServiceSupabase(id, service);
  }
  const data = readData();
  const index = data.services.findIndex((s) => s.id === id);
  if (index !== -1) {
    data.services[index] = { ...data.services[index], ...service };
    writeData(data);
  }
}

export async function deleteService(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    return await deleteServiceSupabase(id);
  }
  const data = readData();
  data.services = data.services.filter((s) => s.id !== id);
  writeData(data);
}

// Add-ons
export async function getAddOns(): Promise<AddOn[]> {
  if (isSupabaseConfigured) {
    return await getAddOnsSupabase();
  }
  return readData().addOns;
}

export async function getAddOn(id: string): Promise<AddOn | undefined> {
  if (isSupabaseConfigured) {
    return await getAddOnSupabase(id);
  }
  return readData().addOns.find((a) => a.id === id);
}

export async function addAddOn(addOn: AddOn): Promise<void> {
  if (isSupabaseConfigured) {
    return await addAddOnSupabase(addOn);
  }
  const data = readData();
  data.addOns.push(addOn);
  writeData(data);
}

export async function updateAddOn(id: string, addOn: Partial<AddOn>): Promise<void> {
  if (isSupabaseConfigured) {
    return await updateAddOnSupabase(id, addOn);
  }
  const data = readData();
  const index = data.addOns.findIndex((a) => a.id === id);
  if (index !== -1) {
    data.addOns[index] = { ...data.addOns[index], ...addOn };
    writeData(data);
  }
}

export async function deleteAddOn(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    return await deleteAddOnSupabase(id);
  }
  const data = readData();
  data.addOns = data.addOns.filter((a) => a.id !== id);
  writeData(data);
}

// Bookings
export async function getBookings(): Promise<Booking[]> {
  if (isSupabaseConfigured) {
    return await getBookingsSupabase();
  }
  return readData().bookings;
}

export async function getBooking(id: string): Promise<Booking | undefined> {
  if (isSupabaseConfigured) {
    return await getBookingSupabase(id);
  }
  return readData().bookings.find((b) => b.id === id);
}

export async function addBooking(booking: Booking): Promise<void> {
  if (isSupabaseConfigured) {
    return await addBookingSupabase(booking);
  }
  const data = readData();
  data.bookings.push(booking);
  try {
    writeData(data);
  } catch (error: any) {
    // In serverless, file writes may fail - log but don't throw
    if (process.env.NETLIFY || process.env.VERCEL) {
      console.warn('Could not persist booking to file system (read-only). Booking exists in memory for this request only.');
    } else {
      throw error;
    }
  }
}

export async function deleteBooking(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    return await deleteBookingSupabase(id);
  }
  const data = readData();
  data.bookings = data.bookings.filter((b) => b.id !== id);
  writeData(data);
}

// Availability
export async function getAvailability(): Promise<Availability> {
  if (isSupabaseConfigured) {
    return await getAvailabilitySupabase();
  }
  return readData().availability;
}

export async function updateAvailability(availability: Availability): Promise<void> {
  if (isSupabaseConfigured) {
    return await updateAvailabilitySupabase(availability);
  }
  const data = readData();
  data.availability = availability;
  writeData(data);
}

// Fixed time slots: 9 AM, 1 PM, 4 PM (weekdays)
const FIXED_SLOTS_WEEKDAY = ['09:00', '13:00', '16:00'];
// Saturday slots: 9 AM and 1 PM only (no 4 PM, no restriction on 1 PM)
const FIXED_SLOTS_SATURDAY = ['09:00', '13:00'];

// Helper to get the start of the week (Monday) for a given date
function getWeekStart(date: string): string {
  const d = new Date(date + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// Helper to get all dates in a week (Monday to Friday only, excluding Saturday)
function getWeekdayDates(weekStart: string): string[] {
  const dates: string[] = [];
  const start = new Date(weekStart + 'T00:00:00');
  for (let i = 0; i < 5; i++) { // Monday to Friday only (0-4)
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// Check if 9 AM and 4 PM slots are filled for every WEEKDAY in a given week (excludes Saturday)
async function areEdgeSlotsFilledForWeek(weekStart: string): Promise<boolean> {
  const bookings = await getBookings();
  const availability = await getAvailability();
  const weekdayDates = getWeekdayDates(weekStart); // Mon-Fri only
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  // For each enabled weekday in the week, check if both 9 AM and 4 PM are booked
  for (const date of weekdayDates) {
    const dateObj = new Date(date + 'T00:00:00');
    const dayIndex = dateObj.getDay();
    const dayOfWeek = dayNames[dayIndex] as keyof typeof availability.workingHours;
    const dayHours = availability.workingHours[dayOfWeek];

    // Skip disabled days (closed days don't need to be filled)
    if (!dayHours?.enabled) {
      continue;
    }

    // Check if this day has both 9 AM and 4 PM booked
    const dayBookings = bookings.filter(b => b.date === date);
    const has9AM = dayBookings.some(b => b.time === '09:00');
    const has4PM = dayBookings.some(b => b.time === '16:00');

    if (!has9AM || !has4PM) {
      return false; // This day is missing an edge slot
    }
  }

  return true; // All enabled weekdays have both edge slots filled
}

export async function getAvailableTimeSlots(date: string, serviceDuration?: number): Promise<string[]> {
  const availability = await getAvailability();
  const bookings = await getBookings();
  const dateBookings = bookings.filter((b) => b.date === date);

  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const dateObj = new Date(date + 'T00:00:00');
  const dayIndex = dateObj.getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = dayNames[dayIndex] as keyof typeof availability.workingHours;
  const dayHours = availability.workingHours[dayOfWeek];

  if (!dayHours?.enabled) {
    return [];
  }

  // Saturday has special slots: 9 AM and 1 PM only (no restrictions)
  const isSaturday = dayIndex === 6;
  console.log('getAvailableTimeSlots:', { date, dayIndex, isSaturday, dayOfWeek, enabled: dayHours?.enabled });

  let slotsToCheck: string[];
  if (isSaturday) {
    // Saturday: always offer 9 AM and 1 PM (no 4 PM, no edge slot restriction)
    slotsToCheck = FIXED_SLOTS_SATURDAY;
    console.log('Saturday slots to check:', slotsToCheck);
  } else {
    // Weekdays: check if 1 PM is unlocked (requires all weekday edge slots filled)
    const weekStart = getWeekStart(date);
    const edgeSlotsFilled = await areEdgeSlotsFilledForWeek(weekStart);
    slotsToCheck = edgeSlotsFilled ? FIXED_SLOTS_WEEKDAY : ['09:00', '16:00'];
  }

  const slots: string[] = [];
  const paddingTime = availability.paddingTime || 0;
  const requiredDuration = serviceDuration || availability.slotDuration;

  // Get working hours boundaries
  const [startHour, startMin] = dayHours.start.split(':').map(Number);
  const [endHour, endMin] = dayHours.end.split(':').map(Number);
  const dayStartMinutes = startHour * 60 + startMin;
  const dayEndMinutes = endHour * 60 + endMin;

  console.log('Working hours:', { dayStartMinutes, dayEndMinutes, requiredDuration });

  for (const timeString of slotsToCheck) {
    // Check if the service itself fits within working hours (excluding pre-padding)
    const serviceEnd = addMinutes(timeString, requiredDuration);
    const slotStartMinutes = timeToMinutes(timeString);
    const serviceEndMinutes = timeToMinutes(serviceEnd);
    console.log('Checking slot:', { timeString, slotStartMinutes, serviceEndMinutes, fits: slotStartMinutes >= dayStartMinutes && serviceEndMinutes <= dayEndMinutes });
    if (slotStartMinutes < dayStartMinutes || serviceEndMinutes > dayEndMinutes) {
      console.log('Slot rejected - outside working hours');
      continue; // Skip slots that don't fit within working hours
    }

    // For conflict checking, include padding before and after
    const serviceStartTime = paddingTime > 0
      ? subtractMinutes(timeString, paddingTime)
      : timeString;
    const serviceEndTime = addMinutes(timeString, requiredDuration + paddingTime);

    const isBooked = dateBookings.some((booking) => {
      const bookingTime = booking.time;
      const bookingEnd = addMinutes(bookingTime, booking.duration);

      // Calculate booking time with padding (before and after)
      const bookingStartWithPadding = paddingTime > 0
        ? subtractMinutes(bookingTime, paddingTime)
        : bookingTime;
      const bookingEndWithPadding = paddingTime > 0
        ? addMinutes(bookingEnd, paddingTime)
        : bookingEnd;

      // Check if the service time range overlaps with any booking + padding
      const serviceStartMin = timeToMinutes(serviceStartTime);
      const serviceEndMin = timeToMinutes(serviceEndTime);
      const bookingStartMin = timeToMinutes(bookingStartWithPadding);
      const bookingEndMin = timeToMinutes(bookingEndWithPadding);

      // Check for overlap: two ranges overlap if one starts before the other ends
      return serviceStartMin < bookingEndMin && serviceEndMin > bookingStartMin;
    });

    if (!isBooked) {
      slots.push(timeString);
    }
  }

  return slots;
}

function timeToMinutes(time: string): number {
  const [hour, min] = time.split(':').map(Number);
  return hour * 60 + min;
}

function addMinutes(time: string, minutes: number): string {
  const [hour, min] = time.split(':').map(Number);
  const totalMinutes = hour * 60 + min + minutes;
  const newHour = Math.floor(totalMinutes / 60);
  const newMin = totalMinutes % 60;
  return `${newHour.toString().padStart(2, '0')}:${newMin.toString().padStart(2, '0')}`;
}

function subtractMinutes(time: string, minutes: number): string {
  const [hour, min] = time.split(':').map(Number);
  let totalMinutes = hour * 60 + min - minutes;
  // Handle negative times (before midnight)
  if (totalMinutes < 0) {
    totalMinutes = 0;
  }
  const newHour = Math.floor(totalMinutes / 60);
  const newMin = totalMinutes % 60;
  return `${newHour.toString().padStart(2, '0')}:${newMin.toString().padStart(2, '0')}`;
}

// Customer management functions
export async function getCustomers(): Promise<Customer[]> {
  if (isSupabaseConfigured) {
    return await getCustomersSupabase();
  }
  return readData().customers || [];
}

export async function getCustomerByEmail(email: string): Promise<Customer | undefined> {
  if (isSupabaseConfigured) {
    return await getCustomerByEmailSupabase(email);
  }
  return readData().customers?.find((c) => c.email.toLowerCase() === email.toLowerCase());
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  if (isSupabaseConfigured) {
    return await getCustomerSupabase(id);
  }
  return readData().customers?.find((c) => c.id === id);
}

export async function createOrUpdateCustomer(customerData: {
  name: string;
  email: string;
  phone?: string;
  amountSpent: number; // booking amount (before discount) - used for points calculation
}): Promise<Customer> {
  if (isSupabaseConfigured) {
    return await createOrUpdateCustomerSupabase(customerData);
  }
  
  const data = readData();
  if (!data.customers) {
    data.customers = [];
  }

  const existingCustomer = data.customers.find(
    (c) => c.email.toLowerCase() === customerData.email.toLowerCase()
  );

  // Award points based on booking amount: 1 point per dollar scheduled/booked
  const pointsToAward = Math.floor(customerData.amountSpent); // 1 point per dollar

  if (existingCustomer) {
    // Update existing customer
    existingCustomer.name = customerData.name;
    if (customerData.phone) {
      existingCustomer.phone = customerData.phone;
    }
    existingCustomer.totalSpent += customerData.amountSpent;
    existingCustomer.points += pointsToAward; // Award points based on scheduled booking amount
    try {
      writeData(data);
    } catch (error: any) {
      if (process.env.NETLIFY || process.env.VERCEL) {
        console.warn('Could not persist customer update to file system.');
      } else {
        throw error;
      }
    }
    return existingCustomer;
  } else {
    // Create new customer
    const newCustomer: Customer = {
      id: Date.now().toString(),
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      totalSpent: customerData.amountSpent,
      points: pointsToAward, // Award points based on scheduled booking amount (1 point per dollar)
      createdAt: new Date().toISOString(),
    };
    data.customers.push(newCustomer);
    try {
      writeData(data);
    } catch (error: any) {
      if (process.env.NETLIFY || process.env.VERCEL) {
        console.warn('Could not persist customer to file system.');
      } else {
        throw error;
      }
    }
    return newCustomer;
  }
}

export async function applyDiscount(customerId: string, discountAmount: number): Promise<boolean> {
  if (isSupabaseConfigured) {
    return await applyDiscountSupabase(customerId, discountAmount);
  }
  
  const data = readData();
  const customer = data.customers?.find((c) => c.id === customerId);
  
  if (!customer) {
    return false;
  }

  // Calculate points needed for discount (200 points = $10)
  const pointsNeeded = (discountAmount / 10) * 200;
  
  if (customer.points >= pointsNeeded) {
    customer.points -= pointsNeeded;
    writeData(data);
    return true;
  }
  
  return false;
}

export async function getFeedbacks(): Promise<Feedback[]> {
  if (isSupabaseConfigured) {
    return await getFeedbacksSupabase();
  }
  const data = readData();
  return data.feedback || [];
}

export async function addFeedback(feedback: Feedback): Promise<void> {
  if (isSupabaseConfigured) {
    return await addFeedbackSupabase(feedback);
  }
  const data = readData();
  if (!data.feedback) {
    data.feedback = [];
  }
  data.feedback.push(feedback);
  try {
    writeData(data);
  } catch (error: any) {
    if (process.env.NETLIFY || process.env.VERCEL) {
      console.warn('Could not persist feedback to file system (read-only). Feedback exists in memory for this request only.');
    } else {
      throw error;
    }
  }
}
