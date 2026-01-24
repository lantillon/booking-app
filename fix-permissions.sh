#!/bin/bash

echo "🔧 Fixing website permissions..."
echo ""

# Stop all Next.js processes
echo "1. Stopping Next.js servers..."
pkill -f "next" 2>/dev/null
sleep 2

# Fix permissions
echo "2. Fixing permissions on node_modules..."
chmod -R 755 node_modules 2>/dev/null

# Clear extended attributes
echo "3. Clearing extended attributes..."
xattr -rc node_modules 2>/dev/null

# Clear build cache
echo "4. Clearing build cache..."
rm -rf .next

echo ""
echo "✅ Permissions fixed!"
echo ""
echo "5. Starting server on port 3009..."
npm run dev -- --port 3009
