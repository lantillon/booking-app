-- Supabase Database Schema for Booking Site
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  duration INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add-ons table
CREATE TABLE IF NOT EXISTS addons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  location TEXT NOT NULL,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  addon_ids TEXT[],
  addon_names TEXT[],
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  duration INTEGER NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Availability table (single row)
CREATE TABLE IF NOT EXISTS availability (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  working_hours JSONB NOT NULL,
  slot_duration INTEGER NOT NULL DEFAULT 30,
  padding_time INTEGER NOT NULL DEFAULT 15
);

-- Insert default availability
INSERT INTO availability (id, working_hours, slot_duration, padding_time)
VALUES (
  'singleton',
  '{
    "monday": {"start": "09:00", "end": "17:00", "enabled": true},
    "tuesday": {"start": "09:00", "end": "17:00", "enabled": true},
    "wednesday": {"start": "09:00", "end": "17:00", "enabled": true},
    "thursday": {"start": "09:00", "end": "17:00", "enabled": true},
    "friday": {"start": "09:00", "end": "17:00", "enabled": true},
    "saturday": {"start": "09:00", "end": "17:00", "enabled": false},
    "sunday": {"start": "09:00", "end": "17:00", "enabled": false}
  }'::jsonb,
  30,
  15
)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (optional - you may want to configure this based on your needs)
-- For now, we'll allow all operations. You can restrict this later.
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (for now - adjust based on your security needs)
CREATE POLICY "Allow all on services" ON services FOR ALL USING (true);
CREATE POLICY "Allow all on addons" ON addons FOR ALL USING (true);
CREATE POLICY "Allow all on bookings" ON bookings FOR ALL USING (true);
CREATE POLICY "Allow all on customers" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all on availability" ON availability FOR ALL USING (true);

