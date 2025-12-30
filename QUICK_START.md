# Quick Start Guide

Get the booking system up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- npm or yarn

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Setup Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and set:
# - DATABASE_URL (your PostgreSQL connection string)
# - BOOKING_API_KEY (generate a random secret)
# - ADMIN_PASSWORD (your admin password)
# - NEXTAUTH_SECRET (run: openssl rand -base64 32)
```

## Step 3: Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed with example services
npm run db:seed
```

## Step 4: Run Development Server

```bash
npm run dev
```

## Step 5: Access the Application

- **Public Booking Page**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
  - Login with the password from `ADMIN_PASSWORD` in `.env`

## Test the API

See `CURL_TESTS.md` for curl commands to test the API endpoints.

## Next Steps

- Read `README.md` for full documentation
- Read `MANYCHAT_SETUP.md` for ManyChat integration
- Deploy to production (Vercel recommended)

## Troubleshooting

### Database Connection Error
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check database exists

### API Key Errors
- Verify `BOOKING_API_KEY` is set in `.env`
- For ManyChat, use the same key in the `X-BOOKING-KEY` header

### Port Already in Use
- Change port: `PORT=3001 npm run dev`
- Or kill the process using port 3000

