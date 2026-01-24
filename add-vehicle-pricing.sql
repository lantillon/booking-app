-- Add vehicle pricing support to services table
-- Run this SQL in Supabase SQL Editor to add vehicle pricing column

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS vehicle_pricing JSONB,
ADD COLUMN IF NOT EXISTS use_vehicle_pricing BOOLEAN DEFAULT FALSE;

-- Example vehicle_pricing JSON structure:
-- {
--   "sedan": 100.00,
--   "suv": 150.00,
--   "truck": 200.00,
--   "van": 180.00,
--   "largeTruck": 250.00
-- }


