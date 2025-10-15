# Vercel Environment Variables Setup

## 🚨 The Problem

The application works on localhost but shows `undefined` environment variables in production (Vercel).

**Why?**
- Environment variables need to be manually added to Vercel's dashboard
- Simply having them in `.env.local` is NOT enough for production
- We had a hardcoded fallback (`|| 'http://localhost:3000'`) that masked the issue on localhost

## ✅ The Fix

### 1. Add Environment Variables to Vercel

Go to: **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

Add **ALL** of these variables (copy from `env.example` or `KEYPAIRS.md`):

#### Client Variables (NEXT_PUBLIC_ prefix)
```
NEXT_PUBLIC_CLIENT_PRIVATE_KEY=0x07b95cc818d1452c97e5c8fa6923bd3d7a60586d6c0da2f7f43e7e3d4a3e30e1
NEXT_PUBLIC_CLIENT_ADDRESS=0x02eb0b878df018f7b9f722b7af6496f084b246597014d2886332ac2945431bf8
NEXT_PUBLIC_FACILITATOR_ADDRESS=0x04ad015c7b45761cef82152303d133bbf2fd9b033e2ffa2af5ac76982d72b479
NEXT_PUBLIC_RECIPIENT_ADDRESS=0x04ad015c7b45761cef82152303d133bbf2fd9b033e2ffa2af5ac76982d72b479
NEXT_PUBLIC_TOKEN_ADDRESS=0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
NEXT_PUBLIC_NETWORK_ID=SN_SEPOLIA
NEXT_PUBLIC_NETWORK_NAME=Starknet Sepolia Testnet
NEXT_PUBLIC_STARKNET_NODE_URL=https://starknet-sepolia.public.blastapi.io
NEXT_PUBLIC_EXPLORER_URL=https://sepolia.voyager.online
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

#### Server Variables (NO NEXT_PUBLIC_ prefix)
```
FACILITATOR_PRIVATE_KEY=0x03ff1db8705d796135cb9e4e25c0821c59d3b5f37235997cd1e4c63ac6c83f65
RECIPIENT_ADDRESS=0x04ad015c7b45761cef82152303d133bbf2fd9b033e2ffa2af5ac76982d72b479
TOKEN_ADDRESS=0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
FACILITATOR_URL=https://your-app.vercel.app
STARKNET_NODE_URL=https://starknet-sepolia.public.blastapi.io
```

**IMPORTANT:**
- Replace `https://your-app.vercel.app` with your actual Vercel deployment URL
- Select **ALL** environments (Production, Preview, Development)
- Click "Save" after adding each variable

### 2. Redeploy

After adding all variables:
1. Go to **Deployments** tab
2. Click the **three dots** (•••) on the latest deployment
3. Select **Redeploy**
4. Wait for deployment to complete

### 3. Verify

Open your production site's browser console and check for:
```
✅ NEXT_PUBLIC_CLIENT_PRIVATE_KEY: 0x07b95cc81...
✅ NEXT_PUBLIC_CLIENT_ADDRESS: 0x02eb0b878d...
✅ NEXT_PUBLIC_FACILITATOR_ADDRESS: 0x04ad015c7b...
```

If you still see `❌ undefined`, **hard refresh** your browser:
- Chrome/Edge: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
- Firefox: `Ctrl+F5` / `Cmd+Shift+R`

## 🔍 What We Fixed in the Code

1. **Removed hardcoded fallback in `middleware.ts`:**
   ```diff
   - url: process.env.FACILITATOR_URL || 'http://localhost:3000',
   + url: process.env.FACILITATOR_URL!,
   ```

2. **Improved logging to show actual `undefined` values:**
   ```diff
   - console.log('RECIPIENT_ADDRESS:', process.env.RECIPIENT_ADDRESS || '❌ MISSING');
   + console.log('RECIPIENT_ADDRESS:', process.env.RECIPIENT_ADDRESS ? `✅ ${value}` : `❌ ${process.env.RECIPIENT_ADDRESS}`);
   ```

3. **Fixed environment check to not show ✅ for undefined/empty values:**
   ```diff
   - const hasPrivateKey = !!privateKey;
   + const hasPrivateKey = privateKey && privateKey.length > 0;
   ```

## 📚 Reference

See `env.example` for complete list of required variables and descriptions.

