# How to Access Your Google Apps & Settings

## 🔐 Gmail App Passwords (For Email)

**Direct Link:** https://myaccount.google.com/apppasswords

**Steps:**
1. Go to the link above
2. Sign in with your Google account (lantill2270@gmail.com)
3. You'll see a list of all your App Passwords
4. To create a new one:
   - Click "Select app" → Choose "Mail"
   - Click "Select device" → Choose "Other" and name it "Booking Site"
   - Click "Generate"
   - Copy the 16-character password
   - Update `SMTP_PASSWORD` in your `.env.local` file

**Alternative Path:**
1. Go to https://myaccount.google.com
2. Click "Security" (left sidebar)
3. Under "Signing in to Google" → Click "2-Step Verification"
4. Scroll down to "App passwords"
5. Click "App passwords"

## ☁️ Google Cloud Console (For APIs & Services)

**Direct Link:** https://console.cloud.google.com

**What you can do here:**
- View all your Google Cloud projects
- Manage APIs (Gmail API, Maps API, etc.)
- View API credentials and keys
- See usage and quotas

**Steps:**
1. Go to https://console.cloud.google.com
2. Sign in with your Google account
3. Select a project from the dropdown (top left)
4. Navigate to:
   - **APIs & Services** → **Credentials** (to see API keys)
   - **APIs & Services** → **Library** (to enable/disable APIs)

## 📧 Gmail Settings

**Direct Link:** https://mail.google.com/mail/u/0/#settings

**What you can do:**
- Configure email forwarding
- Set up email filters
- Manage account settings

## 🔑 Google Account Security

**Direct Link:** https://myaccount.google.com/security

**What you can do:**
- Manage 2-Step Verification
- View App Passwords
- See recent security activity
- Manage connected devices

## 📱 Google Apps Dashboard

**Direct Link:** https://myaccount.google.com/dashboard

**What you can do:**
- See all your Google services
- Quick access to Gmail, Drive, Calendar, etc.
- View account overview

## 🛠️ For Your Booking Site Email

Since you're using Gmail SMTP, you need:

1. **App Password** (not your regular Gmail password)
   - Access: https://myaccount.google.com/apppasswords
   - Current password in `.env.local`: `rcfftysmgalcswtz`
   - If emails aren't working, generate a new one here

2. **2-Step Verification** (required for App Passwords)
   - Access: https://myaccount.google.com/security
   - Must be enabled to use App Passwords

## 🔍 Quick Links Summary

- **App Passwords:** https://myaccount.google.com/apppasswords
- **Google Account:** https://myaccount.google.com
- **Security Settings:** https://myaccount.google.com/security
- **Cloud Console:** https://console.cloud.google.com
- **Gmail Settings:** https://mail.google.com/mail/u/0/#settings

## 💡 Tips

- **App Passwords expire** if you change your Google password
- **Each App Password** is unique and can be revoked individually
- **You can have multiple** App Passwords for different apps/devices
- **App Passwords are 16 characters** (no spaces)
