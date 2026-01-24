-- Add vehicle_size column to bookings table
-- Run this SQL in Supabase SQL Editor

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS vehicle_size TEXT;


