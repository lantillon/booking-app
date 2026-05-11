-- Fix bookings table schema for Instagram DM bookings
-- Run this in your Supabase SQL Editor

-- 1. Make customer_email nullable (Instagram DM bookings may not have email)
ALTER TABLE bookings ALTER COLUMN customer_email DROP NOT NULL;

-- 2. Make location nullable (just in case)
ALTER TABLE bookings ALTER COLUMN location DROP NOT NULL;

-- 3. Add missing columns if they don't exist
DO $$
BEGIN
    -- Add vehicle_size column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'bookings' AND column_name = 'vehicle_size') THEN
        ALTER TABLE bookings ADD COLUMN vehicle_size TEXT;
    END IF;

    -- Add seat_rows column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'bookings' AND column_name = 'seat_rows') THEN
        ALTER TABLE bookings ADD COLUMN seat_rows TEXT;
    END IF;

    -- Add zip_code column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'bookings' AND column_name = 'zip_code') THEN
        ALTER TABLE bookings ADD COLUMN zip_code TEXT;
    END IF;
END $$;

-- Verify the changes
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'bookings'
ORDER BY ordinal_position;
