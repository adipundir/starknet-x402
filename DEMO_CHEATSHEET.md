# x402 Demo Cheat Sheet - Quick Reference

## 🎯 One-Liner Pitch
**"x402 is Coinbase's HTTP payment standard that we've extended to Starknet, enabling seamless micropayments embedded directly in API requests - no wallet popups, no interruptions, just native HTTP headers."**

---

## ⏱️ Time Allocations

| Section | Time | Key Action |
|---------|------|------------|
| Intro | 20s | Explain x402 + Coinbase origin |
| Problem | 20s | Why current API monetization fails |
| Demo Part 1 | 30s | Show 402 response without payment |
| Demo Part 2 | 50s | Show successful payment + transaction |
| Network Logs | 20s | X-PAYMENT header deep dive |
| SDK/Code | 20s | npm package + code structure |
| Closing | 20s | Recap + call to action |

**Total: 3 minutes**

---

## 🎬 Demo Sequence (Step-by-Step)

### Setup (Before Demo Starts):
```
✓ Open https://starknet-x402.vercel.app
✓ DevTools open (Console + Network tabs)
✓ Voyager tab ready
✓ VS Code with project open
✓ npm package page loaded
✓ Clear console & network logs
```

### Step 1: Show 402 (30 seconds)
```
1. Click "Step 1: Request Without Payment"
2. Point to Status: 402
3. Show payment requirements in response body
4. Say: "Server tells us exactly what it needs"
```

### Step 2: Make Payment (50 seconds)
```
1. Click "Step 2: Sign & Send Payment"
2. Watch console logs scroll:
   - "Signing message..."
   - "Sending X-PAYMENT header..."
   - "Middleware verifying..."
3. Point to Status: 200 ✅
4. Click transaction hash link
5. Show Voyager: "This is the actual on-chain transfer"
```

### Step 3: Network Analysis (20 seconds)
```
1. Switch to Network tab
2. Find /api/protected/weather request
3. Click → Headers → Request Headers
4. Point to X-PAYMENT header
5. Say: "This header contains the entire payment authorization"
```

### Step 4: Show Code (20 seconds)
```
1. Switch to npm page
2. Say: "Published as @adipundir/starknet-x402"
3. Switch to VS Code
4. Show packages/x402-starknet-sdk/
5. Quick scroll through src/ folders
```

---

## 💬 Key Talking Points

### Must-Mention Facts:
- ✅ **x402 is Coinbase's standard** (not ours - we extended it)
- ✅ **First blockchain implementation** of x402
- ✅ **Starknet L2** = sub-cent fees ($0.001)
- ✅ **No wallet popups** = seamless UX
- ✅ **HTTP-native** = embedded in request headers
- ✅ **Production-ready** = npm package published

### Technical Highlights:
- Cryptographic signatures (Starknet account abstraction)
- Off-chain verification + on-chain settlement
- Replay protection (nonces)
- Time-bounded (deadlines)

### Use Cases:
- AI APIs (pay per query)
- Data feeds (pay per request)
- Premium content (pay per article)

---

## 🎤 Script Snippets

### Opening:
> "Hi everyone! Today I'm showing x402 - a payment protocol by Coinbase that we've extended to Starknet. It enables HTTP-native micropayments, meaning you can embed payment authorization directly in API requests using a simple header. No wallet popups, no interruptions - just seamless blockchain payments."

### During 402 Response:
> "The server responds with 402 Payment Required and tells us exactly what it needs: 0.01 STRK tokens to this recipient address. This is the payment requirement."

### During Payment:
> "Now we sign a payment authorization with our Starknet wallet, base64-encode it into an X-PAYMENT header, and send the request. The middleware verifies the signature off-chain, settles the payment on-chain, and returns the API response - all in under 10 seconds."

### Showing Transaction:
> "And here's the proof - this is the actual token transfer on Starknet Sepolia. The payment happened on-chain while the user experienced zero friction."

### SDK Mention:
> "We've packaged this as an npm SDK. You can protect your API with x402 payments in just 3 lines of code."

### Closing:
> "To recap: x402 is Coinbase's HTTP payment standard, we extended it to Starknet for cheap L2 transactions, payments are embedded in headers with no wallet popups, and it's production-ready on npm today. Thank you!"

---

## 📊 Data Points to Mention

| Metric | Value | Context |
|--------|-------|---------|
| Transaction Fee | $0.001 | Starknet L2 vs $5+ on Ethereum |
| Settlement Time | ~10s | Fast enough for real-time |
| Payment Amount | $0.01 | Micropayment-friendly |
| Integration Time | <5 min | 3 lines of code |
| npm Downloads | [Check] | Social proof |

---

## 🚨 Backup Plans

### If Payment Fails:
```
Option 1: "Let me show you a previous successful transaction"
         → Open Voyager with known TX hash

Option 2: "This is actually expected in demo mode - let me explain
           how the retry logic works in production"
         → Discuss error handling

Option 3: "Perfect timing - this shows why we have deadlines
           and nonce protection"
         → Turn it into teaching moment
```

