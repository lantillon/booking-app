# Environment Variables Setup Guide

## Restarting the Development Server

### If the server is currently running:

1. **Find the terminal** where `npm run dev` is running
2. **Stop the server**: Press `Ctrl + C` (or `Cmd + C` on Mac)
3. **Start it again**: Run `npm run dev` (or `npm run dev -- -p 3004` if using port 3004)

### Quick restart command:

If you want to restart from scratch, you can run:
```bash
# Stop any running server on port 3004
lsof -ti:3004 | xargs kill -9 2>/dev/null

# Start the server
npm run dev -- -p 3004
```

---

## Adding Environment Variables to Netlify

### Step-by-Step Instructions:

1. **Go to your Netlify Dashboard**
   - Visit [app.netlify.com](https://app.netlify.com)
   - Sign in to your account

2. **Select Your Site**
   - Click on your site from the list

3. **Navigate to Environment Variables**
   - Click on **Site settings** (in the top menu)
   - Scroll down to **Build & deploy**
   - Click on **Environment** (under "Build & deploy" section)

4. **Add the Variables**
   - Click **Add a variable** button
   - Add the first variable:
     - **Key**: `NEXT_PUBLIC_SUPABASE_URL`
     - **Value**: `https://lduuujfpfqljqrkkqddf.supabase.co`
     - Click **Save**
   - Click **Add a variable** again
     - **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkdXV1amZwZnFsanFya2txZGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNzQyNTMsImV4cCI6MjA4MjY1MDI1M30.k27KmbJwKspQ-rU5GFqAVtlNeusRnQ1VjmdyCTqFsjM`
     - Click **Save**

5. **Redeploy Your Site**
   - Go to **Deploys** (in the top menu)
   - Click **Trigger deploy** → **Deploy site**
   - Or push a new commit to trigger a deploy

### Alternative: Using Netlify CLI

If you have Netlify CLI installed:
```bash
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://lduuujfpfqljqrkkqddf.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkdXV1amZwZnFsanFya2txZGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNzQyNTMsImV4cCI6MjA4MjY1MDI1M30.k27KmbJwKspQ-rU5GFqAVtlNeusRnQ1VjmdyCTqFsjM"
```

---

## Important Notes

- **Local Development**: Environment variables in `.env.local` are automatically loaded by Next.js (no need to export them)
- **Netlify Deployment**: Environment variables must be added in the Netlify dashboard
- **After adding env vars**: Always restart your dev server or redeploy on Netlify for changes to take effect
- **Security**: Never commit `.env.local` to git (it's already in `.gitignore`)


