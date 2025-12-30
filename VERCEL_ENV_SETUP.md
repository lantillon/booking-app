# Vercel Environment Variables Setup Guide

## Step-by-Step Instructions

### 1. Navigate to Environment Variables
- In the left sidebar, click **"Environment Variables"** (it's visible in your screenshot)

### 2. Check What's Currently Set
- You should see a list of environment variables
- Look for `DATABASE_URL` - if it's missing, that's your problem!

### 3. Add Missing Variables

Click **"Add New"** and add these one by one:

#### Variable 1: DATABASE_URL (CRITICAL - This is likely missing!)
- **Key**: `DATABASE_URL`
- **Value**: Your PostgreSQL connection string
  - Example: `postgresql://postgres:La88841913%25%24@db.sjflmgcukmajdyxtmtxx.supabase.co:5432/postgres`
  - **IMPORTANT**: Make sure special characters in password are URL-encoded:
    - `%` → `%25`
    - `$` → `%24`
    - `@` → `%40`
    - `#` → `%23`
- **Environment**: Select all three: ☑ Production, ☑ Preview, ☑ Development
- Click **Save**

#### Variable 2: BOOKING_API_KEY
- **Key**: `BOOKING_API_KEY`
- **Value**: Your API key (same as in your local `.env.local`)
- **Environment**: All three
- Click **Save**

#### Variable 3: ADMIN_PASSWORD
- **Key**: `ADMIN_PASSWORD`
- **Value**: Your admin password (same as local)
- **Environment**: All three
- Click **Save**

#### Variable 4: NEXTAUTH_SECRET
- **Key**: `NEXTAUTH_SECRET`
- **Value**: Generate with: `openssl rand -base64 32` (or any long random string)
- **Environment**: All three
- Click **Save**

#### Variable 5: NEXTAUTH_URL
- **Key**: `NEXTAUTH_URL`
- **Value**: Your Vercel URL (e.g., `https://booking-app-kappa-three.vercel.app`)
- **Environment**: All three
- Click **Save**

### 4. After Adding Variables

1. Go to **Deployments** tab (top navigation)
2. Find your latest deployment
3. Click the **⋯** (three dots) menu
4. Click **Redeploy**
5. Wait for deployment to complete

### 5. Test

After redeploy, visit:
- `https://booking-app-kappa-three.vercel.app/api/services`
- Should return JSON (not 500 error)

## Quick Check

If `DATABASE_URL` is missing or incorrect, you'll see:
- 500 error on `/api/services`
- Error in Vercel Function Logs saying "Can't reach database" or "Authentication failed"

## Need Help?

If you see `DATABASE_URL` is already set, check:
1. Is the password URL-encoded? (Special characters must be encoded)
2. Can the database accept connections from Vercel? (Check Supabase/your DB provider's allowed IPs)
3. Check Function Logs for the exact error message

