# Implementation Notes

This document explains key implementation decisions and technical details.

## Race Condition Prevention

### Problem
When multiple users try to book the same time slot simultaneously, we need to prevent double-booking.

### Solution
We use **PostgreSQL Serializable isolation level** for all booking-related transactions. This ensures:

1. **Hold Creation**: Atomically checks for overlapping bookings/holds and creates the hold
2. **Booking Creation**: Atomically validates hold, checks slot availability, creates booking, and deletes hold

### Implementation Details

**Hold Creation** (`/api/hold`):
```typescript
await prisma.$transaction(async (tx) => {
  // Check bookings
  // Check active holds
  // Create hold
}, { isolationLevel: 'Serializable' })
```

**Booking Creation** (`/api/book`):
```typescript
await prisma.$transaction(async (tx) => {
  // Find hold
  // Check if expired
  // Check for overlapping bookings
  // Create booking
  // Delete hold
}, { isolationLevel: 'Serializable' })
```

### Why Serializable?
- **Highest isolation level**: Prevents phantom reads and ensures strict serialization
- **Database-level locking**: PostgreSQL handles the locking automatically
- **No application-level locks needed**: Simpler code, fewer edge cases

### Trade-offs
- **Performance**: Serializable transactions can be slower under high contention
- **Deadlocks**: Possible but rare; PostgreSQL handles them automatically
- **For production at scale**: Consider optimistic locking or distributed locks (Redis) if needed

## Timezone Handling

### Problem
All times must be displayed and stored correctly in America/Denver timezone, accounting for DST.

### Solution
We use `date-fns-tz` for timezone conversions:

1. **Storage**: All times stored in UTC in the database
2. **Display**: Convert UTC to America/Denver for user-facing times
3. **Queries**: Convert America/Denver date ranges to UTC for database queries

### Implementation

**Generating Slots** (`lib/availability.ts`):
```typescript
// Start with date in local timezone
const zonedDate = utcToZonedTime(dateObj, 'America/Denver')
const dayStart = startOfDay(zonedDate)

// Generate slots in local time
// Convert to UTC for storage
const utcStart = zonedTimeToUtc(currentTime, 'America/Denver')
```

**Querying Database**:
```typescript
// Convert local date range to UTC
const utcDayStart = zonedTimeToUtc(dayStart, 'America/Denver')
const utcDayEnd = zonedTimeToUtc(dayEnd, 'America/Denver')

// Query with UTC times
where: {
  startTime: { gte: utcDayStart, lt: utcDayEnd }
}
```

**Displaying Times**:
```typescript
// Convert UTC to local for display
const zonedStart = utcToZonedTime(parseISO(slot.start), 'America/Denver')
const timeStr = format(zonedStart, 'h:mm a')
```

## Hold System

### Purpose
Prevents double-booking during the booking flow (user selects time → enters info → confirms).

### Implementation
- **Duration**: 8 minutes (configurable in `HOLD_DURATION_MINUTES`)
- **Expiration**: Automatic cleanup when expired
- **Session ID**: Tracks which user/session has the hold (e.g., `IG_123456789`)

### Flow
1. User selects time → Create hold
2. User enters info (within 8 minutes)
3. User confirms → Convert hold to booking
4. If expired → Hold deleted, user must select time again

### Cleanup
- Expired holds are checked on booking creation
- Could add a background job to clean up expired holds periodically (not implemented)

## API Security

### API Key Authentication
All ManyChat endpoints require `X-BOOKING-KEY` header.

**Implementation** (`lib/api-auth.ts`):
- Middleware checks header against `BOOKING_API_KEY` env var
- Returns `401 unauthorized` if missing/wrong

### Rate Limiting
Simple in-memory rate limiter (100 requests/minute per IP).

**For Production**:
- Use Redis for distributed rate limiting
- Consider per-API-key rate limits
- Add more sophisticated throttling

