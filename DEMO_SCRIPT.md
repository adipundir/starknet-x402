# x402 Payment Protocol on Starknet - Demo Script
## 2-3 Minute Live Demonstration

---

## **[0:00-0:20] Introduction (20 seconds)**

**"Hi everyone! Today I'm excited to show you x402 - a revolutionary payment protocol for APIs.**

**x402 is a payment standard originally proposed by Coinbase that enables HTTP-native micropayments. Think of it as '402 Payment Required' - a forgotten HTTP status code that we're bringing to life.**

**What makes this special? We've extended x402 to work on Starknet, bringing fast, cheap blockchain payments directly into HTTP requests. No separate payment flows, no complicated integrations - just native HTTP headers."**

---

## **[0:20-0:40] The Problem (20 seconds)**

**"Traditional API monetization is broken:**
- **Credit cards** have high fees (~3%) - not viable for micropayments
- **Web3 wallet popups** interrupt user experience
- **Separate payment flows** add friction

**x402 solves this by embedding payment authorization directly in the HTTP request using a simple `X-PAYMENT` header."**

---

## **[0:40-1:10] Live Demo - Part 1: Without Payment (30 seconds)**

**"Let me show you how it works. I have a weather API protected by x402 payments."**

### Actions:
1. **Open the demo app** (`https://starknet-x402.vercel.app` or `localhost:3000`)
2. **Show the UI** - clean, simple interface
3. **Click "Step 1: Request Without Payment"**

### What to Say:
**"First, let's try accessing the API without payment..."**

4. **Point to the response**:
   - **Status: 402 Payment Required**
   - **Show the response body**: Payment requirements with price, token address, recipient

**"The server responds with 402 and tells us exactly what payment it needs: 0.01 STRK tokens to this address."**

---

## **[1:10-2:00] Live Demo - Part 2: With Payment (50 seconds)**

**"Now let's make the actual payment..."**

### Actions:
1. **Click "Step 2: Sign & Send Payment"**
2. **Show the console logs in real-time** (open DevTools):
   - ✅ Environment variables loaded
   - 🔵 Starting payment process
   - 📝 Signing message with Starknet
   - 🔐 Signature generated
   - 📤 Sending X-PAYMENT header

### What to Say:
**"Behind the scenes, several things happen:**
1. **The client signs a payment authorization using their Starknet wallet**
2. **This signature is base64-encoded into an X-PAYMENT header**
3. **The middleware intercepts the request**
4. **The facilitator verifies the signature off-chain**
5. **Then settles the payment on-chain via Starknet**
6. **Finally, the API responds with the weather data"**

3. **Show the successful response**:
   - **Status: 200 ✅**
   - **Weather data returned**
   - **Transaction hash displayed**

4. **Click the transaction link**:
   - **Opens Voyager explorer**
   - **Show the on-chain transaction**
   - **Point out**: "This is the actual token transfer on Starknet Sepolia testnet"

---

## **[2:00-2:20] Network Logs Deep Dive (20 seconds)**

**"Let's look at the network tab to see what actually happened..."**

### Actions:
1. **Open DevTools → Network tab**
2. **Find the `/api/protected/weather` request**
3. **Show Request Headers**:
   ```
   X-PAYMENT: eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QiLCJuZXR3b3JrIjoi...
   ```

### What to Say:
**"Here's the magic - the X-PAYMENT header contains the entire payment authorization: the signature, amount, token address, and deadline. The middleware verifies this and settles the payment, all without the user leaving the page."**

---

## **[2:20-2:40] The SDK & Codebase (20 seconds)**

### Actions:
1. **Open npmjs.com** → search for `@adipundir/starknet-x402`
2. **Show the package page**

### What to Say:
**"We've packaged this entire implementation as an npm SDK. You can integrate x402 payments into your Starknet app with just a few lines of code:**

```typescript
import { paymentMiddleware } from '@adipundir/starknet-x402';

export const middleware = paymentMiddleware(
  recipientAddress,
  { '/api/protected': { price: '10000000000000000', tokenAddress } }
);
```

**That's it! Your API is now monetized."**

3. **Switch to VS Code** → show project structure:
   ```
   packages/x402-starknet-sdk/    ← The SDK
   app/                           ← Demo application
   lib/x402/                      ← Middleware logic
   ```

