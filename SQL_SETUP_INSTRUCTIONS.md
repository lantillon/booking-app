# How to Set Up SQL in Supabase

## Simple Instructions

**You don't need to erase anything!** Just paste and run.

### Steps:

1. **Go to Supabase SQL Editor**
   - Visit: https://supabase.com/dashboard/project/lduuujfpfqljqrkkqddf
   - Click **"SQL Editor"** (left sidebar)
   - Click **"New query"** button (top right)

2. **Copy the entire SIMPLE_FIX.sql file**
   - Open `SIMPLE_FIX.sql` from your project
   - Copy ALL of it (Ctrl+A, then Ctrl+C / Cmd+A, then Cmd+C)

3. **Paste into SQL Editor**
   - Paste the SQL into the editor
   - The SQL includes DROP statements first (to remove old tables), then CREATE statements (to make new ones)

4. **Click "Run" or press Ctrl+Enter**
   - You should see "Success. No rows returned" or similar

5. **Done!** Try creating a service in your admin panel now.

---

## What the SQL Does

1. **DROP TABLE** statements - Removes the incorrectly structured tables
2. **CREATE TABLE** statements - Creates tables with the correct columns
3. **INSERT** - Adds default availability settings
4. **POLICIES** - Sets up permissions so your app can read/write

All of this runs in one go - you don't need to run it in separate steps!


