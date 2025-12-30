# Where to Find Supabase Connection Pooler URL

## Method 1: Project Settings (Most Common)

1. **Click on your project name** in the top left (where it says "booking-app")
2. Or look for a **gear icon** ⚙️ or **"Settings"** in the top navigation
3. Go to **Project Settings** (not Database Settings)
4. Click on **"Database"** in the left sidebar of Settings
5. Scroll down to find **"Connection String"** or **"Connection Info"**
6. Look for **"Connection Pooling"** section
7. Copy the **Transaction mode** or **Pooler** connection string (port 6543)

## Method 2: Database Overview Page

1. If you see a **"Connect"** button in the top bar (next to "booking-app")
2. Click it - it should show connection strings
3. Look for the **"Connection Pooling"** tab or section
4. Copy the pooler URL (port 6543)

## Method 3: Connection String Format

If you can't find it in the UI, the pooler URL format is usually:

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

For your project, it might be:
```
postgresql://postgres.sjflmgcukmajdyxtmtxx:La88841913%25%24@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

Or:
```
postgresql://postgres.sjflmgcukmajdyxtmtxx:La88841913%25%24@db.sjflmgcukmajdyxtmtxx.supabase.co:6543/postgres?sslmode=require
```

## What You're Looking For

The pooler connection string will have:
- ✅ Port `6543` (NOT 5432)
- ✅ Username format: `postgres.sjflmgcukmajdyxtmtxx` (with your project ref)
- ✅ Might have `.pooler.supabase.com` in the hostname
- ✅ Or just use port 6543 with your regular hostname

## Quick Test

Once you have the pooler URL, test it locally:

```bash
DATABASE_URL="postgresql://postgres.sjflmgcukmajdyxtmtxx:La88841913%25%24@[POOLER-HOST]:6543/postgres?sslmode=require" npx prisma db pull
```

If this works, use the same URL in Vercel!

