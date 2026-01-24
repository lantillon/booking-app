#!/bin/bash

echo "🔧 Complete Website Fix"
echo "======================"
echo ""

cd ~/booking-site

echo "1. Stopping all servers..."
pkill -f "next" 2>/dev/null
sleep 2

echo "2. Fixing permissions (enter password when asked)..."
sudo chmod -R 755 node_modules
sudo chmod 644 node_modules/next/dist/client/components/router-reducer/*.js
sudo xattr -rc node_modules

echo "3. Clearing build cache..."
rm -rf .next

echo ""
echo "✅ All fixes applied!"
echo ""
echo "4. Starting server..."
echo "   (Wait 60 seconds for build to complete)"
echo ""

npm run dev -- --port 3009
