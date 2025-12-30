# ManyChat Integration Guide

This guide explains how to integrate the booking system with ManyChat for real-time availability and booking.

## Overview

The booking flow in ManyChat:
1. User selects a service
2. User selects a date
3. ManyChat calls `/api/availability` to get available times
4. User selects a time slot
5. ManyChat calls `/api/hold` to lock the slot
6. ManyChat collects customer information
7. ManyChat calls `/api/book` to create the booking
8. ManyChat confirms the booking

## API Endpoints

All endpoints require the `X-BOOKING-KEY` header with your secret API key.

### Base URL

For production, use your deployed URL:
```
https://yourdomain.com
```

For testing, use:
```
http://localhost:3000
```

## Step-by-Step Setup

### Step 1: Configure API Key in ManyChat

1. Go to ManyChat → Settings → Custom Fields
2. Create a custom field: `booking_api_key` (Text)
3. Set the value to your `BOOKING_API_KEY` from `.env`

Or, store it in ManyChat's environment variables if supported.

### Step 2: Store Service IDs

Create custom fields to track the booking state:
- `selected_service_id` (Number) - The service the user selected
- `selected_date` (Text) - The date in YYYY-MM-DD format
- `selected_start` (Text) - ISO8601 start time
- `selected_end` (Text) - ISO8601 end time
- `hold_id` (Text) - UUID of the hold
- `booking_id` (Text) - UUID of the completed booking

### Step 3: Get Available Services

**Action**: Make an API Request

**URL**: `GET https://yourdomain.com/api/services`

**Headers**: None required (public endpoint)

**Response**: Array of services
```json
[
  {
    "id": 1,
    "name": "Haircut",
    "durationMinutes": 30,
    "price": 35.00,
    "isActive": true
  }
]
```

**ManyChat Flow**:
1. Show services as buttons or quick replies
2. When user selects a service, save `selected_service_id = {{service.id}}`

### Step 4: Get Availability

**Action**: Make an API Request

**URL**: `GET https://yourdomain.com/api/availability?service_id={{selected_service_id}}&date={{selected_date}}`

**Headers**:
```
X-BOOKING-KEY: {{booking_api_key}}
```

**Response**:
```json
{
  "service_id": 1,
  "date": "2024-01-15",
  "slots": [
    {
      "start": "2024-01-15T15:00:00.000Z",
      "end": "2024-01-15T15:30:00.000Z"
    }
  ],
  "choices": [
    {
      "title": "9:00 AM",
      "value": "2024-01-15T15:00:00.000Z|2024-01-15T15:30:00.000Z"
    }
  ]
}
```

**ManyChat Flow**:
1. Ask user to select a date (use date picker or text input)
2. Save `selected_date` in YYYY-MM-DD format
3. Call this endpoint
4. Display `choices` as buttons (use `title` for button text, `value` for button value)
5. When user clicks a time, save:
   - Split `value` by `|` to get start and end
   - `selected_start = {{split_result[0]}}`
   - `selected_end = {{split_result[1]}}`

### Step 5: Create Hold

**Action**: Make an API Request

**URL**: `POST https://yourdomain.com/api/hold`

**Headers**:
```
X-BOOKING-KEY: {{booking_api_key}}
Content-Type: application/json
```

**Body**:
```json
{
  "service_id": {{selected_service_id}},
  "start": "{{selected_start}}",
  "end": "{{selected_end}}",
  "session_id": "IG_{{subscriber.id}}"
}
```

**Response**:
```json
{
  "hold_id": "550e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2024-01-15T15:08:00.000Z"
}
```

**Error Response** (409):
```json
{
  "error": "slot_taken"
}
```

**ManyChat Flow**:
1. Call this endpoint immediately after user selects a time
2. If error `slot_taken`:
   - Show message: "Sorry, that time was just taken. Let me show you available times again."
   - Go back to Step 4 (get availability)
3. If successful:
   - Save `hold_id = {{hold_id}}`
   - Proceed to collect customer information
   - **Important**: The hold expires in 8 minutes, so collect info quickly!

### Step 6: Collect Customer Information

**ManyChat Flow**:
1. Ask for customer name
2. Save to custom field: `customer_name`
3. Ask for customer phone
4. Save to custom field: `customer_phone`
5. Optionally ask for notes
6. Save to custom field: `customer_notes`

