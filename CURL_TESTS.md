# cURL Test Commands

Use these commands to test the API endpoints. Replace `YOUR_API_KEY` with your actual `BOOKING_API_KEY` from `.env`.

## Base URL

For local development:
```bash
BASE_URL="http://localhost:3000"
API_KEY="YOUR_API_KEY"
```

## 1. Get Availability

Get available time slots for service ID 1 on a specific date.

```bash
curl -X GET \
  "${BASE_URL}/api/availability?service_id=1&date=2024-01-15" \
  -H "X-BOOKING-KEY: ${API_KEY}" \
  -H "Content-Type: application/json"
```

**Expected Response:**
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

## 2. Create Hold

Lock a time slot for 8 minutes.

```bash
curl -X POST \
  "${BASE_URL}/api/hold" \
  -H "X-BOOKING-KEY: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": 1,
    "start": "2024-01-15T15:00:00.000Z",
    "end": "2024-01-15T15:30:00.000Z",
    "session_id": "IG_123456789"
  }'
```

**Expected Response:**
```json
{
  "hold_id": "550e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2024-01-15T15:08:00.000Z"
}
```

**Error Response (slot taken):**
```json
{
  "error": "slot_taken"
}
```

## 3. Create Booking

Convert a hold into a booking.

```bash
# First, get a hold_id from step 2, then:
curl -X POST \
  "${BASE_URL}/api/book" \
  -H "X-BOOKING-KEY: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "hold_id": "550e8400-e29b-41d4-a716-446655440000",
    "customer_name": "John Doe",
    "customer_phone": "+1234567890",
    "notes": "First time customer"
  }'
```

**Expected Response:**
```json
{
  "booking_id": "660e8400-e29b-41d4-a716-446655440000",
  "start_time": "2024-01-15T15:00:00.000Z",
  "end_time": "2024-01-15T15:30:00.000Z",
  "service_name": "Haircut"
}
```

**Error Responses:**
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

## 4. Cancel Booking

Cancel an existing booking (admin only).

```bash
curl -X POST \
  "${BASE_URL}/api/cancel" \
  -H "X-BOOKING-KEY: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": "660e8400-e29b-41d4-a716-446655440000"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Booking cancelled",
  "booking_id": "660e8400-e29b-41d4-a716-446655440000"
}
```

## 5. Test Error Cases

### Missing API Key
```bash
curl -X GET \
  "${BASE_URL}/api/availability?service_id=1&date=2024-01-15" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "error": "unauthorized"
}
```

### Invalid Input
```bash
curl -X POST \
  "${BASE_URL}/api/hold" \
  -H "X-BOOKING-KEY: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": "invalid"
  }'
```

**Expected Response:**
```json
{
  "error": "invalid_input",
  "details": [...]
}
```

## Complete Test Flow

Here's a complete test flow that simulates a booking:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
API_KEY="YOUR_API_KEY"
SERVICE_ID=1
DATE="2024-01-15"

# 1. Get availability
echo "1. Getting availability..."
AVAILABILITY=$(curl -s -X GET \
  "${BASE_URL}/api/availability?service_id=${SERVICE_ID}&date=${DATE}" \
  -H "X-BOOKING-KEY: ${API_KEY}")

echo "$AVAILABILITY" | jq '.'

# Extract first slot (requires jq)
START=$(echo "$AVAILABILITY" | jq -r '.slots[0].start')
END=$(echo "$AVAILABILITY" | jq -r '.slots[0].end')

if [ "$START" = "null" ] || [ -z "$START" ]; then
  echo "No available slots"
  exit 1
fi

echo -e "\n2. Creating hold for slot: ${START} to ${END}"

# 2. Create hold
HOLD_RESPONSE=$(curl -s -X POST \
  "${BASE_URL}/api/hold" \
  -H "X-BOOKING-KEY: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"service_id\": ${SERVICE_ID},
    \"start\": \"${START}\",
    \"end\": \"${END}\",
    \"session_id\": \"test_$(date +%s)\"
  }")

echo "$HOLD_RESPONSE" | jq '.'

HOLD_ID=$(echo "$HOLD_RESPONSE" | jq -r '.hold_id')

if [ "$HOLD_ID" = "null" ] || [ -z "$HOLD_ID" ]; then
  echo "Failed to create hold"
  exit 1
fi

echo -e "\n3. Creating booking with hold_id: ${HOLD_ID}"

# 3. Create booking
BOOKING_RESPONSE=$(curl -s -X POST \
  "${BASE_URL}/api/book" \
  -H "X-BOOKING-KEY: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"hold_id\": \"${HOLD_ID}\",
    \"customer_name\": \"Test Customer\",
    \"customer_phone\": \"+1234567890\",
    \"notes\": \"Test booking\"
  }")

echo "$BOOKING_RESPONSE" | jq '.'

BOOKING_ID=$(echo "$BOOKING_RESPONSE" | jq -r '.booking_id')

if [ "$BOOKING_ID" != "null" ] && [ -n "$BOOKING_ID" ]; then
  echo -e "\n✅ Booking created successfully: ${BOOKING_ID}"
else
  echo -e "\n❌ Failed to create booking"
fi
```

Save this as `test-booking.sh`, make it executable (`chmod +x test-booking.sh`), and run it.

