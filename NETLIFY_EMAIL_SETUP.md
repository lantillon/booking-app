# Email Setup for Netlify Deployment

## ✅ Yes, emails will work on Netlify!

Your email configuration will work on Netlify, but you need to add your environment variables in the Netlify dashboard.

## Step-by-Step: Add Environment Variables to Netlify

### 1. Go to Netlify Dashboard
- Visit [app.netlify.com](https://app.netlify.com)
- Sign in to your account
- Select your site

### 2. Navigate to Environment Variables
- Click **Site settings** (in the top menu)
- Scroll down to **Build & deploy**
- Click **Environment** (under "Build & deploy" section)

### 3. Add These Variables

Click **Add a variable** for each of these:

**Variable 1:**
- **Key:** `SMTP_HOST`
- **Value:** `smtp.gmail.com`
- Click **Save**

**Variable 2:**
- **Key:** `SMTP_PORT`
- **Value:** `587`
- Click **Save**

**Variable 3:**
- **Key:** `SMTP_USER`
- **Value:** `lantill2270@gmail.com`
- Click **Save**

**Variable 4:**
- **Key:** `SMTP_PASSWORD`
- **Value:** `gerafizczgekuctq` (your Gmail App Password)
- Click **Save**

**Variable 5:**
- **Key:** `FROM_EMAIL`
- **Value:** `lantill2270@gmail.com`
- Click **Save**

**Variable 6:**
- **Key:** `ADMIN_EMAIL`
- **Value:** `lantill2270@gmail.com`
- Click **Save**

**Variable 7 (if using Supabase):**
- **Key:** `NEXT_PUBLIC_SUPABASE_URL`
- **Value:** `https://lduuujfpfqljqrkkqddf.supabase.co`
- Click **Save**

**Variable 8 (if using Supabase):**
- **Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkdXV1amZwZnFsanFya2txZGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNzQyNTMsImV4cCI6MjA4MjY1MDI1M30.k27KmbJwKspQ-rU5GFqAVtlNeusRnQ1VjmdyCTqFsjM`
- Click **Save**

### 4. Redeploy Your Site
- Go to **Deploys** (in the top menu)
- Click **Trigger deploy** → **Deploy site**
- Or push a new commit to trigger a deploy

## Important Notes

✅ **Emails will work** - Nodemailer with SMTP works perfectly on Netlify  
✅ **Environment variables** - Must be added in Netlify dashboard (`.env.local` doesn't work on Netlify)  
✅ **Gmail App Password** - Will work the same way on Netlify  
✅ **No code changes needed** - Your code is already set up correctly  

## Testing After Deployment

1. Make a test booking on your deployed site
2. Check your email inbox
3. Check the customer's email (if you used a real email)
4. Check Netlify function logs if emails don't send

## Troubleshooting

**If emails don't send on Netlify:**
1. Verify all environment variables are set correctly
2. Check Netlify function logs (Site → Functions → View logs)
3. Make sure Gmail App Password is still valid
4. Check that `SMTP_PASSWORD` doesn't have extra spaces

## Security Note

- Never commit `.env.local` to git (it's already in `.gitignore`)
- Environment variables in Netlify are encrypted and secure
- Gmail App Passwords are safe to use in environment variables
