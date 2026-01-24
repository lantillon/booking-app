# Fix Supabase Schema Issue

## The Problem

The test script shows that your `services` table exists but has the wrong columns. The error message indicates the `description` column is missing or the schema doesn't match.

## Solution

You need to recreate the tables with the correct schema. Here's how:

### Option 1: Drop and Recreate Tables (Recommended if you don't have important data)

1. **Go to your Supabase project**: https://supabase.com/dashboard/project/lduuujfpfqljqrkkqddf
2. **Open SQL Editor** (left sidebar)
3. **Run this SQL to drop existing tables**:
   ```sql
   DROP TABLE IF EXISTS bookings CASCADE;
   DROP TABLE IF EXISTS customers CASCADE;
   DROP TABLE IF EXISTS addons CASCADE;
   DROP TABLE IF EXISTS services CASCADE;
   DROP TABLE IF EXISTS availability CASCADE;
   ```
4. **Then copy and paste the entire contents of `supabase-schema.sql`** and run it

### Option 2: Use the Fix Script (If you have data you want to keep)

1. **Go to SQL Editor in Supabase**
2. **Copy and paste the contents of `fix-schema.sql`**
3. **Uncomment the DROP TABLE lines** (remove the `--` at the start of each line)
4. **Run the script**

### Option 3: Check Current Schema First

If you want to see what columns currently exist:

1. In Supabase, go to **Table Editor**
2. Click on the `services` table
3. Check what columns it has

If it's missing columns like `description`, `duration`, `price`, etc., you need to recreate it.

## After Fixing

1. Run the test script again:
   ```bash
   node test-supabase.js
   ```

2. You should see: `✅ All tests passed! Supabase is configured correctly.`

3. Try creating a service in your admin panel again

## Quick Fix Command (if you have Supabase CLI)

```bash
supabase db reset
```

But this requires Supabase CLI setup, so the SQL Editor method is easier.


