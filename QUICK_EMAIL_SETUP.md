# Quick Email Setup - 4 Steps

## ✅ Step 1: Get Gmail App Password
**Link:** https://myaccount.google.com/apppasswords

1. Click "Select app" → Choose **Mail**
2. Click "Select device" → Choose **Other** → Name it "Booking Site"
3. Click **Generate**
4. **Copy the password** (16 characters, remove spaces)

## ✅ Step 2: Update .env.local

Open `.env.local` and update this line:
```env
SMTP_PASSWORD=your_new_app_password_here
```

Replace `your_new_app_password_here` with the password from Step 1.

## ✅ Step 3: Restart Server

```bash
# Stop server (Ctrl+C in terminal)
npm run dev
```

## ✅ Step 4: Test

**In browser console (F12):**
```javascript
fetch('/api/test-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ testEmail: 'lantill2270@gmail.com' })
})
.then(r => r.json())
.then(data => {
  if (data.success) {
    alert('✅ Email working! Check inbox.');
  } else {
    alert('❌ Error: ' + data.error);
  }
})
```

**Or make a test booking at:** http://localhost:3000/book

---

## 🎯 That's it!

Once set up, every booking will automatically send:
- ✅ Confirmation email to customer
- ✅ Notification email to you (lantill2270@gmail.com)
