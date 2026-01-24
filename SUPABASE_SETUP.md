# Supabase Setup Guide

This guide will help you set up Supabase for persistent data storage on your deployed site.

## Why Supabase?

On serverless platforms like Netlify, the filesystem is read-only, so data stored in files won't persist. Supabase provides a free PostgreSQL database that works perfectly with Next.js.

## Step 1: Create a Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Sign up for a free account (no credit card required)
3. Create a new project

## Step 2: Set Up the Database

1. In your Supabase project, go to the **SQL Editor**
2. Copy the contents of `supabase-schema.sql` 
3. Paste it into the SQL Editor and click **Run**

This will create all the necessary tables:
- `services` - Your services
- `addons` - Add-ons
- `bookings` - Customer bookings
- `customers` - Customer information and loyalty points
- `availability` - Working hours and settings

## Step 3: Get Your API Keys

1. In your Supabase project, go to **Settings** → **API**
2. Copy your **Project URL** (looks like: `https://xxxxx.supabase.co`)
3. Copy your **anon public** key (looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## Step 4: Add Environment Variables

### For Local Development

Create a `.env.local` file in the root of your project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace `xxxxx` with your actual project ID and key.

### For Netlify Deployment

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add these two variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
4. Redeploy your site

## Step 5: Verify It's Working

1. After deploying, go to your admin panel
2. Try creating a service
3. Refresh the page - the service should still be there!
4. Check your Supabase dashboard → Table Editor to see your data

## Fallback Behavior

- **If Supabase is configured**: All data is stored in Supabase (persistent)
- **If Supabase is NOT configured**: The app falls back to file-based storage (works locally, but not on serverless platforms)

## Security Notes

- The `anon` key is safe to use in client-side code (it's designed for this)
- Row Level Security (RLS) policies are set to allow all operations for simplicity
- For production, you may want to add authentication and restrict access

## Troubleshooting

**Services aren't saving:**
- Check that your environment variables are set correctly
- Verify the SQL schema was run successfully
- Check the browser console and Netlify logs for errors

**Data appears in Supabase but not on the site:**
- Make sure you're using `NEXT_PUBLIC_` prefix for the env vars
- Restart your dev server after adding env vars locally
- Redeploy on Netlify after adding env vars

## Free Tier Limits

Supabase free tier includes:
- 500 MB database storage
- 2 GB bandwidth
- 50,000 monthly active users

This is more than enough for most small to medium businesses!


