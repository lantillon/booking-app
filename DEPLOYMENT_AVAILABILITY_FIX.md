# Fix Availability Update on Deployed Site

## Problem
Availability updates work locally but not on the deployed site (Netlify).

## Most Common Causes

### 1. Missing Supabase Environment Variables
The most likely issue is that Supabase environment variables are not set in Netlify.

**Fix:**
1. Go to your Netlify dashboard
2. Navigate to: **Site settings** → **Environment variables**
3. Make sure these are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. After adding/updating variables, **redeploy your site**

### 2. Database Table Missing
The `availability` table might not exist in your Supabase database.

**Fix:**
1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Run this SQL to create the table:

```sql
CREATE TABLE IF NOT EXISTS availability (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  working_hours JSONB NOT NULL,
  slot_duration INTEGER NOT NULL DEFAULT 30,
  padding_time INTEGER NOT NULL DEFAULT 15,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default availability if it doesn't exist
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
```

### 3. Row Level Security (RLS) Issues
If RLS is enabled, you need to allow operations.

**Fix:**
Run this in Supabase SQL Editor:

```sql
-- Allow public read/write for availability (admin-only in practice via app auth)
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to availability" ON availability
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

## Testing

After fixing, test by:
1. Go to your deployed admin panel
2. Log in
3. Click "Availability" tab
4. Make a change (e.g., change Monday hours)
5. Click "Save Changes"
6. Check browser console (F12) for any errors
7. Refresh the page - changes should persist

## Error Messages

The improved error handling will now show specific errors:
- "Supabase not configured" → Missing environment variables
- "Failed to update availability" → Database connection issue
- "Invalid availability data" → Data format issue

## Still Not Working?

1. **Check browser console** (F12 → Console tab) for error messages
2. **Check Netlify function logs** in Netlify dashboard
3. **Verify Supabase connection** by checking if other features work (bookings, services)
4. **Test locally** to confirm it works there first
