# Fix Supabase Connection from Vercel

## The Problem
Vercel can't reach your Supabase database. This is usually because:
1. Supabase requires SSL connections
2. You might need to use the connection pooler
3. IP restrictions might be blocking Vercel

## Solution 1: Add SSL to Connection String (Most Common Fix)

Your `DATABASE_URL` needs to include SSL parameters:

### Current (Not Working):
```
postgresql://postgres:La88841913%25%24@db.sjflmgcukmajdyxtmtxx.supabase.co:5432/postgres
```

### Fixed (Add `?sslmode=require`):
```
postgresql://postgres:La88841913%25%24@db.sjflmgcukmajdyxtmtxx.supabase.co:5432/postgres?sslmode=require
```

## Solution 2: Use Supabase Connection Pooler

Supabase provides a connection pooler that's better for serverless (like Vercel):

### Get Your Pooler URL:
1. Go to Supabase Dashboard → Your Project
2. Go to **Settings** → **Database**
3. Find **Connection Pooling** section
4. Copy the **Connection String** (it will have a different port, usually `6543` or `5432` with `?pgbouncer=true`)

### Format:
```
postgresql://postgres.sjflmgcukmajdyxtmtxx:La88841913%25%24@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

## Solution 3: Check Supabase Settings

### 1. Allow All IPs (For Testing):
1. Go to Supabase Dashboard → Your Project
2. Go to **Settings** → **Database**
3. Under **Connection Pooling** or **Network Restrictions**
4. Make sure it allows connections from anywhere (or add Vercel IPs)

### 2. Check SSL Mode:
- Supabase requires SSL for external connections
- Make sure your connection string includes `?sslmode=require`

## Quick Fix Steps:

### Step 1: Update DATABASE_URL in Vercel
1. Go to Vercel → Your Project → Settings → Environment Variables
2. Edit `DATABASE_URL`
3. Add `?sslmode=require` at the end:

**Before:**
```
postgresql://postgres:La88841913%25%24@db.sjflmgcukmajdyxtmtxx.supabase.co:5432/postgres
```

**After:**
```
postgresql://postgres:La88841913%25%24@db.sjflmgcukmajdyxtmtxx.supabase.co:5432/postgres?sslmode=require
```

### Step 2: Redeploy
1. Go to Deployments
2. Click **⋯** on latest → **Redeploy**

## Alternative: Get Direct Connection String from Supabase

1. Go to Supabase Dashboard
2. Your Project → **Settings** → **Database**
3. Scroll to **Connection String**
4. Select **URI** tab
5. Copy the connection string (it should already have SSL parameters)
6. Update password encoding if needed (`%` → `%25`, `$` → `%24`)
7. Paste into Vercel Environment Variables

## Test Connection Locally

Test if the connection works with SSL:

```bash
# Test with SSL
DATABASE_URL="postgresql://postgres:La88841913%25%24@db.sjflmgcukmajdyxtmtxx.supabase.co:5432/postgres?sslmode=require" npx prisma db pull
```

If this works locally, use the same URL in Vercel.

