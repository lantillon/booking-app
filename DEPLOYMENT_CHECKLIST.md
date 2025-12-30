# Deployment Checklist for Vercel

## Pre-Deployment Steps

### 1. Test Build Locally
```bash
npm run build
npm start
```
Visit `http://localhost:3000` and test `/api/services` endpoint.

### 2. Verify Environment Variables

You need these **exact** environment variables in Vercel:

#### Required Variables (Set in Vercel Dashboard → Settings → Environment Variables):

1. **`DATABASE_URL`** ⚠️ CRITICAL
   - Your PostgreSQL connection string
   - **IMPORTANT**: URL-encode special characters in password
   - Example: `postgresql://postgres:La88841913%25%24@db.sjflmgcukmajdyxtmtxx.supabase.co:5432/postgres`
   - Special characters: `%` → `%25`, `$` → `%24`, `@` → `%40`, `#` → `%23`
   - Format: `postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE`

2. **`BOOKING_API_KEY`**
   - Your secret API key for ManyChat
   - Example: `your-secret-api-key-here`

3. **`ADMIN_PASSWORD`**
   - Password for admin login
   - Example: `admin123`

4. **`NEXTAUTH_SECRET`**
   - Random secret for NextAuth sessions
   - Generate: `openssl rand -base64 32`
   - Or use any long random string

5. **`NEXTAUTH_URL`**
   - Your Vercel deployment URL
   - Format: `https://your-app-name.vercel.app`
   - Find this in your Vercel project dashboard

## Deployment Steps

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Set Environment Variables in Vercel

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable above
5. Make sure to select **Production**, **Preview**, and **Development** for each variable
6. Click **Save**

### Step 3: Redeploy

1. Go to **Deployments** tab
2. Click the **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. Wait for build to complete

### Step 4: Verify Deployment

1. Visit your site: `https://your-app.vercel.app`
2. Test API: `https://your-app.vercel.app/api/services`
   - Should return JSON array of services (not 500 error)
3. Check browser console for errors

## Troubleshooting 500 Errors

### If `/api/services` returns 500:

1. **Check Vercel Build Logs**:
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on the latest deployment
   - Check **Build Logs** and **Function Logs**
   - Look for error messages

2. **Common Issues**:
   - ❌ `DATABASE_URL` not set → Add it in Environment Variables
   - ❌ `DATABASE_URL` has unencoded special characters → URL-encode password
   - ❌ Database connection timeout → Check if database allows external connections
   - ❌ Prisma Client not generated → Check build logs for `prisma generate` errors

3. **Test Database Connection**:
   ```bash
   # Test locally with production DATABASE_URL
   DATABASE_URL="your-production-url" npx prisma db pull
   ```

4. **Check Vercel Function Logs**:
   - Vercel Dashboard → Your Project → Functions
   - Click on `/api/services`
   - Check runtime logs for errors

## Alternative: Deploy to Render

If Vercel continues to have issues, Render is a good alternative:

### Render Deployment Steps:

1. Go to https://render.com
2. Create new **Web Service**
3. Connect your GitHub repository
4. Settings:
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Add environment variables (same as above)
6. Deploy

## Quick Fix Commands

### Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### URL-encode DATABASE_URL password:
- Use an online URL encoder
- Or manually: `%` → `%25`, `$` → `%24`, `@` → `%40`

### Test API locally with production DATABASE_URL:
```bash
DATABASE_URL="your-production-url" npm run dev
```

