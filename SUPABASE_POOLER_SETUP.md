# Fix: Use Supabase Connection Pooler

## The Problem
Vercel serverless functions can't reach Supabase's direct database connection (port 5432). This is because:
- Serverless functions have dynamic IPs
- Supabase may block direct connections from serverless
- Connection pooling is required for serverless

## The Solution: Use Connection Pooler

### Step 1: Get Pooler URL from Supabase

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection Pooling** section
5. You'll see two options:
   - **Session mode** (port 5432) - Direct connection
   - **Transaction mode** (port 6543) - **Use this one!**

### Step 2: Copy the Pooler Connection String

Look for **"Connection String"** or **"URI"** in the Transaction mode section.

It will look like one of these formats:

**Format 1:**
```
postgresql://postgres.sjflmgcukmajdyxtmtxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Format 2:**
```
postgresql://postgres.sjflmgcukmajdyxtmtxx:[YOUR-PASSWORD]@db.sjflmgcukmajdyxtmtxx.supabase.co:6543/postgres
```

**Format 3: (If you see connection parameters)**
```
postgresql://postgres.sjflmgcukmajdyxtmtxx:[YOUR-PASSWORD]@[POOLER-HOST]:6543/postgres?pgbouncer=true
```

### Step 3: Replace Password and Add SSL

1. Replace `[YOUR-PASSWORD]` with your actual password: `La88841913%$`
2. URL-encode the password:
   - `%` → `%25`
   - `$` → `%24`
3. Add `?sslmode=require` at the end

**Final format should be:**
```
postgresql://postgres.sjflmgcukmajdyxtmtxx:La88841913%25%24@[POOLER-HOST]:6543/postgres?sslmode=require
```

### Step 4: Update Vercel

1. Go to **Vercel Dashboard** → Your Project
2. **Settings** → **Environment Variables**
3. Edit `DATABASE_URL`
4. Replace with the pooler URL (port 6543, not 5432)
5. Make sure it ends with `?sslmode=require`
6. Click **Save**
7. **Redeploy** your project

## Key Differences

| Direct Connection | Connection Pooler |
|------------------|-------------------|
| Port: `5432` | Port: `6543` |
| Host: `db.sjflmgcukmajdyxtmtxx.supabase.co` | Host: `[POOLER-HOST].pooler.supabase.com` or similar |
| ❌ Doesn't work with serverless | ✅ Works with serverless |
| Limited connections | Handles many connections |

## If You Can't Find Pooler Settings

Some Supabase projects have pooler enabled by default. Try:

1. Check if there's a **"Connection String"** tab in Database settings
2. Look for **"Transaction"** or **"Session"** mode options
3. The pooler URL might be in a different section

## Alternative: Enable Pooler in Supabase

If you don't see pooler options:
1. Supabase Dashboard → Your Project
2. Settings → Database
3. Look for **"Connection Pooling"** toggle or settings
4. Enable it if available

## Test the Pooler URL Locally

Before updating Vercel, test locally:

```bash
DATABASE_URL="postgresql://postgres.sjflmgcukmajdyxtmtxx:La88841913%25%24@[POOLER-HOST]:6543/postgres?sslmode=require" npx prisma db pull
```

If this works, use the same URL in Vercel.