### Public vs Protected Routes
- `/api/availability`, `/api/hold`, `/api/book`: Require API key (for ManyChat)
- `/api/public/*`: Proxy routes for web UI (no API key needed, handled server-side)
- `/api/admin/*`: Require NextAuth session (admin only)

## Database Schema

### Services
- Simple CRUD with active/inactive flag
- Price stored as Decimal for precision

### Bookings
- UUID primary key
- Indexed on `(serviceId, startTime, endTime)` for fast overlap queries
- Indexed on `startTime` for date range queries

### Holds
- UUID primary key
- Indexed on `(serviceId, startTime, endTime)` for fast overlap queries
- Indexed on `expiresAt` for cleanup queries
- Cascade delete when service is deleted

## Business Rules

### Availability Rules
- **Days**: Monday-Saturday only (Sunday excluded)
- **Hours**: 9:00 AM - 6:00 PM (America/Denver)
- **Slot Granularity**: 30 minutes
- **Slot Duration**: Based on service `durationMinutes`

### Slot Generation
1. Generate all possible slots for the day (9 AM - 6 PM, 30-min intervals)
2. Filter out slots that would extend past 6 PM
3. Filter out slots that overlap with existing bookings
4. Filter out slots that overlap with active holds

## Error Handling

### Error Response Format
```json
{
  "error": "error_code",
  "message": "Human-readable message (optional)",
  "details": "Additional details (optional)"
}
```

### Error Codes
- `unauthorized`: Missing/invalid API key
- `invalid_input`: Request validation failed
- `slot_taken`: Time slot is no longer available
- `hold_expired`: Hold expired before booking
- `server_error`: Internal server error
- `rate_limit_exceeded`: Too many requests

## Frontend Architecture

### Public Booking Page
- Client-side React with Next.js App Router
- Uses proxy routes (`/api/public/*`) to avoid exposing API key
- State management: React hooks (useState, useEffect)
- Form handling: Controlled components

### Admin Dashboard
- Protected by NextAuth
- Server-side session validation
- CRUD operations for services
- Booking management with filters

## Performance Considerations

### Database Queries
- Indexes on frequently queried fields
- Efficient overlap queries using Prisma OR conditions
- Transaction isolation prevents unnecessary queries

### Caching Opportunities
- Availability results could be cached (with short TTL)
- Service list could be cached
- Consider Redis for production

### Scalability
- Current implementation handles moderate traffic
- For high traffic:
  - Add connection pooling
  - Use read replicas for availability queries
  - Implement caching layer
  - Consider queue system for booking creation

## Testing Strategy

### Unit Tests (Not Implemented)
- Availability calculation logic
- Timezone conversions
- Overlap detection

### Integration Tests (Not Implemented)
- API endpoint tests
- Database transaction tests
- Error handling tests

### Manual Testing
- Use curl commands (see `CURL_TESTS.md`)
- Test booking flow end-to-end
- Test concurrent booking attempts
- Test hold expiration

## Deployment Considerations

### Environment Variables
All sensitive values must be set in production:
- `DATABASE_URL`: Production PostgreSQL
- `BOOKING_API_KEY`: Strong random secret
- `ADMIN_PASSWORD`: Strong password
- `NEXTAUTH_SECRET`: Generated secret
- `NEXTAUTH_URL`: Production URL

### Database Migrations
Use `prisma migrate deploy` in production (not `db push`).

### Build Process
```bash
npm run build  # Generates Prisma Client + Next.js build
```

### Monitoring
- Add logging for booking creation
- Monitor API error rates
- Track hold expiration rates
- Alert on double-booking attempts

## Future Enhancements

1. **Email/SMS Notifications**: Send confirmations and reminders
2. **Calendar Integration**: Sync with Google Calendar, etc.
3. **Recurring Bookings**: Support for repeat appointments
4. **Waitlist**: Queue for fully booked dates
5. **Analytics Dashboard**: Booking statistics and insights
6. **Multi-location Support**: Multiple service locations
7. **Staff Management**: Assign bookings to specific staff members
8. **Payment Integration**: Collect payment during booking

