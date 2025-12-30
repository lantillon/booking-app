# Deploy to Render - Step by Step Guide

Render is often easier for full-stack apps with databases. Let's deploy there instead.

## Step 1: Create Render Account

1. Go to https://render.com
2. Sign up (free tier available)
3. Connect your GitHub account

## Step 2: Create New Web Service

1. Click **"New +"** button
2. Select **"Web Service"**
3. Connect your GitHub repository: `lantillon/booking-app`
4. Select the repository

## Step 3: Configure Service

Fill in these settings:

### Basic Settings:
- **Name**: `booking-app` (or any name you want)
- **Region**: Choose closest to you (e.g., `Oregon (US West)`)
- **Branch**: `main`
- **Root Directory**: (leave empty)

### Build & Deploy:
- **Environment**: `Node`
- **Node Version**: `20.x` (important - select this in advanced settings)
- **Build Command**: 
  ```
  npm ci && npx prisma generate && npm run build
  ```
  (Using `npm ci` instead of `npm install` for more reliable builds)
- **Start Command**: 
  ```
  npm start
  ```

### Environment Variables:

Click **"Add Environment Variable"** and add these one by one:

1. **DATABASE_URL**
   - Value: `postgresql://postgres:La88841913%25%24@db.sjflmgcukmajdyxtmtxx.supabase.co:5432/postgres?sslmode=require`

2. **BOOKING_API_KEY**
   - Value: (your API key from `.env.local`)

3. **ADMIN_PASSWORD**
   - Value: (your admin password from `.env.local`)

4. **NEXTAUTH_SECRET**
   - Value: Generate with: `openssl rand -base64 32`
   - Or use any long random string

5. **NEXTAUTH_URL**
   - Value: Will be `https://your-app-name.onrender.com` (you'll get this after deployment)
   - You can update this later after first deploy

6. **NODE_ENV**
   - Value: `production`

### Advanced Settings (Optional):
- **Health Check Path**: `/api/services`
- **Auto-Deploy**: `Yes` (deploys on every push to main)

## Step 4: Deploy

1. Click **"Create Web Service"**
2. Render will start building
3. Wait 5-10 minutes for first deployment
4. You'll get a URL like: `https://booking-app-xxxx.onrender.com`

## Step 5: Update NEXTAUTH_URL

After deployment:
1. Go to your service settings
2. Update `NEXTAUTH_URL` to your Render URL
3. Click **"Save Changes"**
4. Render will automatically redeploy

## Step 6: Test

Visit your Render URL:
- `https://your-app.onrender.com/api/services` - Should return JSON
- `https://your-app.onrender.com` - Should show booking page

## Advantages of Render:

✅ Better database connection handling
✅ More straightforward environment variable setup
✅ Built-in health checks
✅ Free tier available
✅ Automatic SSL certificates
✅ Better error logs

## Troubleshooting:

### If build fails:
- Check build logs in Render dashboard
- Make sure all environment variables are set
- Verify `DATABASE_URL` has `?sslmode=require`

### If API returns 500:
- Check service logs in Render dashboard
- Verify `DATABASE_URL` is correct
- Make sure database allows connections from Render IPs

### Slow first request:
- Render free tier spins down after inactivity
- First request after spin-down takes ~30 seconds
- This is normal on free tier

## Alternative: Railway

If Render doesn't work, we can also try Railway:
- https://railway.app
- Similar setup process
- Also has free tier

