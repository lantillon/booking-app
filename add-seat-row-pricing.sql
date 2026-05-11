-- Add seat row pricing columns to the services table
-- Run this in your Supabase SQL Editor

-- Add seat_row_pricing column (JSONB to store twoRows and threeRows prices)
ALTER TABLE services ADD COLUMN IF NOT EXISTS seat_row_pricing JSONB;

-- Add use_seat_row_pricing flag
ALTER TABLE services ADD COLUMN IF NOT EXISTS use_seat_row_pricing BOOLEAN DEFAULT false;

-- Add seat_rows column to bookings table to track which seat row option was selected
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS seat_rows TEXT;

-- Example: To update Interior Detail to use seat row pricing:
-- UPDATE services
-- SET use_seat_row_pricing = true,
--     use_vehicle_pricing = false,
--     seat_row_pricing = '{"twoRows": 85, "threeRows": 90}'
-- WHERE name ILIKE '%interior%detail%';
