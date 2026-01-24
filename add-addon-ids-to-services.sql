-- Add addon_ids column to services table
-- This allows services to have assigned add-ons

ALTER TABLE services
ADD COLUMN IF NOT EXISTS addon_ids TEXT[];


