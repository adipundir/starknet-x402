# Environment Variables Setup

## Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# ============================================================================
# CLIENT CONFIGURATION (Frontend - Browser)
# ============================================================================
# ⚠️ WARNING: These are exposed to the browser (NEXT_PUBLIC_)
# In production, use browser wallets instead!

# Client Account (Payer) - Signs payments
NEXT_PUBLIC_CLIENT_PRIVATE_KEY=0x03750e5456f17426a87f70fbd6f2e47a82d95369da7b3cfe4605f79e42108821
NEXT_PUBLIC_CLIENT_ADDRESS=0x02eb0b878df018f7b9f722b7af6496f084b246597014d2886332ac2945431bf8

# Facilitator Address (Public - used by client to check allowance)
NEXT_PUBLIC_FACILITATOR_ADDRESS=0x02a8a171dc53d51916e1db63c239a77658b5d2e8c129f2800e0fc47d794b236e

# Starknet RPC URL (Public)
NEXT_PUBLIC_STARKNET_NODE_URL=https://starknet-sepolia.public.blastapi.io

# ============================================================================
# SERVER CONFIGURATION (Backend - API Routes)
# ============================================================================
# 🔒 These are server-only (NOT exposed to browser)

# Facilitator Account (Settler) - Private key for executing settlements
# 🔴 CRITICAL: Keep this secret! Never expose with NEXT_PUBLIC_
FACILITATOR_PRIVATE_KEY=0x0429a3986572755c0e8a36df04a929bc1eabfde7d27b5ed1ff05b4e010408b30

# Recipient Account (Payee) - Receives payments
PAYMENT_RECIPIENT_ADDRESS=0x04ad015c7b45761cef82152303d133bbf2fd9b033e2ffa2af5ac76982d72b479

# Token Configuration
TOKEN_ADDRESS=0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d

# Starknet RPC URL (Server)
STARKNET_NODE_URL=https://starknet-sepolia.public.blastapi.io

# Facilitator Configuration
FACILITATOR_URL=http://localhost:3000/api/facilitator
```

## Setup Steps

1. **Create `.env.local` file:**
   ```bash
   # Copy the variables above into .env.local
   touch .env.local
   ```

2. **Stop the dev server** (if running):
   ```bash
   # Press Ctrl+C in the terminal
   ```

3. **Restart the dev server:**
   ```bash
   npm run dev
   ```

4. **Hard refresh your browser:**
   - **Mac:** `Cmd + Shift + R`
   - **Windows/Linux:** `Ctrl + Shift + R`

## Variable Explanations

### Client Variables (Browser-exposed)
- `NEXT_PUBLIC_CLIENT_PRIVATE_KEY` - Client's private key for signing (⚠️ demo only!)
- `NEXT_PUBLIC_CLIENT_ADDRESS` - Client's wallet address
- `NEXT_PUBLIC_FACILITATOR_ADDRESS` - Facilitator's address (for approval checks)
- `NEXT_PUBLIC_STARKNET_NODE_URL` - RPC endpoint for Starknet

### Server Variables (Backend-only)
- `FACILITATOR_PRIVATE_KEY` - 🔴 **SECRET!** Facilitator's private key for settlements
- `PAYMENT_RECIPIENT_ADDRESS` - Recipient's address (receives payments)
- `TOKEN_ADDRESS` - STRK token contract address
- `STARKNET_NODE_URL` - RPC endpoint for server-side calls
- `FACILITATOR_URL` - Facilitator API base URL

## Account Roles

### 1. **Client (Payer)**
- **Address:** `0x02eb0b878df018f7b9f722b7af6496f084b246597014d2886332ac2945431bf8`
- **Role:** Makes payments
- **Actions:**
  - Approves facilitator (one-time)
  - Signs payment authorizations (gasless)

### 2. **Facilitator (Settler)**
- **Address:** `0x02a8a171dc53d51916e1db63c239a77658b5d2e8c129f2800e0fc47d794b236e`
- **Role:** Settles transactions
- **Actions:**
  - Verifies signatures
  - Executes `transfer_from` on-chain
  - Pays gas fees

### 3. **Recipient (Payee)**
- **Address:** `0x04ad015c7b45761cef82152303d133bbf2fd9b033e2ffa2af5ac76982d72b479`
- **Role:** Receives payments
- **Actions:**
  - Provides protected resources
  - Receives STRK tokens

## Troubleshooting

### Error: "Facilitator not configured"
**Cause:** Missing `FACILITATOR_PRIVATE_KEY` or `NEXT_PUBLIC_FACILITATOR_ADDRESS`

**Fix:**
1. Check `.env.local` has both variables
2. Restart dev server: `npm run dev`
3. Hard refresh browser

### Error: "Environment variables NOT loaded"
**Cause:** Variables not loaded in browser/server

**Fix:**
1. Stop dev server (Ctrl+C)
2. Run: `npm run dev`
3. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)

### Verification skipping on-chain checks
**Cause:** Missing `NEXT_PUBLIC_FACILITATOR_ADDRESS`

**Fix:**
1. Add to `.env.local`:
   ```
   NEXT_PUBLIC_FACILITATOR_ADDRESS=0x02a8a171dc53d51916e1db63c239a77658b5d2e8c129f2800e0fc47d794b236e
   ```
2. Restart dev server
3. Hard refresh browser

## Security Notes

### Development (Current Setup)
- ⚠️ Client private key exposed to browser
- ⚠️ For testing/demo purposes only
- ✅ Facilitator private key stays server-side

### Production (Recommended)
- ✅ Use browser wallets (ArgentX, Braavos)
- ✅ Never expose private keys with `NEXT_PUBLIC_`
- ✅ Client signs via `wallet.signMessage()`
- ✅ Only facilitator key on server

## Verification Checklist

After setup, verify:

- [ ] `.env.local` file exists in project root
- [ ] All variables are set (copy from above)
- [ ] Dev server restarted
- [ ] Browser hard refreshed
- [ ] No "environment variables not loaded" errors in console
- [ ] Payment flow completes successfully

## See Also

- **KEYPAIRS.md** - Complete account details
- **APPLICATION_FLOW.md** - Complete payment flow
- **TRANSFER_FROM_IMPLEMENTATION.md** - Technical implementation details

