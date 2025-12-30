# Fix: Prepared Statement Error with Supabase Pooler

## The Problem
Error: `prepared statement "s1" already exists`

This happens because Supabase's Transaction Pooler doesn't support prepared statements, but Prisma tries to use them by default.

## The Solution

Add `&pgbouncer=true` to your `DATABASE_URL` connection string.

## Updated Connection String

**For Vercel Environment Variables:**

```
postgresql://postgres.sjflmgcukmajdyxtmtxx:La88841913%25%24@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
```

**Key addition:** `&pgbouncer=true` at the end

## Steps to Fix

1. Go to **Vercel Dashboard** → Your Project
2. **Settings** → **Environment Variables**
3. Edit `DATABASE_URL`
4. Update to:
   ```
   postgresql://postgres.sjflmgcukmajdyxtmtxx:La88841913%25%24@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
   ```
5. Make sure all environments are selected
6. Click **Save**
7. **Redeploy** your project

## What This Does

- `pgbouncer=true` tells Prisma to disable prepared statements
- This is required for Supabase's Transaction Pooler
- Prevents the "prepared statement already exists" error

## Local .env.local

Your local `.env.local` has been updated automatically. After updating Vercel, both will match.

