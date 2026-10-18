-- Add vehicle_count column to bookings table
-- This allows customers to book multiple vehicles in a single appointment
-- Duration and pricing are multiplied by the vehicle count

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vehicle_count INTEGER DEFAULT 1;

-- Add a comment explaining the column
COMMENT ON COLUMN bookings.vehicle_count IS 'Number of vehicles for this booking (default: 1). Duration and price are multiplied by this count.';
