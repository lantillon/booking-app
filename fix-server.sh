#!/bin/bash

echo "🔧 Fixing server permissions..."
echo ""

cd ~/booking-site

# Stop server
echo "1. Stopping server..."
pkill -f "next" 2>/dev/null
sleep 2

# Fix permissions - may need sudo
echo "2. Fixing permissions (may require your password)..."
sudo chmod -R 755 node_modules
sudo chmod -R u+rwX node_modules/next
sudo xattr -rc node_modules

# Fix specific problematic directory
echo "3. Fixing router-reducer permissions..."
sudo find node_modules/next/dist/client/components/router-reducer -type f -exec chmod 644 {} \;
sudo find node_modules/next/dist/client/components/router-reducer -type d -exec chmod 755 {} \;

# Clear cache
echo "4. Clearing build cache..."
rm -rf .next

echo ""
echo "✅ Permissions fixed!"
echo ""
echo "5. Starting server..."
npm run dev -- --port 3009
