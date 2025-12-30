# Fix DATABASE_URL Error

## The Problem
The error shows: **"the URL must start with the protocol `postgresql://` or `postgres://`"**

This means your `DATABASE_URL` in Vercel is either:
- Not set (empty)
- Missing the `postgresql://` prefix
- Has extra whitespace or formatting issues

## The Fix

### Step 1: Go to Environment Variables
1. In Vercel Dashboard → Your Project
2. Click **Settings** → **Environment Variables** (left sidebar)

### Step 2: Check DATABASE_URL
1. Find `DATABASE_URL` in the list
2. Click on it to edit, or delete and recreate it

### Step 3: Set the Correct Value

Your `DATABASE_URL` **MUST** start with `postgresql://` or `postgres://`

**Correct Format:**
```
postgresql://postgres:La88841913%25%24@db.sjflmgcukmajdyxtmtxx.supabase.co:5432/postgres
```

**Structure:**
```
postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]
```

### Step 4: Common Issues to Check

1. **Missing Protocol**: 
   - ❌ Wrong: `postgres:La88841913@db.sjflmgcukmajdyxtmtxx.supabase.co:5432/postgres`
   - ✅ Correct: `postgresql://postgres:La88841913%25%24@db.sjflmgcukmajdyxtmtxx.supabase.co:5432/postgres`

2. **URL Encoding**:
   - Password special characters must be encoded:
   - `%` → `%25`
   - `$` → `%24`
   - `@` → `%40`
   - `#` → `%23`

3. **No Extra Spaces**:
   - Make sure there are no spaces before or after the URL
   - Copy/paste carefully

4. **Environment Selection**:
   - Make sure you select all environments: Production, Preview, Development

### Step 5: After Fixing

1. Click **Save**
2. Go to **Deployments** tab
3. Click **⋯** on latest deployment → **Redeploy**
4. Wait for deployment
5. Test: `https://your-app.vercel.app/api/services`

## Quick Test

If you're not sure about your DATABASE_URL format, test it locally:

```bash
# In your local terminal
DATABASE_URL="your-url-here" npx prisma db pull
```

If this works, the URL is correct. If it fails, check the format.