### What to Say:
**"The codebase includes:**
- ✅ **Client payment signing**
- ✅ **Middleware for Next.js/Express**
- ✅ **Facilitator for verification & settlement**
- ✅ **Full TypeScript support**
- ✅ **Production-ready examples"**

---

## **[2:40-3:00] Closing & Key Points (20 seconds)**

**"To recap:**

✅ **x402** is a payment standard by Coinbase for HTTP-native micropayments

✅ **We've extended it to Starknet** - bringing fast, cheap L2 payments to APIs

✅ **No wallet popups** - cryptographic signatures embedded in HTTP headers

✅ **Published as an npm package** - ready to integrate today

✅ **Open source** - check out the GitHub repo for the full implementation

**This is the future of API monetization - native, seamless, blockchain-powered payments. Thank you!"**

---

## **Quick Reference - Demo Checklist**

### Before Demo:
- [ ] Open `https://starknet-x402.vercel.app` in browser
- [ ] Open DevTools (Console + Network tabs)
- [ ] Open Voyager in another tab (ready to show transaction)
- [ ] Have VS Code open with project structure visible
- [ ] Have npm package page ready (`@adipundir/starknet-x402`)
- [ ] Reset the demo app (refresh page)

### During Demo:
- [ ] Speak clearly and maintain energy
- [ ] Point to screen elements as you explain them
- [ ] Show console logs in real-time
- [ ] Click transaction link to show on-chain proof
- [ ] Emphasize "no wallet popups" and "HTTP-native"

### Key Messages to Hit:
1. x402 is Coinbase's HTTP payment standard
2. Extended to Starknet for cheap L2 transactions
3. Payment embedded in HTTP headers (X-PAYMENT)
4. No interruptions - seamless UX
5. Production-ready SDK on npm

---

## **Backup Talking Points** (if you have extra time)

### Technical Deep Dive:
**"The protocol uses three components:**
1. **Client**: Signs payment authorization with Starknet account abstraction
2. **Middleware**: Intercepts requests, validates signatures
3. **Facilitator**: Settles transactions on-chain

**Security features:**
- Cryptographic signatures prevent replay attacks
- Nonces ensure one-time use
- Deadlines prevent stale authorizations
- Off-chain verification before on-chain settlement"

### Use Cases:
**"Perfect for:**
- AI API calls (pay per query)
- Data feeds (pay per request)
- Premium content (pay per article)
- Compute resources (pay per execution)
- Real-time services (pay per minute)"

### Why Starknet:
**"We chose Starknet because:**
- Sub-cent transaction fees
- Fast confirmation times (~10 seconds)
- Native account abstraction (no EOAs)
- Cairo's security guarantees
- Ethereum L2 - inherits Ethereum security"

---

## **Common Demo Issues & Fixes**

### If payment fails:
**"Oops, looks like we hit a rate limit. In production, you'd implement proper queue management. Let me show you the previous successful transaction instead..."** → Open Voyager with a known transaction hash

### If page loads slowly:
**"While this loads, let me explain what's happening under the hood..."** → Explain the flow

### If environment variables aren't loaded:
**"I see the env vars aren't loaded - this is actually a great teaching moment. x402 requires proper environment setup..."** → Show the .env.example file

---

## **Script Variations**

### 1-Minute Version (Speed Demo):
- Skip problem explanation (0:20-0:40)
- Fast-forward through Part 1 (show 402, move on)
- Focus on successful payment + transaction
- Quick SDK mention at end

### 5-Minute Version (Deep Dive):
- Add technical architecture diagram
- Show code walkthrough
- Explain signature verification
- Demo facilitator endpoints manually (Postman/curl)
- Show multiple successful payments
- Compare with traditional payment flows

---

## **Post-Demo Resources to Share**

1. **GitHub**: `https://github.com/adipundir/starknet-x402`
2. **npm Package**: `@adipundir/starknet-x402`
3. **Live Demo**: `https://starknet-x402.vercel.app`
4. **x402 Spec**: Link to Coinbase's original proposal
5. **Starknet Docs**: For developers wanting to learn more

---

**Good luck with your demo! 🚀**

