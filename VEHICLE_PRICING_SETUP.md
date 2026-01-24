# Vehicle-Based Pricing Setup Guide

## Overview

You can now set different prices for services based on vehicle size (Sedan, SUV, Truck, Van, Large Truck). This is useful for mobile services like car detailing, mobile mechanics, etc.

## Step 1: Update Database Schema

**Important:** Run this SQL in Supabase SQL Editor first:

```sql
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS vehicle_pricing JSONB,
ADD COLUMN IF NOT EXISTS use_vehicle_pricing BOOLEAN DEFAULT FALSE;
```

Or use the file: `add-vehicle-pricing.sql`

## Step 2: Using Vehicle Pricing

### Creating a Service with Vehicle Pricing:

1. Go to Admin → Services → Create New Service
2. Check the box "Use different pricing based on vehicle size"
3. Enter prices for each vehicle type:
   - Sedan
   - SUV
   - Truck
   - Van
   - Large Truck (optional)

### Editing Existing Services:

1. Go to Admin → Services → Edit a service
2. Check/uncheck the vehicle pricing option
3. Set prices for each vehicle type

## Step 3: Next Steps (Still To Do)

The booking page needs to be updated to:
- Show vehicle size selection when a service uses vehicle pricing
- Calculate price based on selected vehicle size
- Store vehicle size in the booking

**Note:** The admin forms are ready. The booking flow update is still needed.

## Vehicle Types

- **Sedan**: Standard 4-door cars
- **SUV**: Sport Utility Vehicles
- **Truck**: Pickup trucks
- **Van**: Vans and minivans
- **Large Truck**: Commercial trucks (optional)


