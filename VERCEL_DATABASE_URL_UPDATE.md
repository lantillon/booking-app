# Update DATABASE_URL in Vercel

## Your Transaction Pooler Connection String

**Format for Vercel:**
```
postgresql://postgres.sjflmgcukmajdyxtmtxx:La88841913%25%24@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require
```

## Steps to Update Vercel

1. Go to **Vercel Dashboard** → Your Project
2. **Settings** → **Environment Variables**
3. Find `DATABASE_URL`
4. Click to edit it
5. Replace with:
   ```
   postgresql://postgres.sjflmgcukmajdyxtmtxx:La88841913%25%24@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require
   ```
6. Make sure all environments are selected: ☑ Production, ☑ Preview, ☑ Development
7. Click **Save**
8. Go to **Deployments** tab
9. Click **⋯** on latest deployment → **Redeploy**

## Key Changes

- ✅ Port changed from `5432` → `6543` (Transaction Pooler)
- ✅ Hostname: `aws-0-us-west-2.pooler.supabase.com` (pooler host)
- ✅ Username: `postgres.sjflmgcukmajdyxtmtxx` (with project ID)
- ✅ Password: `La88841913%25%24` (URL-encoded)
- ✅ SSL: `?sslmode=require` added

## Test After Update

After redeploy, test:
- `https://your-app.vercel.app/api/services` should return JSON (not 500 error)

