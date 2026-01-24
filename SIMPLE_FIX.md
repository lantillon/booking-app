# Simple Fix - Just Copy and Paste

## Step 1: Open a NEW Terminal Window
- Press `Cmd + Space`
- Type "Terminal"
- Press Enter

## Step 2: Copy and Paste This ENTIRE Block:

```bash
cd ~/booking-site
sudo chmod -R 755 node_modules
sudo chmod 644 node_modules/next/dist/client/components/router-reducer/*.js
sudo xattr -rc node_modules
pkill -f "next"
rm -rf .next
npm run dev -- --port 3009
```

## Step 3: 
- Press Enter
- Enter your password when asked (you won't see characters - that's normal)
- Wait 60 seconds
- Open http://localhost:3009 in your browser

## That's it!

The `pkill -f "next"` command will stop ANY running Next.js server, so you don't need to find the old terminal.
