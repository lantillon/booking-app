# Fix Website - Permission Issue Solution

## The Problem
macOS is blocking Next.js from reading files in `node_modules` due to security restrictions, especially with folder names containing spaces.

## Solution: Move Project to Folder Without Spaces

**Run these commands in Terminal:**

```bash
# 1. Stop the server (Ctrl+C if running)

# 2. Move project to a new location without spaces
mv '/Users/lantill4/untitled folder 2' ~/booking-site

# 3. Go to the new location
cd ~/booking-site

# 4. Fix permissions
chmod -R 755 node_modules
xattr -rc node_modules

# 5. Clear cache and restart
rm -rf .next
npm run dev -- --port 3009
```

## Alternative: Fix Permissions in Current Location

If you want to keep the current location, run in Terminal:

```bash
cd '/Users/lantill4/untitled folder 2'

# Stop server first (Ctrl+C)

# Fix permissions (may need sudo)
sudo chmod -R 755 node_modules
sudo xattr -rc node_modules

# Clear cache
rm -rf .next

# Restart
npm run dev -- --port 3009
```

## Quick Fix Script

I've created a fix script. Run this in Terminal:

```bash
cd '/Users/lantill4/untitled folder 2'
bash fix-permissions.sh
```

The script will:
1. Stop all Next.js processes
2. Fix permissions on node_modules
3. Clear extended attributes
4. Clear build cache
5. Restart the server

## After Fixing

Once the site loads:
- ✅ Website will work at http://localhost:3009
- ✅ Email confirmations are already configured
- ✅ All features will be functional
