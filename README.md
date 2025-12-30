# Booking System

A full-stack booking system with ManyChat integration, built with Next.js, TypeScript, Prisma, and PostgreSQL.

## Features

- **Public Booking Interface**: Customers can select services, dates, and available time slots
- **Admin Dashboard**: Manage services and view/cancel bookings
- **ManyChat Integration**: Secure API endpoints for real-time availability and booking
- **Anti Double-Booking**: Uses "holds" (slot locking) with 8-minute expiration
- **Timezone Support**: All times handled in America/Denver timezone
- **Race Condition Prevention**: Database transactions with Serializable isolation level

## Tech Stack

- **Frontend**: Next.js 14 (App Router) with TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js (admin login)
- **Styling**: Tailwind CSS

## Project Structure

```
booking-system/
├── app/
│   ├── api/
│   │   ├── availability/      # GET /api/availability
│   │   ├── hold/               # POST /api/hold
│   │   ├── book/               # POST /api/book
│   │   ├── cancel/             # POST /api/cancel
│   │   ├── services/           # GET /api/services (public)
│   │   ├── admin/              # Admin API routes
│   │   └── auth/               # NextAuth routes
│   ├── admin/                  # Admin dashboard pages
│   ├── page.tsx                # Public booking page
│   └── layout.tsx
├── lib/
│   ├── prisma.ts               # Prisma client
│   ├── availability.ts         # Availability logic
│   ├── api-auth.ts             # API key auth & rate limiting
│   └── auth.ts                 # NextAuth config
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Seed script
└── .env.example
```

## Setup Instructions

### 1. Initialize Project

```bash
# Install dependencies
npm install

# Or with yarn
yarn install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/booking_db?schema=public"

# API Security
BOOKING_API_KEY="your-secret-api-key-here-change-in-production"

# Admin Authentication
ADMIN_PASSWORD="admin123"
NEXTAUTH_SECRET="your-nextauth-secret-here-generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Timezone
TZ="America/Denver"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 3. Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (for development)
npx prisma db push

# Or create a migration (for production)
npx prisma migrate dev --name init

# Seed the database with example services
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at:
- **Public Booking**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin

## API Endpoints

All ManyChat API endpoints require the `X-BOOKING-KEY` header.

### GET /api/availability

Get available time slots for a service on a specific date.

**Query Parameters:**
- `service_id` (number): Service ID
- `date` (string): Date in YYYY-MM-DD format

**Response:**
```json
{
  "service_id": 1,
  "date": "2024-01-15",
  "slots": [
    {"start": "2024-01-15T15:00:00.000Z", "end": "2024-01-15T15:30:00.000Z"}
  ],
  "choices": [
    {"title": "9:00 AM", "value": "2024-01-15T15:00:00.000Z|2024-01-15T15:30:00.000Z"}
  ]
}
```

### POST /api/hold

Create a hold (lock) on a time slot for 8 minutes.

**Request Body:**
```json
{
  "service_id": 1,
  "start": "2024-01-15T15:00:00.000Z",
  "end": "2024-01-15T15:30:00.000Z",
  "session_id": "IG_123456789"
}
```

**Response:**
```json
{
  "hold_id": "uuid-here",
  "expires_at": "2024-01-15T15:08:00.000Z"
}
```

**Error Responses:**
- `409`: `{"error": "slot_taken"}` - Slot is already booked or held

### POST /api/book

Create a booking from a hold.

**Request Body:**
```json
{
  "hold_id": "uuid-here",
  "customer_name": "John Doe",
  "customer_phone": "+1234567890",
  "notes": "Optional notes"
}
```

**Response:**
```json
{
  "booking_id": "uuid-here",
  "start_time": "2024-01-15T15:00:00.000Z",
  "end_time": "2024-01-15T15:30:00.000Z",
  "service_name": "Haircut"
}
```

**Error Responses:**
- `409`: `{"error": "hold_expired"}` - Hold expired
- `409`: `{"error": "slot_taken"}` - Slot was taken between hold and book

### POST /api/cancel

Cancel a booking (admin only).

**Request Body:**
```json
{
  "booking_id": "uuid-here"
}
```

## Testing with cURL

See `CURL_TESTS.md` for complete curl command examples.

## ManyChat Integration

See `MANYCHAT_SETUP.md` for detailed ManyChat setup instructions.

## Database Schema

### Services
- `id`: Integer (primary key)
- `name`: String
- `duration_minutes`: Integer
- `price`: Decimal
- `is_active`: Boolean
- `created_at`: DateTime
- `updated_at`: DateTime

### Bookings
- `id`: UUID (primary key)
- `service_id`: Integer (foreign key)
- `start_time`: DateTime (UTC)
- `end_time`: DateTime (UTC)
- `customer_name`: String
- `customer_phone`: String
- `notes`: String (optional)
- `created_at`: DateTime

### Holds
- `id`: UUID (primary key)
- `service_id`: Integer (foreign key)
- `start_time`: DateTime (UTC)
- `end_time`: DateTime (UTC)
- `session_id`: String (e.g., "IG_123456789")
- `expires_at`: DateTime (UTC)
- `created_at`: DateTime

## Race Condition Prevention

The system uses **PostgreSQL Serializable isolation level** for transactions to prevent double-booking:

1. **Hold Creation**: Checks for overlapping bookings/holds atomically within a transaction
2. **Booking Creation**: Validates hold, checks slot availability, creates booking, and deletes hold all atomically

This ensures that even under high concurrency, no two bookings can be created for the same time slot.

## Business Rules

- **Business Hours**: Monday-Saturday, 9:00 AM - 6:00 PM (America/Denver)
- **Slot Granularity**: 30 minutes
- **Hold Duration**: 8 minutes
- **Timezone**: All times stored in UTC, displayed in America/Denver

## Production Deployment

### Recommended Hosting

- **Vercel**: Best for Next.js (recommended)
- **Render**: Good alternative with PostgreSQL support
- **Fly.io**: Good for full-stack apps

### Environment Variables for Production

Make sure to set all environment variables in your hosting platform:
- `DATABASE_URL`: Production PostgreSQL connection string
- `BOOKING_API_KEY`: Strong, randomly generated secret
- `ADMIN_PASSWORD`: Strong admin password
- `NEXTAUTH_SECRET`: Generated secret
- `NEXTAUTH_URL`: Your production URL (e.g., https://yourdomain.com)

### Database Migrations

For production, use migrations instead of `db push`:

```bash
npx prisma migrate deploy
```

## Development Commands

```bash
# Development
npm run dev

# Build
npm run build

# Start production server
npm start

# Database
npm run db:push          # Push schema (dev)
npm run db:migrate       # Create migration
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio

# Linting
npm run lint
```

## License

MIT

