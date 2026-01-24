-- Quick Migration: Add Vehicle Pricing Support
-- Copy and paste this entire file into a NEW query in Supabase SQL Editor

-- Step 1: Add vehicle pricing columns to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS vehicle_pricing JSONB,
ADD COLUMN IF NOT EXISTS use_vehicle_pricing BOOLEAN DEFAULT FALSE;

-- Step 2: Add vehicle_size column to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS vehicle_size TEXT;

-- Done! Your tables now support vehicle-based pricing.


