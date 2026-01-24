-- Check and fix RLS policy for availability table
-- Run this in Supabase SQL Editor

-- First, check if the policy exists
SELECT * FROM pg_policies WHERE tablename = 'availability';

-- If the policy doesn't exist or doesn't allow updates, run this:
DROP POLICY IF EXISTS "Allow all on availability" ON availability;

-- Create a policy that allows all operations (read, insert, update, delete)
CREATE POLICY "Allow all on availability" ON availability
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'availability';
