# Booking Site

A full-featured booking system where business owners can manage services, add-ons, availability, and customers can book appointments online.

## Features

### Admin Panel
- **Services Management**: Create, edit, and delete services with pricing and duration
- **Add-ons Management**: Create optional add-ons that customers can select
- **Working Hours**: Configure availability for each day of the week
- **Bookings View**: View and manage all customer bookings

### Customer Booking
- Browse available services
- Select optional add-ons
- Choose date and time from available slots
- Complete booking with customer details
- Receive email confirmation (if configured)

## Getting Started

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. (Optional) Set up email confirmations:
   - Create a `.env.local` file in the root directory
   - Add your SMTP email credentials:
     ```
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USER=your-email@gmail.com
     SMTP_PASSWORD=your-app-password
     FROM_EMAIL=your-email@gmail.com
     ```
   - For Gmail: Use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password
   - For other providers: Use your SMTP settings (e.g., Outlook, SendGrid, etc.)

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### For Business Owners

1. Navigate to the **Admin** panel
2. Set up your services in the Services tab
3. Add optional add-ons if needed
4. Configure your working hours in the Availability tab
5. View bookings in the Bookings tab

### For Customers

1. Click "Book Appointment" or navigate to `/book`
2. Select a service
3. Choose add-ons (optional)
4. Select a date and available time slot
5. Enter your details and confirm the booking

## Data Storage

The application supports two storage backends:

1. **Supabase (Recommended for Production)**: PostgreSQL database with free tier. See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for setup instructions.
2. **File-based (Local Development)**: Uses `data.json` for local development. This does NOT work on serverless platforms like Netlify.

**For deployed sites (Netlify/Vercel)**, you MUST use Supabase or another database. File-based storage will not persist on serverless platforms.

## Email Confirmations

The booking system can send email confirmations to customers after they book. To enable this:

1. **Choose an email service**: Gmail, Outlook, SendGrid, or any SMTP-compatible service
2. **Get your SMTP credentials**: 
   - For Gmail: Enable 2-factor authentication and create an [App Password](https://support.google.com/accounts/answer/185833)
   - For other providers: Check their SMTP settings documentation
3. **Configure environment variables**: Create a `.env.local` file with:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   FROM_EMAIL=your-email@gmail.com
   ```
4. **Restart your server**: After adding the environment variables, restart the Next.js server

**Note**: Email sending is optional. If SMTP is not configured, bookings will still work, but no email will be sent. The system gracefully handles missing credentials.

**Gmail Setup**: 
- Use port 587 for TLS or 465 for SSL
- Must use an App Password, not your regular Gmail password
- Enable "Less secure app access" is not needed with App Passwords

## Technologies Used

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React
- Nodemailer (for email confirmations)

## Project Structure

```
├── app/
│   ├── admin/           # Admin panel pages
│   ├── api/             # API routes
│   ├── book/            # Customer booking page
│   └── page.tsx         # Homepage
├── lib/
│   └── data.ts          # Data management functions
├── types/
│   └── index.ts         # TypeScript type definitions
└── data.json            # Data storage (created automatically)
```

