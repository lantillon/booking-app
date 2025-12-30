# Fix Webpack Build Errors

## Common Causes

1. **Node.js Version Mismatch**
   - Platform might be using different Node version
   - Solution: Specify Node 20.x in platform settings

2. **Memory Issues**
   - Webpack needs more memory for large builds
   - Solution: Platform should auto-handle, but we've optimized config

3. **Missing Dependencies**
   - Some packages might not install correctly
   - Solution: Using `npm ci` for more reliable installs

## Platform-Specific Fixes

### For Render:
1. Go to your service settings
2. Under **Environment**, select **Node Version**: `20.x`
3. Update **Build Command** to: `npm ci && npx prisma generate && npm run build`
4. Save and redeploy

### For Vercel:
1. Create `vercel.json` (already done)
2. Vercel should auto-detect Node version from `.nvmrc`
3. If build still fails, check build logs for specific webpack error

## Updated Build Command

Use this for more reliable builds:
```bash
npm ci && npx prisma generate && npm run build
```

`npm ci` is faster and more reliable than `npm install` for CI/CD.

## If Build Still Fails

Check the build logs for the specific webpack error:
- Module not found → Missing dependency
- Memory error → Platform needs more resources
- Syntax error → Code issue (but local build works, so unlikely)

Share the exact error message from the build logs for more specific help.