### Step 7: Create Booking

**Action**: Make an API Request

**URL**: `POST https://yourdomain.com/api/book`

**Headers**:
```
X-BOOKING-KEY: {{booking_api_key}}
Content-Type: application/json
```

**Body**:
```json
{
  "hold_id": "{{hold_id}}",
  "customer_name": "{{customer_name}}",
  "customer_phone": "{{customer_phone}}",
  "notes": "{{customer_notes}}"
}
```

**Response**:
```json
{
  "booking_id": "660e8400-e29b-41d4-a716-446655440000",
  "start_time": "2024-01-15T15:00:00.000Z",
  "end_time": "2024-01-15T15:30:00.000Z",
  "service_name": "Haircut"
}
```

**Error Responses** (409):
```json
{
  "error": "hold_expired"
}
```

```json
{
  "error": "slot_taken"
}
```

**ManyChat Flow**:
1. Call this endpoint with the collected information
2. If error `hold_expired`:
   - Show: "Your hold expired. Let's start over."
   - Go back to Step 4
3. If error `slot_taken`:
   - Show: "That slot was taken. Let me show you other available times."
   - Go back to Step 4
4. If successful:
   - Save `booking_id = {{booking_id}}`
   - Show confirmation message with booking details
   - Format the date/time nicely for the user

## Example ManyChat Flow

```
User: "I want to book an appointment"

Bot: "Great! Which service would you like?"
[Button: Haircut - $35]
[Button: Haircut + Beard Trim - $50]
[Button: Full Service - $75]

User clicks: "Haircut"
→ Save: selected_service_id = 1

Bot: "What date would you like? (YYYY-MM-DD)"
User: "2024-01-15"
→ Save: selected_date = "2024-01-15"

Bot: [Calls /api/availability]
→ Gets available times

Bot: "Here are available times:"
[Button: 9:00 AM]
[Button: 9:30 AM]
[Button: 10:00 AM]
...

User clicks: "9:00 AM"
→ Save: selected_start = "2024-01-15T15:00:00.000Z"
→ Save: selected_end = "2024-01-15T15:30:00.000Z"

Bot: [Calls /api/hold]
→ Gets hold_id

Bot: "Great! I've reserved that time for 8 minutes. What's your name?"
User: "John Doe"
→ Save: customer_name = "John Doe"

Bot: "What's your phone number?"
User: "+1234567890"
→ Save: customer_phone = "+1234567890"

Bot: "Any special notes? (optional)"
User: "First time customer"
→ Save: customer_notes = "First time customer"

Bot: [Calls /api/book]
→ Gets booking_id

Bot: "✅ Booking confirmed!
Booking ID: 660e8400-e29b-41d4-a716-446655440000
Service: Haircut
Date: January 15, 2024
Time: 9:00 AM - 9:30 AM
Name: John Doe
Phone: +1234567890

See you then!"
```

## Custom Fields Summary

Store these in ManyChat:

| Field Name | Type | Description |
|------------|------|-------------|
| `booking_api_key` | Text | Your API key (set once) |
| `selected_service_id` | Number | Selected service ID |
| `selected_date` | Text | Date in YYYY-MM-DD format |
| `selected_start` | Text | ISO8601 start time |
| `selected_end` | Text | ISO8601 end time |
| `hold_id` | Text | UUID of the hold |
| `booking_id` | Text | UUID of the booking |
| `customer_name` | Text | Customer name |
| `customer_phone` | Text | Customer phone |
| `customer_notes` | Text | Optional notes |

## Error Handling

Always check for errors in API responses:

1. **`unauthorized`**: API key is missing or incorrect
2. **`invalid_input`**: Request data is invalid
3. **`slot_taken`**: Time slot is no longer available
4. **`hold_expired`**: Hold expired (8 minutes passed)
5. **`server_error`**: Internal server error

Handle each error appropriately in your ManyChat flow.

## Testing

Use the curl commands in `CURL_TESTS.md` to test your endpoints before integrating with ManyChat.

## Security Notes

- Never expose your `BOOKING_API_KEY` in client-side code
- Store it securely in ManyChat's environment or custom fields
- Use HTTPS in production
- The API key is required for all booking endpoints

## Rate Limiting

The API has rate limiting (100 requests per minute per IP). If you exceed this, you'll receive a `429` status with `{"error": "rate_limit_exceeded"}`.

