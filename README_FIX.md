# Fix Internal Server Error

## The Problem
macOS is blocking Next.js from reading files in `node_modules` due to security restrictions.

## Quick Fix (Run in Terminal)

**Option 1: Use the fix script (Recommended)**
```bash
cd ~/booking-site
bash fix-server.sh
```
This will ask for your password to fix permissions with sudo.

**Option 2: Manual fix**
```bash
cd ~/booking-site

# Stop server (Ctrl+C if running)

# Fix permissions (will ask for password)
sudo chmod -R 755 node_modules
sudo xattr -rc node_modules

# Clear cache
rm -rf .next

# Restart
npm run dev -- --port 3009
```

**Option 3: Reinstall node_modules**
```bash
cd ~/booking-site
rm -rf node_modules package-lock.json .next
npm install
npm run dev -- --port 3009
```

## After Running Fix

1. Wait 30-60 seconds for the build to complete
2. Open http://localhost:3009 in your browser
3. Refresh if you still see errors

The website should work once permissions are fixed!
