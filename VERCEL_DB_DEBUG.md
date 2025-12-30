# Debug Vercel Database Connection

Since DATABASE_URL is correct, let's check other potential issues:

## Common Issues When DATABASE_URL is Correct

### 1. Prisma Client Not Generated
- Vercel might not be running `prisma generate` during build
- Check: Vercel build logs should show "Generated Prisma Client"
- Fix: We have `postinstall` script, but verify it runs

### 2. Database Connection Pooling
- Supabase might need connection pooling for serverless
- Try using Supabase's connection pooler URL instead

### 3. IP Restrictions
- Supabase might be blocking Vercel's IP addresses
- Check Supabase dashboard → Settings → Network Restrictions

### 4. SSL Certificate Issues
- Even with `?sslmode=require`, there might be certificate issues
- Try `?sslmode=require&sslcert=&sslkey=&sslrootcert=`

## Next Steps to Debug

1. **Check Vercel Function Logs**:
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click latest deployment → Functions → `/api/services`
   - Check Runtime Logs for the exact error

2. **Try Connection Pooler**:
   - Go to Supabase Dashboard → Settings → Database
   - Find "Connection Pooling" section
   - Use the pooler URL (usually port 6543 or different hostname)

3. **Test Connection String Locally**:
   ```bash
   DATABASE_URL="your-vercel-url" npx prisma db pull
   ```

4. **Check Supabase Network Settings**:
   - Supabase Dashboard → Settings → Database
   - Make sure "Allow connections from anywhere" is enabled
   - Or add Vercel's IP ranges

## Alternative: Use Supabase Connection Pooler

The pooler is better for serverless (Vercel):

1. Go to Supabase Dashboard
2. Settings → Database → Connection Pooling
3. Copy the "Connection String" (URI format)
4. It will look like:
   ```
   postgresql://postgres.sjflmgcukmajdyxtmtxx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```
5. Update DATABASE_URL in Vercel with this pooler URL

The pooler handles connections better for serverless functions.