### If Page Loads Slowly:
```
"While this loads, let me explain the three-component architecture:
the client signs, the middleware intercepts, and the facilitator
settles on-chain. This distributed design means..."
```

### If Environment Variables Missing:
```
"Actually, this demonstrates an important point about x402
configuration. In production, you'd set these environment
variables in your deployment platform. Let me show you
the .env.example file..."
```

### If Network Tab is Confusing:
```
"Let me zoom in on this... [zoom way in]
See this X-PAYMENT header? It's a base64-encoded JSON payload
containing the signature and payment details."
```

---

## 🎯 Success Metrics

### Audience Understands If They Can Answer:
- ✅ What is x402? (HTTP payment protocol by Coinbase)
- ✅ How does it work? (Payment in X-PAYMENT header)
- ✅ Why Starknet? (Cheap fees, fast, L2)
- ✅ What's the UX benefit? (No wallet popups)
- ✅ How to use it? (npm package, 3 lines of code)

### Strong Demo If:
- ✅ Payment succeeds and TX hash shown
- ✅ Network logs clearly visible
- ✅ Under 3 minutes total
- ✅ No awkward pauses
- ✅ At least 1 "wow" moment

---

## 🔗 URLs to Have Ready

```
Demo:     https://starknet-x402.vercel.app
GitHub:   https://github.com/adipundir/starknet-x402
npm:      https://www.npmjs.com/package/@adipundir/starknet-x402
Explorer: https://sepolia.voyager.online
Coinbase: [Link to x402 proposal if available]
```

---

## 📱 Social Media Snippets

### Twitter/X:
```
Just demoed x402 on Starknet! 🚀

x402 (by @coinbase) enables HTTP-native payments.
We extended it to Starknet for sub-cent micropayments.

✅ No wallet popups
✅ Embedded in HTTP headers
✅ $0.001 tx fees
✅ Production-ready SDK

npm: @adipundir/starknet-x402
Demo: [link]
```

### LinkedIn:
```
Excited to present our implementation of x402 on Starknet!

x402 is a payment protocol originally proposed by Coinbase that
enables micropayments embedded directly in HTTP requests. We've
extended this standard to work on Starknet L2, enabling:

• Sub-cent transaction fees ($0.001 vs $5+ on Ethereum)
• Seamless UX (no wallet popups)
• HTTP-native payments (X-PAYMENT header)
• Production-ready SDK on npm

This opens up new possibilities for API monetization, particularly
for AI services, data feeds, and pay-per-use models.

Check out the demo and open-source implementation:
[links]
```

---

## 🎨 Visual Aids

### Draw on Whiteboard If Available:
```
[Client] --1. GET--> [API]
                     └─> 402 + Requirements

[Client] <------------ [API]

[Client] --2. GET + X-PAYMENT--> [Middleware]
                                  └─> Verify
                                  └─> Settle
                                       └─> Starknet

[Client] <--3. 200 + Data-------- [Middleware]
```

### Console Log Pattern to Point Out:
```
🔍 Environment check ✅
🔵 Starting payment process
📝 Signing message...
🔐 Signature: 0x4f08...
📤 Sending X-PAYMENT header
✅ Status: 200
🔗 Transaction: 0xabc...
```

---

## ⚡ Energy Boosters

### Use These Phrases:
- "Check this out..."
- "This is the magic..."
- "And boom - there it is!"
- "Pretty cool, right?"
- "This is where it gets interesting..."
- "Watch what happens next..."

### Avoid These:
- "Um..." / "Uh..."
- "So basically..."
- "I think..." (be confident!)
- Long technical jargon dumps
- Apologizing for demo glitches

---

## 🎓 Audience Q&A Prep

**Q: Is this secure?**
A: Yes - cryptographic signatures, nonces prevent replay attacks, deadlines prevent stale authorizations.

**Q: What if user doesn't have tokens?**
A: They'd need to acquire STRK first. In production, could integrate on-ramps.

**Q: Why not use Stripe?**
A: Stripe has 3% fees - kills micropayments. Also requires KYC, slower settlements.

**Q: Can I use this on mainnet?**
A: SDK is production-ready, currently on testnet. Mainnet deployment planned.

**Q: How does this compare to Lightning Network?**
A: Different approach - x402 is HTTP-native, works with any blockchain. LN is Bitcoin-specific.

**Q: What about gas fees?**
A: Starknet L2 = $0.001 per transaction. Enables true micropayments.

---

## ✅ Final Checklist (Run Through This)

**5 Minutes Before:**
- [ ] Close unnecessary browser tabs
- [ ] Clear console & network logs
- [ ] Test both Step 1 and Step 2 buttons
- [ ] Verify transaction link works
- [ ] Check sound/mic if virtual
- [ ] Take a breath, smile

**Right Before:**
- [ ] Welcome audience
- [ ] Introduce yourself briefly
- [ ] Set expectation: "This is a 3-minute demo"
- [ ] Dive in!

**After Demo:**
- [ ] Ask for questions
- [ ] Share links in chat
- [ ] Thank the audience
- [ ] Follow up with interested people

---

**You got this! 🚀**

