# Email Troubleshooting Guide

## Quick Test

I've created a test endpoint to verify your email configuration. To test:

1. **Open your browser's developer console** (F12)
2. **Run this command:**
   ```javascript
   fetch('/api/test-email', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ testEmail: 'your-email@gmail.com' })
   })
   .then(r => r.json())
   .then(console.log)
   ```
   Replace `your-email@gmail.com` with your actual email address.

3. **Check the response:**
   - If `success: true` → Email is working!
   - If `success: false` → Check the error message

## Common Issues and Fixes

### 1. Gmail App Password Issues

**Problem:** Gmail app passwords can expire or be revoked.

**Solution:**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification if not already enabled
3. Go to "App passwords" (under 2-Step Verification)
4. Generate a new app password for "Mail"
5. Update `SMTP_PASSWORD` in `.env.local` with the new password
6. Restart your server

### 2. Environment Variables Not Loading

**Problem:** Next.js might not have loaded the `.env.local` file.

**Solution:**
1. Make sure `.env.local` is in the project root (same folder as `package.json`)
2. **Restart your development server** after changing `.env.local`:
   ```bash
   # Stop server (Ctrl+C) then:
   npm run dev
   ```

### 3. Gmail Blocking Connection

**Problem:** Gmail might be blocking the connection from your server.

**Solution:**
- Try using port 465 with SSL instead of 587 with TLS
- Update `.env.local`:
  ```
  SMTP_PORT=465
  ```
- Restart server

### 4. Check Server Logs

When a booking is made, check your server console for:
- ✅ `"Email sent successfully!"` - Email is working
- ⚠️ `"Email not configured"` - Missing environment variables
- ❌ `"Error sending email:"` - Connection/auth issue (check error details)

## Current Configuration

Your current SMTP settings (from `.env.local`):
- **Host:** smtp.gmail.com
- **Port:** 587
- **User:** lantill2270@gmail.com
- **From:** lantill2270@gmail.com

## Testing Steps

1. **Test the connection:**
   ```bash
   # In browser console:
   fetch('/api/test-email', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({})
   }).then(r => r.json()).then(console.log)
   ```

2. **Send a test email:**
   ```bash
   # In browser console:
   fetch('/api/test-email', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ testEmail: 'lantill2270@gmail.com' })
   }).then(r => r.json()).then(console.log)
   ```

3. **Make a test booking** and check server logs for email status

## Alternative: Use a Different Email Service

If Gmail continues to have issues, consider:

- **SendGrid** (Free tier: 100 emails/day)
- **Mailgun** (Free tier: 5,000 emails/month)
- **Resend** (Free tier: 3,000 emails/month)

These services are more reliable for production use and have better deliverability.
