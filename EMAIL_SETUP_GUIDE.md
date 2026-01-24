# Email Confirmation Setup Guide

## Step 1: Get a Gmail App Password

1. **Go to Google App Passwords:**
   - Direct link: https://myaccount.google.com/apppasswords
   - Or: Google Account → Security → 2-Step Verification → App passwords

2. **Generate a new App Password:**
   - Select app: **Mail**
   - Select device: **Other (Custom name)**
   - Enter name: **Booking Site**
   - Click **Generate**
   - **Copy the 16-character password** (it looks like: `abcd efgh ijkl mnop`)

## Step 2: Update Your Configuration

Your `.env.local` file should have these settings:

```env
# Email SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=lantill2270@gmail.com
SMTP_PASSWORD=YOUR_NEW_APP_PASSWORD_HERE
FROM_EMAIL=lantill2270@gmail.com
ADMIN_EMAIL=lantill2270@gmail.com
```

**Important:** Replace `YOUR_NEW_APP_PASSWORD_HERE` with the App Password you just generated.

## Step 3: Restart Your Server

After updating `.env.local`, you MUST restart your server:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

## Step 4: Test the Email Configuration

### Option A: Browser Console Test
1. Open your site: http://localhost:3000
2. Open Developer Console (F12)
3. Run this command:
```javascript
fetch('/api/test-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ testEmail: 'lantill2270@gmail.com' })
})
.then(r => r.json())
.then(data => {
  console.log('Email Test Result:', data);
  if (data.success) {
    alert('✅ Email is working! Check your inbox.');
  } else {
    alert('❌ Email failed: ' + data.error);
  }
})
```

### Option B: Make a Test Booking
1. Go to http://localhost:3000/book
2. Make a test booking
3. Check your email inbox
4. Check server console for email status

## Troubleshooting

### If emails don't send:

1. **Check 2-Step Verification is enabled:**
   - Go to: https://myaccount.google.com/security
   - Make sure 2-Step Verification is ON
   - App Passwords only work with 2-Step Verification

2. **Verify App Password:**
   - Make sure you're using the App Password (16 characters)
   - NOT your regular Gmail password
   - Remove spaces if you copied it with spaces

3. **Check Server Logs:**
   - When making a booking, check the terminal/console
   - Look for:
     - ✅ "SMTP connection verified successfully"
     - ✅ "Email sent successfully!"
     - ❌ Error messages

4. **Try Port 465:**
   - If port 587 doesn't work, try 465
   - Change `SMTP_PORT=465` in `.env.local`
   - Restart server

## What Gets Sent

When a customer makes a booking, two emails are sent:

1. **Customer Confirmation Email:**
   - Sent to the customer's email
   - Contains booking details (service, date, time, location, price)

2. **Admin Notification Email:**
   - Sent to ADMIN_EMAIL (lantill2270@gmail.com)
   - Contains full booking details including customer info

Both emails are sent automatically when a booking is created!
