# Find Your Supabase Connection Pooler URL

You're on the Database Settings page. Now you need to find the actual connection string.

## Step 1: Go to Connection Info

1. In the left sidebar, look for **"Connection Info"** or **"Connection String"**
2. It might be under:
   - **Database** section (top of sidebar)
   - Or in the main Database page (not Settings)

## Step 2: Look for Pooler Connection String

When you find the Connection Info page, you should see:

### Option A: Direct Connection (Port 5432) - DON'T USE THIS
```
postgresql://postgres:[YOUR-PASSWORD]@db.sjflmgcukmajdyxtmtxx.supabase.co:5432/postgres
```

### Option B: Connection Pooler (Port 6543) - USE THIS ONE! ✅
```
postgresql://postgres.sjflmgcukmajdyxtmtxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

Or it might be:
```
postgresql://postgres.sjflmgcukmajdyxtmtxx:[YOUR-PASSWORD]@db.sjflmgcukmajdyxtmtxx.supabase.co:6543/postgres
```

## Step 3: Key Differences to Look For

**Pooler URL will have:**
- Port `6543` (NOT 5432)
- Hostname might include `.pooler.supabase.com` or just use port 6543
- Username format: `postgres.sjflmgcukmajdyxtmtxx` (with project ID)

**Direct URL has:**
- Port `5432`
- Hostname: `db.sjflmgcukmajdyxtmtxx.supabase.co`
- Username: `postgres`

## Step 4: If You Can't Find It

1. Go back to the main **Database** page (click "Database" in top navigation)
2. Look for a tab or section called:
   - "Connection String"
   - "Connection Info" 
   - "Connect" button
   - "Connection pooling" (different from settings)
3. It might show both "Direct connection" and "Connection pooling" options

## Step 5: Format for Vercel

Once you find the pooler URL, format it like this:

1. Replace `[YOUR-PASSWORD]` with: `La88841913%$`
2. URL-encode the password:
   - `%` → `%25`
   - `$` → `%24`
3. Add `?sslmode=require` at the end

**Final format:**
```
postgresql://postgres.sjflmgcukmajdyxtmtxx:La88841913%25%24@[POOLER-HOST]:6543/postgres?sslmode=require
```

## Quick Check

The pooler URL should:
- ✅ Have port `6543`
- ✅ Have `?sslmode=require` at the end
- ✅ Password should be URL-encoded

